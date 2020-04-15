/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const util = require('util');
const http = require('http');
const https = require('https');
const path = require('path');
const url = require('url');
const stream = require('stream');
const streamToBuffer = require('fast-stream-to-buffer')
const MemoryStream = require('memorystream');
const express = require('express');
const bodyParser = require("body-parser");
const EventEmitter = require('events');
const randomstring = require("randomstring");
const { Signale } = require('signale');
const Router = require('express').Router;

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
        this.uiEnabled = this.options.uiEnabled == undefined ? true : this.options.uiEnabled;
        this.apiEnabled = this.options.apiEnabled == undefined ? true : this.options.apiEnabled;
        this.apiPort = this.options.apiPort || 5050;
        this.apiHost = this.options.apiHost || 'localhost'
        this.autoStart = this.options.autoStart == undefined ? true : this.options.autoStart;
        this.tcp = this.options.tcp || false;

        this.logger = this.options.logger || signale;

        this.test = this.options.test == undefined ? false : this.options.test;

        if(this.test) {
            this.proxySockets = new Set();
            this.uiSockets = new Set();
        }

        this.proxyRunning = false;
        this.apiRunning = false;

        if(!this.tcp) {
            this.server = this.proxyURI.protocol === 'https:' ? https : http;
        }

        if(this.autoStart) {
            this.startProxy();
        }

        this.requests = [];
        this.responses = {};
        this.requestHashes = {};
        this.replayResponse = null;

        if(this.apiEnabled) {
            this.startUI();
        }

        return;
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
            this.logger.log(util.format('\x1B[33m%s - %s\x1B[39m', req.method, requestUrl));
        }
        const request = this.server.request(options, function (response) {
            if(self.logLevel >= 1) {
                self.logger.log(util.format('\x1B[32m%s - %s\x1B[39m', response.statusCode, requestUrl));
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
                this.logger.log(util.format('\x1B[31m%s - %s\x1B[39m', 500, requestUrl));
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

        const hash = randomstring.generate(32);

        if (this.logLevel > 1 || this.request || this.response) {
            reqStream = new stream.PassThrough();
            resStream = new stream.PassThrough();
        }

        if (this.response || this.request) {
            fresStream = new MemoryStream();
            streamToBuffer(fresStream, function (err, buf) {
                if (err) throw err
                self.responses[hash] = self.parseResponse(buf.toString());
            });
            resStream.pipe(fresStream);
        }
        if (this.request) {
            freqStream = new MemoryStream();
            streamToBuffer(freqStream, function (err, buf) {
                if (err) throw err

                const parsedRequest = self.parseRequest(buf.toString());
                self.requests.unshift({
                    hash: hash,
                    request: parsedRequest
                });
                self.requestHashes[hash] = parsedRequest;
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
    
    requestReplay (requestHash) {
        var self = this;
        if(this.requests.length < 1) {
            this.emit("replay", null);
            return;
        }
        const request = this.requestHashes[requestHash];
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
            this.logger.log('%s %s HTTP/%s',
                request.method,
                request.url,
                options.httpVersion);

            this.writeDictionaryToStream(process.stdout, request.headers);
        }

        const req = server.request(options, function (response) {
            if (self.logLevel > 1) {
                self.logger.log('HTTP/%s %s%s', response.httpVersion, response.statusCode, response.statusMessage ? ' ' + response.statusMessage : '');
                writeDictionaryToStream(process.stdout, response.headers);
                self.logger.log('');
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
            self.logger.error('%s', error ? error.stack : 'Error replaying request');
        });

        if (request.body) {
            req.end(request.body);
            if (this.logLevel > 1) {
                this.logger.log('\r\n%s\r\n', request.body);
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
                this.logger.error('Cannot parse request, problem with header');
            }
        } else {
            this.logger.error("Cannot parse request");
        }
    }

    parseResponse (response) {
        const headDelimiterExp = /\r?\n\r?\n/;
        const headerExp = /^HTTP\/([\d.]+)\s([\d.]+)/i;

        let head, body, headers, headerMatch;
        let status, version
        let delimMatch = headDelimiterExp.exec(response);

        if (delimMatch) {
            head = response.substring(0, delimMatch.index);
            body = response.substring(delimMatch.index + delimMatch[0].length);
            headerMatch = headerExp.exec(head);

            if (headerMatch) {
                version = headerMatch[1];
                status = headerMatch[2];
                headers = head.substring(headerMatch.index + headerMatch[0].length)
                    .split(/\r?\n/)
                    .map(function (h) { return /^([^\s:]+)\s?:\s?(.*)$/.exec(h); })
                    .filter(function (m) { return m; })
                    .reduce(function (obj, a) { obj[a[1]] = a[2]; return obj; }, {});

                return {
                    status: status,
                    httpVersion: version,
                    headers: headers,
                    body: body
                };
            } else {
                this.logger.error('Cannot parse response, problem with header');
            }
        } else {
            this.logger.error("Cannot parse response");
        }
    }

    startProxy () {
        if(this.proxyRunning) {
            return;
        }

        var self = this;

        this.proxy = http.createServer(this.requestHandler.bind(this));
        this.proxy.listen(this.port, this.host, function() {
            self.emit("proxyListening");
        });

        if(this.logLevel >= 0 || !this.logLevel) {
            this.logger.parasite("Will proxy traffic from http://" + this.host + ":" + this.port + " to " + this.proxyURI.href);
        }

        if(this.test) {
            this.proxy.on('connection', function(socket) {
                self.proxySockets.add(socket);
                socket.on("close", function() {
                    self.proxySocket.delete(socket);
                });
            });
        }

        this.proxyRunning = true;
    }

    startUI () {
        if(this.apiRunning) {
            return;
        }

        this.apiEnabled = true;

        var self = this;
        this.ui = express();
        this.uiRouter = Router();

        this.uiRouter.use(function(req, res, next) {
            Object.setPrototypeOf(req, self.ui.request);
            Object.setPrototypeOf(res, self.ui.response);
            req.res = res;
            res.req = req;
            next();
        });

        this.ui.use(bodyParser.urlencoded({ extended: false }));
        this.ui.use(bodyParser.json());

        this.uiRouter.get('/info', function(req, res) {
            res.status(200).json({
                ingress: 'http://' + self.host + ':' + self.port,
                proxy: self.proxyURI.href
            });
        });

        this.uiRouter.get('/requests', function(req, res) {
            res.status(200).json({
                requests: self.requests
            });
        });

        this.uiRouter.get('/responses', function(req, res) {
            res.status(200).json({
                responses: self.responses
            });
        });

        this.uiRouter.get('/request/:requestHash', function(req, res) {
            res.status(self.requests[req.params.requestHash] ? 200 : 404).json({
                request: self.requestHashes[req.params.requestHash]
            });
        });

        this.uiRouter.get('/response/:requestHash', function(req, res) {
            res.status(self.responses[req.params.requestHash] ? 200 : 404).json({
                response: self.responses[req.params.requestHash]
            });
        });

        this.uiRouter.post('/replay', async function(req, res) {
            const requestHash = req.body.requestHash;
            if(self.logLevel > 0) {
                self.logger.parasite("Replaying request hash " + requestHash);
            }
            const replay = await new Promise((resolve, reject) => {
                try {
                    self.on("replay", async function(httpVersion, statusCode, statusMessage, headers, response) {
                        if(!response) {
                            self.logger.error("Requested Index not found");
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
                    self.requestReplay(requestHash);
                } catch (err) {
                    return reject(err);
                }
            });

            return res.status(replay.response ? 200 : 404).json(replay);
        });

        this.ui.use("/api", this.uiRouter);
    
        if(this.uiEnabled) {
            this.ui.use(express.static(path.join(__dirname, 'dist')));
            this.ui.get('*', function(req, res) {
                res.sendFile(path.join(__dirname, 'dist', 'index.html'));
            });
        }
        
        this.apiServer = this.ui.listen(this.apiPort, this.apiHost, function() {
            if(self.logLevel >= 0) {
                if(self.uiEnabled) {
                    self.logger.parasite("Web UI started on http://" + self.apiHost + ":" + self.apiPort);
                } else {
                    self.logger.parasite("API started on http://" + self.apiHost + ":" + self.apiPort);
                }
            }

            if(this.test) {
                this.apiServer.on('connection', function(socket) {
                    self.uiSockets.add(socket);
                    socket.on("close", function() {
                        self.uiSockets.delete(socket);
                    });
                });
            }

            self.apiRunning = true;
            self.emit("apiListening");
        });

    }

    stopProxy (callback = function(){}) {
        if(this.proxyRunning) {
            if(this.test) {
                for (const socket of this.proxySockets.values()) {
                    socket.destroy();
                }
            }
            this.proxy.close();
            this.proxyRunning = false;
        }

        return callback();
    }

    stopUI (callback = function(){}) {
        if(this.apiRunning) {
            if(this.test) {
                for (const socket of this.uiSockets.values()) {
                    socket.destroy();
                }
            }
            this.apiServer.close();
            this.apiRunning = false;
        }
        
        return callback();
    }
}

module.exports = Parasite;