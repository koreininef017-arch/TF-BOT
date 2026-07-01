/**
 * تحسينات الأداء للبوت
 * يتم تحميله في بداية التشغيل لضبط النظام
 */

// تحسين garbage collection
if (global.gc) {
    setInterval(() => {
        global.gc();
    }, 60000); // كل دقيقة
}

// تحسين memory usage
process.on('warning', (warning) => {
    if (warning.name === 'MaxListenersExceededWarning') {
        // تجاهل تحذيرات MaxListeners المتوقعة
        return;
    }
    console.warn('تحذير النظام:', warning.name, warning.message);
});

// تحسين performance للعمليات async
process.env.UV_THREADPOOL_SIZE = 128;

// تفعيل تحسينات Node.js (إزالة --optimize-for-size لأنها غير مدعومة)
// process.env.NODE_OPTIONS سيتم تعيينها في start.js

// Cache optimization
const originalRequire = require;
const moduleCache = new Map();

function optimizedRequire(id) {
    if (moduleCache.has(id)) {
        return moduleCache.get(id);
    }
    
    const module = originalRequire(id);
    
    // تخزين مؤقت للوحدات الثابتة فقط
    if (id.includes('node_modules') || id.startsWith('./utils/') || id.startsWith('./haykala/')) {
        moduleCache.set(id, module);
    }
    
    return module;
}

// معالجة أخطاء الشبكة
process.on('uncaughtException', (error) => {
    // تجاهل أخطاء الشبكة المتوقعة
    if (error.code === 'ECONNRESET' || 
        error.code === 'EPIPE' || 
        error.code === 'ENOTFOUND' ||
        error.message.includes('Bad MAC')) {
        return;
    }
    
    console.error('خطأ غير محتمل:', error);
    process.exit(1);
});

// معالجة الوعود المرفوضة
process.on('unhandledRejection', (reason, promise) => {
    // تجاهل أخطاء الاتصال المتوقعة
    if (reason?.message?.includes('Bad MAC') ||
        reason?.code === 'ECONNRESET' ||
        reason?.code === 'ENOTFOUND') {
        return;
    }
    
    console.error('وعد مرفوض:', reason);
});

// تحسين timers
const originalSetInterval = setInterval;
const originalSetTimeout = setTimeout;
const activeTimers = new Set();

global.setInterval = function(fn, delay, ...args) {
    const id = originalSetInterval(fn, delay, ...args);
    activeTimers.add(id);
    return id;
};

global.setTimeout = function(fn, delay, ...args) {
    const id = originalSetTimeout(fn, delay, ...args);
    activeTimers.add(id);
    return id;
};

// تنظيف timers عند الإغلاق
process.on('SIGINT', () => {
    activeTimers.forEach(id => {
        clearInterval(id);
        clearTimeout(id);
    });
    activeTimers.clear();
});

module.exports = {
    optimizedRequire,
    cleanup: () => {
        moduleCache.clear();
        activeTimers.forEach(id => {
            clearInterval(id);
            clearTimeout(id);
        });
        activeTimers.clear();
    }
};
