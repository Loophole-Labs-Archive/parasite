/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const util = require('util');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const stream = require('stream');
const streamToBuffer = require('fast-stream-to-buffer')
const MemoryStream = require('memorystream');
const { Signale } = require('signale');
 
const options = {
  types: {
    parasite: {
      badge: "🐛",
      label: 'Parasite',
      color: 'yellow',
      logLevel: 'debug'
    },
  }
}

const signale = new Signale(options);

 class Capture {
    constructor(proxyURI = 'http://localhost:3000/', port = 8080, host = 'localhost', request = true, response = false, allowInsecure = false, logLevel = 1, tcp = false) {
        
        this.proxyURI = url.parse(proxyURI);
        this.port = port;
        this.host = host;
        this.request = request;
        this.response = response;
        this.allowInsecure = allowInsecure;
        this.logLevel = logLevel;
        this.tcp = tcp;

        if(!this.tcp) {
            this.server = this.proxyURI.protocol === 'https:' ? https : http;
        }

        this.proxy = http.createServer(this.requestHandler.bind(this));

        this.proxy.listen(this.port, this.host);
        this.requests = {};
        this.responses = {};
    }

    combinePaths () {
        const args = Array.prototype.slice.call(arguments, 0);
        let path = args.map(function (s) {
            return s.replace(/(^\/+|\/+$)/g, '');
        }).filter(function (s) {
            return !!s;
        }).join('/');

        const last = args.slice(-1)[0];
        if (last[last.length - 1] === '/') {
            path += '/';
        }

        if (!/^https?:\/\//i.test(path)) {
            path = '/' + path;
        }

        return path;
    }

    writeDictionaryToStream (stream, dict) {
        for (var i in dict) {
            stream.write(util.format('%s: %s\r\n', i, dict[i]));
        }
    }

    routeRequest (req, res, reqFileStream, resFileStream) {
        var self = this;

        const requestUrl = this.combinePaths(this.proxyURI.href, req.url);
        const options = {
            hostname: this.proxyURI.hostname,
            port: this.proxyURI.port,
            method: req.method,
            path: this.combinePaths(this.proxyURI.pathname, req.url),
            headers: req.headers,
            rejectUnauthorized: !this.allowInsecure
        };

        if (reqFileStream) {
            reqFileStream.write(
                util.format('%s %s HTTP/%s\r\n',
                    req.method,
                    this.combinePaths(this.proxyURI.protocol + '//' + options.hostname + (options.port ? ':' + options.port : ''), options.path),
                    req.httpVersion));

            if (Object.getOwnPropertyNames(req.headers).length > 0) {
                self.writeDictionaryToStream(reqFileStream, req.headers);
            }
        }

        if(this.logLevel >= 1) {
            signale.log(util.format('\x1B[33m%s - %s\x1B[39m', req.method, requestUrl));
        }
        const request = this.server.request(options, function (response) {
            if(self.logLevel >= 1) {
                signale.log(util.format('\x1B[32m%s - %s\x1B[39m', response.statusCode, requestUrl));
            }

            res.writeHead(response.statusCode, response.headers);

            if (resFileStream) {
                resFileStream.write(util.format('HTTP/%s %s%s\r\n', response.httpVersion, response.statusCode, response.statusMessage ? ' ' + response.statusMessage : ''));
                if (Object.getOwnPropertyNames(response.headers).length > 0) {
                    self.writeDictionaryToStream(resFileStream, response.headers);
                }

                resFileStream.write('\r\n');
                response.pipe(resFileStream, { end: false });
            }

            response.pipe(res);
            response.on('end', function () {
                if (resFileStream) {
                    resFileStream.end();
                }
                res.end();
            });
        });

        request.on('error', function (error) {
            if(this.logLevel >= 1) {
                signale.log(util.format('\x1B[31m%s - %s\x1B[39m', 500, requestUrl));
            }
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.write(util.format('Request options:\r\n%j\r\n\r\n', options));
            res.end(error ? error.stack : 'Error executing request');
        });

        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            if (reqFileStream) {
                reqFileStream.write('\r\n');
                req.pipe(reqFileStream);
            }
            req.pipe(request);
            req.on('end', function () {
                request.end();
            });
        } else {
            if (reqFileStream) {
                reqFileStream.end('\r\n');
            }
            request.end();
        }
    }

    requestHandler (req, res) {
        var self = this;

        let reqStream, resStream, freqStream, fresStream;

        if (this.logLevel > 1 || this.request || this.response) {
            reqStream = new stream.PassThrough();
            resStream = new stream.PassThrough();
        }

        if (this.response || this.request) {
            fresStream = new MemoryStream();
            streamToBuffer(fresStream, function (err, buf) {
                if (err) throw err
                self.responses[req] = {
                    response: buf.toString('base64')
                }
            });
            resStream.pipe(fresStream);
        }
        if (this.request) {
            freqStream = new MemoryStream();
            streamToBuffer(freqStream, function (err, buf) {
                if (err) throw err
                self.requests[req] = {
                    request: buf.toString('base64')
                }
            });
            reqStream.pipe(freqStream);
        }

        if (this.logLevel > 1) {
            reqStream.pipe(process.stdout, { end: false });
            resStream.pipe(process.stdout, { end: false });

            reqStream.on('finish', function () {
                process.stdout.write('\r\n');
            });
            resStream.on('finish', function () {
                process.stdout.write('\r\n');
            });
        }

        this.routeRequest(req, res, reqStream, resStream);
    }
 }

class Replay {
    constructor() {

    }

    parseRequest (payload) {
        const headDelimiterExp = /\r?\n\r?\n/;
        const headerExp = /^([^\s]+)\s([^\s]+)\sHTTP\/([\d.]+)\r?\n/i;

        let head, body, headers, summary, headerMatch;
        let method, url, version;
        let delimMatch = headDelimiterExp.exec(payload);

        if (delimMatch) {
            head = payload.substring(0, delimMatch.index);
            body = payload.substring(delimMatch.index + delimMatch[0].length);
            headerMatch = headerExp.exec(head);

            if (headerMatch) {
                method = headerMatch[1];
                url = headerMatch[2];
                version = headerMatch[3];
                headers = head.substring(headerMatch.index + headerMatch[0].length)
                    .split(/\r?\n/)
                    .map(function (h) { return /^([^\s:]+)\s?:\s?(.*)$/.exec(h); })
                    .filter(function (m) { return m; })
                    .reduce(function (obj, a) { obj[a[1]] = a[2]; return obj; }, {});

                return {
                    method: method,
                    url: url,
                    httpVersion: version,
                    headers: headers,
                    data: body
                };
            } else {
                signale.error('Cannot parse payload, problem with header');
            }
        } else {
            signale.error("Cannot parse payload");
        }
    }

    writeDictionaryToStream(stream, dict) {
        for (var i in dict) {
            stream.write(util.format('%s: %s\r\n', i, dict[i]));
        }
    }

    replay(payload, opts, callback) {
        var rq = parseRequest(payload);
        var url = require('url').parse(rq.url);
        var client = url.protocol === 'https:' ? https : http;
        opts = opts || {};
        var options = {
            hostname: url.hostname,
            port: url.port,
            method: rq.method,
            path: url.path,
            headers: rq.headers,
            httpVersion: rq.httpVersion,
            rejectUnauthorized: !opts.insecure
        };

        if (opts.verbose && opts.outputHeaders) {
            console.log('%s %s HTTP/%s',
                rq.method,
                rq.url,
                options.httpVersion);

            this.writeDictionaryToStream(process.stdout, rq.headers);
        }

        var req = client.request(options, function (response) {
            if (opts.outputHeaders) {
                console.log('HTTP/%s %s%s', response.httpVersion, response.statusCode, response.statusMessage ? ' ' + response.statusMessage : '');
                writeDictionaryToStream(process.stdout, response.headers);
                console.log('');
            }

            response.pipe(process.stdout);

            if (callback) {
                callback(response);
            }
        });

        req.on('error', function (error) {
            console.log('Error: %s', error ? error.stack : 'Error executing request');
        });

        if (rq.data) {
            req.end(rq.data);
            if (opts.verbose) {
                console.log('\r\n%s\r\n', rq.data);
            }
        } else {
            req.end();
        }
    }
}

class Parasite {
    constructor(options) {
        this.options = options || {};
        this.capture = new Capture(
            this.options.proxyURI, 
            this.options.port,
            this.options.host, 
            this.options.request, 
            this.options.response, 
            this.options.allowInsecure, 
            this.options.logLevel, 
            this.options.tcp
        );
        if(this.options.logLevel >= 0 || !this.options.logLevel) {
            signale.parasite("Will proxy traffic from http://" + this.capture.host + ":" + this.capture.port + " to " + this.capture.proxyURI.href);
        }
    }
}

module.exports = Parasite;