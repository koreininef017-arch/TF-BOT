// main.js
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const pino = require('pino');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const { exec } = require('child_process');
const logger = require('./utils/console');
const smartCleaner = require('./utils/smartCleaner');

let startTime = Math.floor(Date.now() / 1000);
let botReady = false;
let messageQueue = [];
const processedIds = new Set();

const question = text => new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(text, answer => { rl.close(); resolve(answer); });
});

// ✨ شعار TF
const asciiArt = `
${chalk.red.bold('░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░')}
${chalk.hex('#FF0000')('████████╗███████╗')}
${chalk.hex('#FF1a1a')('╚══██╔══╝██╔════╝')}
${chalk.hex('#FF3333')('   ██║   █████╗  ')}
${chalk.hex('#FF4d4d')('   ██║   ██╔══╝  ')}
${chalk.hex('#FF6666')('   ██║   ██║     ')}
${chalk.hex('#FF8080')('   ╚═╝   ╚═╝     ')}
${chalk.red.bold('░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░')}
${chalk.dim.red('           [ SYSTEM INITIALIZING ]')}
`;

async function startBot() {
    try {
        console.clear();
        console.log(asciiArt);
        console.log(chalk.hex('#FFD700').bold('\n𝑻𝑯𝑬 𝑭𝑶𝑶𝑳\n'));

        const sessionDir = path.join(__dirname, 'lotm_session');
        await fs.ensureDir(sessionDir);

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            logger: pino({ level: 'silent' }),
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true
        });

        sock.ev.on('creds.update', saveCreds);

        // أول تشغيل (طلب كود الربط)
        if (!sock.authState.creds.registered) {
            console.log(chalk.bold('\n[ SETUP ] Enter your phone number:'));
            let phoneNumber = await question(chalk.bgHex('#FFD700').black(' PHONE : '));
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`Pairing Code: ${code}`);
        }

        // تحديث الاتصال
        sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
            if (connection === 'open') {
                logger.success(`CONNECTED as: ${sock.user.id}`);
                setTimeout(() => {
                    botReady = true;
                    logger.success('BOT READY ✅');
                    processQueuedMessages(sock);
                }, 3000);
                smartCleaner.startAutoCleaning();
                listenToConsole(sock);
            }

            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;
                const isLoggedOut = reason === DisconnectReason.loggedOut;

                // ✅ تجاهل Bad MAC مع إعادة الاتصال
                if (lastDisconnect?.error?.message?.includes('Bad MAC')) {
                    logger.warn('Bad MAC ignored, reconnecting...');
                    setTimeout(startBot, 2000);
                    return;
                }

                logger.warn(`Disconnected: ${lastDisconnect?.error?.message || 'Unknown reason'}`);
                if (isLoggedOut) {
                    logger.error('You have been logged out.');
                    process.exit(1);
                } else {
                    setTimeout(startBot, 2000);
                }
            }
        });

        // معالجة الرسائل
        sock.ev.on('messages.upsert', async (m) => {
            try {
                if (m.type !== 'notify') return;
                const msg = m.messages?.[0];
                if (!msg) return;
                if (msg.key.remoteJid === 'status@broadcast') return;

                // ✅ منع Bad MAC والرسائل الغريبة
                if (!msg.message) return;
                if (msg.messageStubType) return;

                const mid = msg.key?.id;
                if (mid) {
                    if (processedIds.has(mid)) return;
                    processedIds.add(mid);
                    if (processedIds.size > 5000) processedIds.clear();
                }

                const msgTime = Number(msg.messageTimestamp || 0);
                if (msgTime && msgTime < (startTime - 5)) return;

                if (!botReady) {
                    messageQueue.push(m);
                    return;
                }

                const { handleMessages } = require('./handlers/handler');
                await handleMessages(sock, m);
            } catch (err) {
                if (err?.message?.includes('Bad MAC') || err?.message?.includes('decrypt')) {
                    // ✅ تجاهل Bad MAC تمامًا
                    return;
                }
                console.log('⚠️ Message error:', err?.message || err);
            }
        });

    } catch (err) {
        logger.error('Startup error:', err.message || err);
        setTimeout(startBot, 2000);
    }
}

// معالجة الرسائل المؤجلة
async function processQueuedMessages(sock) {
    if (messageQueue.length === 0) return;
    logger.info(`Processing ${messageQueue.length} queued messages...`);
    const { handleMessages } = require('./handlers/handler');
    for (const m of messageQueue) {
        try {
            await handleMessages(sock, m);
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
            console.log('⚠️ Queued message error:', err?.message || err);
        }
    }
    messageQueue = [];
    logger.success('Finished processing queued messages');
}

// أوامر من الكونسول
function listenToConsole(sock) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on('line', (input) => {
        if (input.trim().toLowerCase() === 'exit') {
            console.log('⚠️ إيقاف البوت...');
            process.exit(0);
        } else {
            console.log('[ CMD ] Unknown command. Type "exit" to stop.');
        }
    });
}

// Errors
process.on('uncaughtException', (err) => {
    console.log('⚠️ Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason, promise) => {
    console.log('⚠️ Unhandled Rejection:', reason);
});

console.log(chalk.bold('\n[ INFO ] Starting...'));
startBot();
