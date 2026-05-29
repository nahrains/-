/* ==========================================
   Yusr Dashboard (يُسر) - Finance Hub Logic
   ========================================== */

class FinanceModule {
    constructor() {
        this.activeSubtab = 'fin-lifestyle';
    }

    init() {
        this.renderAll();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Sub-tabs navigation
        document.querySelectorAll('.fin-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.fin-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.activeSubtab = btn.getAttribute('data-subtab');
                document.querySelectorAll('.fin-sub-pane').forEach(p => {
                    if (p.id === `subtab-${this.activeSubtab}`) {
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
                    }
                });
                
                // Specific updates
                if (this.activeSubtab === 'fin-lifestyle') {
                    this.renderLifestyleCost();
                }
            });
        });

        // Trigger Modals
        document.getElementById('new-transaction-btn').addEventListener('click', () => {
            document.getElementById('trans-amount-input').value = '';
            document.getElementById('trans-desc-input').value = '';
            document.getElementById('trans-mood-select').value = '';
            document.getElementById('trans-date-input').value = new Date().toISOString().split('T')[0];
            this.updateTransactionModalCategories();
            window.app.showModal('transaction-modal');
        });

        document.getElementById('new-budget-btn').addEventListener('click', () => {
            this.renderBudgetsSetupForm();
            window.app.showModal('budgets-modal');
        });

        document.getElementById('add-subscription-btn').addEventListener('click', () => {
            document.getElementById('sub-name-input').value = '';
            document.getElementById('sub-cost-input').value = '';
            document.getElementById('sub-date-input').value = new Date().toISOString().split('T')[0];
            window.app.showModal('subscription-modal');
        });

        document.getElementById('add-debt-btn').addEventListener('click', () => {
            document.getElementById('debt-name-input').value = '';
            document.getElementById('debt-total-input').value = '';
            document.getElementById('debt-paid-input').value = '0';
            document.getElementById('debt-date-input').value = new Date().toISOString().split('T')[0];
            window.app.showModal('debt-modal');
        });

        // Toggle transaction category list based on Expense vs Income radio buttons
        document.querySelectorAll('input[name="trans-type"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateTransactionModalCategories());
        });

        // Submit buttons actions
        document.getElementById('save-transaction-submit-btn').addEventListener('click', () => this.saveTransaction());
        document.getElementById('save-budgets-submit-btn').addEventListener('click', () => this.saveBudgets());
        document.getElementById('save-subscription-submit-btn').addEventListener('click', () => this.saveSubscription());
        document.getElementById('save-debt-submit-btn').addEventListener('click', () => this.saveDebt());

        // Lifestyle cost update submit
        document.getElementById('save-comfort-cost-btn').addEventListener('click', () => {
            const input = document.getElementById('custom-comfort-cost-input');
            const val = parseFloat(input.value);
            if (!isNaN(val) && val >= 0) {
                window.app.state.settings.comfortCost = val;
                window.app.saveState();
                this.renderLifestyleCost();
                input.value = '';
                if (window.notificationsModule) window.notificationsModule.toast("تم تحديث المصروف المريح المخصص.", "success");
            }
        });

        // Add savings to FIRE target
        document.getElementById('add-fire-saving-btn').addEventListener('click', () => {
            const input = document.getElementById('fire-saving-add-input');
            const val = parseFloat(input.value);
            if (!isNaN(val) && val > 0) {
                window.app.state.settings.fireSaved = (window.app.state.settings.fireSaved || 0) + val;
                
                // Track as a transaction too (as a special savings/investment expense)
                const newTransaction = {
                    id: 'tr_' + Date.now(),
                    type: 'expense',
                    amount: val,
                    desc: 'تحويل ادخار استثماري (الحرية المالية)',
                    category: 'ترفيه', // default to tahrir or we can keep it un-budgeted
                    isSavingsInvestment: true,
                    date: new Date().toISOString().split('T')[0]
                };
                window.app.state.transactions.push(newTransaction);

                window.app.saveState();
                this.renderLifestyleCost();
                this.renderSummaryCards();
                this.renderTransactions();
                input.value = '';
                if (window.notificationsModule) window.notificationsModule.toast(`أحسنت ادخار ${val} ${window.app.getCurrency()} إضافية للحرية المالية!`, "success");
            }
        });
    }

    updateTransactionModalCategories() {
        const type = document.querySelector('input[name="trans-type"]:checked').value;
        const select = document.getElementById('trans-category-select');
        
        if (type === 'expense') {
            select.innerHTML = `
                <option value="أكل">أكل</option>
                <option value="مواصلات">مواصلات</option>
                <option value="اشتراكات">اشتراكات</option>
                <option value="تسوق">تسوق</option>
                <option value="فواتير">فواتير</option>
                <option value="قهوة">قهوة</option>
                <option value="ترفيه">ترفيه</option>
            `;
        } else {
            select.innerHTML = `
                <option value="راتب">راتب</option>
                <option value="عمل حر">عمل حر</option>
                <option value="مشاريع">مشاريع</option>
                <option value="تحويلات">تحويلات</option>
                <option value="أرباح">أرباح</option>
            `;
        }
    }

    renderAll() {
        this.renderSummaryCards();
        this.renderLifestyleCost();
        this.renderTransactions();
        this.renderBudgetsList();
        this.renderSubscriptions();
        this.renderDebts();
    }

    // Main summary widgets renderer
    renderSummaryCards() {
        const state = window.app.state;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        // 1. Current Month Expenses
        const monthlyExpenses = state.transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                const d = new Date(t.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        document.getElementById('fin-month-expense').textContent = monthlyExpenses.toLocaleString('ar-SA') + ' ' + window.app.getCurrency();

        // Compare to last month
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const lastMonthExpenses = state.transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                const d = new Date(t.date);
                return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        const compareEl = document.getElementById('fin-month-compare');
        if (lastMonthExpenses > 0) {
            const diffPct = Math.round(((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100);
            if (diffPct > 0) {
                compareEl.innerHTML = `<span class="text-danger"><i class="fa-solid fa-arrow-trend-up"></i> أعلى بـ ${diffPct}%</span> عن الشهر الماضي (${lastMonthExpenses.toLocaleString('ar-SA')} ${window.app.getCurrency()})`;
            } else if (diffPct < 0) {
                compareEl.innerHTML = `<span class="text-success"><i class="fa-solid fa-arrow-trend-down"></i> أقل بـ ${Math.abs(diffPct)}%</span> عن الشهر الماضي (${lastMonthExpenses.toLocaleString('ar-SA')} ${window.app.getCurrency()})`;
            } else {
                compareEl.innerHTML = `مساوي لمصاريف الشهر الماضي بالضبط`;
            }
        } else {
            compareEl.textContent = "مقارنة بالشهر الماضي: لا تتوفر بيانات";
        }

        // 2. Budget limits
        const totalBudgetLimit = Object.values(state.budgets).reduce((sum, val) => sum + val, 0);
        document.getElementById('fin-month-budget-total').textContent = `إجمالي ميزانيتك: ${totalBudgetLimit.toLocaleString('ar-SA')} ${window.app.getCurrency()}`;

        const remaining = totalBudgetLimit - monthlyExpenses;
        const remainingEl = document.getElementById('fin-month-remaining');
        remainingEl.textContent = remaining.toLocaleString('ar-SA') + ' ' + window.app.getCurrency();
        if (remaining < 0) {
            remainingEl.className = 'fin-card-value text-danger';
        } else {
            remainingEl.className = 'fin-card-value text-success';
        }

        // 3. Savings Log
        const monthlyIncome = state.transactions
            .filter(t => {
                if (t.type !== 'income') return false;
                const d = new Date(t.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        const monthlySavings = monthlyIncome - monthlyExpenses;
        const savingsEl = document.getElementById('fin-month-savings');
        savingsEl.textContent = (monthlySavings > 0 ? monthlySavings : 0).toLocaleString('ar-SA') + ' ' + window.app.getCurrency();

        const pctEl = document.getElementById('fin-savings-percentage');
        if (monthlyIncome > 0) {
            const savingsPct = Math.round((monthlySavings / monthlyIncome) * 100);
            pctEl.textContent = `نسبة الادخار من الدخل: ${savingsPct > 0 ? savingsPct : 0}%`;
        } else {
            pctEl.textContent = `نسبة الادخار من الدخل: 0% (لم تسجل دخلاً)`;
        }
    }

    // Lifestyle Cost sub-tab calculations
    renderLifestyleCost() {
        const state = window.app.state;
        
        // Calculate dynamic comfort cost based on average essential categories (أكل، فواتير، مواصلات، اشتراكات)
        const essentialsCategories = ['أكل', 'فواتير', 'مواصلات', 'اشتراكات'];
        
        // Take monthly budgets for these categories as default base
        let calculatedComfortCost = 0;
        essentialsCategories.forEach(cat => {
            calculatedComfortCost += state.budgets[cat] || 0;
        });

        // Add monthly subscriptions total
        const subscriptions = state.subscriptions || [];
        const subscriptionsTotal = subscriptions.reduce((sum, sub) => sum + sub.cost, 0);
        calculatedComfortCost += subscriptionsTotal;

        // Use customComfortCost if set, else fallback to calculated
        const activeComfortCost = state.settings.comfortCost || calculatedComfortCost;

        document.getElementById('lifestyle-comfort-cost').textContent = activeComfortCost.toLocaleString('ar-SA') + ' ' + window.app.getCurrency() + ' / شهرياً';

        // Calculate FIRE Target (Comfort Cost * 12 * 25)
        const fireTarget = activeComfortCost * 12 * 25;
        document.getElementById('lifestyle-fire-target').textContent = fireTarget.toLocaleString('ar-SA') + ' ' + window.app.getCurrency();

        // Render progress
        const saved = state.settings.fireSaved || 0;
        document.getElementById('fire-current-progress-label').textContent = saved.toLocaleString('ar-SA') + ' ' + window.app.getCurrency();
        
        const pct = fireTarget > 0 ? Math.min(Math.round((saved / fireTarget) * 100), 100) : 0;
        const fill = document.getElementById('fire-progress-bar');
        fill.style.width = pct + '%';
        
        // Optional label with progress percent
        document.getElementById('fire-current-progress-label').innerHTML += ` (<strong>${pct}%</strong> من الهدف)`;
    }

    // Transactions list view
    renderTransactions() {
        const body = document.getElementById('transactions-table-body');
        const filter = document.getElementById('transaction-type-filter').value;
        let list = window.app.state.transactions;

        // Sort: newest first
        list = [...list].sort((a,b) => new Date(b.date) - new Date(a.date));

        if (filter !== 'all') {
            list = list.filter(t => t.type === filter);
        }

        if (list.length === 0) {
            body.innerHTML = '<tr><td colspan="7" class="empty-text">لا توجد عمليات مسجلة بعد.</td></tr>';
            return;
        }

        body.innerHTML = list.map(t => `
            <tr>
                <td>${t.date}</td>
                <td>${t.desc}</td>
                <td><span class="task-badge ${t.type === 'expense' ? 'personal' : 'work'}">${t.category}</span></td>
                <td>${t.mood ? `${t.mood}` : '--'}</td>
                <td>${t.type === 'expense' ? '<span class="text-danger">مصروف</span>' : '<span class="text-success">دخل</span>'}</td>
                <td class="${t.type === 'expense' ? 'amount-expense' : 'amount-income'}">${t.type === 'expense' ? '-' : '+'}${t.amount} ${window.app.getCurrency()}</td>
                <td>
                    <button class="btn-text text-danger" onclick="financeModule.deleteTransaction('${t.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    saveTransaction() {
        const type = document.querySelector('input[name="trans-type"]:checked').value;
        const amount = parseFloat(document.getElementById('trans-amount-input').value);
        const desc = document.getElementById('trans-desc-input').value.trim();
        const category = document.getElementById('trans-category-select').value;
        const mood = document.getElementById('trans-mood-select').value;
        const date = document.getElementById('trans-date-input').value;

        if (isNaN(amount) || amount <= 0) {
            alert('الرجاء إدخال مبلغ صحيح.');
            return;
        }

        if (!desc) {
            alert('يرجى كتابة وصف للعملية.');
            return;
        }

        const newTrans = {
            id: 'tr_' + Date.now(),
            type: type,
            amount: amount,
            desc: desc,
            category: category,
            mood: type === 'expense' ? mood : '',
            date: date || new Date().toISOString().split('T')[0]
        };

        window.app.state.transactions.push(newTrans);
        
        // Budget warnings check
        if (type === 'expense') {
            this.checkBudgetThreshold(category);
        }

        window.app.saveState();
        this.renderAll();
        window.app.hideModal('transaction-modal');
        if (window.notificationsModule) window.notificationsModule.toast("تم تسجيل المعاملة المالية بنجاح!", "success");
    }

    deleteTransaction(transId) {
        const idx = window.app.state.transactions.findIndex(t => t.id === transId);
        if (idx !== -1) {
            window.app.state.transactions.splice(idx, 1);
            window.app.saveState();
            this.renderAll();
            if (window.notificationsModule) window.notificationsModule.toast("تم حذف المعاملة.", "warning");
        }
    }

    // Category Budgets list tab
    renderBudgetsList() {
        const container = document.getElementById('budgets-container');
        const state = window.app.state;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const categories = ['أكل', 'مواصلات', 'اشتراكات', 'تسوق', 'فواتير', 'قهوة', 'ترفيه'];
        let overallSpent = 0;
        let overallBudget = 0;
        let warningNotices = [];

        container.innerHTML = categories.map(cat => {
            const limit = state.budgets[cat] || 0;
            
            // Calculate actual spend for category this month
            const spent = state.transactions
                .filter(t => {
                    return t.type === 'expense' && 
                           t.category === cat && 
                           new Date(t.date).getMonth() === currentMonth && 
                           new Date(t.date).getFullYear() === currentYear;
                })
                .reduce((sum, t) => sum + t.amount, 0);

            overallSpent += spent;
            overallBudget += limit;

            const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            
            // Determine warning color
            let fillClass = '';
            if (pct >= 100) {
                fillClass = 'danger';
                warningNotices.push(`<p class="text-danger"><i class="fa-solid fa-circle-exclamation"></i> لقد تجاوزت ميزانية <strong>${cat}</strong> بالكامل!</p>`);
            } else if (pct >= 80) {
                fillClass = 'warning';
                warningNotices.push(`<p class="text-warning"><i class="fa-solid fa-triangle-exclamation"></i> اقتربت من الحد الأقصى لميزانية <strong>${cat}</strong> (${pct}%).</p>`);
            }

            return `
                <div class="budget-item">
                    <div class="budget-item-info">
                        <span>${cat}</span>
                        <span>${spent.toLocaleString('ar-SA')} / ${limit.toLocaleString('ar-SA')} ${window.app.getCurrency()}</span>
                    </div>
                    <div class="budget-item-bar">
                        <div class="budget-item-fill ${fillClass}" style="width: ${Math.min(pct, 100)}%"></div>
                    </div>
                    <div class="budget-item-details">
                        <span>نسبة الاستهلاك: ${pct}%</span>
                        <span>المتبقي: ${(limit - spent).toLocaleString('ar-SA')} ${window.app.getCurrency()}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Calculate Overall Budget Progress
        const overallPct = overallBudget > 0 ? Math.round((overallSpent / overallBudget) * 100) : 0;
        document.getElementById('overall-budget-percentage').textContent = overallPct + '%';
        
        const noticesContainer = document.getElementById('budget-notices-container');
        if (warningNotices.length > 0) {
            noticesContainer.innerHTML = warningNotices.join('');
        } else {
            noticesContainer.innerHTML = '<p class="text-success"><i class="fa-solid fa-circle-check"></i> إنفاقك ممتاز وضمن الحدود الآمنة للجميع!</p>';
        }
    }

    renderBudgetsSetupForm() {
        const body = document.getElementById('budgets-setup-body');
        const state = window.app.state;
        const categories = ['أكل', 'مواصلات', 'اشتراكات', 'تسوق', 'فواتير', 'قهوة', 'ترفيه'];

        body.innerHTML = categories.map(cat => `
            <div class="form-group">
                <label>ميزانية ${cat}:</label>
                <input type="number" id="budget-input-${cat}" class="form-control budget-setup-input" data-category="${cat}" value="${state.budgets[cat] || 0}">
            </div>
        `).join('');
    }

    saveBudgets() {
        const inputs = document.querySelectorAll('.budget-setup-input');
        inputs.forEach(input => {
            const cat = input.getAttribute('data-category');
            const val = parseFloat(input.value);
            if (!isNaN(val) && val >= 0) {
                window.app.state.budgets[cat] = val;
            }
        });

        window.app.saveState();
        this.renderAll();
        window.app.hideModal('budgets-modal');
        if (window.notificationsModule) window.notificationsModule.toast("تم تحديث الميزانيات بنجاح!", "success");
    }

    // Check budget limit threshold (called when adding transaction or quick commands)
    checkBudgetThreshold(category) {
        const state = window.app.state;
        const limit = state.budgets[category] || 0;
        if (limit === 0) return;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const spent = state.transactions
            .filter(t => {
                return t.type === 'expense' && 
                       t.category === category && 
                       new Date(t.date).getMonth() === currentMonth && 
                       new Date(t.date).getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        const pct = Math.round((spent / limit) * 100);
        
        if (window.notificationsModule) {
            if (pct >= 100) {
                window.notificationsModule.toast(`⚠️ تنبيه مالي: لقد تجاوزت ميزانية (${category}) بالكامل!`, 'danger');
                window.notificationsModule.sendBrowserNotification("تجاوزت الميزانية!", {
                    body: `تجاوزت حد الميزانية المخصص لتصنيف (${category}). يرجى ترشيد الاستهلاك.`,
                    icon: 'icons/icon-192.png'
                });
            } else if (pct >= 80) {
                window.notificationsModule.toast(`⚠️ تنبيه مالي: استهلكت ${pct}% من ميزانية (${category})!`, 'warning');
            }
        }
    }

    // Subscriptions logic
    renderSubscriptions() {
        const body = document.getElementById('subscriptions-table-body');
        const subs = window.app.state.subscriptions || [];

        if (subs.length === 0) {
            body.innerHTML = '<tr><td colspan="6" class="empty-text">لا توجد اشتراكات شهرية مضافة بعد.</td></tr>';
            document.getElementById('subs-total-val').textContent = '0 ' + window.app.getCurrency();
            return;
        }

        const totalCost = subs.reduce((sum, s) => sum + s.cost, 0);
        document.getElementById('subs-total-val').textContent = totalCost.toLocaleString('ar-SA') + ' ' + window.app.getCurrency();

        body.innerHTML = subs.map(s => {
            const daysLeft = this.calculateDaysRemaining(s.nextRenewal);
            const alertText = s.alert ? '<span class="text-success"><i class="fa-solid fa-circle-check"></i> نشط</span>' : '<span class="text-muted">معطل</span>';
            return `
                <tr>
                    <td><strong>${s.name}</strong></td>
                    <td class="text-danger">${s.cost} ${window.app.getCurrency()}</td>
                    <td>${s.nextRenewal}</td>
                    <td><span class="task-badge ${daysLeft <= 3 ? 'personal' : 'work'}">${daysLeft} أيام</span></td>
                    <td>${alertText}</td>
                    <td>
                        <button class="btn-text text-danger" onclick="financeModule.deleteSubscription('${s.id}')">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    saveSubscription() {
        const name = document.getElementById('sub-name-input').value.trim();
        const cost = parseFloat(document.getElementById('sub-cost-input').value);
        const nextRenewal = document.getElementById('sub-date-input').value;
        const alertToggle = document.getElementById('sub-alert-toggle').checked;

        if (!name) {
            alert('الرجاء إدخال اسم الخدمة.');
            return;
        }
        if (isNaN(cost) || cost <= 0) {
            alert('الرجاء إدخال قيمة اشتراك صحيحة.');
            return;
        }
        if (!nextRenewal) {
            alert('الرجاء اختيار تاريخ التجديد القادم.');
            return;
        }

        const newSub = {
            id: 'sub_' + Date.now(),
            name: name,
            cost: cost,
            nextRenewal: nextRenewal,
            alert: alertToggle
        };

        if (!window.app.state.subscriptions) window.app.state.subscriptions = [];
        window.app.state.subscriptions.push(newSub);
        
        window.app.saveState();
        this.renderAll();
        window.app.hideModal('subscription-modal');
        if (window.notificationsModule) window.notificationsModule.toast("تم حفظ قيد الاشتراك بنجاح!", "success");
    }

    deleteSubscription(id) {
        const idx = window.app.state.subscriptions.findIndex(s => s.id === id);
        if (idx !== -1) {
            window.app.state.subscriptions.splice(idx, 1);
            window.app.saveState();
            this.renderAll();
            if (window.notificationsModule) window.notificationsModule.toast("تم إزالة الاشتراك.", "warning");
        }
    }

    // Debts & Installments logic
    renderDebts() {
        const body = document.getElementById('debts-table-body');
        const debts = window.app.state.debts || [];

        if (debts.length === 0) {
            body.innerHTML = '<tr><td colspan="7" class="empty-text">لا توجد ديون أو أقساط مضافة بعد.</td></tr>';
            return;
        }

        body.innerHTML = debts.map(d => {
            const remaining = d.total - d.paid;
            const pct = Math.min(Math.round((d.paid / d.total) * 100), 100);
            return `
                <tr>
                    <td><strong>${d.name}</strong></td>
                    <td>${d.total.toLocaleString('ar-SA')} ${window.app.getCurrency()}</td>
                    <td class="text-success">${d.paid.toLocaleString('ar-SA')} ${window.app.getCurrency()}</td>
                    <td class="text-danger">${remaining.toLocaleString('ar-SA')} ${window.app.getCurrency()}</td>
                    <td>${d.nextPaymentDate}</td>
                    <td>
                        <div class="goal-progress" style="min-width: 80px;">
                            <div class="goal-progress-bar">
                                <div class="goal-progress-fill" style="width: ${pct}%; background-color: var(--success-color)"></div>
                            </div>
                            <span>${pct}%</span>
                        </div>
                    </td>
                    <td>
                        <button class="btn-text" onclick="financeModule.payDebtInstallment('${d.id}')" title="تسديد دفعة"><i class="fa-solid fa-money-bill-wave"></i> دفعة</button>
                        <button class="btn-text text-danger" onclick="financeModule.deleteDebt('${d.id}')" title="حذف">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    saveDebt() {
        const name = document.getElementById('debt-name-input').value.trim();
        const total = parseFloat(document.getElementById('debt-total-input').value);
        const paid = parseFloat(document.getElementById('debt-paid-input').value) || 0;
        const nextPaymentDate = document.getElementById('debt-date-input').value;

        if (!name) {
            alert('الرجاء إدخال اسم الدين/القسط.');
            return;
        }
        if (isNaN(total) || total <= 0) {
            alert('الرجاء إدخال المبلغ الإجمالي.');
            return;
        }

        const newDebt = {
            id: 'debt_' + Date.now(),
            name: name,
            total: total,
            paid: paid,
            nextPaymentDate: nextPaymentDate || new Date().toISOString().split('T')[0]
        };

        if (!window.app.state.debts) window.app.state.debts = [];
        window.app.state.debts.push(newDebt);

        window.app.saveState();
        this.renderAll();
        window.app.hideModal('debt-modal');
        if (window.notificationsModule) window.notificationsModule.toast("تم حفظ الدين/القسط المستحق بنجاح!", "success");
    }

    payDebtInstallment(id) {
        const debt = window.app.state.debts.find(d => d.id === id);
        if (debt) {
            const remaining = debt.total - debt.paid;
            const amountStr = prompt(`ادخل قيمة الدفعة المسددة لقسط (${debt.name}): \nالمتبقي الكلي: ${remaining} ${window.app.getCurrency()}`, "500");
            const amount = parseFloat(amountStr);
            
            if (!isNaN(amount) && amount > 0) {
                if (amount > remaining) {
                    alert('قيمة الدفعة أكبر من المبلغ المتبقي المستحق!');
                    return;
                }

                debt.paid += amount;
                
                // Track as a transaction too (as a special debt payment expense)
                const newTransaction = {
                    id: 'tr_' + Date.now(),
                    type: 'expense',
                    amount: amount,
                    desc: `تسديد قسط / جزء من دين (${debt.name})`,
                    category: 'فواتير', // default category
                    date: new Date().toISOString().split('T')[0]
                };
                window.app.state.transactions.push(newTransaction);

                window.app.saveState();
                this.renderAll();
                if (window.notificationsModule) window.notificationsModule.toast(`تم تسديد دفعة بقيمة ${amount} ${window.app.getCurrency()} بنجاح.`, 'success');
            }
        }
    }

    deleteDebt(id) {
        const idx = window.app.state.debts.findIndex(d => d.id === id);
        if (idx !== -1) {
            window.app.state.debts.splice(idx, 1);
            window.app.saveState();
            this.renderAll();
            if (window.notificationsModule) window.notificationsModule.toast("تم إزالة قيد الدين.", "warning");
        }
    }

    // Helper calculate days left until nextRenewal date string
    calculateDaysRemaining(dateStr) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const renewal = new Date(dateStr);
        renewal.setHours(0,0,0,0);
        
        const diffTime = renewal - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }
}

// Attach module to window
window.financeModule = new FinanceModule();
