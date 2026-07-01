// Fang.js
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const path = require('path');

// رابط دعوة المجموعة - ضع الرابط هنا
const INVITE_LINK = "https://chat.whatsapp.com/XXXXXXXXXXX";

// استخراج كود الدعوة من الرابط
const inviteCode = INVITE_LINK.split('https://chat.whatsapp.com/')[1];

if (!inviteCode) {
    console.log('رابط الدعوة غير صحيح');
    process.exit(1);
}

const baseSessionPath = path.join(__dirname, 'Fang_Yuan');

async function joinGroupWithClient(sock, sessionName) {
    try {
        console.log(`[${sessionName}] جاري الانضمام إلى المجموعة...`);
        const response = await sock.groupAcceptInvite(inviteCode);
        console.log(`[${sessionName}] تم الانضمام بنجاح: ${response}`);
        return true;
    } catch (error) {
        console.log(`[${sessionName}] فشل الانضمام: ${error}`);
        return false;
    }
}

async function processSession(sessionName, index, total) {
    const sessionPath = path.join(baseSessionPath, sessionName);

    try {
        console.log(`[${index+1}/${total}] جاري تهيئة الجلسة: ${sessionName}`);

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['MacOs', 'Chrome', '1.0.0'],
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true
        });

        sock.ev.on('creds.update', saveCreds);

        // الانتظار حتى الاتصال مع مهلة
        await Promise.race([
            new Promise((resolve) => {
                sock.ev.on('connection.update', ({ connection }) => {
                    if (connection === 'open') {
                        resolve();
                    }
                });
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('انتهت مهلة الاتصال')), 30000))
        ]);

        await joinGroupWithClient(sock, sessionName);

        // إغلاق الاتصال
        await sock.logout();

    } catch (error) {
        console.log(`[${sessionName}] خطأ: ${error}`);
    }
}

async function main() {
    if (!fs.existsSync(baseSessionPath)) {
        console.log('لم يتم العثور على جلسات. الرجاء تشغيل sea.js أولاً.');
        return;
    }

    const sessions = await fs.readdir(baseSessionPath);
    console.log(`تم العثور على ${sessions.length} جلسة.`);

    for (let i = 0; i < sessions.length; i++) {
        await processSession(sessions[i], i, sessions.length);

        // إذا لم تكن الجلسة الأخيرة، أضف تأخير
        if (i < sessions.length - 1) {
            const delay = Math.floor(Math.random() * 20000) + 10000; // 10-30 ثانية
            console.log(`انتظار ${delay/1000} ثانية قبل الجلسة التالية...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    console.log('تم معالجة جميع الجلسات.');
}

main().catch(console.error);