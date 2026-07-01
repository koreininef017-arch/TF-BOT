// تثبيت وتجهيز سريع
const fs = require('fs');
const { execSync } = require('child_process');

console.clear();
console.log('🔧 إعداد سريع للبوت...\n');

try {
    // فحص Node.js
    const nodeVersion = process.version;
    console.log(`✅ Node.js ${nodeVersion}`);
    
    // فحص الملفات الأساسية
    const requiredFiles = ['main.js', 'config.js'];
    requiredFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file}`);
        } else {
            console.log(`❌ ${file} مفقود!`);
        }
    });
    
    // إنشاء المجلدات
    const dirs = ['data', 'lotm_session', 'plugins', 'IMS', 'handlers'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ تم إنشاء مجلد ${dir}`);
        } else {
            console.log(`✅ مجلد ${dir} موجود`);
        }
    });
    
    // فحص node_modules
    if (!fs.existsSync('node_modules')) {
        console.log('\n📦 تثبيت المكاتب المطلوبة...');
        try {
            execSync('npm install', { stdio: 'inherit' });
            console.log('✅ تم تثبيت المكاتب');
        } catch (e) {
            console.log('⚠️ خطأ في تثبيت المكاتب، ولكن يمكن المتابعة');
        }
    } else {
        console.log('✅ المكاتب المطلوبة مثبتة');
    }
    
    console.log('\n🎉 الإعداد مكتمل!');
    console.log('\n🚀 للتشغيل: node .');
    
} catch (error) {
    console.log(`❌ خطأ في الإعداد: ${error.message}`);
    process.exit(1);
}
