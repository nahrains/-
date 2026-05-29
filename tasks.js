/* ==========================================
   Yusr Dashboard (يُسر) - Tasks & Goals Logic
   ========================================== */

class TasksModule {
    constructor() {
        this.currentFilter = 'all';
        this.focusTimer = null;
        this.focusDuration = 25 * 60; // 25 min default in seconds
        this.focusTimeLeft = 25 * 60;
        this.focusState = 'idle'; // idle, running, paused
        this.activeFocusTask = null;
        this.subtasksList = []; // Temp storage during task creation
    }

    init() {
        this.renderGoals();
        this.renderTasks();
        this.setupEventListeners();
        this.updateGoalDropdowns();
        this.updateFocusWidget();
    }

    setupEventListeners() {
        // Modal launchers
        document.getElementById('new-task-btn').addEventListener('click', () => {
            this.subtasksList = [];
            this.renderSubtasksComposer();
            document.getElementById('task-title-input').value = '';
            document.getElementById('task-goal-select').value = '';
            document.getElementById('task-due-date-input').value = new Date().toISOString().split('T')[0];
            document.getElementById('task-alert-time-input').value = '';
            window.app.showModal('task-modal');
        });

        document.getElementById('new-goal-btn').addEventListener('click', () => {
            document.getElementById('goal-title-input').value = '';
            document.getElementById('goal-desc-input').value = '';
            window.app.showModal('goal-modal');
        });

        // Submit actions
        document.getElementById('save-task-submit-btn').addEventListener('click', () => this.saveTask());
        document.getElementById('save-goal-submit-btn').addEventListener('click', () => this.saveGoal());

        // Subtask composer helper
        document.getElementById('add-subtask-composer-btn').addEventListener('click', () => {
            const input = document.getElementById('subtask-input');
            const val = input.value.trim();
            if (val) {
                this.subtasksList.push({ title: val, completed: false });
                this.renderSubtasksComposer();
                input.value = '';
            }
        });

        // Filter button click handler
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.getAttribute('data-filter');
                this.renderTasks();
            });
        });

        // Toggle task view / focus mode tabs
        const listToggle = document.getElementById('toggle-task-list');
        const focusToggle = document.getElementById('toggle-focus-mode');
        const listView = document.getElementById('tasks-list-view');
        const focusView = document.getElementById('focus-mode-view');

        listToggle.addEventListener('click', () => {
            listToggle.classList.add('active');
            focusToggle.classList.remove('active');
            listView.classList.remove('hidden');
            focusView.classList.add('hidden');
        });

        focusToggle.addEventListener('click', () => {
            focusToggle.classList.add('active');
            listToggle.classList.remove('active');
            focusView.classList.remove('hidden');
            listView.classList.add('hidden');
            this.populateFocusTaskDropdown();
        });

        // Focus session buttons
        document.getElementById('start-focus-session-btn').addEventListener('click', () => this.startFocusSession());
        document.getElementById('focus-pause-btn').addEventListener('click', () => this.pauseFocusSession());
        document.getElementById('focus-resume-btn').addEventListener('click', () => this.resumeFocusSession());
        document.getElementById('focus-cancel-btn').addEventListener('click', () => this.cancelFocusSession());
        document.getElementById('focus-complete-btn').addEventListener('click', () => this.completeFocusSession());

        // Widget dashboard focus sync controls
        document.getElementById('focus-widget-start').addEventListener('click', () => {
            if (this.focusState === 'idle') {
                this.populateFocusTaskDropdown();
                const select = document.getElementById('focus-task-select');
                if (select.options.length > 0) {
                    this.startFocusSession();
                } else {
                    window.app.switchTab('tasks');
                    focusToggle.click();
                    if (window.notificationsModule) window.notificationsModule.toast("يرجى اختيار أو إضافة مهمة للتركيز عليها أولاً.", "info");
                }
            } else if (this.focusState === 'paused') {
                this.resumeFocusSession();
            }
        });
        document.getElementById('focus-widget-pause').addEventListener('click', () => this.pauseFocusSession());
        document.getElementById('focus-widget-reset').addEventListener('click', () => this.cancelFocusSession());
    }

    renderSubtasksComposer() {
        const list = document.getElementById('subtasks-composer-list');
        list.innerHTML = this.subtasksList.map((st, i) => `
            <li>
                <span>${st.title}</span>
                <button type="button" class="btn-text text-danger" onclick="tasksModule.removeSubtaskFromComposer(${i})">&times;</button>
            </li>
        `).join('');
    }

    removeSubtaskFromComposer(idx) {
        this.subtasksList.splice(idx, 1);
        this.renderSubtasksComposer();
    }

    // Save Goal submission
    saveGoal() {
        const title = document.getElementById('goal-title-input').value.trim();
        const category = document.getElementById('goal-category-select').value;
        const desc = document.getElementById('goal-desc-input').value.trim();

        if (!title) {
            alert('يرجى إدخال عنوان للهدف الرئيسي.');
            return;
        }

        const newGoal = {
            id: 'g_' + Date.now(),
            title: title,
            category: category,
            desc: desc,
            progress: 0
        };

        window.app.state.goals.push(newGoal);
        window.app.saveState();
        this.renderGoals();
        this.updateGoalDropdowns();
        window.app.hideModal('goal-modal');
        if (window.notificationsModule) window.notificationsModule.toast("تم حفظ الهدف الجديد بنجاح!", "success");
    }

    // Save Task submission
    saveTask() {
        const title = document.getElementById('task-title-input').value.trim();
        const category = document.getElementById('task-category-select').value;
        const priority = document.getElementById('task-priority-select').value;
        const goalId = document.getElementById('task-goal-select').value;
        const dueDate = document.getElementById('task-due-date-input').value;
        const alertTime = document.getElementById('task-alert-time-input').value;

        if (!title) {
            alert('يرجى إدخال عنوان للمهمة.');
            return;
        }

        const newTask = {
            id: 't_' + Date.now(),
            title: title,
            category: category,
            priority: priority,
            goalId: goalId,
            subtasks: [...this.subtasksList],
            dueDate: dueDate || new Date().toISOString().split('T')[0],
            alertTime: alertTime || null,
            completed: false
        };

        window.app.state.tasks.push(newTask);
        this.recalculateGoalProgress(goalId);
        window.app.saveState();
        
        this.renderTasks();
        window.app.hideModal('task-modal');
        if (window.notificationsModule) window.notificationsModule.toast("تم إضافة المهمة بنجاح!", "success");
    }

    renderGoals() {
        const container = document.getElementById('goals-container');
        const goals = window.app.state.goals;
        
        if (goals.length === 0) {
            container.innerHTML = '<p class="empty-text">لم تقم بإضافة أهداف كبرى بعد.</p>';
            return;
        }

        container.innerHTML = goals.map(g => `
            <div class="goal-card ${g.category}">
                <div class="goal-card-header">
                    <h4>${g.title}</h4>
                    <button class="goal-delete-btn" onclick="tasksModule.deleteGoal('${g.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
                ${g.desc ? `<p class="goal-card-desc">${g.desc}</p>` : ''}
                <div class="goal-progress">
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill" style="width: ${g.progress}%"></div>
                    </div>
                    <div class="goal-progress-text">نسبة التقدم: ${g.progress}%</div>
                </div>
            </div>
        `).join('');
    }

    renderTasks() {
        const container = document.getElementById('tasks-container');
        let tasks = window.app.state.tasks;

        // Apply filters
        if (this.currentFilter === 'completed') {
            tasks = tasks.filter(t => t.completed);
        } else if (this.currentFilter !== 'all') {
            tasks = tasks.filter(t => t.category === this.currentFilter && !t.completed);
        } else {
            // Sort to show non-completed first, then by priority (high to low)
            tasks = [...tasks].sort((a, b) => {
                if (a.completed && !b.completed) return 1;
                if (!a.completed && b.completed) return -1;
                
                const priorityWeight = { high: 3, medium: 2, low: 1 };
                return priorityWeight[b.priority] - priorityWeight[a.priority];
            });
        }

        if (tasks.length === 0) {
            container.innerHTML = '<p class="empty-text">لا توجد مهام مطابقة للفلتر المحدد.</p>';
            return;
        }

        container.innerHTML = tasks.map(t => {
            const goal = window.app.state.goals.find(g => g.id === t.goalId);
            return `
                <div class="task-card ${t.completed ? 'completed' : ''}">
                    <div class="task-card-main">
                        <div class="task-checkbox ${t.completed ? 'checked' : ''}" onclick="tasksModule.toggleTaskState('${t.id}')">
                            <i class="fa-solid fa-check"></i>
                        </div>
                        <span class="task-title-text">${t.title}</span>
                        <span class="task-badge ${t.category}">${t.category === 'work' ? 'عمل' : t.category === 'study' ? 'دراسة' : 'شخصي'}</span>
                        <div class="task-priority-dot ${t.priority}" title="الأولوية: ${t.priority}"></div>
                        <button class="task-card-action" onclick="tasksModule.deleteTask('${t.id}')">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                    ${t.subtasks && t.subtasks.length > 0 ? `
                        <ul class="task-subtasks-list">
                            ${t.subtasks.map((st, i) => `
                                <li class="subtask-item ${st.completed ? 'completed' : ''}">
                                    <div class="subtask-checkbox ${st.completed ? 'checked' : ''}" onclick="tasksModule.toggleSubtask('${t.id}', ${i})">
                                        <i class="fa-solid fa-check"></i>
                                    </div>
                                    <span>${st.title}</span>
                                </li>
                            `).join('')}
                        </ul>
                    ` : ''}
                    ${goal ? `
                        <div class="task-card-details">
                            <span><i class="fa-solid fa-bullseye"></i> الهدف المرتبط: ${goal.title}</span>
                            ${t.dueDate ? `<span><i class="fa-solid fa-calendar-day"></i> موعد الاستحقاق: ${t.dueDate}</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        this.populateFocusTaskDropdown();
    }

    toggleTaskState(taskId) {
        const task = window.app.state.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            
            // Mark all subtasks as completed if task is completed
            if (task.subtasks) {
                task.subtasks.forEach(st => st.completed = task.completed);
            }

            // Sync with goals progress
            if (task.goalId) {
                this.recalculateGoalProgress(task.goalId);
            }

            window.app.saveState();
            this.renderTasks();
            this.renderGoals();
            
            if (window.notificationsModule) {
                const sound = task.completed ? 'success' : 'click';
                window.notificationsModule.playChime(sound);
                window.notificationsModule.toast(task.completed ? "أحسنت! تم إنجاز المهمة بنجاح." : "تم إلغاء تحديد إنجاز المهمة.", "success");
            }
        }
    }

    toggleSubtask(taskId, subtaskIdx) {
        const task = window.app.state.tasks.find(t => t.id === taskId);
        if (task && task.subtasks && task.subtasks[subtaskIdx]) {
            task.subtasks[subtaskIdx].completed = !task.subtasks[subtaskIdx].completed;
            
            // If all subtasks are checked, auto-complete parent task
            const allChecked = task.subtasks.every(st => st.completed);
            task.completed = allChecked;

            if (task.goalId) {
                this.recalculateGoalProgress(task.goalId);
            }

            window.app.saveState();
            this.renderTasks();
            this.renderGoals();

            if (window.notificationsModule) {
                window.notificationsModule.playChime('click');
            }
        }
    }

    deleteTask(taskId) {
        const taskIdx = window.app.state.tasks.findIndex(t => t.id === taskId);
        if (taskIdx !== -1) {
            const task = window.app.state.tasks[taskIdx];
            window.app.state.tasks.splice(taskIdx, 1);
            if (task.goalId) {
                this.recalculateGoalProgress(task.goalId);
            }
            window.app.saveState();
            this.renderTasks();
            this.renderGoals();
            if (window.notificationsModule) window.notificationsModule.toast("تم حذف المهمة.", "warning");
        }
    }

    deleteGoal(goalId) {
        if (confirm("هل أنت متأكد من حذف هذا الهدف الرئيسي؟ سيؤدي ذلك إلى إلغاء ربطه بجميع المهام المرتبطة.")) {
            const idx = window.app.state.goals.findIndex(g => g.id === goalId);
            if (idx !== -1) {
                window.app.state.goals.splice(idx, 1);
                
                // Unlink tasks
                window.app.state.tasks.forEach(t => {
                    if (t.goalId === goalId) t.goalId = '';
                });

                window.app.saveState();
                this.renderGoals();
                this.renderTasks();
                this.updateGoalDropdowns();
                if (window.notificationsModule) window.notificationsModule.toast("تم حذف الهدف بنجاح.", "warning");
            }
        }
    }

    recalculateGoalProgress(goalId) {
        if (!goalId) return;
        const goal = window.app.state.goals.find(g => g.id === goalId);
        if (goal) {
            const linkedTasks = window.app.state.tasks.filter(t => t.goalId === goalId);
            if (linkedTasks.length === 0) {
                goal.progress = 0;
            } else {
                // Calculate average completion of tasks + subtasks
                let totalPoints = 0;
                let completedPoints = 0;

                linkedTasks.forEach(t => {
                    if (t.subtasks && t.subtasks.length > 0) {
                        // Subtasks weight
                        t.subtasks.forEach(st => {
                            totalPoints += 1;
                            if (st.completed) completedPoints += 1;
                        });
                    } else {
                        // Task itself weights 1
                        totalPoints += 1;
                        if (t.completed) completedPoints += 1;
                    }
                });

                goal.progress = Math.round((completedPoints / totalPoints) * 100);
            }
        }
    }

    updateGoalDropdowns() {
        const selects = [document.getElementById('task-goal-select'), document.getElementById('trans-goal-select')];
        const goals = window.app.state.goals;
        
        selects.forEach(select => {
            if (!select) return;
            const originalVal = select.value;
            select.innerHTML = '<option value="">غير مرتبط بهدف</option>';
            goals.forEach(g => {
                select.innerHTML += `<option value="${g.id}">${g.title}</option>`;
            });
            select.value = originalVal;
        });
    }

    populateFocusTaskDropdown() {
        const select = document.getElementById('focus-task-select');
        if (!select) return;
        const activeTasks = window.app.state.tasks.filter(t => !t.completed);
        
        select.innerHTML = '';
        if (activeTasks.length === 0) {
            select.innerHTML = '<option value="">لا توجد مهام نشطة حالياً</option>';
            return;
        }

        activeTasks.forEach(t => {
            select.innerHTML += `<option value="${t.id}">${t.title}</option>`;
        });
    }

    // ==========================================
    // Focus Mode (Pomodoro Timer) Logic
    // ==========================================
    startFocusSession() {
        const select = document.getElementById('focus-task-select');
        const taskId = select.value;
        const durationInput = document.getElementById('focus-duration-input');
        
        if (!taskId) {
            alert('الرجاء اختيار مهمة صحيحة للتركيز عليها.');
            return;
        }

        const task = window.app.state.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.activeFocusTask = task;
        const minutes = parseInt(durationInput.value) || 25;
        this.focusDuration = minutes * 60;
        this.focusTimeLeft = this.focusDuration;
        this.focusState = 'running';

        // Update UI View
        document.getElementById('focus-setup-area').classList.add('hidden');
        document.getElementById('focus-active-area').classList.remove('hidden');
        document.getElementById('active-focus-task-title').textContent = task.title;

        const goal = window.app.state.goals.find(g => g.id === task.goalId);
        const goalLabel = document.getElementById('active-focus-goal-title');
        if (goal) {
            goalLabel.textContent = `الهدف المرتبط: ${goal.title}`;
            goalLabel.classList.remove('hidden');
        } else {
            goalLabel.classList.add('hidden');
        }

        // Setup ticking interval
        this.runTimer();
        this.updateFocusWidget();
        
        if (window.notificationsModule) {
            window.notificationsModule.playChime('start');
            window.notificationsModule.toast(`بدأت جلسة التركيز لمهمة: ${task.title}`, 'info');
        }
    }

    runTimer() {
        if (this.focusTimer) clearInterval(this.focusTimer);
        
        this.focusTimer = setInterval(() => {
            if (this.focusTimeLeft > 0) {
                this.focusTimeLeft--;
                this.updateFocusTimerUI();
            } else {
                this.completeFocusSession(true); // completed by timer
            }
        }, 1000);
    }

    updateFocusTimerUI() {
        const minutes = Math.floor(this.focusTimeLeft / 60);
        const seconds = this.focusTimeLeft % 60;
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update Focus panel timer
        document.getElementById('main-timer-text').textContent = timeStr;
        
        // Update Dashboard widget timer
        document.getElementById('focus-widget-timer').textContent = timeStr;

        // Update SVG Progress circle
        const circle = document.getElementById('timer-progress-bar');
        if (circle) {
            const radius = circle.r.baseVal.value;
            const circumference = radius * 2 * Math.PI;
            const offset = circumference - (this.focusTimeLeft / this.focusDuration) * circumference;
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            circle.style.strokeDashoffset = offset;
        }

        // Update Browser Document Title
        document.title = `⏱️ ${timeStr} | يُسر`;
    }

    pauseFocusSession() {
        this.focusState = 'paused';
        clearInterval(this.focusTimer);
        this.updateFocusWidget();

        document.getElementById('focus-pause-btn').classList.add('hidden');
        document.getElementById('focus-resume-btn').classList.remove('hidden');
        if (window.notificationsModule) window.notificationsModule.playChime('click');
    }

    resumeFocusSession() {
        this.focusState = 'running';
        this.runTimer();
        this.updateFocusWidget();

        document.getElementById('focus-resume-btn').classList.add('hidden');
        document.getElementById('focus-pause-btn').classList.remove('hidden');
        if (window.notificationsModule) window.notificationsModule.playChime('click');
    }

    cancelFocusSession() {
        clearInterval(this.focusTimer);
        this.focusState = 'idle';
        this.activeFocusTask = null;
        document.title = "يُسر | لوحة تحكم حياتك المتكاملة";

        // Reset elements
        document.getElementById('focus-setup-area').classList.remove('hidden');
        document.getElementById('focus-active-area').classList.add('hidden');
        this.updateFocusWidget();
        if (window.notificationsModule) window.notificationsModule.toast("تم إلغاء جلسة التركيز.", "warning");
    }

    completeFocusSession(byTimer = false) {
        clearInterval(this.focusTimer);
        const task = this.activeFocusTask;
        
        if (task) {
            // Auto complete task
            this.toggleTaskState(task.id);
        }

        this.focusState = 'idle';
        this.activeFocusTask = null;
        document.title = "يُسر | لوحة تحكم حياتك المتكاملة";

        // Reset views
        document.getElementById('focus-setup-area').classList.remove('hidden');
        document.getElementById('focus-active-area').classList.add('hidden');
        this.updateFocusWidget();

        if (window.notificationsModule) {
            window.notificationsModule.playChime('alarm');
            if (byTimer) {
                window.notificationsModule.toast(`رائع! انتهى الوقت المخصص لجلسة التركيز وأُنجزت المهمة. خذ قسطاً من الراحة!`, 'success');
                // Send native browser notification
                window.notificationsModule.sendBrowserNotification("جلسة التركيز انتهت!", {
                    body: `أكملت مهمة: "${task ? task.title : ''}" بنجاح. خذ 5 دقائق للراحة.`,
                    icon: 'icons/icon-192.png'
                });
            }
        }
    }

    updateFocusWidget() {
        const widgetTaskName = document.getElementById('focus-widget-task-name');
        const widgetTimer = document.getElementById('focus-widget-timer');
        const startBtn = document.getElementById('focus-widget-start');
        const pauseBtn = document.getElementById('focus-widget-pause');
        const resetBtn = document.getElementById('focus-widget-reset');

        if (this.focusState === 'idle') {
            widgetTaskName.textContent = "لا توجد مهمة نشطة حالياً";
            widgetTimer.textContent = "25:00";
            
            startBtn.classList.remove('hidden');
            startBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            pauseBtn.classList.add('hidden');
            resetBtn.classList.add('hidden');
        } else if (this.focusState === 'running') {
            widgetTaskName.textContent = this.activeFocusTask ? this.activeFocusTask.title : '';
            
            startBtn.classList.add('hidden');
            pauseBtn.classList.remove('hidden');
            resetBtn.classList.remove('hidden');
        } else if (this.focusState === 'paused') {
            widgetTaskName.textContent = `(مؤقت) ${this.activeFocusTask ? this.activeFocusTask.title : ''}`;
            
            startBtn.classList.remove('hidden');
            startBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            pauseBtn.classList.add('hidden');
            resetBtn.classList.remove('hidden');
        }
    }
}

// Attach module to window
window.tasksModule = new TasksModule();
