    // ==========================================
    // MANAGEMENT MODULE (Accounts + Categories + Subscriptions + Quick Action)
    // ==========================================

    // --- ACCOUNTS ---
    function renderAccounts() {
        const db = getAppData();
        const container = document.getElementById('ui-accounts-container');
        container.innerHTML = '';

        const groupMap = {
            'Cash & Bank': { title: 'Dompet & Rekening', icon: 'ph-wallet', items: [] },
            'Investment': { title: 'Investasi & Tabungan', icon: 'ph-trend-up', items: [] },
            'Asset': { title: 'Aset Tetap (Properti, Kendaraan)', icon: 'ph-buildings', items: [] },
            'Debt': { title: 'Utang & Kartu Kredit', icon: 'ph-credit-card', items: [] }
        };

        db.Accounts.forEach(acc => {
            if (groupMap[acc.Type]) groupMap[acc.Type].items.push(acc);
        });

        for (const [type, group] of Object.entries(groupMap)) {
            if (group.items.length === 0) continue;

            let totalBalance = 0;
            group.items.forEach(a => totalBalance += a.Balance);

            let groupHTML = `
          <div class="mb-8 animate-fade-in-up">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center border border-brand-200 dark:border-brand-800/50">
                <i class="ph-bold ${group.icon}"></i>
              </div>
              <h3 class="font-bold text-lg">${group.title}</h3>
              <span class="ml-auto text-sm font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full">${formatRp(totalBalance)}</span>
            </div>

            <!-- Tampilan Desktop (Tabel) -->
            <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm mb-3">
              <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th class="px-5 py-3 font-normal"><i class="ph-bold ph-bank mr-1"></i> Nama Akun</th>
                    ${(type === 'Cash & Bank' || type === 'Investment') ? `
                        <th class="px-5 py-3 font-normal text-right"><i class="ph-bold ph-target mr-1"></i> Dialokasikan</th>
                        <th class="px-5 py-3 font-normal text-right"><i class="ph-bold ph-check-circle mr-1"></i> Saldo Bebas</th>
                    ` : ''}
                    <th class="px-5 py-3 font-normal text-right"><i class="ph-bold ph-money mr-1"></i> Saldo Aktual</th>
                    <th class="px-5 py-3 font-normal text-right w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
        `;

            // Render Baris Tabel
            group.items.forEach(acc => {
                const colorClass = acc.Balance < 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200';

                groupHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer" onclick="openAccountDetail('${acc.ID}')">
              <td class="px-5 py-2.5 font-bold text-slate-800 dark:text-slate-200">${acc.Name}</td>
              ${(type === 'Cash & Bank' || type === 'Investment') ? `
                <td class="px-5 py-2.5 text-right text-slate-500">${acc.GoalAllocated > 0 ? formatRp(acc.GoalAllocated) : '-'}</td>
                <td class="px-5 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">${formatRp(acc.Balance - (acc.GoalAllocated || 0))}</td>
              ` : ''}
              <td class="px-5 py-2.5 text-right font-bold ${colorClass}">${formatRp(acc.Balance)}</td>
              <td class="px-5 py-2.5 text-right">
                <div class="flex justify-end gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
                  <button onclick="event.stopPropagation(); openAccountModal('${acc.ID}')" class="p-1.5 text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700"><i class="ph-bold ph-pencil-simple"></i></button>
                  <button onclick="event.stopPropagation(); deleteAccount('${acc.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700"><i class="ph-bold ph-trash"></i></button>
                </div>
              </td>
            </tr>
          `;
            });

            groupHTML += `
                </tbody>
              </table>
            </div>

            <!-- Tampilan Mobile (Card) -->
            <div class="md:hidden grid grid-cols-1 gap-3">
        `;

            // Render Card Mobile
            group.items.forEach(acc => {
                const colorClass = acc.Balance < 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200';
                let subtitle = acc.Type;
                if (acc.GoalAllocated > 0) {
                    subtitle = `Terkunci: ${formatRp(acc.GoalAllocated)} | Bebas: ${formatRp(acc.Balance - acc.GoalAllocated)}`;
                }

                groupHTML += `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm group hover:border-brand-500 transition-colors cursor-pointer relative overflow-hidden" onclick="openAccountDetail('${acc.ID}')">
              
              <div class="absolute right-0 top-0 opacity-[0.03] dark:opacity-[0.05] transform translate-x-4 -translate-y-4">
                <i class="ph-fill ${group.icon} text-8xl"></i>
              </div>
              
              <div class="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h4 class="font-bold text-lg leading-tight mb-1 text-slate-800 dark:text-slate-200 line-clamp-1">${acc.Name}</h4>
                  <p class="text-[10px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded w-max">${subtitle}</p>
                </div>
                <div class="flex gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
                  <button onclick="event.stopPropagation(); openAccountModal('${acc.ID}')" class="p-1.5 text-slate-400 hover:text-blue-500 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                  <button onclick="event.stopPropagation(); deleteAccount('${acc.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"><i class="ph-bold ph-trash text-sm"></i></button>
                </div>
              </div>
              <div class="text-2xl font-bold ${colorClass} relative z-10">${formatRp(acc.Balance)}</div>
            </div>
          `;
            });
            groupHTML += `</div></div>`;
            container.innerHTML += groupHTML;
        }
    }

    function openAccountModal(id = null) {
        lockBodyScroll();
        document.getElementById('modal-account').classList.remove('hidden');
        pushModalState('modal-account');
        resetAndSyncForm('form-account');

        if (id) {
            const db = getAppData();
            const acc = db.Accounts.find(x => x.ID === id);
            if (acc) {
                document.getElementById('modal-account-title').innerText = 'Edit Akun';
                document.getElementById('AccID').value = acc.ID;
                document.getElementById('AccName').value = acc.Name;
                document.getElementById('AccBalance').value = acc.Balance;
                setSelectValue('AccType', acc.Type);
                document.getElementById('AccType').disabled = true; // Protect changing type if linked
            }
        } else {
            document.getElementById('modal-account-title').innerText = 'Tambah Akun Baru';
            document.getElementById('AccID').value = '';
            document.getElementById('AccType').disabled = false;
            setSelectValue('AccType', 'Cash & Bank');
        }
    }

    function closeAccountModal() {
        unlockBodyScroll();
        document.getElementById('modal-account').classList.add('hidden');
    }

    function saveAccount(e) {
        e.preventDefault();
        let db = getAppData();
        const id = document.getElementById('AccID').value;
        const typeSel = document.getElementById('AccType');

        const newAcc = {
            ID: id || 'ACC-' + Date.now(),
            Name: document.getElementById('AccName').value,
            Type: typeSel.disabled ? db.Accounts.find(a => a.ID === id).Type : typeSel.value,
            Balance: Number(document.getElementById('AccBalance').value),
            GoalAllocated: id ? (db.Accounts.find(x => x.ID === id).GoalAllocated || 0) : 0
        };

        if (id) {
            const idx = db.Accounts.findIndex(x => x.ID === id);
            if (idx > -1) db.Accounts[idx] = newAcc;
        } else {
            db.Accounts.push(newAcc);
        }

        addAuditLog(id ? "Update" : "Create", "Akun: " + newAcc.Name);

        // Standard Sync
        saveMasterData('Accounts', db.Accounts);

        closeAccountModal();
        Swal.fire({ icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    }

    function deleteAccount(id) {
        const db = getAppData();
        const isLinkedTrx = db.Transactions.some(t => t.FromAccountID === id || t.ToAccountID === id);
        const isLinkedAsset = db.Assets.some(a => a.LinkedAccountID === id);
        const isLinkedDebt = db.Debts.some(d => d.LinkedAccountID === id);
        const isLinkedGoal = db.Goals.some(g => g.LinkedAccountID === id);

        if (isLinkedTrx || isLinkedAsset || isLinkedDebt || isLinkedGoal) {
            Swal.fire({ icon: 'error', title: 'Tidak Dapat Dihapus', text: 'Akun ini masih terhubung dengan histori transaksi, aset, utang, atau goal.' });
            return;
        }

        Swal.fire({
            title: 'Hapus Akun?',
            text: "Anda tidak dapat mengembalikan akun yang terhapus.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus!'
        }).then((result) => {
            if (result.isConfirmed) {
                db.Accounts = db.Accounts.filter(a => a.ID !== id);
                addAuditLog("Delete", "Akun ID: " + id);

                saveMasterData('Accounts', db.Accounts);

                Swal.fire('Terhapus!', 'Akun berhasil dihapus.', 'success');
            }
        });
    }

    // --- ACCOUNT DETAIL PANE ---
    function openAccountDetail(accId) {
        lockBodyScroll();
        pushModalState('modal-account-detail');
        currentDetailAccId = accId;
        const db = getAppData();
        const acc = db.Accounts.find(a => a.ID === accId);
        if (!acc) return;

        document.getElementById('detail-acc-type').innerText = acc.Type;
        document.getElementById('detail-acc-name').innerText = acc.Name;
        const isColorRed = acc.Balance < 0;
        document.getElementById('detail-acc-balance').innerText = formatRp(acc.Balance);
        document.getElementById('detail-acc-balance').className = `text-lg font-bold mt-1 ${isColorRed ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`;

        const freeWrap = document.getElementById('detail-acc-free-wrap');
        const freeVal = document.getElementById('detail-acc-free-balance');
        if (freeWrap && freeVal) {
            if (acc.Type === 'Cash & Bank' || acc.Type === 'Investment') {
                freeWrap.classList.remove('hidden');
                freeVal.innerText = formatRp(acc.Balance - (acc.GoalAllocated || 0));
            } else {
                freeWrap.classList.add('hidden');
            }
        }

        const pane = document.getElementById('modal-account-detail');
        pane.classList.remove('hidden');

        // Sync filter defaults
        setSelectValue('filter-history', 'All');
        document.getElementById('filter-date-start').value = '';
        document.getElementById('filter-date-end').value = '';

        switchDetailTab('history');

        // Delay render logic for smooth animation UI
        setTimeout(() => {
            renderAccountHistory();
        }, 50);
    }

    function closeAccountDetail() {
        unlockBodyScroll();
        const pane = document.getElementById('modal-account-detail');
        pane.classList.add('hidden');
        currentDetailAccId = null;
    }

    function handleBackdropClick(e) {
        if (e.target.id === 'modal-account-detail') closeAccountDetail();
    }

    function switchDetailTab(tab) {
        const btnHist = document.getElementById('btn-tab-history');
        const btnAlloc = document.getElementById('btn-tab-allocation');
        const contHist = document.getElementById('detail-content-history');
        const contAlloc = document.getElementById('detail-content-allocation');

        const activeClassList = ['text-brand-500', 'border-brand-500', 'bg-white', 'dark:bg-slate-900'];
        const inactiveClassList = ['text-slate-500', 'border-transparent', 'bg-slate-50', 'dark:bg-slate-900/50'];

        if (tab === 'history') {
            btnHist.classList.add(...activeClassList);
            btnHist.classList.remove(...inactiveClassList);
            btnAlloc.classList.add(...inactiveClassList);
            btnAlloc.classList.remove(...activeClassList);

            contHist.classList.remove('hidden');
            contAlloc.classList.add('hidden');
        } else {
            btnAlloc.classList.add(...activeClassList);
            btnAlloc.classList.remove(...inactiveClassList);
            btnHist.classList.add(...inactiveClassList);
            btnHist.classList.remove(...activeClassList);

            contAlloc.classList.remove('hidden');
            contHist.classList.add('hidden');

            renderAccountAllocation();
        }
    }

    function toggleExpandDetail() {
        const innerPane = document.getElementById('detail-pane-inner');
        const icon = document.getElementById('icon-expand-detail');
        isDetailExpanded = !isDetailExpanded;

        if (isDetailExpanded) {
            innerPane.classList.remove('md:w-[480px]');
            innerPane.classList.add('md:w-[800px]');
            icon.classList.replace('ph-arrows-out', 'ph-arrows-in');
        } else {
            innerPane.classList.remove('md:w-[800px]');
            innerPane.classList.add('md:w-[480px]');
            icon.classList.replace('ph-arrows-in', 'ph-arrows-out');
        }
    }

    function renderAccountHistory() {
        if (!currentDetailAccId) return;
        const db = getAppData();
        const container = document.getElementById('ui-detail-history');

        const typeFilter = document.getElementById('filter-history').value;
        const startDate = document.getElementById('filter-date-start').value;
        const endDate = document.getElementById('filter-date-end').value;

        let trxs = db.Transactions.filter(t => t.FromAccountID === currentDetailAccId || t.ToAccountID === currentDetailAccId);

        if (typeFilter !== 'All') trxs = trxs.filter(t => t.Type === typeFilter);
        if (startDate) trxs = trxs.filter(t => t.Date >= startDate);
        if (endDate) trxs = trxs.filter(t => t.Date <= endDate);

        trxs.sort((a, b) => new Date(b.Date) - new Date(a.Date));

        container.innerHTML = '';

        if (trxs.length === 0) {
            container.innerHTML = `<div class="text-center py-10 text-slate-400 text-sm">Tidak ada histori transaksi.</div>`;
            return;
        }

        const getCatName = (id) => { const c = db.Categories.find(x => x.ID === id); return c ? c.Name : '-'; };
        const getAccName = (id) => { const a = db.Accounts.find(x => x.ID === id); return a ? a.Name : 'Lainnya'; };

        trxs.forEach(t => {
            let isOut = false;
            let info = '';

            if (t.Type === 'Transfer') {
                if (t.FromAccountID === currentDetailAccId) { isOut = true; info = `Ke: ${getAccName(t.ToAccountID)}`; }
                else { isOut = false; info = `Dari: ${getAccName(t.FromAccountID)}`; }
            } else if (t.Type === 'Expense') {
                isOut = true; info = getCatName(t.CategoryID);
            } else if (t.Type === 'Income') {
                isOut = false; info = getCatName(t.CategoryID);
            }

            const color = isOut ? 'text-rose-500' : 'text-emerald-500';
            const sign = isOut ? '-' : '+';
            const iconHtml = isOut ? `<i class="ph-bold ph-arrow-up-right"></i>` : `<i class="ph-bold ph-arrow-down-left"></i>`;
            const dateStr = new Date(t.Date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

            container.innerHTML += `
          <div class="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:border-brand-300 transition-colors cursor-pointer" onclick="openTransactionModal('${t.ID}')">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center ${color} shrink-0">
                    ${iconHtml}
                </div>
                <div>
                    <div class="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">${t.Note || t.Type}</div>
                    <div class="text-[10px] text-slate-500 mt-0.5">${info} • ${dateStr}</div>
                </div>
            </div>
            <div class="font-bold ${color} text-right shrink-0">
                ${sign}${formatRp(t.Amount)}
            </div>
          </div>
        `;
        });
    }

    function renderAccountAllocation() {
        if (!currentDetailAccId) return;
        const db = getAppData();
        const container = document.getElementById('ui-detail-allocation');
        const acc = db.Accounts.find(a => a.ID === currentDetailAccId);

        if (!acc) return;

        container.innerHTML = '';

        let itemsHTML = '';

        if (acc.Type === 'Cash & Bank' || acc.Type === 'Investment') {
            const goals = db.Goals.filter(g => g.LinkedAccountID === acc.ID);

            if (goals.length > 0) {
                itemsHTML += `<div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">Terkunci untuk Goals</div>`;
                goals.forEach(g => {
                    itemsHTML += `
                    <div class="flex justify-between items-center p-3 bg-brand-50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800/50 rounded-lg mb-2">
                        <span class="text-sm font-bold text-brand-600 dark:text-brand-400 line-clamp-1">${g.Name}</span>
                        <span class="text-sm font-bold text-brand-600 dark:text-brand-400 shrink-0">${formatRp(g.AllocatedAmount)}</span>
                    </div>
                `;
                });
            }

            const bebas = acc.Balance - acc.GoalAllocated;
            itemsHTML = `
              <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-2 flex justify-between items-center">
                  <span class="text-xs font-bold text-slate-500 uppercase">Dana Bebas (Liquid)</span>
                  <span class="text-lg font-bold text-emerald-500">${formatRp(bebas)}</span>
              </div>
          ` + itemsHTML;

        } else if (acc.Type === 'Asset') {
            const assets = db.Assets.filter(a => a.LinkedAccountID === acc.ID);
            if (assets.length > 0) {
                assets.forEach(ast => {
                    itemsHTML += `
                      <div class="flex flex-col p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/50 rounded-lg mb-2">
                          <div class="flex justify-between items-center mb-1">
                              <span class="text-sm font-bold text-purple-600 dark:text-purple-400 line-clamp-1">${ast.Name}</span>
                              <span class="text-sm font-bold text-purple-600 dark:text-purple-400 shrink-0">${formatRp(ast.MarketValue)}</span>
                          </div>
                          <span class="text-[10px] text-purple-500">Nilai Awal: ${formatRp(ast.OriginalValue)}</span>
                      </div>
                  `;
                });
            } else {
                itemsHTML = '<div class="text-xs text-slate-400">Belum ada rincian aset di akun ini.</div>';
            }
        } else if (acc.Type === 'Debt') {
            const debts = db.Debts.filter(d => d.LinkedAccountID === acc.ID && (d.FinalValue - d.PaidAmount > 0));
            let totalTracked = 0;

            if (debts.length > 0) {
                itemsHTML += `<div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">Tagihan Tercatat (Tracked)</div>`;
                debts.forEach(d => {
                    const sisa = d.FinalValue - d.PaidAmount;
                    totalTracked += sisa;
                    itemsHTML += `
                      <div class="flex flex-col p-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 rounded-lg mb-2">
                          <div class="flex justify-between items-center mb-1">
                              <span class="text-sm font-bold text-rose-600 dark:text-rose-400 line-clamp-1">${d.Name}</span>
                              <span class="text-sm font-bold text-rose-600 dark:text-rose-400 shrink-0">${formatRp(sisa)}</span>
                          </div>
                          <span class="text-[10px] text-rose-500">Total Utang: ${formatRp(d.FinalValue)}</span>
                      </div>
                  `;
                });
            }

            const actualBalance = acc.Balance < 0 ? Math.abs(acc.Balance) : 0;
            let nonTracked = actualBalance - totalTracked;
            if (nonTracked < 0) nonTracked = 0;

            let surplus = acc.Balance > 0 ? acc.Balance : 0;

            itemsHTML = `
              <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-2 flex justify-between items-center">
                  <span class="text-xs font-bold text-slate-500 uppercase">Non-Tracked / Lainnya</span>
                  <span class="text-lg font-bold text-rose-500">${formatRp(nonTracked)}</span>
              </div>
          ` + itemsHTML;

            if (surplus > 0) {
                itemsHTML = `
              <div class="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 mb-2 flex justify-between items-center">
                  <span class="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase">Surplus / Overpayment</span>
                  <span class="text-lg font-bold text-emerald-500">+${formatRp(surplus)}</span>
              </div>
            ` + itemsHTML;
            }
        }

        container.innerHTML = itemsHTML;
    }

    // --- CATEGORIES ---
    function renderCategories() {
        const db = getAppData();
        const container = document.getElementById('ui-categories-container');
        if (!container) return;
        container.innerHTML = '';

        const incomeCats = db.Categories.filter(c => c.Type === 'Income').sort((a, b) => a.Name.localeCompare(b.Name));
        const expenseCats = db.Categories.filter(c => c.Type === 'Expense').sort((a, b) => a.Name.localeCompare(b.Name));

        if (db.Categories.length === 0) {
            container.innerHTML = `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center"><i class="ph-fill ph-tag text-4xl text-slate-300 dark:text-slate-700 mb-3"></i><p class="text-slate-500 font-medium">Belum ada kategori. Buat kategori pertamamu!</p></div>`;
            return;
        }

        const renderTableUI = (title, items, badgeColorClass, iconHeader) => {
            if (items.length === 0) return '';

            let html = `
                <div class="mb-8 animate-fade-in-up">
                    <div class="flex items-center justify-between mb-4 px-1">
                        <h3 class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span class="w-1.5 h-6 rounded-full ${badgeColorClass}"></span>
                            ${title}
                        </h3>
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">${items.length} Kategori</span>
                    </div>

                    <!-- Desktop Table -->
                    <div class="hidden md:block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                        <table class="w-full text-left text-sm whitespace-nowrap">
                            <thead class="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th class="px-4 py-3 font-normal w-80"><i class="ph-bold ${iconHeader} mr-1"></i> Nama Kategori</th>
                                    <th class="px-4 py-3 font-normal"><i class="ph-bold ph-text-align-left mr-1"></i> Deskripsi</th>
                                    <th class="px-4 py-3 font-normal text-right w-28">Aksi</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            `;

            items.forEach(c => {
                html += `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td class="px-4 py-4 font-bold text-slate-800 dark:text-slate-200">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700 shadow-sm group-hover:scale-110 transition-transform">
                                    <i class="ph-fill ${c.Icon || 'ph-tag'}"></i>
                                </div>
                                <span>${c.Name}</span>
                            </div>
                        </td>
                        <td class="px-4 py-4 whitespace-normal">
                            <div class="text-slate-500 dark:text-slate-400 text-xs font-medium line-clamp-2 max-w-md" title="${c.Description || ''}">
                                ${c.Description || '<span class="opacity-30 font-normal">Tidak ada deskripsi</span>'}
                            </div>
                        </td>
                        <td class="px-4 py-4 text-right">
                            <div class="flex items-center justify-end gap-1.5">
                                <button onclick="openCategoryModal('${c.ID}')" class="p-2 text-slate-400 hover:text-blue-500 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg transition-colors" title="Edit"><i class="ph-bold ph-pencil-simple"></i></button>
                                <button onclick="deleteCategory('${c.ID}')" class="p-2 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg transition-colors" title="Hapus"><i class="ph-bold ph-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>

                    <!-- Mobile Cards -->
                    <div class="md:hidden space-y-3">
            `;

            items.forEach(c => {
                html += `
                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm group">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-100 dark:border-slate-700">
                                    <i class="ph-fill ${c.Icon || 'ph-tag'} text-xl"></i>
                                </div>
                                <h4 class="font-bold text-slate-800 dark:text-slate-100">${c.Name}</h4>
                            </div>
                            <div class="flex gap-1.5">
                                <button onclick="openCategoryModal('${c.ID}')" class="p-1.5 text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg"><i class="ph-bold ph-pencil-simple"></i></button>
                                <button onclick="deleteCategory('${c.ID}')" class="p-1.5 text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg"><i class="ph-bold ph-trash"></i></button>
                            </div>
                        </div>
                        ${c.Description ? `<p class="text-[11px] text-slate-500 italic border-t border-slate-50 dark:border-slate-800/50 pt-2">${c.Description}</p>` : ''}
                    </div>
                `;
            });

            html += `</div></div>`;
            return html;
        };

        let resultHTML = '';
        resultHTML += renderTableUI('Kategori Pengeluaran', expenseCats, 'bg-rose-500', 'ph-tag');
        resultHTML += renderTableUI('Kategori Pemasukan', incomeCats, 'bg-emerald-500', 'ph-trend-up');

        container.innerHTML = resultHTML;
    }

    function renderIconSelector(selectedValue = 'ph-tag') {
        const container = document.getElementById('ui-icon-selector');
        container.innerHTML = '';
        CATEGORY_ICONS.forEach(icon => {
            const isSelected = icon === selectedValue;
            container.innerHTML += `
          <button type="button" onclick="selectCatIcon('${icon}')" class="w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${isSelected ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-500 shadow-sm' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-brand-300'}">
            <i class="ph ph-bold ${icon} text-lg"></i>
          </button>
        `;
        });
        document.getElementById('CatIcon').value = selectedValue;
    }

    function selectCatIcon(icon) {
        renderIconSelector(icon);
    }

    function openCategoryModal(id = null) {
        lockBodyScroll();
        document.getElementById('modal-category').classList.remove('hidden');
        pushModalState('modal-category');
        resetAndSyncForm('form-category');

        if (id) {
            const db = getAppData();
            const cat = db.Categories.find(x => x.ID === id);
            if (cat) {
                document.getElementById('modal-category-title').innerText = 'Edit Kategori';
                document.getElementById('CatID').value = cat.ID;
                document.getElementById('CatName').value = cat.Name;
                document.getElementById('CatDescription').value = cat.Description || '';
                setSelectValue('CatType', cat.Type);
                renderIconSelector(cat.Icon || 'ph-tag');
            }
        } else {
            document.getElementById('modal-category-title').innerText = 'Tambah Kategori Baru';
            document.getElementById('CatID').value = '';
            document.getElementById('CatDescription').value = '';
            setSelectValue('CatType', 'Expense');
            renderIconSelector('ph-tag');
        }
    }

    function closeCategoryModal() {
        unlockBodyScroll();
        document.getElementById('modal-category').classList.add('hidden');
    }

    function saveCategory(e) {
        e.preventDefault();
        let db = getAppData();
        const id = document.getElementById('CatID').value;

        const newCat = {
            ID: id || 'CAT-' + Date.now(),
            Name: document.getElementById('CatName').value,
            Description: document.getElementById('CatDescription').value,
            Type: document.getElementById('CatType').value,
            Icon: document.getElementById('CatIcon').value
        };

        if (id) {
            const idx = db.Categories.findIndex(x => x.ID === id);
            if (idx > -1) db.Categories[idx] = newCat;
        } else {
            db.Categories.push(newCat);
        }

        addAuditLog(id ? "Update" : "Create", "Kategori: " + newCat.Name);

        // Standard Sync
        saveMasterData('Categories', db.Categories);

        closeCategoryModal();
        Swal.fire({ icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    }

    function deleteCategory(id) {
        const db = getAppData();
        if (db.Transactions.some(t => t.CategoryID === id) || db.Budgets.some(b => b.LinkedCategories.includes(id))) {
            Swal.fire({ icon: 'error', title: 'Tidak Dapat Dihapus', text: 'Kategori ini masih digunakan pada Transaksi atau Budget.' });
            return;
        }

        Swal.fire({
            title: 'Hapus Kategori?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus!'
        }).then((result) => {
            if (result.isConfirmed) {
                db.Categories = db.Categories.filter(c => c.ID !== id);
                addAuditLog("Delete", "Kategori ID: " + id);

                saveMasterData('Categories', db.Categories);

                Swal.fire('Terhapus!', 'Kategori berhasil dihapus.', 'success');
            }
        });
    }

    // --- SUBSCRIPTIONS ---
    function setSubFilter(val) {
        currentSubFilter = val;
        renderSubscriptions();
    }

    function renderSubscriptions() {
        const db = getAppData();
        const container = document.getElementById('ui-subscriptions-container');
        if (!container) return;

        container.innerHTML = '';
        let subs = db.Recurring || [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (currentSubFilter === 'CurrentMonth') {
            const m = today.getMonth();
            const y = today.getFullYear();
            subs = subs.filter(s => {
                const d = new Date(s.NextDue);
                return d.getMonth() === m && d.getFullYear() === y && s.Status === 'Active';
            });
        } else if (currentSubFilter === 'AllActive') {
            subs = subs.filter(s => s.Status === 'Active');
        } else if (currentSubFilter === 'Overdue') {
            subs = subs.filter(s => new Date(s.NextDue) < today && s.Status === 'Active');
        }

        if (subs.length === 0) {
            container.innerHTML = `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center"><i class="ph-fill ph-arrows-clockwise text-4xl text-blue-300 dark:text-blue-700 mb-3"></i><p class="text-slate-500 font-medium">Tidak ada langganan pada filter ini.</p></div>`;
            return;
        }

        // TABLE UNTUK DESKTOP
        let tableHTML = `
        <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3 font-normal"><i class="ph-bold ph-text-aa mr-1"></i> Nama</th>
                <th class="px-4 py-3 font-normal"><i class="ph-bold ph-clock mr-1"></i> Siklus</th>
                <th class="px-4 py-3 font-normal"><i class="ph-bold ph-arrow-up-right mr-1"></i> Kategori</th>
                <th class="px-4 py-3 font-normal"><i class="ph-bold ph-hash mr-1"></i> Biaya</th>
                <th class="px-4 py-3 font-normal"><i class="ph-bold ph-bank mr-1"></i> Akun</th>
                <th class="px-4 py-3 font-normal"><i class="ph-bold ph-circle-half mr-1"></i> Status</th>
                <th class="px-4 py-3 font-normal"><i class="ph-bold ph-calendar-blank mr-1"></i> Jatuh Tempo</th>
                <th class="px-4 py-3 font-normal text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
      `;

        // GRID UNTUK MOBILE
        let gridHTML = `<div class="md:hidden grid grid-cols-1 gap-4">`;

        subs.sort((a, b) => new Date(a.NextDue) - new Date(b.NextDue)).forEach(sub => {
            const nextDate = new Date(sub.NextDue);
            const diffDays = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

            let statusBadge = '';
            if (sub.Status === 'Paused') statusBadge = '<span class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700">PAUSED</span>';
            else if (diffDays < 0) statusBadge = `<span class="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"><i class="ph-bold ph-warning"></i> OVERDUE ${Math.abs(diffDays)} HARI</span>`;
            else if (diffDays === 0) statusBadge = '<span class="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 px-2 py-0.5 rounded text-[10px] font-bold">HARI INI</span>';
            else if (diffDays <= 7) statusBadge = `<span class="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50 px-2 py-0.5 rounded text-[10px] font-bold">${diffDays} HARI LAGI</span>`;
            else statusBadge = `<span class="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded text-[10px] font-bold">AKTIF</span>`;

            const dueColor = (diffDays < 0 && sub.Status === 'Active') ? 'text-rose-500 font-bold' : 'text-slate-600 dark:text-slate-400';

            const cat = db.Categories.find(c => c.ID === sub.CategoryID);
            const acc = db.Accounts.find(a => a.ID === sub.AccountID);

            // Render Desktop Row
            tableHTML += `
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
            <td class="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <i class="ph-fill ${cat ? cat.Icon : 'ph-arrows-clockwise'} text-slate-400"></i> ${sub.Name}
            </td>
            <td class="px-4 py-3"><span class="bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800/50 text-xs">${sub.Frequency === 'Monthly' ? 'Bulanan' : (sub.Frequency === 'Yearly' ? 'Tahunan' : 'Mingguan')}</span></td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-400">${cat ? cat.Name : '-'}</td>
            <td class="px-4 py-3 font-medium">${formatRp(sub.Amount)}</td>
            <td class="px-4 py-3 text-slate-600 dark:text-slate-400">${acc ? acc.Name : '-'}</td>
            <td class="px-4 py-3">${statusBadge}</td>
            <td class="px-4 py-3 ${dueColor}">${nextDate.toLocaleDateString('id-ID')}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                ${sub.Status === 'Active' ? `<button onclick="markSubPaid('${sub.ID}')" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-500 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"><i class="ph-bold ph-check"></i> Bayar</button>` : ''}
                <div class="flex gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
                  <button onclick="openSubscriptionModal('${sub.ID}')" class="p-1.5 text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700"><i class="ph-bold ph-pencil-simple"></i></button>
                  <button onclick="deleteSubscription('${sub.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700"><i class="ph-bold ph-trash"></i></button>
                </div>
              </div>
            </td>
          </tr>
        `;

            // Render Mobile Card
            gridHTML += `
              <div class="bg-white dark:bg-slate-900 border ${diffDays < 0 && sub.Status === 'Active' ? 'border-rose-300 dark:border-rose-800' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-5 shadow-sm relative group transition-all-smooth">
                  <div class="flex justify-between items-start mb-3">
                      <div class="flex gap-3 items-center">
                          <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/50"><i class="ph-fill ${cat ? cat.Icon : 'ph-arrows-clockwise'} text-xl"></i></div>
                          <div>
                              <h3 class="font-bold text-lg text-slate-800 dark:text-slate-200 leading-tight">${sub.Name}</h3>
                              <p class="text-[10px] text-slate-500 font-medium">${sub.Frequency === 'Monthly' ? 'Bulanan' : (sub.Frequency === 'Yearly' ? 'Tahunan' : 'Mingguan')} • ${cat ? cat.Name : '-'}</p>
                          </div>
                      </div>
                  </div>
                  <div class="mb-4">
                      <div class="text-2xl font-black text-slate-800 dark:text-slate-200 mb-1">${formatRp(sub.Amount)}</div>
                      ${statusBadge}
                  </div>
                  <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div class="text-[10px] text-slate-500 flex flex-col gap-0.5">
                          <span class="flex items-center gap-1"><i class="ph-fill ph-calendar-blank"></i> Jatuh Tempo: <span class="${dueColor}">${nextDate.toLocaleDateString('id-ID')}</span></span>
                          <span class="flex items-center gap-1"><i class="ph-fill ph-bank"></i> ${acc ? acc.Name : '-'}</span>
                      </div>
                      <div class="flex gap-2 opacity-100 md:opacity-100 group-hover:opacity-100 transition-opacity">
                          ${sub.Status === 'Active' ? `<button onclick="markSubPaid('${sub.ID}')" class="p-1.5 text-emerald-500 hover:text-white hover:bg-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-200 dark:border-emerald-800/50 transition-colors" title="Bayar Sekarang"><i class="ph-bold ph-check text-lg"></i></button>` : ''}
                          <button onclick="openSubscriptionModal('${sub.ID}')" class="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 rounded transition-colors" title="Edit Langganan"><i class="ph-bold ph-pencil-simple text-lg"></i></button>
                          <button onclick="deleteSubscription('${sub.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded transition-colors" title="Hapus Langganan"><i class="ph-bold ph-trash text-lg"></i></button>
                      </div>
                  </div>
              </div>
          `;
        });

        tableHTML += `</tbody></table></div>`;
        gridHTML += `</div>`;
        container.innerHTML = tableHTML + gridHTML;
    }

    function openSubscriptionModal(id = null) {
        lockBodyScroll();
        const db = getAppData();

        let catOpts = '<option value="" disabled selected>Pilih Kategori...</option>';
        db.Categories.filter(c => c.Type === 'Expense').forEach(c => { catOpts += `<option value="${c.ID}">${c.Name}</option>`; });
        setSelectHTML('SubCategory', catOpts);

        let accOpts = '<option value="" disabled selected>Pilih Akun Sumber Dana...</option>';
        db.Accounts.forEach(a => { accOpts += `<option value="${a.ID}" data-balance="${a.Balance}">${a.Name} - ${a.Type}</option>`; });
        setSelectHTML('SubAccount', accOpts);

        document.getElementById('modal-subscription').classList.remove('hidden');
        pushModalState('modal-subscription');
        resetAndSyncForm('form-subscription');

        if (id) {
            document.getElementById('modal-subscription-title').innerText = 'Edit Langganan';
            const s = db.Recurring.find(x => x.ID === id);
            if (s) {
                document.getElementById('SubID').value = s.ID;
                document.getElementById('SubName').value = s.Name;
                document.getElementById('SubAmount').value = s.Amount;
                document.getElementById('SubNextDue').value = s.NextDue;
                setSelectValue('SubFrequency', s.Frequency);
                setSelectValue('SubCategory', s.CategoryID);
                setSelectValue('SubAccount', s.AccountID);
                setSelectValue('SubStatus', s.Status);
            }
        } else {
            document.getElementById('modal-subscription-title').innerText = 'Tambah Langganan Baru';
            document.getElementById('SubID').value = '';
            document.getElementById('SubNextDue').value = new Date().toLocaleDateString('en-CA');
            setSelectValue('SubStatus', 'Active');
            setSelectValue('SubFrequency', 'Monthly');
        }
    }

    function closeSubscriptionModal() {
        unlockBodyScroll();
        document.getElementById('modal-subscription').classList.add('hidden');
    }

    function saveSubscription(e) {
        e.preventDefault();
        let db = getAppData();
        const id = document.getElementById('SubID').value;

        const newSub = {
            ID: id || 'SUB-' + Date.now(),
            Name: document.getElementById('SubName').value,
            Amount: Number(document.getElementById('SubAmount').value),
            Frequency: document.getElementById('SubFrequency').value,
            CategoryID: document.getElementById('SubCategory').value,
            AccountID: document.getElementById('SubAccount').value,
            NextDue: document.getElementById('SubNextDue').value,
            Status: document.getElementById('SubStatus').value
        };

        if (id) {
            const idx = db.Recurring.findIndex(x => x.ID === id);
            if (idx > -1) db.Recurring[idx] = newSub;
        } else {
            db.Recurring.push(newSub);
        }

        addAuditLog(id ? "Update" : "Create", "Langganan: " + newSub.Name);

        // Standard Sync
        saveMasterData('Recurring', db.Recurring);

        closeSubscriptionModal();
        Swal.fire({ icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    }

    function deleteSubscription(id) {
        Swal.fire({
            title: 'Hapus Langganan?',
            text: 'Ini tidak akan menghapus riwayat transaksi masa lalu.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus!'
        }).then((result) => {
            if (result.isConfirmed) {
                let db = getAppData();
                db.Recurring = db.Recurring.filter(s => s.ID !== id);
                addAuditLog("Delete", "Langganan ID: " + id);

                saveMasterData('Recurring', db.Recurring);

                Swal.fire('Terhapus!', 'Catatan langganan dihapus.', 'success');
            }
        });
    }

    function markSubPaid(id) {
        let db = getAppData();
        const subIdx = db.Recurring.findIndex(s => s.ID === id);
        if (subIdx === -1) return;

        const sub = db.Recurring[subIdx];

        // Set flag agar handleTrxSubmit otomatis geser NextDue setelah disimpan
        window._pendingRecurringAdvance = id;

        openTransactionModal(null, {
            Type: 'Expense',
            Date: sub.NextDue,
            Amount: sub.Amount,
            Note: sub.Name,
            AccountID: sub.AccountID,
            CategoryID: sub.CategoryID
        });
    }

    // Dipanggil dari handleTrxSubmit setelah transaksi langganan berhasil disimpan
    function advanceRecurringNextDue(recurringId) {
        let db = getAppData();
        const subIdx = db.Recurring.findIndex(s => s.ID === recurringId);
        if (subIdx === -1) return;

        const sub = db.Recurring[subIdx];
        const currentDue = new Date(sub.NextDue);

        if (sub.Frequency === 'Weekly') {
            currentDue.setDate(currentDue.getDate() + 7);
        } else if (sub.Frequency === 'Monthly') {
            currentDue.setMonth(currentDue.getMonth() + 1);
        } else if (sub.Frequency === 'Yearly') {
            currentDue.setFullYear(currentDue.getFullYear() + 1);
        }

        db.Recurring[subIdx].NextDue = currentDue.toLocaleDateString('en-CA');
        saveMasterData('Recurring', db.Recurring);
        addAuditLog("System", `Auto-advance NextDue: ${sub.Name}`, db.Recurring[subIdx].NextDue);
    }

    // --- QUICK ACTION MODAL ---
    function openQuickAction(type, entityId) {
        lockBodyScroll();
        const db = getAppData();
        document.getElementById('modal-quick-action').classList.remove('hidden');
        pushModalState('modal-quick-action');
        resetAndSyncForm('form-quick-action');
        document.getElementById('ActionEntityID').value = entityId;
        document.getElementById('ActionType').value = type;
        document.getElementById('ActionDate').value = new Date().toLocaleDateString('en-CA');

        const wrapCat = document.getElementById('wrapper-action-cat');
        const lblAcc = document.getElementById('label-action-acc');

        if (type === 'fundGoal') {
            const goal = db.Goals.find(g => g.ID === entityId);
            document.getElementById('modal-action-title').innerText = 'Top-Up Dana Goal';
            document.getElementById('action-subtitle').innerHTML = `Goal: <b>${goal.Name}</b>\nAkun Penampung: <b>${db.Accounts.find(a => a.ID === goal.LinkedAccountID)?.Name || '-'}</b>`;
            lblAcc.innerText = 'Pindahkan Dari Akun (Sumber Dana)';

            let accOpts = '<option value="" disabled selected>Pilih Sumber Dana...</option>';
            db.Accounts.filter(a => ['Cash & Bank', 'Investment'].includes(a.Type)).forEach(a => {
                if (a.ID === goal.LinkedAccountID) {
                    accOpts += `<option value="${a.ID}" data-balance="${a.Balance - a.GoalAllocated}">${a.Name} — Alokasi Internal</option>`;
                } else {
                    accOpts += `<option value="${a.ID}" data-balance="${a.Balance - a.GoalAllocated}">${a.Name}</option>`;
                }
            });
            setSelectHTML('ActionAccount', accOpts);
            wrapCat.classList.add('hidden');
            document.getElementById('ActionCategory').required = false;

        } else if (type === 'sellAsset') {
            const ast = db.Assets.find(a => a.ID === entityId);
            document.getElementById('modal-action-title').innerText = 'Jual Aset';
            document.getElementById('action-subtitle').innerHTML = `Aset: <b>${ast.Name}</b>\nNilai Pasar: <b>${formatRp(ast.MarketValue)}</b>`;
            document.getElementById('ActionAmount').value = ast.MarketValue;
            lblAcc.innerText = 'Uang Masuk Ke Rekening/Dompet';

            // Tampilkan slider partial sell
            const wrapPartial = document.getElementById('wrapper-action-partial');
            if (wrapPartial) {
                wrapPartial.classList.remove('hidden');
                document.getElementById('ActionSellPercent').value = 100;
                document.getElementById('ActionSellPercentLabel').innerText = '100%';
                document.getElementById('ActionSellInfo').innerText = 'Jual seluruh aset.';
                // Simpan nilai pasar asli untuk kalkulasi slider
                window._sellAssetFullValue = ast.MarketValue;
            }

            let accOpts = '<option value="" disabled selected>Pilih Rekening Tujuan...</option>';
            db.Accounts.filter(a => ['Cash & Bank', 'Investment'].includes(a.Type)).forEach(a => {
                accOpts += `<option value="${a.ID}">${a.Name}</option>`;
            });
            setSelectHTML('ActionAccount', accOpts);
            wrapCat.classList.add('hidden');
            document.getElementById('ActionCategory').required = false;
        }
    }

    function closeQuickActionModal() {
        unlockBodyScroll();
        document.getElementById('modal-quick-action').classList.add('hidden');
        // Reset partial sell slider
        const wrapPartial = document.getElementById('wrapper-action-partial');
        if (wrapPartial) wrapPartial.classList.add('hidden');
        window._sellAssetFullValue = null;
    }

    // Handler slider porsi jual aset
    function handleSellPercentChange() {
        const pct = Number(document.getElementById('ActionSellPercent').value);
        document.getElementById('ActionSellPercentLabel').innerText = pct + '%';
        const fullVal = window._sellAssetFullValue || 0;
        const amount = Math.round(fullVal * pct / 100);
        document.getElementById('ActionAmount').value = amount;
        document.getElementById('ActionSellInfo').innerText = pct === 100
            ? 'Jual seluruh aset.'
            : `Jual ${pct}% → Sisa aset: ${formatRp(fullVal - amount)}`;
    }

    function submitQuickAction(e) {
        e.preventDefault();
        let db = getAppData();
        const type = document.getElementById('ActionType').value;
        const id = document.getElementById('ActionEntityID').value;
        const amt = Number(document.getElementById('ActionAmount').value);
        const date = document.getElementById('ActionDate').value;
        const accId = document.getElementById('ActionAccount').value;
        const catId = document.getElementById('ActionCategory').value;

        const processAction = () => {
            if (type === 'fundGoal') {
                const goalIdx = db.Goals.findIndex(g => g.ID === id);
                const goal = db.Goals[goalIdx];

                if (accId !== goal.LinkedAccountID) {
                    const trx = {
                        ID: 'TRX-' + Date.now(), Date: date, Type: 'Transfer', FromAccountID: accId, ToAccountID: goal.LinkedAccountID, CategoryID: '', Amount: amt, Note: 'Top-Up Goal: ' + goal.Name,
                        ReferenceType: 'Goal', ReferenceID: goal.ID, LinkedDebtPayments: null
                    };
                    saveTransaction(trx);
                    let sIdx = db.Accounts.findIndex(a => a.ID === accId);
                    if (sIdx > -1) db.Accounts[sIdx].Balance -= amt;
                    let tIdx = db.Accounts.findIndex(a => a.ID === goal.LinkedAccountID);
                    if (tIdx > -1) db.Accounts[tIdx].Balance += amt;
                }

                db.Goals[goalIdx].AllocatedAmount += amt;
                db = syncAccountGoalAllocations(db);

                addAuditLog("System", "Top Up Goal " + formatRp(amt), accId === goal.LinkedAccountID ? "Alokasi Internal" : "Via Transfer");

                // Sync
                saveMasterData('Goals', db.Goals);
                saveMasterData('Accounts', db.Accounts);

            } else if (type === 'sellAsset') {
                const astIdx = db.Assets.findIndex(a => a.ID === id);
                const ast = db.Assets[astIdx];
                const sellPct = Number(document.getElementById('ActionSellPercent')?.value || 100);
                const isFullSell = sellPct >= 100;

                // Transfer: Akun Asset → Akun Cash/Bank
                const trx = {
                    ID: 'TRX-' + Date.now(), Date: date, Type: 'Transfer',
                    FromAccountID: ast.LinkedAccountID, ToAccountID: accId,
                    CategoryID: '', Amount: amt,
                    Note: isFullSell ? 'Jual Aset: ' + ast.Name : `Jual ${sellPct}% Aset: ${ast.Name}`,
                    ReferenceType: 'AssetSale', ReferenceID: ast.ID,
                    LinkedDebtPayments: null,
                    // Snapshot aset agar bisa di-restore jika transaksi dihapus
                    LinkedAssetSnapshot: JSON.parse(JSON.stringify(ast))
                };
                saveTransaction(trx);

                let tIdx = db.Accounts.findIndex(a => a.ID === accId);
                if (tIdx > -1) db.Accounts[tIdx].Balance += amt;

                if (isFullSell) {
                    // Jual 100% → hapus aset
                    db.Assets.splice(astIdx, 1);
                } else {
                    // Partial sell → kurangi proporsional
                    const remaining = (100 - sellPct) / 100;
                    db.Assets[astIdx].MarketValue = Math.round(ast.MarketValue * remaining);
                    db.Assets[astIdx].OriginalValue = Math.round(ast.OriginalValue * remaining);
                }

                db = syncAssetAccountBalances(db);
                addAuditLog("System", `Jual ${isFullSell ? '' : sellPct + '% '}Aset: ${ast.Name}`);

                // Sync
                saveMasterData('Assets', db.Assets);
                saveMasterData('Accounts', db.Accounts);
            }
            closeQuickActionModal();
            Swal.fire('Sukses', 'Proses berhasil dijalankan.', 'success');
        };

        if (type === 'fundGoal') {
            const goalIdx = db.Goals.findIndex(g => g.ID === id);
            if (goalIdx === -1) return;
            const goal = db.Goals[goalIdx];

            const sourceAcc = db.Accounts.find(a => a.ID === accId);

            if (goal.AllocatedAmount + amt > goal.TargetAmount) {
                Swal.fire('Gagal', 'Nominal top-up melebihi sisa target goal.', 'error'); return;
            }

            if (amt > (sourceAcc.Balance - sourceAcc.GoalAllocated)) {
                Swal.fire({
                    title: 'Saldo Tidak Cukup',
                    html: `Top-Up ini akan membuat saldo bebas akun <b>${sourceAcc.Name}</b> menjadi minus. Lanjutkan?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Ya, Lanjutkan'
                }).then((res) => { if (res.isConfirmed) processAction(); });
                return;
            }
            processAction();
        } else if (type === 'sellAsset') {
            processAction();
        }
    }

    // ==========================================
    // ADMIN DASHBOARD LOGIC (Moved from script-admin.html)
    // ==========================================
    let adminDataLoaded = false;

    // Observe tab behavior if admin tab is shown
    document.addEventListener('DOMContentLoaded', () => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.id === 'tab-admin' && !mutation.target.classList.contains('hidden')) {
                    if (!adminDataLoaded) {
                        loadAdminData();
                    }
                }
            });
        });
        const tabAdmin = document.getElementById('tab-admin');
        if (tabAdmin) {
            observer.observe(tabAdmin, { attributes: true, attributeFilter: ['class'] });
        }
    });

    function loadAdminData(isManual = false) {
        if (!window.appSession || window.appSession.role !== 'admin' || !window.appSession.idToken) {
            Swal.fire('Akses Ditolak', 'Hanya admin yang dapat memuat data ini.', 'error');
            return;
        }

        const icon = document.getElementById('admin-refresh-icon');
        if (icon) icon.classList.add('animate-spin');

        const usersTbody = document.getElementById('admin-users-tbody');
        const licensesTbody = document.getElementById('admin-licenses-tbody');
        if (usersTbody) usersTbody.innerHTML = `<tr><td colspan="3" class="px-5 py-8 text-center text-slate-500"><i class="ph ph-spinner animate-spin text-2xl mb-2 text-brand-500"></i><br>Sedang membongkar data...</td></tr>`;
        if (licensesTbody) licensesTbody.innerHTML = `<tr><td colspan="3" class="px-5 py-8 text-center text-slate-500"><i class="ph ph-spinner animate-spin text-2xl mb-2 text-brand-500"></i><br>Mengambil token lisensi...</td></tr>`;

        if (isManual) {
            Swal.fire({ title: 'Memuat data...', toast: true, position: 'top-end', showConfirmButton: false, didOpen: () => { Swal.showLoading(); }});
        }

        google.script.run
            .withSuccessHandler(res => {
                if (icon) icon.classList.remove('animate-spin');
                if (res.success) {
                    adminDataLoaded = true;
                    renderAdminDashboard(res.data);
                    if (isManual) {
                        Swal.fire({ icon: 'success', title: 'Data Diperbarui', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
                    }
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            })
            .withFailureHandler(err => {
                if (icon) icon.classList.remove('animate-spin');
                Swal.fire('System Error', err.message, 'error');
            })
            .getAdminDashboardData(window.appSession.idToken);
    }

    function renderAdminDashboard(data) {
        // Update Stats
        document.getElementById('admin-stat-users').innerText = data.stats.totalUsers;
        document.getElementById('admin-stat-active-keys').innerText = data.stats.activeLicenses;
        document.getElementById('admin-stat-used-keys').innerText = data.stats.usedLicenses;

        // Render Users Table/Cards
        const usersTbody = document.getElementById('admin-users-tbody');
        if (data.users && data.users.length > 0) {
            const sortedUsers = data.users.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            // Desktop Table
            const tableHtml = sortedUsers.map(u => `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 group">
                    <td class="px-4 md:px-5 py-2.5">
                        <div class="font-bold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors text-xs md:text-sm">${u.email}</div>
                        <div class="text-[9px] text-slate-400 font-mono mt-0.5 truncate max-w-[150px]" title="${u.spreadsheetId}">${u.spreadsheetId}</div>
                    </td>
                    <td class="px-4 md:px-5 py-2.5 text-center">
                        <div class="flex items-center justify-center gap-1 font-bold">
                            <span class="px-1.5 py-0.5 rounded-full text-[8px] uppercase tracking-tighter ${u.role === 'admin' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}">${u.role}</span>
                            <span class="px-1.5 py-0.5 rounded-full text-[8px] uppercase tracking-tighter ${u.level === 'pro' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}">${u.level || 'basic'}</span>
                        </div>
                    </td>
                    <td class="px-4 md:px-5 py-2.5 text-right hidden sm:table-cell">
                        <div class="text-[10px] font-bold text-slate-900 dark:text-slate-200">${u.createdAt.split(' ')[0]}</div>
                        <div class="text-[8px] text-slate-400 uppercase tracking-widest leading-none mt-0.5">Joined</div>
                    </td>
                </tr>
            `).join('');

            usersTbody.innerHTML = tableHtml;
        } else {
            usersTbody.innerHTML = `<tr><td colspan="3" class="px-5 py-12 text-center text-slate-400"><i class="ph ph-mask-sad text-4xl mb-2"></i><br />Belum ada pengguna terdaftar.</td></tr>`;
        }

        // Setup Global Licenses for Filtering
        window.globalAdminLicenses = (data.licenses || []);
        renderFiltersLicenses();
    }

    function renderFiltersLicenses() {
        const filterVal = document.getElementById('admin-license-filter')?.value || 'active';
        const sortVal = document.getElementById('admin-license-sort')?.value || 'oldest';

        let filtered = [...(window.globalAdminLicenses || [])];

        if (filterVal === 'booked') {
            filtered = filtered.filter(l => l.status === 'booked');
        } else if (filterVal === 'active') {
            filtered = filtered.filter(l => l.status === 'active');
        } else if (filterVal === 'used') {
            filtered = filtered.filter(l => l.status === 'used');
        }

        if (sortVal === 'oldest') {
            filtered = filtered.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        } else {
            filtered = filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        }

        const licensesTbody = document.getElementById('admin-licenses-tbody');
        if (!licensesTbody) return;

        if (filtered.length > 0) {
            licensesTbody.innerHTML = filtered.map(l => {
                let statusBadge = '';
                let actionBtn = '';
                
                if (l.status === 'active') {
                    statusBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 text-[8px] font-bold uppercase tracking-tighter border border-emerald-200 dark:border-emerald-800"><span class="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span> Available</span>`;
                    actionBtn = `<button onclick="promptBookLicense('${l.key}')" class="text-[10px] font-bold text-amber-500 hover:text-white hover:bg-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800/50 transition-colors w-full md:w-auto">Book</button>`;
                } else if (l.status === 'booked') {
                    statusBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10 text-[8px] font-bold uppercase tracking-tighter border border-amber-200 dark:border-amber-800">Booked: ${l.bookedBy || '-'}</span>`;
                    actionBtn = `<button onclick="promptUnbookLicense('${l.key}')" class="text-[10px] font-bold text-slate-500 hover:text-white hover:bg-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors w-full md:w-auto">Batal</button>`;
                } else if (l.status === 'used') {
                    statusBadge = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[8px] font-bold uppercase tracking-tighter border border-slate-200 dark:border-slate-700">Used</span>`;
                    actionBtn = `<button onclick="promptReactivateLicense('${l.key}')" class="text-[10px] font-bold text-blue-500 hover:text-white hover:bg-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800/50 transition-colors w-full md:w-auto">Pulihkan</button>`;
                }

                return `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 group animate-fade-in shadow-sm hover:shadow-md">
                    <td class="px-4 md:px-5 py-2.5">
                        <div class="flex items-center gap-2">
                             <div class="font-mono font-bold text-sm text-brand-600 dark:text-brand-400 tracking-wider">${l.key}</div>
                             <button onclick="copyLicenseKey('${l.key}')" class="flex items-center justify-center w-6 h-6 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-all shadow-sm active:scale-95 shadow-brand-500/20 shrink-0" title="Salin Token">
                                <i class="ph-bold ph-copy text-[10px]"></i>
                             </button>
                        </div>
                        <div class="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">${l.createdAt}</div>
                    </td>
                    <td class="px-4 md:px-5 py-2.5 text-center">
                        ${statusBadge}
                    </td>
                    <td class="px-4 md:px-5 py-2.5 text-right">
                        ${actionBtn}
                    </td>
                </tr>
            `}).join('');
        } else {
            licensesTbody.innerHTML = `<tr><td colspan="3" class="px-5 py-12 text-center text-slate-400"><i class="ph ph-mask-sad text-4xl mb-2"></i><br />Tidak ada token dengan kriteria pencarian ini.</td></tr>`;
        }
    }

    function handleGenerateKeys(e) {
        e.preventDefault();
        const qty = parseInt(document.getElementById('input-key-qty').value);
        if (!qty || qty < 1) return;

        if (!window.appSession || window.appSession.role !== 'admin' || !window.appSession.idToken) return;

        const btn = document.getElementById('btn-generate-keys');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class="ph-bold ph-spinner animate-spin"></i> Generating...`;
        btn.disabled = true;

        google.script.run
            .withSuccessHandler(res => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                document.getElementById('input-key-qty').value = '';

                if (res.success) {
                    Swal.fire({
                        title: 'Keys Generated!',
                        html: `Berhasil membuat ${res.data.length} lisensi baru. Memuat ulang data...`,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    loadAdminData(); // Refresh UI
                } else {
                    Swal.fire('Gagal', res.message, 'error');
                }
            })
            .withFailureHandler(err => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                Swal.fire('Gagal', 'Sistem error: ' + err.message, 'error');
            })
            .generateLicenseKeys(window.appSession.idToken, qty);
    }

    function copyLicenseKey(key) {
        const message = `Halo Kak! ✨✨\n\nMakasih banyak ya sudah mulai melek finansial dan percayakan *Excellearn Wealth Tracker* sebagai partner perjalanan keuanganmu. 🚀\n\nSilakan akses aplikasinya di sini ya:\n🔗 *excellearn.online/wealth-tracker*\n\nDan ini Token akses Kakak: \n🎫 *${key}*\n\nKalau kamu ada kendala, atau mau request fitur, join di komunitas ini ya biar tau update terbaru juga: \nhttps://chat.whatsapp.com/JABFOiahEQb5QlCHwhmoJU\n\nSemoga makin cuan dan teratur ya keuangannya! 💰😊`;

        // Robust Copy Mechanism for Apps Script Iframe
        const textArea = document.createElement("textarea");
        textArea.value = message;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                Swal.fire({
                    icon: 'success',
                    title: 'Pesan Disalin!',
                    text: 'Pesan manis untuk customer sudah siap dikirim.',
                    timer: 1500,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }
        } catch (err) {
            console.error('Gagal menyalin:', err);
        }
        document.body.removeChild(textArea);
    }

    // --- LICENSE BOOKING ACTIONS ---
    function promptBookLicense(key) {
        Swal.fire({
            title: 'Booking Token',
            input: 'text',
            inputLabel: 'Nama Pemesan',
            inputPlaceholder: 'Masukkan nama pembeli...',
            showCancelButton: true,
            confirmButtonText: 'Book',
            cancelButtonText: 'Batal',
            inputValidator: (value) => {
                if (!value || value.trim() === '') return 'Nama tidak boleh kosong!';
            }
        }).then((result) => {
            if (result.isConfirmed) {
                updateLicenseStatusUI(key, 'booked', result.value);
            }
        });
    }

    function promptUnbookLicense(key) {
        Swal.fire({
            title: 'Batal Booking',
            text: "Token ini akan kembali tersedia (Available) untuk umum. Lanjutkan?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Batalkan',
            cancelButtonText: 'Tutup'
        }).then((result) => {
            if (result.isConfirmed) {
                updateLicenseStatusUI(key, 'active', '');
            }
        });
    }

    function promptReactivateLicense(key) {
        Swal.fire({
            title: 'Pulihkan Token?',
            text: "Pastikan pengguna sebelumnya benar-benar tidak menggunakan database-nya lagi. Token ini akan dikembalikan menjadi 'Available'.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Pulihkan',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                updateLicenseStatusUI(key, 'active', '');
            }
        });
    }

    function updateLicenseStatusUI(key, status, buyerName) {
        Swal.fire({
            title: 'Memproses...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        google.script.run
            .withSuccessHandler(res => {
                if (res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Status Diperbarui',
                        text: res.message,
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000
                    });
                    loadAdminData(); // Refresh API secara background
                } else {
                    Swal.fire('Gagal', res.message, 'error');
                }
            })
            .withFailureHandler(err => {
                Swal.fire('Error', 'Sistem gagal tersambung: ' + err.message, 'error');
            })
            .updateLicenseStatusAdmin(window.appSession.idToken, key, status, buyerName);
    }