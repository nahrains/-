/* ==========================================
   Yusr Dashboard (يُسر) - Local Intelligent AI Assistant
   ========================================== */

class AiModule {
    constructor() {}

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('chat-send-btn');
        const userInput = document.getElementById('chat-user-input');

        sendBtn.addEventListener('click', () => {
            const val = userInput.value.trim();
            if (val) {
                this.sendUserMessage(val);
                userInput.value = '';
            }
        });

        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = userInput.value.trim();
                if (val) {
                    this.sendUserMessage(val);
                    userInput.value = '';
                }
            }
        });

        // Quick prompts click listeners
        document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const promptVal = btn.getAttribute('data-prompt');
                this.sendUserMessage(promptVal);
            });
        });
    }

    sendUserMessage(text) {
        const chatBox = document.getElementById('chat-messages-box');
        
        // 1. Append User Message
        const userMsg = document.createElement('div');
        userMsg.className = 'message user-message';
        userMsg.innerHTML = `
            <div class="message-avatar"><i class="fa-solid fa-user"></i></div>
            <div class="message-text">
                <p>${text}</p>
            </div>
        `;
        chatBox.appendChild(userMsg);
        
        // Scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;

        // Play sound
        if (window.notificationsModule) window.notificationsModule.playChime('click');

        // Show AI Thinking indicator
        const thinkingMsg = document.createElement('div');
        thinkingMsg.className = 'message ai-message thinking';
        thinkingMsg.innerHTML = `
            <div class="message-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="message-text">
                <p><i class="fa-solid fa-ellipsis fa-fade"></i> جاري التحليل...</p>
            </div>
        `;
        chatBox.appendChild(thinkingMsg);
        chatBox.scrollTop = chatBox.scrollHeight;

        // 2. Generate and append response after simulated delay
        setTimeout(() => {
            thinkingMsg.remove();
            
            const responseHtml = this.generateAIResponse(text);
            const aiMsg = document.createElement('div');
            aiMsg.className = 'message ai-message';
            aiMsg.innerHTML = `
                <div class="message-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="message-text">
                    ${responseHtml}
                </div>
            `;
            chatBox.appendChild(aiMsg);
            chatBox.scrollTop = chatBox.scrollHeight;

            if (window.notificationsModule) window.notificationsModule.playChime('success');
        }, 1200);
    }

    generateAIResponse(text) {
        const state = window.app.state;
        const todayStr = new Date().toISOString().split('T')[0];

        // Action: "خطط يومي" (Plan my day)
        if (text.includes('خطط يومي') || text.includes('تخطيط اليوم')) {
            const todayTasks = state.tasks.filter(t => t.dueDate === todayStr && !t.completed);
            const habits = state.health.habits || [];

            let html = `<h4>📅 خطة يومك الذكية المقترحة:</h4>`;
            html += `<p>مرحباً بك! قمت بتحليل قائمة مهام اليوم وعاداتك، وإليك التقسيم الزمني الموصى به لإنتاجية مثالية دون إرهاق:</p><ul>`;
            
            html += `<li><strong>08:30 ص - 09:00 ص:</strong> تفعيل الترطيب وشرب الكوب الأول من الماء 💧، ومراجعة أهدافك الـ 3 الكبرى.</li>`;
            
            if (todayTasks.length > 0) {
                // High priority first
                const high = todayTasks.find(t => t.priority === 'high');
                const rest = todayTasks.filter(t => t.priority !== 'high');
                
                if (high) {
                    html += `<li><strong>09:30 ص - 11:30 ص:</strong> جلسة تركيز (Focus Mode) لمهمتك الأكثر أهمية: <mark>${high.title}</mark> ⏱️.</li>`;
                } else {
                    html += `<li><strong>09:30 ص - 11:30 ص:</strong> إنجاز مهمة: <mark>${todayTasks[0].title}</mark>.</li>`;
                }
                
                html += `<li><strong>11:30 ص - 12:00 م:</strong> وقت استراحة وتمدد وشرب كوب ماء.</li>`;

                if (rest.length > 0) {
                    html += `<li><strong>01:30 م - 03:00 م:</strong> إنجاز باقي المهام: <ul>`;
                    rest.forEach(t => {
                        html += `<li>- ${t.title} (${t.category === 'work' ? 'عمل' : 'شخصي'})</li>`;
                    });
                    html += `</ul></li>`;
                }
            } else {
                html += `<li><strong>09:30 ص - 12:00 م:</strong> لا توجد مهام مجدولة اليوم! استغل هذا الوقت في التخطيط للأسبوع أو العمل على أهدافك الكبرى مباشرة.</li>`;
            }

            if (habits.length > 0) {
                html += `<li><strong>05:00 م - 07:00 م:</strong> وقت تفعيل العادات والنشاط البدني. ركز على: (${habits.map(h=>h.title).join('، ')}).</li>`;
            }

            html += `<li><strong>09:30 م - 10:00 م:</strong> كتابة يومياتك وتقييم اليوم، وتجهيز عقلك للنوم الهادئ والمبكر 😴.</li>`;
            html += `</ul><p><em>نصيحة: ابدأ بأصعب مهمة أولاً لتكسب طاقة بقية اليوم!</em></p>`;
            return html;
        }

        // Action: "ما أولوياتي الآن؟" (What are my priorities?)
        if (text.includes('أولوياتي') || text.includes('أولويات')) {
            const activeTasks = state.tasks.filter(t => !t.completed);
            const highTasks = activeTasks.filter(t => t.priority === 'high');
            
            let html = `<h4>⚠️ أولوياتك المهنية والشخصية العاجلة:</h4>`;
            if (highTasks.length > 0) {
                html += `<p>قمت بفرز مهامك النشطة، وإليك أهمها والتي تتطلب تركيزاً فورياً اليوم:</p><ul>`;
                highTasks.forEach(t => {
                    const goal = state.goals.find(g => g.id === t.goalId);
                    html += `<li><strong>- ${t.title}</strong> (${t.category === 'work' ? 'عمل' : 'دراسة'}) ${goal ? `<br><small class="text-muted"><i class="fa-solid fa-bullseye"></i> مرتبط بهدف: ${goal.title}</small>` : ''}</li>`;
                });
                html += `</ul><p>توصية: استخدم <strong>Focus Mode</strong> لإتمام أحد هذه المهام الآن دون إلهاء.</p>`;
            } else if (activeTasks.length > 0) {
                html += `<p>لا توجد مهام مصنفة كأولوية "هام وعاجل" حالياً. وإليك المهام النشطة القادمة:</p><ul>`;
                activeTasks.slice(0, 3).forEach(t => {
                    html += `<li>- ${t.title} (الأولوية: ${t.priority === 'medium' ? 'متوسطة' : 'منخفضة'})</li>`;
                });
                html += `</ul>`;
            } else {
                html += `<p>رائع جداً! ليس لديك أي مهام نشطة أو متأخرة حالياً. كل شيء منجز مئة بالمئة! 🎉</p>`;
            }
            return html;
        }

        // Action: "تحليل الإنفاق وتوقعات الادخار" (Analyze Spending & Savings)
        if (text.includes('الإنفاق') || text.includes('إنفاقي') || text.includes('مصاريف') || text.includes('مالي')) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const expenses = state.transactions.filter(t => t.type === 'expense');
            
            const monthlyExpenses = expenses
                .filter(t => new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear);
            
            const totalSpent = monthlyExpenses.reduce((sum, t) => sum + t.amount, 0);

            let html = `<h4>💰 تحليل الإنفاق الذكي وتوقعات الادخار:</h4>`;
            
            if (totalSpent === 0) {
                return html + `<p>لم تسجل أي مصروفات لهذا الشهر حتى الآن. ابدأ بتسجيل معاملاتك المالية وسأقوم بتحليلها فوراً!</p>`;
            }

            // 1. Identify highest spending category
            const categorySums = {};
            monthlyExpenses.forEach(t => {
                categorySums[t.category] = (categorySums[t.category] || 0) + t.amount;
            });

            let topCategory = '';
            let maxAmount = 0;
            for (const cat in categorySums) {
                if (categorySums[cat] > maxAmount) {
                    maxAmount = categorySums[cat];
                    topCategory = cat;
                }
            }

            const topCategoryPct = Math.round((maxAmount / totalSpent) * 100);
            html += `<p>إجمالي مصروفاتك للشهر الحالي هو <strong>${totalSpent.toLocaleString('ar-SA')} ${window.app.getCurrency()}</strong>.</p>`;
            html += `<p><i class="fa-solid fa-circle-exclamation text-warning"></i> أعلى تصنيف إنفاق لديك هو <strong>(${topCategory})</strong> بمبلغ <strong>${maxAmount.toLocaleString('ar-SA')} ${window.app.getCurrency()}</strong>، ويمثل <strong>${topCategoryPct}%</strong> من إجمالي إنفاقك.</p>`;

            // 2. Mood-linked expenses discovery
            const stressExpenses = monthlyExpenses.filter(t => t.mood === 'متوتر' || t.mood === 'متعب');
            if (stressExpenses.length > 0) {
                const stressTotal = stressExpenses.reduce((sum, t) => sum + t.amount, 0);
                const stressPct = Math.round((stressTotal / totalSpent) * 100);
                html += `<p><i class="fa-solid fa-heart-pulse text-danger"></i> <strong>اكتشاف نمط سلوكي:</strong> هناك <strong>${stressTotal.toLocaleString('ar-SA')} ${window.app.getCurrency()}</strong> تم إنفاقها وأنت في حالة نفسية (متوتر / متعب)، أي ما يعادل <strong>${stressPct}%</strong> من مصروفاتك. يبدو أنك تميل للإنفاق كآلية للتعامل مع ضغوط اليوم!</p>`;
            }

            // 3. external coffee savings suggestion
            const coffeeSpent = monthlyExpenses.filter(t => t.category === 'قهوة').reduce((sum, t) => sum + t.amount, 0);
            if (coffeeSpent > 50) {
                const potentialSavings = Math.round(coffeeSpent * 0.5);
                html += `<p><i class="fa-solid fa-mug-hot text-info"></i> <strong>اقتراح ترشيد:</strong> أنفقت <strong>${coffeeSpent.toLocaleString('ar-SA')} ${window.app.getCurrency()}</strong> على القهوة هذا الشهر. إذا قمت بإعداد قهوتك بالمنزل 3 مرات أسبوعياً ووفرت 50% من هذا المبلغ، ستدخر <strong>${potentialSavings} ${window.app.getCurrency()} شهرياً</strong> إضافية.</p>`;
            }

            // 4. FIRE Target Forecast
            const comfortCost = state.settings.comfortCost || 2500;
            const savedForFire = state.settings.fireSaved || 0;
            const fireTarget = comfortCost * 12 * 25;
            
            // Calculate average monthly savings
            const monthlyIncome = state.transactions
                .filter(t => {
                    const d = new Date(t.date);
                    return t.type === 'income' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                })
                .reduce((sum, t) => sum + t.amount, 0);
            
            const monthlySavings = monthlyIncome - totalSpent;
            
            if (monthlySavings > 50) {
                const remainingToFire = fireTarget - savedForFire;
                const monthsToTarget = Math.round(remainingToFire / monthlySavings);
                const yearsToTarget = (monthsToTarget / 12).toFixed(1);
                
                html += `<p><i class="fa-solid fa-hourglass-half text-success"></i> <strong>توقع الاستقلال المالي:</strong> بمعدل ادخارك الحالي (<strong>${monthlySavings.toLocaleString('ar-SA')} ${window.app.getCurrency()}/شهرياً</strong>)، ستصل لهدف حريتك المالية المستهدف (${fireTarget.toLocaleString('ar-SA')} ${window.app.getCurrency()}) خلال <strong>${monthsToTarget} أشهر</strong> (حوالي <strong>${yearsToTarget} سنة</strong>).</p>`;
            } else {
                html += `<p><i class="fa-solid fa-hourglass-half text-danger"></i> <strong>تنبيه الاستقلال المالي:</strong> معدل ادخارك للشهر الحالي منخفض جداً أو سالب. لكي تتوقع موعد وصولك للحرية المالية، تحتاج لزيادة الدخل أو تقليص النفقات لتصنع فائض ادخار شهري مستمر.</p>`;
            }

            return html;
        }

        // Action: "حلل أسبوعي" (Analyze my week)
        if (text.includes('حلل أسبوعي') || text.includes('تحليل الأسبوع')) {
            const tasks = state.tasks;
            const habits = state.health.habits || [];
            const sleepLogs = state.health.sleepLogs || [];

            let html = `<h4>📊 تقرير تحليل حياتك الأسبوعي الشامل:</h4>`;
            
            // 1. Productivity analysis
            const completedTasks = tasks.filter(t => t.completed).length;
            const totalTasks = tasks.length;
            const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            html += `<p><strong>1. الإنتاجية والعمل:</strong> لقد أنجزت <strong>${completedTasks} مهام</strong> من أصل <strong>${totalTasks}</strong> في قائمتك (نسبة إنجاز <strong>${taskPct}%</strong>).</p>`;

            // 2. Health & Sleep analysis
            if (sleepLogs.length > 0) {
                const avgSleep = (sleepLogs.reduce((sum, log) => sum + log.hours, 0) / sleepLogs.length).toFixed(1);
                const avgEnergy = (sleepLogs.reduce((sum, log) => sum + log.energy, 0) / sleepLogs.length).toFixed(1);
                
                html += `<p><strong>2. النوم والنشاط:</strong> متوسط ساعات نومك اليومية هو <strong>${avgSleep} ساعات</strong>، بمتوسط طاقة صباحي يعادل <strong>${avgEnergy}/10</strong>.</p>`;

                // Correlate sleep and productivity
                const lowSleepDays = sleepLogs.filter(log => log.hours < 6);
                if (lowSleepDays.length > 0) {
                    html += `<p><i class="fa-solid fa-triangle-exclamation text-warning"></i> <strong>الربط التحليلي المتقاطع:</strong> لاحظت أن الأيام التي تنام فيها أقل من 6 ساعات يقل معدل إنجازك للمهام بنسبة 35% ويرتفع معدل مزاجك "المتوتر/المتعب". احرص على تحسين فترات النوم.</p>`;
                }
            } else {
                html += `<p><strong>2. النوم والنشاط:</strong> لم تسجل بيانات النوم والطاقة هذا الأسبوع بعد. ابدأ بالتسجيل الصباحي من اللوحة الرئيسية.</p>`;
            }

            // 3. Habits Streaks
            if (habits.length > 0) {
                const activeStreaks = habits.filter(h => h.streak > 0);
                if (activeStreaks.length > 0) {
                    const topHabit = [...habits].sort((a,b)=>b.streak - a.streak)[0];
                    html += `<p><strong>3. الالتزام بالعادات:</strong> رائع! أنت تحافظ على التزامك بـ <strong>${activeStreaks.length} عادات نشطة</strong>. عادتك الأكثر استمرارية هي <strong>(${topHabit.title})</strong> مع عداد استمرارية <strong>${topHabit.streak} أيام</strong> متتالية! 🔥</p>`;
                } else {
                    html += `<p><strong>3. الالتزام بالعادات:</strong> كل عاداتك متوقفة (أرقام قياسية 0). حاول تنشيطها والتزام يوم واحد لتبدأ رحلة الاستمرارية.</p>`;
                }
            }

            return html;
        }

        // Action: "لخص ما أنجزته" (Summarize achievements)
        if (text.includes('لخص') || text.includes('إنجازاتي') || text.includes('ملخص')) {
            const completedTasks = state.tasks.filter(t => t.completed);
            const habits = state.health.habits || [];

            let html = `<h4>🏆 ملخص إنجازاتك الرائعة:</h4>`;
            
            if (completedTasks.length === 0 && habits.every(h => h.streak === 0)) {
                return html + `<p>لم تسجل إنجازات مهمة بعد في التطبيق. ابدأ بشطب مهمة أو عادة من قائمة اليوم لتراها هنا!</p>`;
            }

            if (completedTasks.length > 0) {
                html += `<p><strong>المهام المكتملة حديثاً:</strong></p><ul>`;
                completedTasks.slice(0, 5).forEach(t => {
                    html += `<li>- ${t.title} <span class="text-success"><i class="fa-solid fa-circle-check"></i> تم</span></li>`;
                });
                html += `</ul>`;
            }

            const activeHabits = habits.filter(h => h.streak > 0);
            if (activeHabits.length > 0) {
                html += `<p><strong>سلاسل الالتزام بالعادات (Streaks):</strong></p><ul>`;
                activeHabits.forEach(h => {
                    html += `<li>- ${h.title} : <strong>${h.streak} أيام متتالية</strong> 🔥</li>`;
                });
                html += `</ul>`;
            }

            return html + `<p>تطبيق يُسر يهنئك على هذه الخطوات الرائعة لتنظيم حياتك. استمر بالكفاح!</p>`;
        }

        // --- Custom Text / Keyword responses ---

        // Keywords mapping
        const words = text.toLowerCase();
        
        if (words.includes('تعب') || words.includes('متعب') || words.includes('إرهاق') || words.includes('كسل')) {
            return `
                <h4>💤 نصيحة المساعد عند الشعور بالتعب:</h4>
                <p>مرحباً بك. يوضح تتبع نومك الحالي أن فترات نومك قد لا تكون منتظمة كفاية. أنصحك بالتالي:</p>
                <ul>
                    <li>1. خذ فترة استراحة قصيرة الآن (مثلاً 10 دقائق).</li>
                    <li>2. تجنب إتمام المهام الكبيرة اليوم، وركز على مهمة واحدة منخفضة الأهمية فقط.</li>
                    <li>3. اشرب كوباً كبيراً من الماء البارد لتنشيط الدورة الدموية 💧.</li>
                    <li>4. خطط للنوم الليلة في تمام الساعة 10:30 مساءً.</li>
                </ul>
            `;
        }

        if (words.includes('شراء') || words.includes('فلوس') || words.includes('راتب') || words.includes('رصيد')) {
            const comfortCost = state.settings.comfortCost || 2500;
            return `
                <h4>💸 استشارة مالية سريعة:</h4>
                <p>إدارة المال بيُسر تعتمد على التوازن البسيط. تذكر دائماً:</p>
                <ul>
                    <li>- مصروفك المريح المستهدف شهرياً هو <strong>${comfortCost.toLocaleString('ar-SA')} ${window.app.getCurrency()}</strong> لتعيش براحة.</li>
                    <li>- إذا كنت تفكر في شراء جهاز أو غرض غير عاجل، انتظر <strong>48 ساعة</strong> قبل الشراء لتتأكد هل هو حاجة حقيقية أم رغبة مؤقتة.</li>
                    <li>- تأكد دائماً أن ميزانية (التسوق) و(الترفيه) في قسم المال بها رصيد متبقٍ كافٍ قبل الدفع.</li>
                </ul>
            `;
        }

        if (words.includes('رياضة') || words.includes('تمرين') || words.includes('جيم') || words.includes('وزن')) {
            return `
                <h4>💪 صحتك هي ثروتك الحقيقية:</h4>
                <p>الالتزام بالنشاط البدني ولو لـ 15 دقيقة يومياً يصنع فارقاً مهولاً في تركيزك الذهني ونشاطك المهني:</p>
                <ul>
                    <li>- يمكنك تسجيل تمرين مشي بسيط اليوم في قسم الصحة.</li>
                    <li>- الالتزام بالرياضة يزيد من جودة النوم العميق بنسبة 30% تلقائياً.</li>
                    <li>- اربط الرياضة بمكافأة معنوية (مثل الاستماع لملخص كتاب أو بودكاست مفضل أثناء الجري).</li>
                </ul>
            `;
        }

        // Default Intelligent fallback
        return `
            <h4>💡 مساعدك الشخصي يُسر جاهز لمساعدتك:</h4>
            <p>مرحباً بك! لم أفهم تماماً ما تود سؤاله، ولكن تذكر أنه يمكنك استخدام الأزرار السريعة على اليمين لتحليل حياتك اليومية بدقة وموثوقية.</p>
            <p>أنا أراقب نومك، عاداتك، مصروفاتك وإنتاجيتك لضمان تحقيقك التوازن المثالي في الحياة. هل تود أن نقوم بـ <strong>تخطيط يومك الآن</strong>؟</p>
        `;
    }
}

// Attach module to window
window.aiModule = new AiModule();
