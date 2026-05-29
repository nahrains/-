/* ==========================================
   Yusr Dashboard (يُسر) - Core Application Logic
   ========================================== */

// Global State
const yusrState = {
    goals: [],
    tasks: [],
    transactions: [],
    budgets: {},
    subscriptions: [],
    debts: [],
    health: {
        water: { date: '', count: 0, goal: 8 },
        workouts: [],
        sleepLogs: [], // { date: '', hours: 0, quality: '', energy: 5, mood: '' }
        waterHistory: [],
        habits: []
    },
    journal: [],
    weeklyReviews: [],
    settings: {
        theme: 'dark',
        comfortCost: 0,
        fireSaved: 0,
        currency: 'د.ع'
    }
};

class YusrApp {
    constructor() {
        this.state = yusrState;
        this.activeTab = 'dashboard';
    }

    init() {
        this.loadState();
        this.initPinLockScreen();
        this.setupEventListeners();
        this.registerServiceWorker();
        this.switchTab(this.activeTab);
        this.updateHeaderDateTime();
        this.initSettings();
        
        // Initialize other modules
        if (window.tasksModule) window.tasksModule.init();
        if (window.financeModule) window.financeModule.init();
        if (window.healthModule) window.healthModule.init();
        if (window.notificationsModule) window.notificationsModule.init();
        if (window.aiModule) window.aiModule.init();
        if (window.chartsModule) window.chartsModule.init();
        if (window.calendarModule) window.calendarModule.init();

        this.updateDashboardStats();
        this.initAutoLockOnBackground();
        setInterval(() => this.updateHeaderDateTime(), 60000);
    }

    // Load state from localStorage
    loadState() {
        const stored = localStorage.getItem('yusr_state');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Merge loaded state with default state to prevent key errors
                this.state = { ...yusrState, ...parsed };
                if (parsed.health) this.state.health = { ...yusrState.health, ...parsed.health };
                if (parsed.settings) this.state.settings = { ...yusrState.settings, ...parsed.settings };
                if (!Array.isArray(this.state.subscriptions)) this.state.subscriptions = [];
                if (!Array.isArray(this.state.debts)) this.state.debts = [];
            } catch (e) {
                console.error("Error parsing yusr_state from local storage", e);
            }
        } else {
            // Initialize with completely clean state (no demo/test data)
            this.state = JSON.parse(JSON.stringify(yusrState));
            this.saveState();
        }
    }

    // Commit state to localStorage
    saveState() {
        localStorage.setItem('yusr_state', JSON.stringify(this.state));
        this.updateDashboardStats();
        // Update charts when saving state
        if (window.chartsModule && typeof window.chartsModule.updateAllCharts === 'function') {
            window.chartsModule.updateAllCharts();
        }
    }

    seedDefaultData() {
        this.state.goals = [
            { id: 'g1', title: 'تعلم لغة برمجة جديدة', category: 'career', desc: 'قراءة دورة كاملة وتطبيق مشاريع عملية.', progress: 0 },
            { id: 'g2', title: 'تحسين اللياقة البدنية والصحة', category: 'health', desc: 'تنزيل الوزن وتناول طعام صحي ومشي يومي.', progress: 0 }
        ];
        this.state.tasks = [
            { id: 't1', title: 'دراسة أساسيات جافاسكريبت', category: 'study', priority: 'high', goalId: 'g1', subtasks: [{title: 'المتغيرات والعمليات', completed: true}, {title: 'الدوال والكائنات', completed: false}], dueDate: new Date().toISOString().split('T')[0], completed: false },
            { id: 't2', title: 'مشي 30 دقيقة في الهواء الطلق', category: 'personal', priority: 'medium', goalId: 'g2', subtasks: [], dueDate: new Date().toISOString().split('T')[0], completed: false }
        ];
        this.state.budgets = {
            'أكل': 300000,
            'مواصلات': 150000,
            'فواتير': 200000,
            'قهوة': 60000,
            'ترفيه': 100000
        };
        this.state.transactions = [
            { id: 'tr1', type: 'income', amount: 1500000, desc: 'الراتب الشهري الأساسي', category: 'راتب', date: new Date().toISOString().split('T')[0] },
            { id: 'tr2', type: 'expense', amount: 5000, desc: 'اشتراك قهوة صباحية اليوم', category: 'قهوة', mood: 'سعيد', date: new Date().toISOString().split('T')[0] }
        ];
        const today = new Date();
        const generatePastDateStr = (daysAgo) => {
            const d = new Date();
            d.setDate(today.getDate() - daysAgo);
            return d.toISOString().split('T')[0];
        };

        this.state.health = {
            water: { date: today.toISOString().split('T')[0], count: 3, goal: 8 },
            workouts: [
                { id: 'w1', type: 'مشي سريع', duration: 30, date: generatePastDateStr(1) },
                { id: 'w2', type: 'تمارين كارديو', duration: 45, date: generatePastDateStr(3) }
            ],
            sleepLogs: [
                { date: generatePastDateStr(5), hours: 6.5, quality: 'مريحة', energy: 6, mood: 'هادئ' },
                { date: generatePastDateStr(4), hours: 7.0, quality: 'عميقة', energy: 8, mood: 'سعيد' },
                { date: generatePastDateStr(3), hours: 5.5, quality: 'متقطعة', energy: 4, mood: 'متعب' },
                { date: generatePastDateStr(2), hours: 8.0, quality: 'عميقة', energy: 9, mood: 'سعيد' },
                { date: generatePastDateStr(1), hours: 7.5, quality: 'مريحة', energy: 7, mood: 'هادئ' },
                { date: today.toISOString().split('T')[0], hours: 7.0, quality: 'مريحة', energy: 8, mood: 'سعيد' }
            ],
            waterHistory: [
                { date: generatePastDateStr(6), count: 5, goal: 8 },
                { date: generatePastDateStr(5), count: 8, goal: 8 },
                { date: generatePastDateStr(4), count: 6, goal: 8 },
                { date: generatePastDateStr(3), count: 4, goal: 8 },
                { date: generatePastDateStr(2), count: 8, goal: 8 },
                { date: generatePastDateStr(1), count: 7, goal: 8 }
            ],
            habits: [
                { id: 'h1', title: 'النوم المبكر (قبل 11 مساءً)', streak: 3, history: [generatePastDateStr(3), generatePastDateStr(2), generatePastDateStr(1), today.toISOString().split('T')[0]] },
                { id: 'h2', title: 'شرب 8 أكواب ماء', streak: 1, history: [generatePastDateStr(2), today.toISOString().split('T')[0]] },
                { id: 'h3', title: 'ممارسة الرياضة الصباحية', streak: 0, history: [generatePastDateStr(3), generatePastDateStr(1)] }
            ]
        };

        this.state.settings.comfortCost = 800000;
        this.state.settings.fireSaved = 15000000;
        this.state.settings.currency = 'د.ع';
        this.saveState();
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('Service Worker registered successfully', reg.scope))
                    .catch(err => console.log('Service Worker registration failed', err));
            });
        }
    }

    // Switch Navigation Tabs (SPA Routing)
    switchTab(tabId) {
        this.activeTab = tabId;
        
        // Update sidebar active button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Toggle active section view
        document.querySelectorAll('.tab-section').forEach(sec => {
            if (sec.id === `tab-${tabId}`) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });

        // Specific sub-tab layout updates if needed
        if (tabId === 'stats' && window.chartsModule) {
            window.chartsModule.updateAllCharts();
        }
        
        if (tabId === 'dashboard') {
            this.renderDashboardMiniLists();
        }
    }

    // Dynamic Header Clock and Calendar Date in Arabic
    updateHeaderDateTime() {
        const dateEl = document.getElementById('topbar-date');
        const greetingEl = document.getElementById('greeting-title');
        
        const now = new Date();
        const hour = now.getHours();
        
        // Greeting based on time of day
        let greeting = 'مرحباً بك';
        if (hour >= 5 && hour < 12) {
            greeting = 'صباح الخير، وبداية يوم موفقة ☀️';
        } else if (hour >= 12 && hour < 17) {
            greeting = 'مساء الخير، عساك على القوة 💪';
        } else if (hour >= 17 && hour < 23) {
            greeting = 'مساء النور والراحة 🌙';
        } else {
            greeting = 'أهلاً بك، نوماً هنيئاً وأحلاماً سعيدة 💤';
        }
        
        greetingEl.textContent = greeting;

        // Custom Arabic date format options
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('ar-SA', options);
    }

    // Global Modal Controllers
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    setupEventListeners() {
        // Tab click listeners
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.getAttribute('data-tab'));
            });
        });

        // Theme toggler
        const themeBtn = document.getElementById('theme-toggle-btn');
        themeBtn.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-theme');
            document.body.classList.toggle('dark-theme', !isLight);
            this.state.settings.theme = isLight ? 'light' : 'dark';
            this.saveState();
            
            // Toggle icon
            const icon = themeBtn.querySelector('i');
            if (isLight) {
                icon.className = 'fa-solid fa-moon';
            } else {
                icon.className = 'fa-solid fa-sun';
            }
        });

        // Apply saved theme
        if (this.state.settings.theme === 'light') {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
            themeBtn.querySelector('i').className = 'fa-solid fa-moon';
        }

        // Close modal buttons click listeners
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.remove('active');
            });
        });

        // Quick Command Text Parser
        const quickInput = document.getElementById('quick-command-input');
        quickInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.parseQuickCommand(quickInput.value);
                quickInput.value = '';
            }
        });

        // Voice Input simulation button
        const voiceBtn = document.getElementById('voice-input-btn');
        voiceBtn.addEventListener('click', () => {
            this.toggleVoiceInput();
        });

        // Dashboard Mood Selector
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.getElementById('energy-range-input').addEventListener('input', (e) => {
            document.getElementById('energy-val-label').textContent = e.target.value;
        });

        document.getElementById('save-status-btn').addEventListener('click', () => {
            this.saveDailyStatus();
        });

        // Dashboard Quick Expense Card Listener
        const quickExpenseBtn = document.getElementById('dash-quick-expense-submit-btn');
        if (quickExpenseBtn) {
            quickExpenseBtn.addEventListener('click', () => {
                const amountInput = document.getElementById('dash-quick-amount-input');
                const catSelect = document.getElementById('dash-quick-category-select');
                const descInput = document.getElementById('dash-quick-desc-input');
                
                const amount = parseFloat(amountInput.value);
                const category = catSelect.value;
                const desc = descInput.value.trim() || `مصروف سريع لـ ${category}`;
                
                if (isNaN(amount) || amount <= 0) {
                    alert('الرجاء إدخال مبلغ صحيح.');
                    return;
                }
                
                const newTransaction = {
                    id: 'tr_' + Date.now(),
                    type: 'expense',
                    amount: amount,
                    desc: desc,
                    category: category,
                    mood: this.getTodayMood(),
                    date: new Date().toISOString().split('T')[0]
                };
                this.state.transactions.push(newTransaction);
                
                if (window.financeModule) {
                    window.financeModule.checkBudgetThreshold(category);
                }

                this.saveState();
                
                // Clear inputs
                amountInput.value = '';
                descInput.value = '';
                
                // Update all views
                if (window.financeModule) window.financeModule.renderAll();
                
                if (window.notificationsModule) {
                    window.notificationsModule.toast(`تم تسجيل مصروف بقيمة ${amount.toLocaleString('ar-SA')} ${this.getCurrency()} لتصنيف ${category}`, 'info');
                }
            });
        }

        // Settings Listeners
        const pinEnableCheck = document.getElementById('settings-pin-enable');
        if (pinEnableCheck) {
            pinEnableCheck.addEventListener('change', () => {
                const inputGroup = document.getElementById('settings-pin-input-group');
                inputGroup.style.display = pinEnableCheck.checked ? 'block' : 'none';
            });
        }

        const savePinBtn = document.getElementById('save-pin-settings-btn');
        if (savePinBtn) {
            savePinBtn.addEventListener('click', () => this.savePinSettings());
        }

        const exportBackupBtn = document.getElementById('export-backup-btn');
        if (exportBackupBtn) {
            exportBackupBtn.addEventListener('click', () => this.exportBackup());
        }

        const importBackupBtn = document.getElementById('import-backup-btn');
        if (importBackupBtn) {
            importBackupBtn.addEventListener('click', () => this.importBackup());
        }

        const saveGenBtn = document.getElementById('save-general-settings-btn');
        if (saveGenBtn) {
            saveGenBtn.addEventListener('click', () => this.saveGeneralSettings());
        }

        const exportCsvBtn = document.getElementById('export-transactions-csv-btn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportTransactionsCSV());
        }

        const resetDataBtn = document.getElementById('reset-all-data-btn');
        if (resetDataBtn) {
            resetDataBtn.addEventListener('click', () => this.resetAllData());
        }

        const exportPdfBtn = document.getElementById('export-pdf-report-btn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => {
                window.print();
            });
        }

        // Print handlers to temporarily switch to light-theme for high-contrast ink-friendly prints
        let wasDarkBeforePrint = false;
        window.addEventListener('beforeprint', () => {
            if (document.body.classList.contains('dark-theme')) {
                wasDarkBeforePrint = true;
                document.body.classList.remove('dark-theme');
                document.body.classList.add('light-theme');
                if (window.chartsModule) {
                    window.chartsModule.updateAllCharts();
                }
            }
        });

        window.addEventListener('afterprint', () => {
            if (wasDarkBeforePrint) {
                wasDarkBeforePrint = false;
                document.body.classList.remove('light-theme');
                document.body.classList.add('dark-theme');
                if (window.chartsModule) {
                    window.chartsModule.updateAllCharts();
                }
            }
        });
    }

    // Save morning energy, mood and sleep log
    saveDailyStatus() {
        const activeMoodBtn = document.querySelector('.mood-btn.active');
        const mood = activeMoodBtn ? activeMoodBtn.getAttribute('data-mood') : 'calm';
        const energy = parseInt(document.getElementById('energy-range-input').value);
        const todayStr = new Date().toISOString().split('T')[0];

        // Check if sleep logs for today exist
        const todayLogIdx = this.state.health.sleepLogs.findIndex(log => log.date === todayStr);
        const statusTextMap = { happy: 'سعيد', calm: 'هادئ', tired: 'متعب', stressed: 'متوتر', sad: 'حزين' };
        
        const logData = {
            date: todayStr,
            hours: todayLogIdx !== -1 ? this.state.health.sleepLogs[todayLogIdx].hours : 7, // default if not set
            quality: todayLogIdx !== -1 ? this.state.health.sleepLogs[todayLogIdx].quality : 'مريحة',
            energy: energy,
            mood: statusTextMap[mood] || 'هادئ'
        };

        if (todayLogIdx !== -1) {
            this.state.health.sleepLogs[todayLogIdx] = logData;
        } else {
            this.state.health.sleepLogs.push(logData);
        }

        this.saveState();
        if (window.notificationsModule) {
            window.notificationsModule.toast(`تم حفظ حالتك النفسية والطاقة اليومية لليوم (${statusTextMap[mood]} | طاقة ${energy}) بنجاح!`, 'success');
        }
    }

    // Quick command input NLP parser
    parseQuickCommand(text) {
        text = text.trim();
        if (!text) return;

        // Parse: "مهمة [عنوان المهمة]"
        if (text.startsWith('مهمة ')) {
            const title = text.replace('مهمة ', '');
            const newTask = {
                id: 't_' + Date.now(),
                title: title,
                category: 'personal',
                priority: 'medium',
                goalId: '',
                subtasks: [],
                dueDate: new Date().toISOString().split('T')[0],
                completed: false
            };
            this.state.tasks.push(newTask);
            this.saveState();
            if (window.tasksModule) window.tasksModule.renderTasks();
            if (window.notificationsModule) window.notificationsModule.toast(`تمت إضافة المهمة: "${title}"`, 'success');
            return;
        }

        // Parse: "دخل/مصروف [التصنيف] [المبلغ] [البيان]" أو "[التصنيف] [المبلغ] [البيان]"
        let category = '';
        let amount = NaN;
        let desc = '';
        let type = '';
        
        const expenseCategories = ['أكل', 'مواصلات', 'اشتراكات', 'تسوق', 'فواتير', 'قهوة', 'ترفيه'];
        const incomeCategories = ['راتب', 'عمل حر', 'مشاريع', 'تحويلات', 'أرباح'];

        const parts = text.split(' ');
        if (parts.length >= 2) {
            // Check if it starts with "دخل" or "مصروف"
            if (parts[0] === 'دخل' && parts.length >= 3) {
                type = 'income';
                category = parts[1];
                if (category === 'عمل_حر' || category === 'حر') category = 'عمل حر';
                amount = parseFloat(parts[2]);
                desc = parts.slice(3).join(' ');
            } else if (parts[0] === 'مصروف' && parts.length >= 3) {
                type = 'expense';
                category = parts[1];
                amount = parseFloat(parts[2]);
                desc = parts.slice(3).join(' ');
            } else {
                // Direct category check
                let cat = parts[0];
                if (cat === 'عمل_حر') cat = 'عمل' + ' ' + 'حر'; // 'عمل حر'
                
                if (expenseCategories.includes(cat)) {
                    type = 'expense';
                    category = cat;
                    amount = parseFloat(parts[1]);
                    desc = parts.slice(2).join(' ');
                } else if (incomeCategories.includes(cat)) {
                    type = 'income';
                    category = cat;
                    amount = parseFloat(parts[1]);
                    desc = parts.slice(2).join(' ');
                }
            }
            
            // If parsed correctly
            if (type && category && !isNaN(amount) && amount > 0) {
                const finalDesc = desc.trim() || `${type === 'expense' ? 'مصروف' : 'دخل'} سريع لـ ${category}`;
                const newTransaction = {
                    id: 'tr_' + Date.now(),
                    type: type,
                    amount: amount,
                    desc: finalDesc,
                    category: category,
                    mood: type === 'expense' ? this.getTodayMood() : '',
                    date: new Date().toISOString().split('T')[0]
                };
                this.state.transactions.push(newTransaction);
                
                if (type === 'expense' && window.financeModule) {
                    window.financeModule.checkBudgetThreshold(category);
                }

                this.saveState();
                if (window.financeModule) window.financeModule.renderAll();
                
                const toastType = type === 'expense' ? 'info' : 'success';
                const toastMsg = type === 'expense'
                    ? `تم تسجيل مصروف بقيمة ${amount.toLocaleString('ar-SA')} ${this.getCurrency()} لتصنيف ${category}`
                    : `تم تسجيل دخل بقيمة ${amount.toLocaleString('ar-SA')} ${this.getCurrency()} لتصنيف ${category}`;
                if (window.notificationsModule) window.notificationsModule.toast(toastMsg, toastType);
                return;
            }
        }

        // Parse: "نوم [ساعات النوم]"
        if (text.startsWith('نوم ') || text.startsWith('النوم ')) {
            const hours = parseFloat(text.replace(/نوم |النوم /, ''));
            if (!isNaN(hours)) {
                const todayStr = new Date().toISOString().split('T')[0];
                const idx = this.state.health.sleepLogs.findIndex(log => log.date === todayStr);
                
                const logData = {
                    date: todayStr,
                    hours: hours,
                    quality: 'مريحة',
                    energy: idx !== -1 ? this.state.health.sleepLogs[idx].energy : 6,
                    mood: idx !== -1 ? this.state.health.sleepLogs[idx].mood : 'هادئ'
                };

                if (idx !== -1) {
                    this.state.health.sleepLogs[idx] = logData;
                } else {
                    this.state.health.sleepLogs.push(logData);
                }

                this.saveState();
                if (window.notificationsModule) window.notificationsModule.toast(`تم تسجيل ساعات النوم اليومية: ${hours} ساعة`, 'success');
                return;
            }
        }

        // Parse: "ماء" or "شرب ماء" (adds 1 water cup)
        if (text === 'ماء' || text === 'شرب ماء' || text === 'كوب ماء') {
            if (window.healthModule) {
                window.healthModule.addWaterCup();
            }
            return;
        }

        // Fallback: AI search input redirect
        if (window.notificationsModule) {
            window.notificationsModule.toast(`التحويل للمساعد للبحث عن: "${text}"`, 'info');
        }
        this.switchTab('ai-assistant');
        if (window.aiModule) {
            window.aiModule.sendUserMessage(text);
        }
    }

    getTodayMood() {
        const todayStr = new Date().toISOString().split('T')[0];
        const log = this.state.health.sleepLogs.find(l => l.date === todayStr);
        return log ? log.mood : '';
    }

    // Speech synthesis recognition simulation
    toggleVoiceInput() {
        const btn = document.getElementById('voice-input-btn');
        const input = document.getElementById('quick-command-input');
        
        if (btn.classList.contains('active')) {
            btn.classList.remove('active');
            if (this.recognition) this.recognition.stop();
        } else {
            btn.classList.add('active');
            
            // Check if Web Speech API is supported
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                this.recognition = new SpeechRecognition();
                this.recognition.lang = 'ar-SA';
                this.recognition.interimResults = false;
                this.recognition.maxAlternatives = 1;

                this.recognition.onstart = () => {
                    input.placeholder = "تحدث الآن (مثال: أكل 15، مهمة شراء كتب)...";
                };

                this.recognition.onresult = (event) => {
                    const resultText = event.results[0][0].transcript;
                    input.value = resultText;
                    this.parseQuickCommand(resultText);
                    btn.classList.remove('active');
                    input.placeholder = "إدخال سريع (مثال: أكل 20، نوم 8، مهمة قراءة)...";
                };

                this.recognition.onerror = () => {
                    btn.classList.remove('active');
                    input.placeholder = "إدخال سريع (مثال: أكل 20، نوم 8، مهمة قراءة)...";
                    if (window.notificationsModule) window.notificationsModule.toast("حدث خطأ في التقاط الصوت. جرب الكتابة.", "danger");
                };

                this.recognition.onend = () => {
                    btn.classList.remove('active');
                    input.placeholder = "إدخال سريع (مثال: أكل 20، نوم 8، مهمة قراءة)...";
                };

                this.recognition.start();
            } else {
                // Mock text dialog simulation for speech-recognition
                btn.classList.remove('active');
                const promptText = prompt("جهازك الحالي لا يدعم التعرف على الصوت مباشرة. اكتب الأمر هنا لتسجيله سريعاً:");
                if (promptText) {
                    input.value = promptText;
                    this.parseQuickCommand(promptText);
                }
            }
        }
    }

    updateDashboardStats() {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // 1. Month expenses calculation
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyExpenses = this.state.transactions
            .filter(tr => {
                if (tr.type !== 'expense') return false;
                const d = new Date(tr.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, tr) => sum + tr.amount, 0);

        document.getElementById('dash-month-expense').textContent = monthlyExpenses.toLocaleString('ar-SA') + ' ' + this.getCurrency();

        // 2. Today's task completion percentage
        const todayTasks = this.state.tasks.filter(t => t.dueDate === todayStr);
        if (todayTasks.length > 0) {
            const completed = todayTasks.filter(t => t.completed).length;
            const pct = Math.round((completed / todayTasks.length) * 100);
            document.getElementById('dash-task-percentage').textContent = pct + '%';
        } else {
            document.getElementById('dash-task-percentage').textContent = '--';
        }

        // Render dashboard elements
        this.renderDashboardMiniLists();
    }

    renderDashboardMiniLists() {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Render Top 3 Goals
        const goalsListEl = document.getElementById('dash-goals-list');
        const topGoals = this.state.goals.slice(0, 3);
        if (topGoals.length > 0) {
            goalsListEl.innerHTML = topGoals.map(g => `
                <div class="goal-mini-item">
                    <div class="goal-mini-info">
                        <span>${g.title}</span>
                        <strong>${g.progress}%</strong>
                    </div>
                    <div class="goal-mini-bar">
                        <div class="goal-mini-fill" style="width: ${g.progress}%"></div>
                    </div>
                </div>
            `).join('');
        } else {
            goalsListEl.innerHTML = '<p class="empty-text">لم تقم بإضافة أهداف كبرى بعد.</p>';
        }

        // Render Today's Tasks
        const tasksListEl = document.getElementById('dash-tasks-list');
        const todayTasks = this.state.tasks.filter(t => t.dueDate === todayStr);
        if (todayTasks.length > 0) {
            tasksListEl.innerHTML = todayTasks.map(t => `
                <div class="task-item-row ${t.completed ? 'completed' : ''}">
                    <div class="task-checkbox ${t.completed ? 'checked' : ''}" onclick="tasksModule.toggleTaskState('${t.id}')">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <span class="task-title-text">${t.title}</span>
                    <span class="task-badge ${t.category}">${t.category === 'work' ? 'عمل' : t.category === 'study' ? 'دراسة' : 'شخصي'}</span>
                    <div class="task-priority-dot ${t.priority}"></div>
                </div>
            `).join('');
        } else {
            tasksListEl.innerHTML = '<p class="empty-text">لا توجد مهام مجدولة لليوم.</p>';
        }

        // Render Daily Habits
        const habitsListEl = document.getElementById('dash-habits-list');
        const habits = this.state.health.workouts.filter(w => w.isHabit) || []; // Using habit status or direct logs
        // If empty, fetch habits if saved
        const habitsArray = this.state.health.habits || [];
        if (habitsArray.length > 0) {
            habitsListEl.innerHTML = habitsArray.slice(0, 4).map(h => {
                const isDoneToday = h.history && h.history.includes(todayStr);
                return `
                    <div class="habit-item-row">
                        <div class="habit-checkbox ${isDoneToday ? 'checked' : ''}" onclick="healthModule.toggleHabitCheck('${h.id}')">
                            <i class="fa-solid fa-check"></i>
                        </div>
                        <span class="habit-title-text">${h.title}</span>
                        <div class="habit-streak-badge">
                            <i class="fa-solid fa-fire"></i> ${h.streak}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            habitsListEl.innerHTML = '<p class="empty-text">لا توجد عادات مضافة لليوم. قم بزيارة قسم الصحة.</p>';
        }

        // Sync focus timer widget to main state
        if (window.tasksModule) {
            window.tasksModule.updateFocusWidget();
        }
    }

    // ==========================================
    // Settings & Security Logic
    // ==========================================
    initSettings() {
        const state = this.state;
        
        // 1. Username
        const usernameInput = document.getElementById('settings-username-input');
        if (usernameInput) usernameInput.value = state.settings.username || '';
        
        // Update greeting display
        if (state.settings.username) {
            const greetingEl = document.getElementById('greeting-title');
            if (greetingEl) {
                const now = new Date();
                const hour = now.getHours();
                let welcome = 'مرحباً بك';
                if (hour >= 5 && hour < 12) welcome = 'صباح الخير، يا';
                else if (hour >= 12 && hour < 17) welcome = 'مساء الخير، يا';
                else if (hour >= 17 && hour < 23) welcome = 'مساء النور، يا';
                else welcome = 'أهلاً بك، يا';
                greetingEl.textContent = `${welcome} ${state.settings.username} ☀️`;
            }
        }

        // 1.5 Currency
        const currencySelect = document.getElementById('settings-currency-select');
        if (currencySelect) currencySelect.value = state.settings.currency || 'د.ع';

        // Update currency labels across the app
        const curr = this.getCurrency();
        document.querySelectorAll('.currency-label').forEach(el => {
            el.textContent = curr;
        });

        // 2. Water goal
        const waterGoalInput = document.getElementById('settings-water-goal-input');
        if (waterGoalInput) {
            if (!state.health.water) state.health.water = { date: '', count: 0, goal: 8 };
            waterGoalInput.value = state.health.water.goal || 8;
        }

        // 3. Sound toggle
        const soundToggle = document.getElementById('settings-sound-enable');
        if (soundToggle) soundToggle.checked = state.settings.soundEnabled !== undefined ? state.settings.soundEnabled : true;

        // 4. PIN settings checkboxes
        const pinEnableCheck = document.getElementById('settings-pin-enable');
        if (pinEnableCheck) {
            pinEnableCheck.checked = state.settings.pinEnabled || false;
            document.getElementById('settings-pin-input-group').style.display = state.settings.pinEnabled ? 'block' : 'none';
        }
        
        const pinVal = document.getElementById('settings-pin-value');
        if (pinVal) pinVal.value = state.settings.pinCode || '';
    }

    saveGeneralSettings() {
        const username = document.getElementById('settings-username-input').value.trim();
        const waterGoal = parseInt(document.getElementById('settings-water-goal-input').value) || 8;
        const soundEnabled = document.getElementById('settings-sound-enable').checked;
        const currency = document.getElementById('settings-currency-select').value;

        this.state.settings.username = username;
        this.state.settings.currency = currency;
        
        if (!this.state.health.water) {
            this.state.health.water = { date: new Date().toISOString().split('T')[0], count: 0, goal: 8 };
        }
        this.state.health.water.goal = waterGoal;
        this.state.settings.soundEnabled = soundEnabled;

        this.saveState();
        this.initSettings();
        
        if (window.healthModule) window.healthModule.renderWaterWidget();

        if (window.notificationsModule) {
            window.notificationsModule.toast("تم حفظ الإعدادات العامة بنجاح!", "success");
        }
    }

    savePinSettings() {
        const pinEnabled = document.getElementById('settings-pin-enable').checked;
        const pinCode = document.getElementById('settings-pin-value').value.trim();

        if (pinEnabled && (!pinCode || pinCode.length !== 4 || isNaN(pinCode))) {
            alert('الرجاء إدخال رمز PIN صحيح مكون من 4 أرقام.');
            return;
        }

        this.state.settings.pinEnabled = pinEnabled;
        this.state.settings.pinCode = pinEnabled ? pinCode : '';

        this.saveState();
        this.initSettings();

        if (window.notificationsModule) {
            window.notificationsModule.toast(pinEnabled ? "تم تفعيل رمز قفل الخصوصية بنجاح!" : "تم إلغاء تفعيل قفل الخصوصية.", "success");
        }
    }

    // Export state as JSON file download
    exportBackup() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        
        const dateStr = new Date().toISOString().split('T')[0];
        downloadAnchor.setAttribute("download", `yusr_backup_${dateStr}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        if (window.notificationsModule) {
            window.notificationsModule.toast("تم تصدير النسخة الاحتياطية بنجاح. احفظ الملف بمكان آمن!", "success");
        }
    }

    // Import JSON file backup
    importBackup() {
        const fileInput = document.getElementById('import-backup-file');
        if (fileInput.files.length === 0) {
            alert('الرجاء اختيار ملف النسخة الاحتياطية (JSON) أولاً.');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                // Validate if it is a Yusr state structure
                if (parsed.tasks && parsed.transactions && parsed.goals) {
                    this.state = parsed;
                    this.saveState();
                    alert('تم استعادة البيانات بنجاح! سيتم إعادة تحميل الصفحة الآن لتطبيق التغييرات.');
                    window.location.reload();
                } else {
                    alert('الملف غير صالح أو لا يحتوي على بنية بيانات تطبيق يُسر.');
                }
            } catch (err) {
                alert('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية.');
            }
        };

        reader.readAsText(file);
    }

    // Export transactions to Excel/CSV file
    exportTransactionsCSV() {
        const transactions = this.state.transactions || [];
        if (transactions.length === 0) {
            alert('لا توجد معاملات مالية لتصديرها.');
            return;
        }

        // CSV Header with BOM for correct Arabic representation in Excel
        let csvContent = "\uFEFF";
        csvContent += "التاريخ,البيان,التصنيف,المزاج,النوع,المبلغ\n";

        transactions.forEach(t => {
            const date = t.date;
            const desc = `"${t.desc.replace(/"/g, '""')}"`;
            const cat = t.category;
            const mood = t.mood || '';
            const typeText = t.type === 'expense' ? 'مصروف' : 'دخل';
            const amount = t.amount;
            
            csvContent += `${date},${desc},${cat},${mood},${typeText},${amount}\n`;
        });

        const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        
        const dateStr = new Date().toISOString().split('T')[0];
        downloadAnchor.setAttribute("download", `yusr_transactions_${dateStr}.csv`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        if (window.notificationsModule) {
            window.notificationsModule.toast("تم تصدير المعاملات المالية كملف CSV بنجاح!", "success");
        }
    }

    resetAllData() {
        if (confirm("تحذير: هل أنت متأكد تماماً من حذف جميع بياناتك والبدء من جديد؟ هذا الخيار سيمسح كل شيء نهائياً!")) {
            localStorage.removeItem('yusr_state');
            alert('تمت إعادة ضبط البيانات. سيتم تحديث الصفحة الآن.');
            window.location.reload();
        }
    }

    getCurrency() {
        return (this.state.settings && this.state.settings.currency) ? this.state.settings.currency : 'د.ع';
    }

    // PIN lock screen dialog validation
    initPinLockScreen() {
        const state = this.state;
        const lockScreen = document.getElementById('pin-lock-screen');
        if (!lockScreen) return;
        
        if (state.settings && state.settings.pinEnabled && state.settings.pinCode) {
            // Lock active
            lockScreen.style.display = 'flex';
            
            let inputPin = '';
            const pinDisplay = document.getElementById('pin-screen-val');
            const errMsg = document.getElementById('pin-screen-error-msg');
            
            if (pinDisplay) pinDisplay.value = '';
            if (errMsg) errMsg.classList.add('hidden');
            
            // Keypad clicks
            document.querySelectorAll('.pin-key-btn').forEach(btn => {
                // Remove previous event listener to avoid duplicates on re-render
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.addEventListener('click', () => {
                    const key = newBtn.getAttribute('data-key');
                    errMsg.classList.add('hidden');
                    
                    if (key === 'clear') {
                        inputPin = '';
                    } else if (key === 'delete') {
                        inputPin = inputPin.slice(0, -1);
                    } else if (inputPin.length < 4) {
                        inputPin += key;
                    }
                    
                    // Update display
                    pinDisplay.value = inputPin;
                    
                    // Auto check PIN on reaching 4 characters
                    if (inputPin.length === 4) {
                        if (inputPin === state.settings.pinCode) {
                            // Unlocked!
                            lockScreen.style.display = 'none';
                            pinDisplay.value = '';
                            if (window.notificationsModule) {
                                window.notificationsModule.toast("أهلاً بك! تم إلغاء قفل تطبيق يُسر.", "success");
                            }
                        } else {
                            // Wrong PIN
                            inputPin = '';
                            pinDisplay.value = '';
                            errMsg.classList.remove('hidden');
                            if (window.notificationsModule) {
                                window.notificationsModule.playChime('warning');
                            }
                        }
                    }
                });
            });
        } else {
            lockScreen.style.display = 'none';
        }
    }

    // Auto lock app when minimized or sent to background
    initAutoLockOnBackground() {
        let backgroundTime = 0;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Record timestamp when minimized/backgrounded
                backgroundTime = Date.now();
            } else if (document.visibilityState === 'visible') {
                // Return to foreground
                if (this.state.settings && this.state.settings.pinEnabled && this.state.settings.pinCode) {
                    const elapsedSeconds = (Date.now() - backgroundTime) / 1000;
                    // If backgrounded for more than 45 seconds, lock it!
                    if (elapsedSeconds >= 45) {
                        this.initPinLockScreen();
                    }
                }
            }
        });
    }
}

// Global Launcher
document.addEventListener('DOMContentLoaded', () => {
    window.app = new YusrApp();
    window.app.init();
});
