/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const Parasite = require('../index');

test('Starts Parasite with default options', (done) => {

    const parasite = new Parasite({
        test: true
    });

    parasite.on("proxyListening", function() {
        expect(parasite.proxyRunning).toBe(true);
        parasite.stopProxy();
    });

    parasite.on("uiListening", function() {
        expect(parasite.uiRunning).toBe(true);
        parasite.stopUI();
    });

    expect(parasite.test).toBe(true);
    expect(parasite.port).toBe(8080);
    expect(parasite.host).toBe('localhost');
    expect(parasite.request).toBe(true);
    expect(parasite.response).toBe(false);
    expect(parasite.allowInsecure).toBe(false);
    expect(parasite.logLevel).toBe(1);
    expect(parasite.uiPort).toBe(5050);
    expect(parasite.uiHost).toBe('localhost');

    expect(parasite.proxyURI.href).toBe('http://localhost:3000/');

    parasite.proxy.on("close", function() {
        expect(parasite.proxyRunning).toBe(false);
        parasite.uiServer.on("close", function() {
            expect(parasite.uiRunning).toBe(false);
            return done();
        });
    });
});


test('Starts Parasite with without UI', (done) => {

    const parasite = new Parasite({
        uiEnabled: false,
        test: true
    });

    parasite.on("proxyListening", function() {
        expect(parasite.proxyRunning).toBe(true);
        parasite.stopProxy();
    });

    expect(parasite.uiRunning).toBe(false);

    expect(parasite.test).toBe(true);
    expect(parasite.port).toBe(8080);
    expect(parasite.host).toBe('localhost');
    expect(parasite.request).toBe(true);
    expect(parasite.response).toBe(false);
    expect(parasite.allowInsecure).toBe(false);
    expect(parasite.logLevel).toBe(1);
    expect(parasite.uiPort).toBe(5050);
    expect(parasite.uiHost).toBe('localhost');

    expect(parasite.proxyURI.href).toBe('http://localhost:3000/');

    parasite.proxy.on("close", function() {
        expect(parasite.proxyRunning).toBe(false);
        return done();
    });
});

test('Starts Parasite with without autostart', (done) => {

    const parasite = new Parasite({
        autoStart: false,
        uiEnabled: false,
        test: true
    });

    expect(parasite.proxyRunning).toBe(false);
    expect(parasite.uiRunning).toBe(false);

    expect(parasite.test).toBe(true);
    expect(parasite.port).toBe(8080);
    expect(parasite.host).toBe('localhost');
    expect(parasite.request).toBe(true);
    expect(parasite.response).toBe(false);
    expect(parasite.allowInsecure).toBe(false);
    expect(parasite.logLevel).toBe(1);
    expect(parasite.uiPort).toBe(5050);
    expect(parasite.uiHost).toBe('localhost');

    expect(parasite.proxyURI.href).toBe('http://localhost:3000/');

    return done();
});

test('Starts Parasite with without logging', (done) => {

    const jestLogger = {
        parasite: jest.fn(),
        error: jest.fn(),
        log: jest.fn()
    }

    const parasite = new Parasite({
        logLevel: -1,
        logger: jestLogger,
        test: true
    });

    parasite.on("proxyListening", function() {
        expect(parasite.proxyRunning).toBe(true);
        parasite.stopProxy();
    });

    parasite.on("uiListening", function() {
        expect(parasite.uiRunning).toBe(true);
        parasite.stopUI();
    });

    expect(parasite.test).toBe(true);
    expect(parasite.port).toBe(8080);
    expect(parasite.host).toBe('localhost');
    expect(parasite.request).toBe(true);
    expect(parasite.response).toBe(false);
    expect(parasite.allowInsecure).toBe(false);
    expect(parasite.logLevel).toBe(-1);
    expect(parasite.uiPort).toBe(5050);
    expect(parasite.uiHost).toBe('localhost');
    expect(parasite.logger).toBe(jestLogger);

    expect(parasite.proxyURI.href).toBe('http://localhost:3000/');

    parasite.proxy.on("close", function() {
        expect(parasite.proxyRunning).toBe(false);
        parasite.uiServer.on("close", function() {
            expect(parasite.uiRunning).toBe(false);
            expect(jestLogger.parasite).toHaveBeenCalledTimes(0);
            expect(jestLogger.error).toHaveBeenCalledTimes(0);
            expect(jestLogger.log).toHaveBeenCalledTimes(0);
            return done();
        });
    });
});