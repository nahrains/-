/* ==========================================
   Yusr Dashboard (يُسر) - Notifications & Audio Alerts
   ========================================== */

class NotificationsModule {
    constructor() {
        this.audioCtx = null;
        this.firedAlertsToday = {};
    }

    init() {
        this.requestBrowserNotificationPermission();
        this.renderNotificationsList();
        this.startReminderChecker();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const bellBtn = document.getElementById('bell-btn');
        const dropdown = document.getElementById('notifications-dropdown');
        const clearBtn = document.getElementById('clear-notifications-btn');

        // Toggle notifications bell dropdown
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
            this.markNotificationsAsRead();
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
        });

        dropdown.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent closing dropdown when clicking inside
        });

        clearBtn.addEventListener('click', () => {
            window.app.state.notifications = [];
            window.app.saveState();
            this.renderNotificationsList();
        });
    }

    // Initialize Web Audio API on first user interaction
    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Desktop notification request
    requestBrowserNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                // Request on first user click anywhere
                document.addEventListener('click', () => {
                    Notification.requestPermission();
                }, { once: true });
            }
        }
    }

    sendBrowserNotification(title, options) {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, options);
            } catch (e) {
                // Handle service worker notification fallbacks if any
                console.log("Error firing notification", e);
            }
        }
    }

    // In-App floating Toast alerts
    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconClass = 'fa-circle-info';
        if (type === 'success') iconClass = 'fa-circle-check';
        if (type === 'danger') iconClass = 'fa-circle-exclamation';
        if (type === 'warning') iconClass = 'fa-triangle-exclamation';
        
        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        this.addNotificationToHistory(message, type);

        // Slide out and remove toast
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }

    addNotificationToHistory(message, type) {
        if (!window.app.state.notifications) window.app.state.notifications = [];
        
        const newNotif = {
            id: 'notif_' + Date.now(),
            message: message,
            type: type,
            time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            read: false
        };

        window.app.state.notifications.unshift(newNotif);
        // limit history to 20
        if (window.app.state.notifications.length > 20) {
            window.app.state.notifications.pop();
        }
        
        window.app.saveState();
        this.renderNotificationsList();
    }

    renderNotificationsList() {
        const listEl = document.getElementById('notifications-list');
        const badgeEl = document.getElementById('bell-badge');
        const list = window.app.state.notifications || [];

        const unreadCount = list.filter(n => !n.read).length;
        if (unreadCount > 0) {
            badgeEl.textContent = unreadCount;
            badgeEl.classList.remove('hidden');
        } else {
            badgeEl.classList.add('hidden');
        }

        if (list.length === 0) {
            listEl.innerHTML = '<p class="empty-notifications">لا توجد إشعارات جديدة</p>';
            return;
        }

        listEl.innerHTML = list.map(n => `
            <div class="notification-item">
                <span class="text-primary" style="font-weight: 500">${n.message}</span>
                <span class="time">${n.time}</span>
            </div>
        `).join('');
    }

    markNotificationsAsRead() {
        const list = window.app.state.notifications || [];
        list.forEach(n => n.read = true);
        window.app.saveState();
        this.renderNotificationsList();
    }

    // Synthesize premium sound effects using Web Audio API
    playChime(type = 'click') {
        if (window.app && window.app.state.settings && window.app.state.settings.soundEnabled === false) {
            return;
        }
        try {
            this.initAudio();
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            const now = this.audioCtx.currentTime;

            if (type === 'click') {
                // Subtle high click
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } 
            else if (type === 'start') {
                // Uplifting dual chime
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } 
            else if (type === 'success') {
                // Cheerful triple upward chime
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
                osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
                osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                osc.start(now);
                osc.stop(now + 0.45);
            } 
            else if (type === 'alarm') {
                // Double alerting beep chime
                osc.type = 'square';
                osc.frequency.setValueAtTime(587.33, now); // D5
                osc.frequency.setValueAtTime(440.00, now + 0.15); // A4
                osc.frequency.setValueAtTime(587.33, now + 0.3); // D5
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc.start(now);
                osc.stop(now + 0.6);
            }
            else if (type === 'warning') {
                // Solid warning tone
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(330, now);
                osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        } catch (e) {
            console.warn("Web Audio API is blocked or not supported on this browser context", e);
        }
    }

    // ==========================================
    // Smart Scheduler / Checker
    // ==========================================
    startReminderChecker() {
        // Run checks immediately
        this.runScheduledChecks();

        // Run checks every 15 minutes
        setInterval(() => {
            this.runScheduledChecks();
        }, 900000);
    }

    runScheduledChecks() {
        const state = window.app.state;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const hour = now.getHours();

        // 1. Subscription renewal dates checks
        if (state.subscriptions && state.subscriptions.length > 0) {
            state.subscriptions.forEach(sub => {
                if (sub.alert) {
                    const alertKey = `${todayStr}_sub_${sub.id}`;
                    if (!this.firedAlertsToday[alertKey]) {
                        const daysLeft = window.financeModule.calculateDaysRemaining(sub.nextRenewal);
                        if (daysLeft === 1) {
                            this.toast(`تذكير: اشتراك (${sub.name}) يتجدد غداً بقيمة ${sub.cost} ${window.app.getCurrency()}`, 'warning');
                            this.firedAlertsToday[alertKey] = true;
                        } else if (daysLeft === 0) {
                            this.toast(`تنبيه: اليوم هو تاريخ تجديد اشتراك (${sub.name}) بقيمة ${sub.cost} ${window.app.getCurrency()}`, 'danger');
                            this.firedAlertsToday[alertKey] = true;
                        }
                    }
                }
            });
        }

        // 2. Debt installments checks
        if (state.debts && state.debts.length > 0) {
            state.debts.forEach(debt => {
                const alertKey = `${todayStr}_debt_${debt.id}`;
                if (!this.firedAlertsToday[alertKey]) {
                    const daysLeft = window.financeModule.calculateDaysRemaining(debt.nextPaymentDate);
                    if (daysLeft === 2) {
                        this.toast(`تذكير: موعد قسط (${debt.name}) يستحق الدفع خلال يومين. المتبقي: ${debt.total - debt.paid} ${window.app.getCurrency()}`, 'warning');
                        this.firedAlertsToday[alertKey] = true;
                    } else if (daysLeft === 0) {
                        this.toast(`تنبيه: سداد قسط (${debt.name}) مستحق اليوم!`, 'danger');
                        this.firedAlertsToday[alertKey] = true;
                    }
                }
            });
        }

        // 3. Morning tasks checklist reminder at 9:00 AM (between 9:00 and 10:00)
        if (hour === 9) {
            const morningKey = `${todayStr}_morning_tasks`;
            if (!this.firedAlertsToday[morningKey]) {
                const pendingTasks = state.tasks.filter(t => !t.completed).length;
                if (pendingTasks > 0) {
                    this.toast(`صباح الخير! لديك ${pendingTasks} مهام معلقة اليوم. حان وقت تنظيم يومك وتفعيل إنجازاتك ☀️`, 'info');
                } else {
                    this.toast("صباح الخير! ابدأ يومك بنشاط وحدد مهام جديدة لليوم ☀️", "info");
                }
                this.sendBrowserNotification("تطبيق يُسر - تذكير الصباح", {
                    body: "حان الوقت لمراجعة قائمة مهامك اليومية وتنظيم يومك ☀️",
                    icon: "icons/icon-192.png"
                });
                this.playChime('start');
                this.firedAlertsToday[morningKey] = true;
            }
        }

        // 4. Evening self-assessment reflection reminder at 9:00 PM (between 21:00 and 22:00)
        if (hour === 21) {
            const eveningKey = `${todayStr}_evening_reflection`;
            if (!this.firedAlertsToday[eveningKey]) {
                this.toast("مساء الخير! حان وقت التقييم الذاتي وتدوين حالتك النفسية وإنجازاتك لليوم 🌙", "info");
                this.sendBrowserNotification("تطبيق يُسر - التقييم المسائي", {
                    body: "حان وقت تقييم يومك وتدوين حالتك النفسية وعاداتك 🌙",
                    icon: "icons/icon-192.png"
                });
                this.playChime('alarm');
                this.firedAlertsToday[eveningKey] = true;
            }
        }

        // 5. Daily water drinking checker (encouragement)
        if (hour >= 10 && hour <= 21 && hour % 3 === 0) { // at 12pm, 3pm, 6pm, 9pm
            const waterKey = `${todayStr}_water_${hour}`;
            if (!this.firedAlertsToday[waterKey]) {
                if (state.health && state.health.water && state.health.water.count < state.health.water.goal) {
                    this.toast("حان وقت ترطيب جسمك! لا تنسى شرب كوب ماء الآن 💧", "info");
                    this.playChime('start');
                }
                this.firedAlertsToday[waterKey] = true;
            }
        }
    }
}

// Attach module to window
window.notificationsModule = new NotificationsModule();
