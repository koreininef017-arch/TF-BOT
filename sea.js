// sea.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

// دالة للسؤال من المستخدم
const question = (text) => new Promise((resolve) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(text, (answer) => {
        rl.close();
        resolve(answer);
    });
});

// إنشاء logger بديل بدون مشاكل child
const createSimpleLogger = () => {
    return {
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        fatal: () => {},
        child: () => createSimpleLogger() // إضافة دالة child لتجنب الأخطاء
    };
};

async function startSession() {
    let sock = null;
    
    try {
        console.clear();
        console.log('╔═══════════════════════════════════════╗');
        console.log('║             TF - SEA.JS               ║');
        console.log('║        إنشاء جلسة جديدة بوت          ║');
        console.log('╚═══════════════════════════════════════╝\n');

        // إنشاء مجلد Fang_Yuan إذا لم يكن موجوداً
        const baseSessionPath = path.join(__dirname, 'Fang_Yuan');
        await fs.ensureDir(baseSessionPath);
        console.log('✓ تم إنشاء مجلد الجلسات');

        // البحث عن آخر رقم جلسة وإنشاء الرقم التالي
        const sessions = await fs.readdir(baseSessionPath);
        let sessionNumber = 1;
        
        // البحث عن آخر رقم مستخدم
        for (const session of sessions) {
            if (session.startsWith('TF_')) {
                const num = parseInt(session.replace('TF_', ''));
                if (num >= sessionNumber) {
                    sessionNumber = num + 1;
                }
            }
        }

        const sessionName = `TF_${sessionNumber}`;
        const sessionPath = path.join(baseSessionPath, sessionName);
        await fs.ensureDir(sessionPath);
        console.log(`✓ إنشاء جلسة جديدة: ${sessionName}`);

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        // إعدادات البوت مع logger بديل
        const socketOptions = {
            auth: state,
            printQRInTerminal: false,
            browser: ['MacOs', 'Chrome', '1.0.0'],
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true,
            logger: createSimpleLogger() // استخدام logger البديل
        };

        sock = makeWASocket(socketOptions);
        sock.ev.on('creds.update', saveCreds);

        // طلب رقم الهاتف إذا لم يكن مسجلاً
        if (!sock.authState.creds.registered) {
            console.log('\n📱 الرجاء إدخال رقم الهاتف للحصول على كود الاقتران');
            console.log('   (مع رمز الدولة، مثال: +1234567890)');
            console.log('   (اكتب "#" للإلغاء)\n');

            let phoneNumber = await question('➤ رقم الهاتف: ');
            
            if (phoneNumber.trim() === '#') {
                console.log('تم الإلغاء');
                process.exit(0);
            }

            phoneNumber = phoneNumber.replace(/[^0-9+]/g, '');
            
            if (!phoneNumber.match(/^\+[0-9]{10,15}$/)) {
                console.log('\n❌ رقم الهاتف غير صحيح!');
                console.log('يجب أن يبدأ بـ + ويحتوي على 10-15 رقم');
                process.exit(1);
            }

            try {
                console.log('\n⏳ جاري طلب كود الاقتران...');
                const code = await sock.requestPairingCode(phoneNumber);
                
                console.log('\n╔═══════════════════════════════════════╗');
                console.log('║            معلومات الاقتران           ║');
                console.log('╠═══════════════════════════════════════╣');
                console.log(`║ 📞 الرقم: ${phoneNumber}`);
                console.log(`║ 🔑 الكود: ${code}`);
                console.log('╚═══════════════════════════════════════╝\n');
                
                console.log('📋 خطوات الربط:');
                console.log('1. افتح الواتساب على هاتفك الرئيسي');
                console.log('2. اذهب إلى الإعدادات → الأجهزة المرتبطة');
                console.log('3. اختر "ربط جهاز" → "استخدم كود الاقتران"');
                console.log('4. أدخل الكود أعلاه');
                console.log('\n⏳ في انتظار الربط... (اضغط Ctrl+C عند الانتهاء)');

            } catch (error) {
                console.log('\n❌ فشل في الحصول على كود الاقتران:', error.message);
                process.exit(1);
            }
        } else {
            console.log('✓ الجلسة موجودة مسبقاً');
            console.log('✓ جاري الاتصال...');
        }

        // معالجة أحداث الاتصال
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                console.log('\n✅ تم الاتصال بنجاح!');
                console.log(`✅ الجلسة ${sessionName} جاهزة للاستخدام`);
                console.log('\n⏹️  اضغط Ctrl+C لإيقاف التشغيل');
            }
            
            if (connection === 'close') {
                const error = lastDisconnect?.error;
                const isLoggedOut = error?.output?.statusCode === DisconnectReason.loggedOut;
                
                if (!isLoggedOut) {
                    console.log('\n🔁 تم قطع الاتصال، جاري إعادة المحاولة...');
                    setTimeout(startSession, 2000);
                } else {
                    console.log('\n❌ تم تسجيل الخروج، الجلسة لم تعد صالحة');
                    process.exit(1);
                }
            }
        });

        // البقاء في الانتظار
        await new Promise(() => {});

    } catch (error) {
        console.log('\n❌ خطأ:', error.message);
        
        if (sock) {
            try {
                await sock.logout();
            } catch (e) {
                // تجاهل أخطاء logout
            }
        }
        
        setTimeout(startSession, 3000);
    }
}

// معالجة الإشارات
process.on('SIGINT', () => {
    console.log('\n\n🛑 تم إيقاف التشغيل');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 تم إيقاف التشغيل');
    process.exit(0);
});

// معالجة الأخطاء - تجاهل جميع أخطاء baileys
process.on('uncaughtException', (error) => {
    const ignoreErrors = [
        'Invalid buffer',
        'Bad MAC',
        'Connection closed',
        'logger.child',
        'child is not a function'
    ];
    
    if (ignoreErrors.some(msg => error.message.includes(msg))) {
        return;
    }
    console.log('❌ خطأ غير متوقع:', error.message);
});

process.on('unhandledRejection', (reason) => {
    const ignoreErrors = [
        'Invalid buffer',
        'Bad MAC',
        'Connection closed',
        'logger.child',
        'child is not a function'
    ];
    
    const errorMessage = reason?.message || String(reason);
    if (ignoreErrors.some(msg => errorMessage.includes(msg))) {
        return;
    }
    console.log('❌ وعد مرفوض:', errorMessage);
});

// بدء التشغيل
console.log('🚀 بدء تشغيل sea.js...');
startSession().catch(console.error);