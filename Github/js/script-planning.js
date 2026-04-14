  // ==========================================
  // PLANNING MODULE (Budgets + Goals)
  // ==========================================

  // --- BUDGETS ---
  function renderBudgets() {
    const db = getAppData();
    const container = document.getElementById('ui-budgets-container');
    if (!container) return;
    container.innerHTML = '';

    if (db.Budgets.length === 0) {
      container.innerHTML = `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center"><i class="ph-fill ph-wallet text-4xl text-slate-300 dark:text-slate-700 mb-3"></i><p class="text-slate-500 font-medium">Belum ada budget. Buat budget pertamamu!</p></div>`;
      return;
    }

    let tableHTML = `
      <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="px-4 py-3 font-normal"><i class="ph-bold ph-wallet mr-1"></i> Nama Budget</th>
              <th class="px-4 py-3 font-normal text-right"><i class="ph-bold ph-coins mr-1"></i> Terpakai</th>
              <th class="px-4 py-3 font-normal"><i class="ph-bold ph-chart-bar mr-1"></i> Progres</th>
              <th class="px-4 py-3 font-normal text-right"><i class="ph-bold ph-flag mr-1"></i> Sisa</th>
              <th class="px-4 py-3 font-normal text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
      `;

    let cardsHTML = `<div class="md:hidden flex flex-col gap-3">`;

    db.Budgets.forEach(b => {
      const stats = calculateBudgetStatus(b, db.Transactions);
      const isDanger = stats.percentSpent > 100;
      const colorClass = isDanger ? 'bg-rose-500' : (stats.percentSpent > 80 ? 'bg-yellow-500' : 'bg-brand-500');
      const textClass = isDanger ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200';
      const pctText = stats.percentSpent.toFixed(1) + '%';
      const sisa = stats.effectiveLimit - stats.spentThisMonth;

      // Table Row (Desktop)
      tableHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <td class="px-4 py-4 font-bold text-slate-800 dark:text-slate-200">
                <div class="flex items-center gap-2">
                  <i class="ph-fill ph-wallet text-slate-400 text-lg"></i>
                  <div>
                    <div class="font-bold">${b.Name}</div>
                    <div class="text-[10px] text-slate-500 font-normal">${b.Mode === 'Cumulative' ? 'Kumulatif' : 'Reset Bulanan'}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4 text-right">
                <div class="font-bold ${textClass}">${formatRp(stats.spentThisMonth)}</div>
                <div class="text-[10px] text-slate-500">dari ${formatRp(stats.effectiveLimit)}</div>
              </td>
              <td class="px-4 py-4 w-48">
                <div class="flex items-center gap-2">
                  <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 relative">
                    <div class="${colorClass} h-2 rounded-full transition-all" style="width: ${Math.min(stats.percentSpent, 100)}%"></div>
                    <div class="absolute top-1/2 -translate-y-1/2 -ml-[2px] w-1 h-3 bg-slate-800 dark:bg-white border border-white dark:border-slate-900 rounded-[1px] z-10 shadow-sm" style="left: ${stats.timeElapsedPercent}%" title="Target Proporsional Hari Ini"></div>
                  </div>
                  <span class="text-xs font-bold text-slate-500 w-10 text-right">${pctText}</span>
                </div>
              </td>
              <td class="px-4 py-4 text-right font-bold ${sisa < 0 ? 'text-rose-500' : 'text-emerald-500'}">
                ${formatRp(sisa)}
              </td>
              <td class="px-4 py-4 text-right">
                <div class="opacity-100 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                  <button onclick="navigateToBudgetTransactions('${b.ID}')" class="p-1.5 text-slate-400 hover:text-brand-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700" title="Lihat Transaksi"><i class="ph-bold ph-list-magnifying-glass"></i></button>
                  <button onclick="openBudgetModal('${b.ID}')" class="p-1.5 text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700"><i class="ph-bold ph-pencil-simple"></i></button>
                  <button onclick="deleteBudget('${b.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700"><i class="ph-bold ph-trash"></i></button>
                </div>
              </td>
            </tr>
          `;

      // Card Item (Mobile)
      cardsHTML += `
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="font-bold text-lg leading-tight text-slate-800 dark:text-slate-200">${b.Name}</h3>
                <p class="text-xs text-slate-500">${b.Mode === 'Cumulative' ? 'Kumulatif' : 'Reset Bulanan'}</p>
              </div>
              <div class="flex gap-1">
                 <button onclick="openBudgetModal('${b.ID}')" class="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><i class="ph-bold ph-pencil-simple text-lg"></i></button>
                 <button onclick="deleteBudget('${b.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><i class="ph-bold ph-trash text-lg"></i></button>
              </div>
            </div>
            
            <div class="mt-4 mb-2">
              <div class="flex justify-between items-end mb-1 text-sm">
                <span class="font-medium text-slate-500">Terpakai</span>
                <div class="text-right">
                  <span class="font-bold ${isDanger ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}">${formatRp(stats.spentThisMonth)}</span>
                  <span class="text-xs text-slate-400">/ ${formatRp(stats.effectiveLimit)}</span>
                </div>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 relative mt-2">
                <div class="${colorClass} h-full rounded-full transition-all" style="width: ${Math.min(stats.percentSpent, 100)}%"></div>
                <div class="absolute top-1/2 -translate-y-1/2 -ml-[3px] w-1.5 h-3.5 bg-slate-800 dark:bg-white border border-white dark:border-slate-900 rounded-[2px] z-10 shadow-sm" style="left: ${stats.timeElapsedPercent}%" title="Target Proporsional Hari Ini"></div>
              </div>
            </div>
            
            <div class="flex justify-between text-[10px] text-slate-500 mt-2">
              <span>Sisa: <strong class="${sisa < 0 ? 'text-rose-500' : 'text-emerald-500'}">${formatRp(sisa)}</strong></span>
              <span class="font-bold">${pctText}</span>
            </div>
            <button onclick="navigateToBudgetTransactions('${b.ID}')" class="w-full mt-3 py-2 text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-brand-200 dark:border-brand-800/50">
              <i class="ph-bold ph-list-magnifying-glass text-sm"></i> Lihat Transaksi
            </button>
          </div>
        `;
    });

    tableHTML += `</tbody></table></div>`;
    cardsHTML += `</div>`;
    container.innerHTML = tableHTML + cardsHTML;
  }

  // Cross-Navigation: Budget → Halaman Transaksi dengan auto-filter
  function navigateToBudgetTransactions(budgetId) {
      showTab('transactions');
      // Tunggu render selesai sebelum set filter
      setTimeout(() => {
          setSelectValue('main-filter-budget', budgetId);
          handleBudgetFilterChange();
      }, 200);
  }

  function handleBudgetModeChange() {
    const mode = document.getElementById('BudMode').value;
    const wrap = document.getElementById('wrapper-bud-cumulative');
    if (mode === 'Cumulative') {
      wrap.classList.remove('hidden');
      document.getElementById('BudStartDate').required = true;
    } else {
      wrap.classList.add('hidden');
      document.getElementById('BudStartDate').required = false;
    }
  }

  function openBudgetModal(id = null) {
    lockBodyScroll();
    pushModalState('modal-budget');
    const db = getAppData();

    const catContainer = document.getElementById('ui-budget-categories');
    catContainer.innerHTML = '';
    const expCats = db.Categories.filter(c => c.Type === 'Expense');
    if (expCats.length === 0) {
      catContainer.innerHTML = '<div class="text-xs text-slate-400">Belum ada kategori pengeluaran.</div>';
    } else {
      expCats.forEach(c => {
        catContainer.innerHTML += `
                  <label class="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                      <input type="checkbox" name="BudLinkedCats" value="${c.ID}" class="w-4 h-4 rounded text-brand-500 focus:ring-brand-500">
                      <span>${c.Name}</span>
                  </label>
              `;
      });
    }

    document.getElementById('modal-budget').classList.remove('hidden');
    resetAndSyncForm('form-budget');

    if (id) {
      document.getElementById('modal-budget-title').innerText = 'Edit Budget';
      const b = db.Budgets.find(x => x.ID === id);
      if (b) {
        document.getElementById('BudID').value = b.ID;
        document.getElementById('BudName').value = b.Name;
        document.getElementById('BudAmount').value = b.Amount;

        setSelectValue('BudMode', b.Mode || 'Reset');
        setSelectValue('BudRolloverType', b.RolloverType || 'Both');
        if (b.StartDate) document.getElementById('BudStartDate').value = b.StartDate;

        if (b.LinkedCategories) {
          document.querySelectorAll('input[name="BudLinkedCats"]').forEach(cb => {
            if (b.LinkedCategories.includes(cb.value)) cb.checked = true;
          });
        }
      }
    } else {
      document.getElementById('modal-budget-title').innerText = 'Tambah Budget Baru';
      document.getElementById('BudID').value = '';
      setSelectValue('BudMode', 'Reset');
      setSelectValue('BudRolloverType', 'Both');
      document.getElementById('BudStartDate').value = new Date().toLocaleDateString('en-CA');
    }
    handleBudgetModeChange();
  }

  function closeBudgetModal() {
    unlockBodyScroll();
    document.getElementById('modal-budget').classList.add('hidden');
  }

  function saveBudget(e) {
    e.preventDefault();
    let db = getAppData();
    const id = document.getElementById('BudID').value;

    const linkedCats = Array.from(document.querySelectorAll('input[name="BudLinkedCats"]:checked')).map(cb => cb.value);
    if (linkedCats.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Peringatan', text: 'Pilih setidaknya satu kategori pengeluaran.' });
      return;
    }

    const newBud = {
      ID: id || 'BDG-' + Date.now(),
      Name: document.getElementById('BudName').value,
      Amount: Number(document.getElementById('BudAmount').value),
      Period: 'Monthly',
      Mode: document.getElementById('BudMode').value,
      RolloverType: document.getElementById('BudRolloverType').value,
      StartDate: document.getElementById('BudStartDate').value,
      LinkedCategories: linkedCats
    };

    if (id) {
      const idx = db.Budgets.findIndex(x => x.ID === id);
      if (idx > -1) db.Budgets[idx] = newBud;
    } else {
      db.Budgets.push(newBud);
    }

    addAuditLog(id ? "Update" : "Create", "Budget: " + newBud.Name);

    // Standard Sync
    saveMasterData('Budgets', db.Budgets);

    closeBudgetModal();
    Swal.fire({ icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
  }

  function deleteBudget(id) {
    Swal.fire({
      title: 'Hapus Budget?',
      text: 'Histori transaksi tetap aman, hanya pencatatan batas budget ini yang dihapus.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
      if (result.isConfirmed) {
        let db = getAppData();
        db.Budgets = db.Budgets.filter(b => b.ID !== id);
        addAuditLog("Delete", "Budget ID: " + id);

        saveMasterData('Budgets', db.Budgets);

        Swal.fire('Terhapus!', 'Budget telah dihapus.', 'success');
      }
    });
  }

  // --- GOALS ---
  function renderGoals() {
    const db = getAppData();
    const container = document.getElementById('ui-goals-container');
    if (!container) return;
    container.innerHTML = '';

    if (db.Goals.length === 0) {
      container.innerHTML = `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center"><i class="ph-fill ph-target text-4xl text-brand-300 dark:text-brand-700 mb-3"></i><p class="text-slate-500 font-medium">Belum ada goal. Mulai targetkan impianmu sekarang!</p></div>`;
      return;
    }

    const getAccName = (id) => { const a = db.Accounts.find(x => x.ID === id); return a ? a.Name : '-'; };

    const calculateDaysLeft = (deadlineStr) => {
      const dl = new Date(deadlineStr);
      const today = new Date();
      const diffTime = dl - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    let tableHTML = `
      <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="px-4 py-3 font-normal"><i class="ph-bold ph-target mr-1"></i> Nama Goal</th>
              <th class="px-4 py-3 font-normal"><i class="ph-bold ph-bank mr-1"></i> Akun Terhubung</th>
              <th class="px-4 py-3 font-normal text-right"><i class="ph-bold ph-coins mr-1"></i> Terkumpul</th>
              <th class="px-4 py-3 font-normal"><i class="ph-bold ph-chart-bar mr-1"></i> Progres</th>
              <th class="px-4 py-3 font-normal"><i class="ph-bold ph-calendar-blank mr-1"></i> Sisa Waktu</th>
              <th class="px-4 py-3 font-normal text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
      `;

    let cardsHTML = `<div class="md:hidden flex flex-col gap-3">`;

    db.Goals.sort((a, b) => new Date(a.Deadline) - new Date(b.Deadline)).forEach(g => {
      const pctRaw = (g.AllocatedAmount / g.TargetAmount) * 100;
      const pct = Math.min(Math.max(pctRaw, 0), 100).toFixed(1);
      const isComplete = pct >= 100;
      const colorClass = isComplete ? 'bg-emerald-500' : 'bg-brand-500';
      const textClass = isComplete ? 'text-emerald-500' : 'text-brand-500';

      const daysLeft = calculateDaysLeft(g.Deadline);
      let dlText = `${daysLeft} hari lagi`;
      let dlColor = 'text-slate-600 dark:text-slate-400';
      if (daysLeft < 0) { dlText = 'Terlewat'; dlColor = 'text-rose-500 font-bold'; }
      else if (daysLeft === 0) { dlText = 'Hari ini!'; dlColor = 'text-brand-500 font-bold'; }
      else if (daysLeft > 365) { dlText = `${(daysLeft / 365).toFixed(1)} tahun`; }

      tableHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <td class="px-4 py-4 font-bold text-slate-800 dark:text-slate-200">
                <div class="flex items-center gap-2">
                  ${isComplete ? '<i class="ph-fill ph-check-circle text-emerald-500 text-lg"></i>' : '<i class="ph-fill ph-target text-slate-400 text-lg"></i>'}
                  ${g.Name}
                </div>
              </td>
              <td class="px-4 py-4 text-slate-600 dark:text-slate-400 text-xs">${getAccName(g.LinkedAccountID)}</td>
              <td class="px-4 py-4 text-right">
                <div class="font-bold ${textClass}">${formatRp(g.AllocatedAmount)}</div>
                <div class="text-[10px] text-slate-500">dari ${formatRp(g.TargetAmount)}</div>
              </td>
              <td class="px-4 py-4 w-48">
                <div class="flex items-center gap-2">
                  <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div class="${colorClass} h-2 rounded-full transition-all" style="width: ${pct}%"></div>
                  </div>
                  <span class="text-xs font-bold text-slate-500 w-10 text-right">${pct}%</span>
                </div>
              </td>
              <td class="px-4 py-4 text-xs ${dlColor}">${dlText}</td>
              <td class="px-4 py-4 text-right">
                <div class="opacity-100 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                  ${!isComplete ? `<button onclick="openQuickAction('fundGoal', '${g.ID}')" class="p-1.5 text-brand-500 hover:text-white hover:bg-brand-500 transition-colors bg-brand-50 dark:bg-brand-900/20 rounded shadow-sm border border-brand-200 dark:border-brand-800" title="Tambah Dana"><i class="ph-bold ph-plus"></i></button>` : ''}
                  <button onclick="openGoalModal('${g.ID}')" class="p-1.5 text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700"><i class="ph-bold ph-pencil-simple"></i></button>
                  <button onclick="deleteGoal('${g.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700"><i class="ph-bold ph-trash"></i></button>
                </div>
              </td>
            </tr>
          `;

      cardsHTML += `
            <div class="bg-white dark:bg-slate-900 border ${isComplete ? 'border-emerald-300 dark:border-emerald-800/50' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-5 shadow-sm relative overflow-hidden">
              ${isComplete ? '<div class="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><i class="ph-bold ph-check"></i> TERCAPAI</div>' : ''}
              <div class="mb-3">
                <h3 class="font-bold text-lg text-slate-800 dark:text-slate-200 leading-tight">${g.Name}</h3>
                <p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><i class="ph-fill ph-bank"></i> ${getAccName(g.LinkedAccountID)}</p>
              </div>
              
              <div class="mb-4">
                <div class="flex justify-between items-end mb-1">
                  <div class="text-xs font-medium text-slate-500">Terkumpul</div>
                  <div class="text-right">
                    <span class="text-lg font-bold ${textClass}">${formatRp(g.AllocatedAmount)}</span>
                    <span class="text-[10px] text-slate-400 block -mt-1">/ ${formatRp(g.TargetAmount)}</span>
                  </div>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div class="${colorClass} h-2.5 rounded-full transition-all" style="width: ${pct}%"></div>
                </div>
              </div>

              <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                <div class="text-xs ${dlColor} flex items-center gap-1"><i class="ph-bold ph-calendar-blank"></i> ${dlText}</div>
                <div class="flex gap-2">
                  ${!isComplete ? `<button onclick="openQuickAction('fundGoal', '${g.ID}')" class="p-1.5 text-brand-500 hover:text-white hover:bg-brand-500 transition-colors bg-brand-50 dark:bg-brand-900/20 rounded-lg shadow-sm border border-brand-200 dark:border-brand-800" title="Tambah Dana"><i class="ph-bold ph-plus text-lg"></i></button>` : ''}
                  <button onclick="openGoalModal('${g.ID}')" class="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><i class="ph-bold ph-pencil-simple text-lg"></i></button>
                  <button onclick="deleteGoal('${g.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><i class="ph-bold ph-trash text-lg"></i></button>
                </div>
              </div>
            </div>
          `;
    });

    tableHTML += `</tbody></table></div>`;
    cardsHTML += `</div>`;
    container.innerHTML = tableHTML + cardsHTML;
  }

  function openGoalModal(id = null) {
    lockBodyScroll();
    pushModalState('modal-goal');
    const db = getAppData();

    let accOptions = '<option value="" disabled selected>Pilih Akun Penyimpanan...</option>';
    db.Accounts.filter(a => a.Type === 'Cash & Bank' || a.Type === 'Investment').forEach(acc => {
      const sisaBalance = acc.Balance - acc.GoalAllocated;
      let adjustedSisa = sisaBalance;
      if (id) {
        const existingGol = db.Goals.find(g => g.ID === id);
        if (existingGol && existingGol.LinkedAccountID === acc.ID) adjustedSisa += Number(existingGol.AllocatedAmount);
      }
      accOptions += `<option value="${acc.ID}">${acc.Name} - Sisa Dana: ${formatRp(adjustedSisa)}</option>`;
    });
    setSelectHTML('GolAccount', accOptions);

    document.getElementById('modal-goal').classList.remove('hidden');
    resetAndSyncForm('form-goal');

    if (id) {
      document.getElementById('modal-goal-title').innerText = 'Edit Goal / Update Dana';
      const g = db.Goals.find(x => x.ID === id);
      if (g) {
        document.getElementById('GolID').value = g.ID;
        document.getElementById('GolName').value = g.Name;
        document.getElementById('GolTarget').value = g.TargetAmount;
        document.getElementById('GolAllocated').value = g.AllocatedAmount;
        document.getElementById('GolDeadline').value = g.Deadline;
        setSelectValue('GolAccount', g.LinkedAccountID);
      }
    } else {
      document.getElementById('modal-goal-title').innerText = 'Tambah Goal Baru';
      document.getElementById('GolID').value = '';
      document.getElementById('GolAllocated').value = '0';

      let nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      document.getElementById('GolDeadline').value = nextYear.toLocaleDateString('en-CA');
    }
  }

  function closeGoalModal() {
    unlockBodyScroll();
    document.getElementById('modal-goal').classList.add('hidden');
  }

  function saveGoal(e) {
    e.preventDefault();
    let db = getAppData();
    const id = document.getElementById('GolID').value;
    const targetAmt = Number(document.getElementById('GolTarget').value);
    const allocAmt = Number(document.getElementById('GolAllocated').value);
    const accId = document.getElementById('GolAccount').value;

    if (allocAmt > targetAmt) {
      Swal.fire({ icon: 'warning', title: 'Target Terlampaui', text: 'Dana terkumpul tidak boleh melebihi Target Nominal.' });
      return;
    }

    const processGoalSubmit = () => {
      const newGol = {
        ID: id || 'GOL-' + Date.now(),
        Name: document.getElementById('GolName').value,
        TargetAmount: targetAmt,
        AllocatedAmount: allocAmt,
        Deadline: document.getElementById('GolDeadline').value,
        LinkedAccountID: accId
      };

      if (id) {
        const idx = db.Goals.findIndex(x => x.ID === id);
        if (idx > -1) db.Goals[idx] = newGol;
      } else {
        db.Goals.push(newGol);
      }

      db = syncAccountGoalAllocations(db);

      addAuditLog(id ? "Update" : "Create", "Goal: " + newGol.Name);

      // Standard Sync
      saveMasterData('Goals', db.Goals);
      saveMasterData('Accounts', db.Accounts);

      closeGoalModal();
      Swal.fire({ icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    };

    const selectedAcc = db.Accounts.find(a => a.ID === accId);
    if (selectedAcc) {
      let oldAllocAmt = 0;
      if (id) {
        const existingGol = db.Goals.find(g => g.ID === id);
        if (existingGol && existingGol.LinkedAccountID === accId) {
          oldAllocAmt = Number(existingGol.AllocatedAmount);
        }
      }
      const trueAvailableBalance = Number(selectedAcc.Balance) - Number(selectedAcc.GoalAllocated) + oldAllocAmt;

      if (allocAmt > trueAvailableBalance) {
        Swal.fire({
          icon: 'warning',
          title: 'Saldo Tidak Mencukupi',
          html: `Alokasi ini akan membuat saldo bebas akun <b>${selectedAcc.Name}</b> menjadi minus. Lanjutkan?`,
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'Ya, Lanjutkan'
        }).then((result) => {
          if (result.isConfirmed) processGoalSubmit();
        });
        return;
      }
    }

    processGoalSubmit();
  }

  function deleteGoal(id) {
    Swal.fire({
      title: 'Hapus Goal?',
      text: "Dana yang dialokasikan akan dilepaskan (bebas) kembali ke akun terhubung.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
      if (result.isConfirmed) {
        let db = getAppData();
        db.Goals = db.Goals.filter(g => g.ID !== id);

        db = syncAccountGoalAllocations(db);

        addAuditLog("Delete", "Goal ID: " + id);

        saveMasterData('Goals', db.Goals);
        saveMasterData('Accounts', db.Accounts);

        Swal.fire('Terhapus!', 'Goal dihapus dan dana dibebaskan.', 'success');
      }
    });
  }