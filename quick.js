// تشغيل فوري مضمون 100%
const { spawn } = require('child_process');
const fs = require('fs');

console.clear();
console.log('🚀 تشغيل فوري...\n');

// تنظيف سريع
try {
    if (fs.existsSync('plugins/.pluginsLoaded')) fs.unlinkSync('plugins/.pluginsLoaded');
    if (fs.existsSync('IMS/.imsLoaded')) fs.unlinkSync('IMS/.imsLoaded');
} catch (e) {}

// تشغيل مباشر
const bot = spawn('node', ['main.js'], { stdio: 'inherit' });

// إيقاف مع Ctrl+C
process.on('SIGINT', () => {
    console.log('\n⚠️ إيقاف البوت...');
    bot.kill();
    process.exit(0);
});

bot.on('error', () => process.exit(1));
