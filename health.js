/* ==========================================
   Yusr Dashboard (يُسر) - Health & Habits Logic
   ========================================== */

class HealthModule {
    constructor() {}

    init() {
        this.checkAndResetWaterDaily();
        this.renderWaterWidget();
        this.renderHabits();
        this.renderTodayWorkouts();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Hydration tracker clicks
        document.getElementById('add-water-cup-btn').addEventListener('click', () => this.addWaterCup());
        document.getElementById('reset-water-btn').addEventListener('click', () => this.resetWaterCount());

        // Workout logging submit
        document.getElementById('save-workout-btn').addEventListener('click', () => this.saveWorkout());

        // Habit modal triggers & submit
        document.getElementById('add-habit-btn').addEventListener('click', () => {
            const title = prompt("ادخل اسم العادة الجديدة التي تود الالتزام بها: (مثال: قراءة 15 صفحة، رياضة الصباح، نوم مبكر)");
            if (title && title.trim()) {
                this.createNewHabit(title.trim());
            }
        });
    }

    checkAndResetWaterDaily() {
        const state = window.app.state;
        const todayStr = new Date().toISOString().split('T')[0];

        if (!state.health.water) {
            state.health.water = { date: todayStr, count: 0, goal: 8 };
        }
        if (!state.health.waterHistory) {
            state.health.waterHistory = [];
        }

        // Reset if date changed
        if (state.health.water.date !== todayStr) {
            // Save to history before reset
            const prevDate = state.health.water.date;
            const prevCount = state.health.water.count;
            const prevGoal = state.health.water.goal || 8;
            
            if (prevDate) {
                const existingIdx = state.health.waterHistory.findIndex(h => h.date === prevDate);
                if (existingIdx !== -1) {
                    state.health.waterHistory[existingIdx].count = prevCount;
                } else {
                    state.health.waterHistory.push({ date: prevDate, count: prevCount, goal: prevGoal });
                }
                
                // Limit to last 30 entries
                if (state.health.waterHistory.length > 30) {
                    state.health.waterHistory.shift();
                }
            }

            state.health.water.date = todayStr;
            state.health.water.count = 0;
            window.app.saveState();
        }
    }

    renderWaterWidget() {
        const water = window.app.state.health.water;
        const currentCount = water.count;
        const goalCount = water.goal;

        document.getElementById('water-current-count').textContent = currentCount;
        document.getElementById('water-goal-count').textContent = goalCount;

        const pct = Math.min((currentCount / goalCount) * 100, 100);
        document.getElementById('water-bar').style.height = pct + '%';
    }

    addWaterCup() {
        this.checkAndResetWaterDaily();
        const water = window.app.state.health.water;
        water.count++;

        window.app.saveState();
        this.renderWaterWidget();

        if (window.notificationsModule) {
            window.notificationsModule.playChime('click');
            if (water.count === water.goal) {
                window.notificationsModule.toast("رائع! لقد حققت هدف شرب الماء اليومي الكامل 🎉", "success");
                window.notificationsModule.playChime('success');
            } else {
                window.notificationsModule.toast(`تم تسجيل كوب ماء إضافي (${water.count}/${water.goal})`, 'info');
            }
        }
    }

    resetWaterCount() {
        const water = window.app.state.health.water;
        water.count = 0;
        window.app.saveState();
        this.renderWaterWidget();
        if (window.notificationsModule) window.notificationsModule.toast("تم إعادة تعيين عداد المياه اليومي.", "warning");
    }

    // Workouts tracker
    saveWorkout() {
        const type = document.getElementById('workout-type-input').value.trim();
        const duration = parseInt(document.getElementById('workout-duration-input').value);
        const todayStr = new Date().toISOString().split('T')[0];

        if (!type) {
            alert('يرجى تحديد نوع الرياضة.');
            return;
        }
        if (isNaN(duration) || duration <= 0) {
            alert('يرجى كتابة مدة صحيحة بالدقائق.');
            return;
        }

        const newWorkout = {
            id: 'work_' + Date.now(),
            type: type,
            duration: duration,
            date: todayStr
        };

        if (!window.app.state.health.workouts) window.app.state.health.workouts = [];
        window.app.state.health.workouts.push(newWorkout);

        window.app.saveState();
        this.renderTodayWorkouts();
        
        document.getElementById('workout-type-input').value = '';
        document.getElementById('workout-duration-input').value = '';
        
        if (window.notificationsModule) {
            window.notificationsModule.playChime('success');
            window.notificationsModule.toast(`أحسنت! تم تسجيل تمرينك الرياضي: ${type} لمدة ${duration} دقيقة.`, 'success');
        }
    }

    renderTodayWorkouts() {
        const listEl = document.getElementById('today-workouts-list');
        const todayStr = new Date().toISOString().split('T')[0];
        const workouts = (window.app.state.health.workouts || []).filter(w => w.date === todayStr);

        if (workouts.length === 0) {
            listEl.innerHTML = '<li class="empty-text">لم تسجل تمرينات رياضية لليوم بعد.</li>';
            return;
        }

        listEl.innerHTML = workouts.map(w => `
            <li class="event-item-row" style="margin-bottom: 8px;">
                <span class="event-time-badge">${w.duration} د</span>
                <span><strong>رياضة:</strong> ${w.type}</span>
                <button class="event-delete-btn" onclick="healthModule.deleteWorkout('${w.id}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </li>
        `).join('');
    }

    deleteWorkout(id) {
        const idx = window.app.state.health.workouts.findIndex(w => w.id === id);
        if (idx !== -1) {
            window.app.state.health.workouts.splice(idx, 1);
            window.app.saveState();
            this.renderTodayWorkouts();
            if (window.notificationsModule) window.notificationsModule.toast("تم إزالة التمرين.", "warning");
        }
    }

    // ==========================================
    // Habit Tracker logic
    // ==========================================
    renderHabits() {
        const container = document.getElementById('habits-list-container');
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (!window.app.state.health.habits) {
            window.app.state.health.habits = [
                { id: 'h1', title: 'النوم المبكر (قبل 11 مساءً)', streak: 2, history: [this.getYesterdayStr(), todayStr] },
                { id: 'h2', title: 'شرب 8 أكواب ماء', streak: 1, history: [todayStr] },
                { id: 'h3', title: 'ممارسة الرياضة الصباحية', streak: 0, history: [] }
            ];
            window.app.saveState();
        }

        const habits = window.app.state.health.habits;

        if (habits.length === 0) {
            container.innerHTML = '<p class="empty-text">لا توجد عادات للتتبع بعد. أضف عاداتك المفضلة!</p>';
            return;
        }

        container.innerHTML = habits.map(h => {
            const isDoneToday = h.history && h.history.includes(todayStr);
            return `
                <div class="habit-card">
                    <div class="habit-card-info">
                        <h4>${h.title}</h4>
                        <p>الأيام الملتزمة المتتالية (Streak):</p>
                        <div class="habit-streak-badge">
                            <i class="fa-solid fa-fire"></i> ${h.streak} أيام متتالية
                        </div>
                    </div>
                    <div class="habit-check-area">
                        <button class="btn-outline ${isDoneToday ? 'btn-success text-white' : ''}" onclick="healthModule.toggleHabitCheck('${h.id}')">
                            ${isDoneToday ? '<i class="fa-solid fa-circle-check"></i> تم اليوم' : 'تحديد كمنجز'}
                        </button>
                        <button class="btn-text text-danger" onclick="healthModule.deleteHabit('${h.id}')">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    createNewHabit(title) {
        const newHabit = {
            id: 'h_' + Date.now(),
            title: title,
            streak: 0,
            history: []
        };
        
        if (!window.app.state.health.habits) window.app.state.health.habits = [];
        window.app.state.health.habits.push(newHabit);
        
        window.app.saveState();
        this.renderHabits();
        if (window.notificationsModule) window.notificationsModule.toast(`تم إضافة العادة الجديدة: ${title}`, 'success');
    }

    toggleHabitCheck(id) {
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayStr = this.getYesterdayStr();
        const habit = window.app.state.health.habits.find(h => h.id === id);
        
        if (habit) {
            if (!habit.history) habit.history = [];
            const idx = habit.history.indexOf(todayStr);

            if (idx !== -1) {
                // Uncheck today
                habit.history.splice(idx, 1);
                
                // Recalculate streak downwards
                this.recalculateHabitStreak(habit);
                
                if (window.notificationsModule) {
                    window.notificationsModule.playChime('click');
                    window.notificationsModule.toast("تم إلغاء تحديد إنجاز العادة اليوم.", "warning");
                }
            } else {
                // Check today
                habit.history.push(todayStr);
                
                // Recalculate streak upwards
                this.recalculateHabitStreak(habit);

                if (window.notificationsModule) {
                    window.notificationsModule.playChime('success');
                    window.notificationsModule.toast(`ممتاز! التزمت بعادة (${habit.title}) اليوم.`, 'success');
                }
            }

            window.app.saveState();
            this.renderHabits();
            window.app.updateDashboardStats();
        }
    }

    recalculateHabitStreak(habit) {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Sort history dates in ascending order
        const historySorted = [...habit.history].sort((a,b) => new Date(a) - new Date(b));
        
        if (historySorted.length === 0) {
            habit.streak = 0;
            return;
        }

        let streak = 0;
        let checkDate = new Date(); // start checking from today backwards
        checkDate.setHours(0,0,0,0);

        // If today is not checked, check if yesterday was. If not, streak is 0.
        const hasToday = habit.history.includes(todayStr);
        const hasYesterday = habit.history.includes(this.getYesterdayStr());

        if (!hasToday && !hasYesterday) {
            habit.streak = 0;
            return;
        }

        // If today is checked, start counting from today. Else from yesterday.
        if (!hasToday && hasYesterday) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
            const checkDateStr = checkDate.toISOString().split('T')[0];
            if (habit.history.includes(checkDateStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1); // move back 1 day
            } else {
                break;
            }
        }

        habit.streak = streak;
    }

    deleteHabit(id) {
        if (confirm("هل أنت متأكد من حذف هذه العادة نهائياً؟")) {
            const idx = window.app.state.health.habits.findIndex(h => h.id === id);
            if (idx !== -1) {
                window.app.state.health.habits.splice(idx, 1);
                window.app.saveState();
                this.renderHabits();
                if (window.notificationsModule) window.notificationsModule.toast("تم إزالة العادة.", "warning");
            }
        }
    }

    getYesterdayStr() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }
}

// Attach module to window
window.healthModule = new HealthModule();
