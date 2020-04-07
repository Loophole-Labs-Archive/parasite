const { exec } = require('pkg');
const signale = require('signale');
const argv = require('minimist')(process.argv.slice(2));

async function start() {
    const target = argv['target'] || argv['t'] || 'node12';
    const arch  = argv['architecture'] || argv['a'] || 'x64';
    const output = argv['o'] || argv['output'] || 'parasite';
    const name = argv['name'] || argv['n'];

    signale.start("Compiling " + name + " for " + target );

    try {
        await exec([ '.', '--targets', target + '-' + arch, '--output', output ]);
    } catch(error) {
        signale.error(error);
        process.exit(1);
    } finally {
        signale.success("Compilation successful");
    }
}

start();