const { spawn } = require('child_process');

function launch() {
    console.log('🚀 Starting TF Bot...');
    const bot = spawn('node', ['main.js'], {
        stdio: 'inherit',
        env: process.env
    });

    bot.on('close', () => {
        console.log('🔄 Restarting...');
        setTimeout(launch, 3000);
    });
}

launch();
