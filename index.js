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
const express = require('express');
const bodyParser = require("body-parser");
const EventEmitter = require('events');

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

class Parasite extends EventEmitter {

    constructor(options) {
        super(options);

        this.options = options || {};

        this.proxyURI = url.parse(this.options.proxyURI || 'http://localhost:3000/');
        this.port = this.options.port || 8080;
        this.host = this.options.host || 'localhost';
        this.request = this.options.request || true;
        this.response = this.options.response || false;
        this.allowInsecure = this.options.allowInsecure || false;
        this.logLevel = this.options.logLevel || 1;
        this.uiEnabled = this.options.ui || true;
        this.uiPort = this.options.uiPort || 5050;
        this.uiHost = this.options.uiHost || 'localhost'
        this.tcp = this.options.tcp || false;

        if(!this.tcp) {
            this.server = this.proxyURI.protocol === 'https:' ? https : http;
        }

        this.proxy = http.createServer(this.requestHandler.bind(this));

        this.proxy.listen(this.port, this.host);
        this.requests = [];
        this.responses = [];
        this.replayResponse = null;

        if(this.logLevel >= 0 || !this.logLevel) {
            signale.parasite("Will proxy traffic from http://" + this.host + ":" + this.port + " to " + this.proxyURI.href);
        }

        if(this.uiEnabled) {
            var self = this;
            this.ui = express();
            this.ui.use(bodyParser.urlencoded({ extended: false }));
            this.ui.use(bodyParser.json());
            this.ui.get('/all', function(req, res) {
                res.status(200).json({
                    requests: self.requests,
                    responses: self.responses
                });
            });

            this.ui.get('/requests', function(req, res) {
                res.status(200).json({
                    requests: self.requests,
                });
            });

            this.ui.get('/responses', function(req, res) {
                res.status(200).json({
                    responses: self.responses,
                });
            });

            this.ui.get('/request/:requestIndex', function(req, res) {
                res.status(self.requests[req.params.requestIndex] ? 200 : 404).json({
                    request: self.parseRequest(Buffer.from(self.requests[req.params.requestIndex], 'base64').toString())
                });
            });

            this.ui.get('/response/:responseIndex', function(req, res) {
                res.status(self.responses[req.params.responseIndex] ? 200 : 404).json({
                    request: self.parseRequest(Buffer.from(self.responses[req.params.responseIndex], 'base64').toString())
                });
            });

            this.ui.post('/replay', async function(req, res) {
                const requestIndex = req.body.requestIndex;
                if(self.logLevel > 0) {
                    signale.parasite("Replaying request #" + requestIndex);
                }

                const replay = await new Promise((resolve, reject) => {
                    try {
                        self.on("replay", async function(httpVersion, statusCode, statusMessage, headers, response) {
                            if(!response) {
                                signale.error("Requested Index not found");
                                return resolve({
                                    response: null
                                });
                            } else {
                                return resolve({
                                    response: {
                                        httpVersion: httpVersion,
                                        statusCode: statusCode,
                                        statusMessage: statusMessage,
                                        headers: headers,
                                        body: response.toString()
                                    }
                                });
                            }
                        });
                        self.requestReplay(requestIndex); 
                    } catch (err) {
                        return reject(err);
                    }
                });

                return res.status(replay.response ? 200 : 404).json(replay);
            });
            this.ui.listen(this.uiPort, this.uiHost, function() {
                if(self.logLevel >= 0) {
                    signale.parasite("Web UI started on http://" + self.uiHost + ":" + self.uiPort);
                }
            });
        }
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
                self.responses.unshift(buf.toString('base64'));
            });
            resStream.pipe(fresStream);
        }
        if (this.request) {
            freqStream = new MemoryStream();
            streamToBuffer(freqStream, function (err, buf) {
                if (err) throw err
                self.requests.unshift(buf.toString('base64'));
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
    
    requestReplay (requestIndex) {
        var self = this;
        if(this.requests.length < 1) {
            this.emit("replay", null);
            return;
        }
        const request = this.parseRequest(Buffer.from(this.requests[requestIndex], 'base64').toString());
        const url = require('url').parse(request.url);
        const server = url.protocol === 'https:' ? https : http;
        const options = {
            hostname: url.hostname,
            port: url.port,
            method: request.method,
            path: url.path,
            headers: request.headers,
            httpVersion: request.httpVersion,
            rejectUnauthorized: this.options.allowInsecure
        }

        if (this.logLevel > 1) {
            siganle.log('%s %s HTTP/%s',
                request.method,
                request.url,
                options.httpVersion);

            this.writeDictionaryToStream(process.stdout, request.headers);
        }

        const req = server.request(options, function (response) {
            if (self.logLevel > 1) {
                signale.log('HTTP/%s %s%s', response.httpVersion, response.statusCode, response.statusMessage ? ' ' + response.statusMessage : '');
                writeDictionaryToStream(process.stdout, response.headers);
                signale.log('');
            }

            if(self.logLevel > 1) {
                response.pipe(process.stdout);
            }

            const replayResponseStream = new MemoryStream();
            streamToBuffer(replayResponseStream, function (err, buf) {
                if (err) throw err

                self.emit("replay", response.httpVersion, response.statusCode, response.statusMessage, response.headers, buf.toString());
            });
            response.pipe(replayResponseStream);

        });

        req.on('error', function (error) {
            siganle.error('%s', error ? error.stack : 'Error replaying request');
        });

        if (request.body) {
            req.end(request.body);
            if (this.logLevel > 1) {
                signale.log('\r\n%s\r\n', request.body);
            }
        } else {
            req.end();
        }
    }

    parseRequest (request) {
        const headDelimiterExp = /\r?\n\r?\n/;
        const headerExp = /^([^\s]+)\s([^\s]+)\sHTTP\/([\d.]+)\r?\n/i;

        let head, body, headers, headerMatch;
        let method, url, version;
        let delimMatch = headDelimiterExp.exec(request);

        if (delimMatch) {
            head = request.substring(0, delimMatch.index);
            body = request.substring(delimMatch.index + delimMatch[0].length);
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
                    body: body
                };
            } else {
                signale.error('Cannot parse request, problem with header');
            }
        } else {
            signale.error("Cannot parse request");
        }
    }
}

module.exports = Parasite;