    // ==========================================
    // DASHBOARD MODULE
    // ==========================================
    function loadDashboardData() {
        const db = getAppData();

        let totalLiquid = 0, totalAssets = 0, totalDebts = 0;
        db.Accounts.forEach(acc => {
            if (acc.Type === 'Cash & Bank' || acc.Type === 'Investment') totalLiquid += acc.Balance;
            if (acc.Type === 'Asset') totalAssets += acc.Balance;
            if (acc.Type === 'Debt') {
                // [PERBAIKAN BUG]: Jika saldo utang positif (Overpayment surplus), maka ia jadi aset likuid
                if (acc.Balance < 0) {
                    totalDebts += Math.abs(acc.Balance);
                } else {
                    totalLiquid += acc.Balance;
                }
            }
        });

        let dashboardBudgets = db.Budgets.map(b => calculateBudgetStatus(b, db.Transactions));

        // --- Calculate Top Spending Categories This Month ---
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const monthlyExpenses = db.Transactions.filter(t => {
            if (t.Type !== 'Expense') return false;
            const d = new Date(t.Date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const categoryTotals = {};
        monthlyExpenses.forEach(t => {
            categoryTotals[t.CategoryID] = (categoryTotals[t.CategoryID] || 0) + t.Amount;
        });

        let topSpendData = Object.keys(categoryTotals).map(catId => {
            const cat = db.Categories.find(c => c.ID === catId);
            return {
                name: cat ? cat.Name : 'Lainnya',
                amount: categoryTotals[catId]
            };
        }).sort((a, b) => b.amount - a.amount);

        if (topSpendData.length > 5) {
            const othersAmount = topSpendData.slice(5).reduce((sum, item) => sum + item.amount, 0);
            topSpendData = topSpendData.slice(0, 5);
            topSpendData.push({ name: 'Lainnya', amount: othersAmount });
        }

        // --- Recent Transactions ---
        const recentTrxData = [...db.Transactions].sort((a, b) => {
            const dateDiff = new Date(b.Date) - new Date(a.Date);
            if (dateDiff !== 0) return dateDiff;
            return (b.ID || '').toString().localeCompare((a.ID || '').toString());
        }).slice(0, 5);

        renderDashboard({
            status: 'success',
            data: {
                netWorth: totalLiquid + totalAssets - totalDebts,
                totalLiquid: totalLiquid,
                totalAssets: totalAssets,
                totalDebts: totalDebts,
                goals: db.Goals,
                budgets: dashboardBudgets,
                logs: db.AuditLogs.slice(0, 5),
                topSpend: topSpendData,
                recentTrx: recentTrxData,
                dbReference: db
            }
        });
    }

    function renderDashboard(response) {
        if (response.status === 'error') return;

        const data = response.data;
        const db = data.dbReference;

        const formatHiddenRp = (num) => isBalanceHidden ? 'Rp ••••••••' : formatRp(num);

        const eyeIcon = document.getElementById('icon-hide-balance');
        if (eyeIcon) {
            if (isBalanceHidden) eyeIcon.classList.replace('ph-eye', 'ph-eye-slash');
            else eyeIcon.classList.replace('ph-eye-slash', 'ph-eye');
        }

        document.getElementById('ui-networth').innerText = formatHiddenRp(data.netWorth);
        document.getElementById('ui-assets').innerText = formatHiddenRp(data.totalLiquid + data.totalAssets);
        document.getElementById('ui-debts').innerText = formatHiddenRp(data.totalDebts);

        // --- TOP SPENDING CHART ---
        if (topSpendChartInstance) topSpendChartInstance.destroy();

        if (data.topSpend && data.topSpend.length > 0) {
            document.getElementById('ui-dashboard-top-spend-empty').classList.add('hidden');
            document.getElementById('topSpendChart').classList.remove('hidden');

            const ctx = document.getElementById('topSpendChart').getContext('2d');
            const isDark = document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#94a3b8' : '#64748b';

            const totalPengeluaran = data.topSpend.reduce((sum, item) => sum + item.amount, 0);
            const formatKpi = (num) => {
                if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0', '') + ' M';
                if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + ' jt';
                if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + ' rb';
                return formatRp(num);
            };
            const kpiText = isBalanceHidden ? '•••' : formatKpi(totalPengeluaran);

            const centerTextPlugin = {
                id: 'centerText',
                beforeDraw: function (chart) {
                    const width = chart.width, height = chart.height, ctx = chart.ctx;
                    ctx.restore();

                    const isDarkTheme = document.documentElement.classList.contains('dark');
                    const kpiColor = isDarkTheme ? '#f8fafc' : '#0f172a';

                    const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                    const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

                    ctx.font = "bold 28px sans-serif";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = kpiColor;
                    const valX = centerX - (ctx.measureText(kpiText).width / 2);
                    ctx.fillText(kpiText, valX, centerY);
                    ctx.save();
                }
            };

            topSpendChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: data.topSpend.map(x => x.name),
                    datasets: [{
                        data: data.topSpend.map(x => x.amount),
                        backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#eab308', '#94a3b8'],
                        borderWidth: 2,
                        borderColor: isDark ? '#0f172a' : '#ffffff',
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: textColor, font: { size: 11 }, usePointStyle: true, boxWidth: 8 } },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    let label = context.label || '';
                                    if (label) label += ': ';
                                    if (context.parsed !== null) label += isBalanceHidden ? 'Rp ••••••••' : formatRp(context.parsed);
                                    return label;
                                }
                            }
                        }
                    },
                    cutout: '75%'
                },
                plugins: [centerTextPlugin]
            });
        } else {
            document.getElementById('topSpendChart').classList.add('hidden');
            document.getElementById('ui-dashboard-top-spend-empty').classList.remove('hidden');
        }

        // --- RECENT TRANSACTIONS ---
        const recentTrxContainer = document.getElementById('ui-dashboard-recent-trx');
        recentTrxContainer.innerHTML = '';
        if (data.recentTrx && data.recentTrx.length > 0) {
            data.recentTrx.forEach(t => {
                const isExpense = t.Type === 'Expense';
                const isIncome = t.Type === 'Income';
                const color = isExpense ? 'text-rose-500' : (isIncome ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300');
                const sign = isExpense ? '-' : (isIncome ? '+' : '');
                const displayDate = new Date(t.Date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

                let iconName = 'ph-tag';
                let catName = 'Transfer';
                if (t.Type !== 'Transfer' && db) {
                    const cat = db.Categories.find(c => c.ID === t.CategoryID);
                    if (cat) {
                        iconName = cat.Icon || 'ph-tag';
                        catName = cat.Name;
                    }
                } else if (t.Type === 'Transfer') {
                    iconName = 'ph-swap';
                }

                recentTrxContainer.innerHTML += `
                <div class="flex items-center justify-between group">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-100 dark:border-slate-800 shrink-0">
                      <i class="ph-bold ${iconName} text-lg"></i>
                    </div>
                    <div>
                      <p class="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">${t.Note || t.Type}</p>
                      <p class="text-[10px] text-slate-500 mt-0.5">${catName} • ${displayDate}</p>
                    </div>
                  </div>
                  <div class="font-bold text-sm ${color} shrink-0">${sign}${formatRp(t.Amount)}</div>
                </div>
              `;
            });
        } else {
            recentTrxContainer.innerHTML = '<p class="text-sm text-slate-500 text-center py-5">Belum ada transaksi.</p>';
        }

        // --- COMPACT BUDGETS ---
        const budgetContainer = document.getElementById('ui-dashboard-budgets');
        budgetContainer.innerHTML = '';
        if (data.budgets && data.budgets.length > 0) {
            const sortedBudgets = [...data.budgets].sort((a, b) => b.percentSpent - a.percentSpent).slice(0, 3);
            sortedBudgets.forEach(b => {
                const isDanger = b.percentSpent > b.timeElapsedPercent;
                const barColor = isDanger ? 'bg-rose-500' : 'bg-brand-500';
                const pctWidth = Math.min(b.percentSpent, 100);

                budgetContainer.innerHTML += `
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="font-medium line-clamp-1 pr-2">${b.Name}</span>
                <span class="text-slate-500 font-medium shrink-0">${formatRp(b.spentThisMonth)} / ${formatRp(Math.max(0, b.effectiveLimit))}</span>
              </div>
              <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 relative mt-2">
                <div class="${barColor} h-full rounded-full transition-all" style="width: ${pctWidth}%"></div>
                <div class="absolute top-1/2 -translate-y-1/2 -ml-[3px] w-1.5 h-3.5 bg-slate-800 dark:bg-white border border-white dark:border-slate-900 rounded-[2px] z-10 shadow-sm" style="left: ${b.timeElapsedPercent}%" title="Target Proporsional Hari Ini"></div>
              </div>
            </div>
          `;
            });
        } else {
            budgetContainer.innerHTML = '<p class="text-sm text-slate-500">Belum ada budget aktif.</p>';
        }

        // --- COMPACT GOALS ---
        const goalsContainer = document.getElementById('ui-dashboard-goals');
        if (goalsContainer) {
            goalsContainer.innerHTML = '';
            if (data.goals && data.goals.length > 0) {
                const today = new Date();
                const sortedGoals = [...data.goals]
                    .sort((a, b) => new Date(a.Deadline) - new Date(b.Deadline))
                    .slice(0, 3);

                sortedGoals.forEach(g => {
                    const pctRaw = (g.AllocatedAmount / g.TargetAmount) * 100;
                    const pct = Math.min(Math.max(pctRaw, 0), 100).toFixed(1);
                    const isComplete = pct >= 100;
                    const barColor = isComplete ? 'bg-emerald-500' : 'bg-brand-500';

                    const diffTime = new Date(g.Deadline) - today;
                    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    let dlText = `${daysLeft} hr lagi`;
                    let dlColor = 'text-slate-400';
                    if (daysLeft < 0) { dlText = 'Terlewat'; dlColor = 'text-rose-500 font-bold'; }
                    else if (daysLeft === 0) { dlText = 'Hari ini!'; dlColor = 'text-brand-500 font-bold'; }
                    else if (daysLeft <= 30) { dlColor = 'text-brand-500'; }
                    else if (daysLeft > 365) { dlText = `${(daysLeft / 365).toFixed(1)} thn`; }

                    goalsContainer.innerHTML += `
              <div>
                <div class="flex justify-between items-end mb-1">
                  <span class="font-medium text-sm line-clamp-1 pr-2">${g.Name} <span class="text-[10px] ${dlColor} ml-1">(${dlText})</span></span>
                  <span class="text-xs font-bold ${isComplete ? 'text-emerald-500' : 'text-slate-500'}">${pct}%</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden relative">
                  <div class="${barColor} h-2.5 rounded-full" style="width: ${pct}%"></div>
                </div>
              </div>
            `;
                });
            } else {
                goalsContainer.innerHTML = '<p class="text-sm text-slate-500">Belum ada goal.</p>';
            }
        }

        const auditContainer = document.getElementById('ui-audits');
        auditContainer.innerHTML = '';
        if (data.logs && data.logs.length > 0) {
            data.logs.forEach(log => {
                let icon = 'ph-info'; let color = 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
                if (log.Action === 'Create') { icon = 'ph-plus'; color = 'text-brand-500 bg-brand-100 dark:bg-brand-900/30'; }
                else if (log.Action === 'Delete') { icon = 'ph-trash'; color = 'text-rose-500 bg-rose-100 dark:bg-rose-900/30'; }
                else if (log.Action === 'Update') { icon = 'ph-pencil-simple'; color = 'text-purple-500 bg-purple-100 dark:bg-purple-900/30'; }

                auditContainer.innerHTML += `
            <li class="flex gap-3 items-start">
              <div class="w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0">
                <i class="ph-fill ${icon}"></i>
              </div>
              <div>
                <p class="text-sm font-medium leading-tight text-slate-800 dark:text-slate-200">${log.Action} ${log.Entity}</p>
                <p class="text-xs text-slate-500 mt-0.5">${log.Timestamp}</p>
              </div>
            </li>
          `;
            });
        } else {
            auditContainer.innerHTML = '<p class="text-sm text-slate-500">Belum ada aktivitas.</p>';
        }
    }
