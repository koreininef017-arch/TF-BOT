const { fork } = require('child_process');
const path = require('path');

function run() {
    const bot = fork(path.join(__dirname, 'main.js'));
    bot.on('exit', run);
}
run();
