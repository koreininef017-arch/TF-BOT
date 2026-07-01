const fs = require('fs-extra');
const { spawn } = require('child_process');

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(colors[color] + message + colors.reset);
}

async function prepare() {
    log('blue', '🚀 TF BOT - التحضير السريع');
    if (!fs.existsSync('main.js')) {
        log('red', '❌ ملف main.js غير موجود!');
        process.exit(1);
    }
    const cleanFiles = ['plugins/.pluginsLoaded', 'IMS/.imsLoaded'];
    cleanFiles.forEach(file => {
        if (fs.existsSync(file)) fs.removeSync(file);
    });
    ['data', 'lotm_session', 'plugins', 'IMS'].forEach(dir => fs.ensureDirSync(dir));
    log('green', '✅ البيئة جاهزة.');
}

function start() {
    prepare().then(() => {
        const bot = spawn('node', ['main.js'], {
            stdio: 'inherit',
            env: { ...process.env, UV_THREADPOOL_SIZE: '16' }
        });

        bot.on('close', (code) => {
            log('yellow', '⚠️ البوت توقف (كود: ' + code + ')');
            log('blue', '🔄 إعادة التشغيل في 3 ثوان...');
            setTimeout(start, 3000);
        });

        bot.on('error', (err) => {
            log('red', '❌ خطأ في التشغيل: ' + err.message);
        });
    });
}

process.on('uncaughtException', (err) => {
    if (err.message.includes('ECONNRESET') || err.message.includes('Bad MAC')) return;
    console.error('Fatal Exception:', err.message);
});

start();
