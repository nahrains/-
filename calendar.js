/* ==========================================
   Yusr Dashboard (يُسر) - Calendar, Journal & Weekly Review
   ========================================== */

class CalendarModule {
    constructor() {
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.currentWizardStep = 1;
        this.selectedJournalRating = 0;
    }

    init() {
        this.renderWeekCalendar();
        this.renderSelectedDayEvents();
        this.renderJournalHistory();
        this.renderWeeklyReviewsArchive();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Event Modals
        document.getElementById('new-event-btn').addEventListener('click', () => {
            document.getElementById('event-title-input').value = '';
            document.getElementById('event-date-input').value = this.selectedDate;
            document.getElementById('event-time-input').value = '';
            window.app.showModal('event-modal');
        });

        document.getElementById('save-event-submit-btn').addEventListener('click', () => this.saveEvent());

        // Journal logic
        document.getElementById('new-journal-btn').addEventListener('click', () => {
            document.getElementById('journal-text-area').value = '';
            this.setJournalRating(0);
            window.app.switchTab('calendar');
            document.getElementById('journal-text-area').focus();
        });

        // Journal star ratings click
        document.querySelectorAll('.star-rating').forEach(star => {
            star.addEventListener('click', () => {
                const val = parseInt(star.getAttribute('data-val'));
                this.setJournalRating(val);
            });
        });

        document.getElementById('save-journal-btn').addEventListener('click', () => this.saveJournalEntry());

        // Weekly review wizard trigger
        document.getElementById('trigger-weekly-review-btn').addEventListener('click', () => this.startWeeklyReviewWizard());
        
        // Wizard navigation buttons
        document.getElementById('wizard-prev-btn').addEventListener('click', () => this.navigateWizard(-1));
        document.getElementById('wizard-next-btn').addEventListener('click', () => this.navigateWizard(1));
        document.getElementById('wizard-finish-btn').addEventListener('click', () => this.finishWeeklyReview());
    }

    // ==========================================
    // Week Calendar Logic
    // ==========================================
    renderWeekCalendar() {
        const grid = document.getElementById('week-days-grid');
        if (!grid) return;

        const label = document.getElementById('current-week-label');
        
        // Calculate start of current week (let's say Sunday)
        const today = new Date();
        const currentDayIndex = today.getDay(); // 0 is Sunday, 6 is Saturday
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - currentDayIndex); // Sunday

        // Render label (month name + starting day)
        const monthName = startOfWeek.toLocaleDateString('ar-SA', { month: 'long' });
        label.textContent = `أسبوع ${startOfWeek.getDate()} ${monthName}`;

        const dayNames = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
        let html = '';

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + i);
            const dayStr = dayDate.toISOString().split('T')[0];

            const isActive = dayStr === this.selectedDate ? 'active' : '';
            const hasEvents = this.hasEventsOnDate(dayStr);

            html += `
                <div class="cal-day-cell ${isActive}" onclick="calendarModule.selectCalendarDay('${dayStr}')">
                    <span class="name">${dayNames[i]}</span>
                    <span class="num">${dayDate.getDate()}</span>
                    ${hasEvents ? '<div class="indicator"></div>' : ''}
                </div>
            `;
        }
        grid.innerHTML = html;
    }

    selectCalendarDay(dateStr) {
        this.selectedDate = dateStr;
        this.renderWeekCalendar();
        this.renderSelectedDayEvents();
    }

    hasEventsOnDate(dateStr) {
        const state = window.app.state;
        const events = state.calendarEvents || [];
        const tasks = state.tasks || [];
        
        const hasCalEvent = events.some(e => e.date === dateStr);
        const hasTask = tasks.some(t => t.dueDate === dateStr && !t.completed);
        
        return hasCalEvent || hasTask;
    }

    renderSelectedDayEvents() {
        const container = document.getElementById('day-events-container');
        const titleEl = document.getElementById('selected-day-events-title');
        const state = window.app.state;
        
        const formattedDate = new Date(this.selectedDate).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' });
        titleEl.textContent = `مواعيد ومهام يوم (${formattedDate}):`;

        // 1. Gather calendar events
        const events = (state.calendarEvents || []).filter(e => e.date === this.selectedDate);
        
        // 2. Gather tasks due on this date
        const tasks = state.tasks.filter(t => t.dueDate === this.selectedDate);

        if (events.length === 0 && tasks.length === 0) {
            container.innerHTML = '<p class="empty-text">لا توجد مواعيد أو مهام مسجلة لهذا اليوم.</p>';
            return;
        }

        let html = '';
        
        // Render appointments
        events.forEach(e => {
            html += `
                <div class="event-item-row ${e.type}">
                    <span class="event-time-badge">${e.time || 'طوال اليوم'}</span>
                    <div class="event-type-dot"></div>
                    <span class="task-title-text"><strong>${e.type === 'rest' ? 'وقت راحة: ' : e.type === 'study' ? 'دراسة: ' : 'موعد: '}</strong>${e.title}</span>
                    <button class="event-delete-btn" onclick="calendarModule.deleteEvent('${e.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
        });

        // Render tasks
        tasks.forEach(t => {
            html += `
                <div class="event-item-row appointment" style="background-color: var(--primary-light); border-right: 3px solid var(--primary-color)">
                    <span class="event-time-badge">${t.alertTime || 'مهمة'}</span>
                    <div class="event-type-dot" style="background-color: var(--primary-color)"></div>
                    <span class="task-title-text" style="${t.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}"><strong>مهام: </strong>${t.title}</span>
                    <span class="task-badge ${t.category}" style="margin-right: auto">${t.category === 'work' ? 'عمل' : t.category === 'study' ? 'دراسة' : 'شخصي'}</span>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    saveEvent() {
        const title = document.getElementById('event-title-input').value.trim();
        const type = document.getElementById('event-type-select').value;
        const date = document.getElementById('event-date-input').value;
        const time = document.getElementById('event-time-input').value;
        const alertToggle = document.getElementById('event-alert-toggle').checked;

        if (!title) {
            alert('الرجاء إدخال عنوان الموعد.');
            return;
        }
        if (!date) {
            alert('الرجاء اختيار تاريخ الموعد.');
            return;
        }

        const newEvent = {
            id: 'ev_' + Date.now(),
            title: title,
            type: type,
            date: date,
            time: time || null,
            alert: alertToggle
        };

        if (!window.app.state.calendarEvents) window.app.state.calendarEvents = [];
        window.app.state.calendarEvents.push(newEvent);

        window.app.saveState();
        this.renderWeekCalendar();
        this.renderSelectedDayEvents();
        window.app.hideModal('event-modal');
        if (window.notificationsModule) window.notificationsModule.toast("تم حفظ الموعد في التقويم بنجاح!", "success");
    }

    deleteEvent(id) {
        const idx = window.app.state.calendarEvents.findIndex(e => e.id === id);
        if (idx !== -1) {
            window.app.state.calendarEvents.splice(idx, 1);
            window.app.saveState();
            this.renderWeekCalendar();
            this.renderSelectedDayEvents();
            if (window.notificationsModule) window.notificationsModule.toast("تم إزالة الحدث.", "warning");
        }
    }

    // ==========================================
    // Journal / Day Rating Logic
    // ==========================================
    setJournalRating(val) {
        this.selectedJournalRating = val;
        document.querySelectorAll('.star-rating').forEach(star => {
            const starVal = parseInt(star.getAttribute('data-val'));
            if (starVal <= val) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    saveJournalEntry() {
        const text = document.getElementById('journal-text-area').value.trim();
        const rating = this.selectedJournalRating;
        const todayStr = new Date().toISOString().split('T')[0];

        if (!text) {
            alert('الرجاء كتابة اليوميات قبل الحفظ.');
            return;
        }
        if (rating === 0) {
            alert('الرجاء اختيار تقييم لليوم بالنجوم.');
            return;
        }

        const newEntry = {
            id: 'j_' + Date.now(),
            text: text,
            rating: rating,
            date: todayStr,
            formattedDate: new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        };

        if (!window.app.state.journal) window.app.state.journal = [];
        
        // Remove duplicate entry for today if exists to overwrite
        const dupIdx = window.app.state.journal.findIndex(j => j.date === todayStr);
        if (dupIdx !== -1) {
            window.app.state.journal.splice(dupIdx, 1);
        }

        window.app.state.journal.unshift(newEntry);
        window.app.saveState();
        
        this.renderJournalHistory();
        document.getElementById('journal-text-area').value = '';
        this.setJournalRating(0);

        if (window.notificationsModule) {
            window.notificationsModule.playChime('success');
            window.notificationsModule.toast("تم حفظ اليوميات وتقييم اليوم بنجاح. فخورون بوعيك الذاتي! 📝", "success");
        }
    }

    renderJournalHistory() {
        const container = document.getElementById('journal-history-list');
        const journal = window.app.state.journal || [];

        if (journal.length === 0) {
            container.innerHTML = '<p class="empty-text">لا توجد يوميات مسجلة سابقاً.</p>';
            return;
        }

        container.innerHTML = journal.map(j => `
            <div class="journal-history-item">
                <div class="journal-history-item-header">
                    <span>${j.formattedDate}</span>
                    <span class="text-warning">${'★'.repeat(j.rating)}${'☆'.repeat(5 - j.rating)}</span>
                </div>
                <p class="journal-history-item-text">${j.text}</p>
            </div>
        `).join('');
    }

    // ==========================================
    // Weekly Review Wizard Logic
    // ==========================================
    startWeeklyReviewWizard() {
        this.currentWizardStep = 1;
        this.compileWeeklyStatistics();
        
        // Reset textareas
        document.getElementById('review-notes-achieved').value = '';
        document.getElementById('review-notes-failed').value = '';
        document.getElementById('review-notes-reasons').value = '';
        document.getElementById('review-notes-actions').value = '';

        this.updateWizardUI();
        window.app.showModal('weekly-review-modal');
    }

    compileWeeklyStatistics() {
        const state = window.app.state;
        const statsEl = document.getElementById('weekly-review-achievements-stats');
        
        // Calculate accomplishments for last 7 days
        const last7DaysTasks = state.tasks.filter(t => t.completed);
        const taskCount = last7DaysTasks.length;

        const habitsCount = (state.health.habits || []).filter(h => h.streak > 0).length;
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const totalSpent = state.transactions
            .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth)
            .reduce((sum, t) => sum + t.amount, 0);

        statsEl.innerHTML = `
            <div class="banner-stats" style="margin-top: 10px; margin-bottom: 15px;">
                <div class="banner-stat-card" style="background-color: var(--primary-light); color: var(--primary-color); border: 1px solid var(--primary-color)">
                    <span class="stat-title">مهام أنجزتها</span>
                    <span class="stat-value">${taskCount}</span>
                </div>
                <div class="banner-stat-card" style="background-color: var(--accent-light); color: var(--accent-color); border: 1px solid var(--accent-color)">
                    <span class="stat-title">عادات ملتزم بها</span>
                    <span class="stat-value">${habitsCount}</span>
                </div>
                <div class="banner-stat-card" style="background-color: var(--danger-light); color: var(--danger-color); border: 1px solid var(--danger-color)">
                    <span class="stat-title">المصروف الشهري</span>
                    <span class="stat-value">${totalSpent} ${window.app.getCurrency()}</span>
                </div>
            </div>
        `;
    }

    navigateWizard(direction) {
        this.currentWizardStep += direction;
        this.updateWizardUI();
    }

    updateWizardUI() {
        const step = this.currentWizardStep;

        // Toggle panes
        document.querySelectorAll('.wizard-content-pane').forEach((pane, idx) => {
            if (idx + 1 === step) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        });

        // Toggle dots
        document.querySelectorAll('.wizard-dot').forEach((dot, idx) => {
            if (idx + 1 === step) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Toggle button visibility
        const prevBtn = document.getElementById('wizard-prev-btn');
        const nextBtn = document.getElementById('wizard-next-btn');
        const finishBtn = document.getElementById('wizard-finish-btn');

        if (step === 1) {
            prevBtn.classList.add('hidden');
            nextBtn.classList.remove('hidden');
            finishBtn.classList.add('hidden');
        } else if (step === 2) {
            prevBtn.classList.remove('hidden');
            nextBtn.classList.remove('hidden');
            finishBtn.classList.add('hidden');
        } else if (step === 3) {
            prevBtn.classList.remove('hidden');
            nextBtn.classList.add('hidden');
            finishBtn.classList.remove('hidden');
        }
    }

    finishWeeklyReview() {
        const achieved = document.getElementById('review-notes-achieved').value.trim();
        const failed = document.getElementById('review-notes-failed').value.trim();
        const reasons = document.getElementById('review-notes-reasons').value.trim();
        const actions = document.getElementById('review-notes-actions').value.trim();

        if (!achieved || !failed || !actions) {
            alert('الرجاء كتابة مراجعات لجميع الخانات المطلوبة في المعالج الأسبوعي.');
            return;
        }

        const newReview = {
            id: 'rev_' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            formattedDate: `مراجعة أسبوعية - ${new Date().toLocaleDateString('ar-SA', { month: 'long', day: 'numeric', year: 'numeric' })}`,
            achieved: achieved,
            failed: failed,
            reasons: reasons,
            actions: actions
        };

        if (!window.app.state.weeklyReviews) window.app.state.weeklyReviews = [];
        window.app.state.weeklyReviews.unshift(newReview);

        window.app.saveState();
        this.renderWeeklyReviewsArchive();
        window.app.hideModal('weekly-review-modal');

        if (window.notificationsModule) {
            window.notificationsModule.playChime('success');
            window.notificationsModule.toast("رائع! لقد أتممت مراجعتك الأسبوعية وحفظتها في الأرشيف بنجاح.", "success");
        }
    }

    renderWeeklyReviewsArchive() {
        const container = document.getElementById('weekly-reviews-container');
        const reviews = window.app.state.weeklyReviews || [];

        if (reviews.length === 0) {
            container.innerHTML = '<p class="empty-text">لم تسجل مراجعات أسبوعية بعد.</p>';
            return;
        }

        container.innerHTML = reviews.map(r => `
            <div class="review-arch-item">
                <div class="review-arch-header">
                    <i class="fa-solid fa-folder-open text-primary"></i> ${r.formattedDate}
                </div>
                <div class="review-arch-body">
                    <div class="review-arch-col">
                        <strong>ما أنجزته:</strong>
                        <p>${r.achieved}</p>
                    </div>
                    <div class="review-arch-col">
                        <strong>الإخفاقات والأسباب:</strong>
                        <p>${r.failed} ${r.reasons ? `<br><small class="text-muted">السبب: ${r.reasons}</small>` : ''}</p>
                    </div>
                    <div class="review-arch-col">
                        <strong>الخطة والأهداف القادمة:</strong>
                        <p>${r.actions}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Attach module to window
window.calendarModule = new CalendarModule();
