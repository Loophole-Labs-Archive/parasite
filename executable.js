#!/usr/bin/env node

const Parasite = require('./index');
const ora = require('ora');
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
const commandLineUsage = require('command-line-usage');
const os = require('os');
const request = require('request-promise');

const updateOptions = {
    uri: 'https://dl.loopholelabs.io/releases/parasite/parasiteClientVersion',
    method: "GET",
    headers: {
        'User-Agent': "Parasite"
    },
    json: true
}

const sections = [
    {
        header: 'Usage',
        content: '$ parasite {bold [proxy_port]} {bold [forward_port]} [-l,--listen listen_host ] [-f,--forward forward_host] [--ssl] [-s,--silent] [-v,--verbose]'
    },
    {
        header: 'Examples',
        content: [
            {
                name: '$ parasite 8080 3000',
                summary: 'Starts a Parasite Proxy to capture traffic on port 8080 and forward it to http://localhost:3000'
            },
            {
                name: '$ parasite 8080 3000 -l 0.0.0.0 -f 127.0.0.1 --ssl',
                summary: 'Starts a Parasite Proxy to capture traffic on http://0.0.0.0:8080 and forward it to https://127.0.0.1:3000'
            }
        ]
    },
    {
        header: 'Commands',
        content: [
            { name: 'version', summary: 'Print out version information' },
            { name: 'help', summary: 'Display this help message' }
        ]
    },
    {
        content: 'For more information please visit https://parasite.sh'
    }
]

const usage = commandLineUsage(sections);

const { Signale } = require('signale');

const options = {
  types: {
    globe: {
        badge: "🌐",
        label: "Download",
        color: 'yellow',
        logLevel: 'info'
    }
  }
};

const signale = new Signale(options);

const argv = require('minimist')(process.argv.slice(2));

const version = '0.1.8';

if(argv['_'].includes('version')) {
    signale.log(chalk.red("Parsite Version:", version));
    process.exit(0);
}

clear();

signale.log(chalk.magentaBright(figlet.textSync('Parsite', { horizontalLayout: 'full', font: 'ANSI Shadow' })));
signale.log(chalk.magenta("Loophole Labs Inc."));

request(updateOptions).then(function(data) {
    if(data.latestVersion !== version) {
        signale.info("A new update for Parasite is available: " + data.latestVersion);
        signale.info("You are currently on version: " + version);

        const platform = os.platform();
        let operatingSystem;
        if(platform === 'darwin') {
            operatingSystem = 'macos';
        } else if (platform === 'linux') {
            operatingSystem = 'linux';
        } else if (platform === 'win32') {
            operatingSystem = 'windows';
        } else {
            signale.warn("An update may not be available for " + platform + " operating systems.");
            operatingSystem = platform;
        }

        const arch = os.arch();
        if(arch !== 'x64') {
            signale.error("An update may not be available for " + arch + " architectures.");
        }

        const url = 'https://dl.loopholelabs.io/releases/parasite/' + operatingSystem + "/" + data.latestVersion + "/" + arch + "/parasite.zip";

        signale.globe(url);
        signale.log("Press any key to continue...");
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', function() {
            return start(true);
        });
    } else {
        return start(false);
    }
});

function start(updateAvailable) {
    if(updateAvailable) {
        clear();
        signale.log(chalk.magentaBright(figlet.textSync('Parasite', { horizontalLayout: 'full', font: 'ANSI Shadow' })));
        signale.log(chalk.magenta("Loophole Labs Inc."));
    }

    if(argv['_'].includes('help')) {
        signale.log(chalk.red(usage));
        process.exit(0);
    }

    let spinner = ora('Starting Parasite\n').start();

    const proxyPort = argv['_'][0] || 8080;
    const forwardPort = argv['_'][1] || 3000;

    const proxyHost = argv['listen'] || argv['l'] || 'localhost';
    const forwardHost = argv['forward'] || argv['f'] || 'localhost'
    const ssl = argv['ssl'] || false;
    let logLevel;

    if(argv['v'] || argv['verbose']) {
        logLevel = 2;
    } else if (argv['s'] || argv['silent']) {
        logLevel = 0;
    } else {
        logLevel = 1;
    }

    const forwardProtocol = ssl ? 'https://' : 'http://';
    const proxyURI = forwardProtocol + forwardHost + ':' + forwardPort;
    spinner.stop();

    const parasite = new Parasite({
        'proxyURI': proxyURI,
        'host': proxyHost,
        'port': proxyPort,
        'logLevel': logLevel
    });
}
