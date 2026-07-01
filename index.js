const { fork } = require('child_process');
const { join } = require('path');
const fs = require('fs-extra');
const logger = require('./utils/console');

const maxRetries = 10; // زيادة عدد المحاولات
const retryDelay = 2000; // تقليل وقت إعادة المحاولة إلى 2 ثانية
const forceRestart = true; // إجبار إعادة التشغيل

let isRunning = false;
let retryCount = 0;

function handleConnection(retry = 0) {
    const currentPath = process.cwd();
    const connectionFolder = join(currentPath, 'lotm_session');

    if (!fs.existsSync(connectionFolder)) {
        logger.warn('+-+️ ملف الاتصال غير موجود، سيتم المتابعة على أي حال...');
    }

    if (isRunning) return;
    isRunning = true;
    logger.info('+-+ يـتـم الــتــهــيــئــة...');

    const child = fork(join(__dirname, 'main.js'), [], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        env: {
            ...process.env,
            CONNECTION_FOLDER: connectionFolder
        }
    });

    child.on('message', (data) => {
        if (data === 'ready') {
            retryCount = 0;
            logger.success('تــم الــتــشــغــيــل +-+!');
        } else if (data === 'reset') {
            logger.warn('🔄 إعــادة الــتــشــغــيــل +-+...');
            child.kill();
            setTimeout(() => handleConnection(0), 1000); // إعادة تشغيل أسرع
        } else if (data === 'uptime') {
            child.send(process.uptime());
        }
    });

    child.on('exit', async (code) => {
        isRunning = false;

        if (code === 0) {
            logger.info('+-+ تــم الـإيــقــاف.');
            return;
        }

        if (code === 429) {
            logger.warn('⚠️ تم تجاوز معدل الطلبات، الانتظار 5 ثواني...');
            await delay(5000); // تقليل وقت الانتظار
            return handleConnection(retry);
        }

        if (retry < maxRetries) {
            retry++;
            logger.warn(`⚠️ إعادة التشغيل (${retry}/${maxRetries}) بعد ${retryDelay / 1000} ثواني...`);
            await delay(retryDelay);
            handleConnection(retry);
        } else if (forceRestart) {
            logger.warn('⚠️ تجاوز الحد الأقصى. إعادة تعيين العداد...');
            retryCount = 0; // إعادة تعيين العداد
            setTimeout(() => handleConnection(0), retryDelay * 2);
        } else {
            logger.error('❌ تجاوز الحد الأقصى لمحاولات التشغيل. سيتم الإيقاف.');
            process.exit(1);
        }
    });

    child.on('error', (err) => {
        isRunning = false;
        logger.error(`❌ خطأ في العملية الفرعية: ${err}`);
        if (retry < maxRetries) {
            retry++;
            setTimeout(() => handleConnection(retry), retryDelay);
        }
    });

    
    setTimeout(() => {
        if (!child.connected) {
            logger.error('❌ فشل الاتصال بالبوت خلال المهلة المحددة (5 ثواني)');
            child.kill();
            handleConnection(retry + 1);
        }
    }, 5000); // تقليل مهلة انتظار الاتصال
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


process.on('SIGINT', () => process.exit());

process.on('uncaughtException', (err) => {
    if (err.code === 'ECONNRESET' || err.code === 'rate-overlimit') {
        logger.warn('⚠️ تم تجاهل خطأ معروف.');
        return;
    }
    logger.error('❌ خطأ غير معالج:', err);
});

process.on('unhandledRejection', (reason) => {
    if (reason?.code === 429) {
        logger.warn('⚠️ تجاوز معدل الطلبات، جاري الانتظار...');
        return;
    }
    logger.error('❌ وعد غير معالج:', reason);
});

// تثبيت معالج Bad MAC لتقليل أخطاء التشفير وإعادة تهيئة الجلسة عند الحاجة
try {
  require('./utils/badmac-fix');
} catch {}

logger.info('+-+ بدء التشغيل...');
handleConnection();
