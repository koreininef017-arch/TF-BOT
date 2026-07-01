const { spawn } = require('child_process');
const chalk = require('chalk');

class StabilityTester {
    constructor() {
        this.tests = [];
        this.isRunning = false;
    }

    async runStabilityTest(duration = 60000) { // اختبار لمدة دقيقة
        console.log(chalk.bold.blue('🔧 بدء اختبار الاستقرار...'));
        console.log(chalk.gray(`⏱️ المدة: ${duration/1000} ثانية\n`));

        this.isRunning = true;
        const startTime = Date.now();
        let botProcess = null;
        let isReady = false;
        let messagesSent = 0;
        let responses = 0;
        let errors = 0;

        try {
            // بدء البوت
            console.log(chalk.cyan('🚀 تشغيل البوت...'));
            botProcess = spawn('node', ['main.js', '--fast-start'], {
                stdio: 'pipe',
                cwd: process.cwd()
            });

            let output = '';
            
            // مراقبة الإخراج
            botProcess.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;

                // فحص جاهزية البوت
                if (text.includes('BOT IS NOW READY') && !isReady) {
                    isReady = true;
                    const readyTime = Date.now() - startTime;
                    console.log(chalk.green(`✅ البوت جاهز في ${(readyTime/1000).toFixed(1)}s`));
                    
                    // بدء اختبار الرسائل
                    this.startMessageTest(botProcess);
                }

                // عد الردود
                if (text.includes('✅') || text.includes('تم')) {
                    responses++;
                }
            });

            // مراقبة الأخطاء
            botProcess.stderr.on('data', (data) => {
                const errorText = data.toString();
                
                // تجاهل الأخطاء الشائعة
                if (!errorText.includes('Bad MAC') && 
                    !errorText.includes('Warning') &&
                    !errorText.includes('DeprecationWarning')) {
                    errors++;
                    console.log(chalk.red(`❌ خطأ: ${errorText.trim()}`));
                }
            });

            // انتظار انتهاء المدة أو توقف البوت
            await Promise.race([
                this.waitForDuration(duration),
                this.waitForProcessExit(botProcess)
            ]);

        } catch (error) {
            console.error(chalk.red('❌ خطأ في الاختبار:', error.message));
            errors++;
        } finally {
            // إنهاء البوت
            if (botProcess && !botProcess.killed) {
                botProcess.kill('SIGTERM');
                
                // انتظار الإنهاء أو فرض الإنهاء
                setTimeout(() => {
                    if (!botProcess.killed) {
                        botProcess.kill('SIGKILL');
                    }
                }, 5000);
            }

            this.isRunning = false;
        }

        // تقرير النتائج
        this.generateStabilityReport({
            duration: Date.now() - startTime,
            isReady,
            messagesSent,
            responses,
            errors,
            targetDuration: duration
        });
    }

    startMessageTest(botProcess) {
        // محاكاة رسائل اختبار بسيطة
        const testMessages = [
            'ping',
            'help',
            'status'
        ];

        let messageIndex = 0;
        const sendInterval = setInterval(() => {
            if (!this.isRunning || botProcess.killed) {
                clearInterval(sendInterval);
                return;
            }

            const message = testMessages[messageIndex % testMessages.length];
            // هنا يمكن إضافة محاكاة إرسال رسائل
            messageIndex++;
            
            if (messageIndex > 10) { // إرسال 10 رسائل كحد أقصى
                clearInterval(sendInterval);
            }
        }, 3000); // كل 3 ثوان
    }

    waitForDuration(duration) {
        return new Promise(resolve => {
            setTimeout(resolve, duration);
        });
    }

    waitForProcessExit(process) {
        return new Promise((resolve, reject) => {
            process.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`البوت توقف بكود: ${code}`));
                }
            });
        });
    }

    generateStabilityReport(results) {
        const { duration, isReady, messagesSent, responses, errors, targetDuration } = results;
        
        console.log(chalk.bold.magenta('\n📋 تقرير الاستقرار'));
        console.log(chalk.magenta('═'.repeat(50)));

        // الجاهزية
        if (isReady) {
            console.log(chalk.green('✅ البوت وصل لحالة الجاهزية'));
        } else {
            console.log(chalk.red('❌ البوت لم يصل لحالة الجاهزية'));
        }

        // المدة
        const actualDuration = (duration / 1000).toFixed(1);
        const expectedDuration = (targetDuration / 1000).toFixed(1);
        
        if (duration >= targetDuration * 0.9) { // تشغل لأكثر من 90% من المدة المطلوبة
            console.log(chalk.green(`⏱️ تشغل لمدة: ${actualDuration}s / ${expectedDuration}s`));
        } else {
            console.log(chalk.red(`⏱️ توقف مبكراً: ${actualDuration}s / ${expectedDuration}s`));
        }

        // الأخطاء
        if (errors === 0) {
            console.log(chalk.green('✅ لا توجد أخطاء'));
        } else if (errors <= 2) {
            console.log(chalk.yellow(`⚠️ ${errors} خطأ بسيط`));
        } else {
            console.log(chalk.red(`❌ ${errors} خطأ (كثير)`));
        }

        // التقييم العام
        console.log(chalk.bold('\n🎯 التقييم العام:'));
        
        let score = 0;
        if (isReady) score += 40;
        if (duration >= targetDuration * 0.9) score += 30;
        if (errors === 0) score += 20;
        else if (errors <= 2) score += 10;
        if (responses > 0) score += 10;

        if (score >= 90) {
            console.log(chalk.green(`🥇 ممتاز (${score}/100) - البوت مستقر تماماً`));
        } else if (score >= 70) {
            console.log(chalk.yellow(`🥈 جيد (${score}/100) - استقرار مقبول`));
        } else if (score >= 50) {
            console.log(chalk.orange(`🥉 متوسط (${score}/100) - يحتاج تحسين`));
        } else {
            console.log(chalk.red(`❌ ضعيف (${score}/100) - يحتاج إصلاح`));
        }

        console.log(chalk.magenta('═'.repeat(50)));
    }
}

// تشغيل الاختبار إذا تم استدعاء الملف مباشرة
async function main() {
    const tester = new StabilityTester();
    
    const duration = process.argv.includes('--quick') ? 30000 : 60000; // 30s أو 60s
    
    try {
        await tester.runStabilityTest(duration);
    } catch (error) {
        console.error(chalk.red('❌ فشل اختبار الاستقرار:', error.message));
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = StabilityTester;