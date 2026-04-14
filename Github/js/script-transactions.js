    // Advanced Filters Added
    // ==========================================
    // TRANSACTIONS MODULE
    // ==========================================
    function openTransactionModal(id = null, initialData = null) {
        lockBodyScroll();
        const db = getAppData();

        // Reset Selects Before Syncing Type
        document.getElementById('modal-trx').classList.remove('hidden');
        pushModalState('modal-trx');
        resetAndSyncForm('form-trx');

        if (id) {
            document.getElementById('modal-trx-title').innerText = 'Edit Transaksi';
            document.getElementById('TrxID').value = id;
            const trx = db.Transactions.find(t => t.ID === id);
            if (trx) {
                document.querySelector(`input[name="Type"][value="${trx.Type}"]`).checked = true;
                handleTrxTypeChange(); // Load Options based on Type (Important step to trigger transfer filtering)

                document.getElementById('TrxDate').value = trx.Date;
                document.getElementById('TrxAmount').value = trx.Amount;
                document.getElementById('TrxNote').value = trx.Note;

                if (trx.Type === 'Expense') {
                    setSelectValue('TrxAccount', trx.FromAccountID);
                    setSelectValue('TrxCategory', trx.CategoryID);
                } else if (trx.Type === 'Income') {
                    setSelectValue('TrxAccount', trx.ToAccountID);
                    setSelectValue('TrxCategory', trx.CategoryID);
                } else {
                    setSelectValue('TrxFromAccount', trx.FromAccountID);
                    setSelectValue('TrxToAccount', trx.ToAccountID);
                }
            }
        } else {
            document.getElementById('modal-trx-title').innerText = 'Input Transaksi';
            document.getElementById('TrxID').value = '';
            document.getElementById('TrxDate').value = (initialData && initialData.Date) ? initialData.Date : new Date().toLocaleDateString('en-CA');

            if (initialData) {
                const typeRadio = document.querySelector(`input[name="Type"][value="${initialData.Type}"]`);
                if (typeRadio) typeRadio.checked = true;
                handleTrxTypeChange();

                if (initialData.Amount) document.getElementById('TrxAmount').value = initialData.Amount;
                if (initialData.Note) document.getElementById('TrxNote').value = initialData.Note;

                if (initialData.Type === 'Expense') {
                    setTimeout(() => {
                        if (initialData.AccountID) setSelectValue('TrxAccount', initialData.AccountID);
                        if (initialData.CategoryID) setSelectValue('TrxCategory', initialData.CategoryID);
                    }, 50);
                }
            } else {
                document.querySelector('input[name="Type"][value="Expense"]').checked = true;
                handleTrxTypeChange();
            }
        }
    }

    function closeTransactionModal() {
        unlockBodyScroll();
        document.getElementById('modal-trx').classList.add('hidden');
        resetAndSyncForm('form-trx');
    }

    function handleTrxTypeChange() {
        const typeElement = document.querySelector('input[name="Type"]:checked');
        if (!typeElement) return;
        const type = typeElement.value;
        const db = getAppData();

        const wrapAcc = document.getElementById('wrapper-trx-account');
        const wrapFrom = document.getElementById('wrapper-trx-from');
        const wrapTo = document.getElementById('wrapper-trx-to');
        const wrapCat = document.getElementById('wrapper-trx-category');
        const noteTransfer = document.getElementById('wrapper-trx-transfer-note');

        const lblAcc = document.getElementById('label-trx-account');
        const lblCat = document.getElementById('label-trx-category');

        // Setup Options
        if (type === 'Transfer') {
            let transferOptions = '<option value="" disabled selected>Pilih Akun...</option>';
            db.Accounts.filter(a => (a.Type === 'Cash & Bank' || a.Type === 'Investment')).forEach(acc => {
                const freeBalance = Number(acc.Balance) - Number(acc.GoalAllocated || 0);
                transferOptions += `<option value="${acc.ID}" data-balance="${freeBalance}">${acc.Name}</option>`;
            });
            setSelectHTML('TrxFromAccount', transferOptions);
            setSelectHTML('TrxToAccount', transferOptions);
            noteTransfer.classList.remove('hidden');
        } else {
            let allOptions = '<option value="" disabled selected>Pilih Akun...</option>';
            db.Accounts.forEach(acc => {
                const freeBalance = Number(acc.Balance) - Number(acc.GoalAllocated || 0);
                allOptions += `<option value="${acc.ID}" data-balance="${freeBalance}">${acc.Name}</option>`;
            });
            setSelectHTML('TrxAccount', allOptions);
            noteTransfer.classList.add('hidden');
        }

        // Setup UI Visiblity
        if (type === 'Expense' || type === 'Income') {
            wrapAcc.classList.remove('hidden');
            wrapFrom.classList.add('hidden');
            wrapTo.classList.add('hidden');
            wrapCat.classList.remove('hidden');

            document.getElementById('TrxAccount').required = true;
            document.getElementById('TrxFromAccount').required = false;
            document.getElementById('TrxToAccount').required = false;
            document.getElementById('TrxCategory').required = true;

            if (type === 'Expense') {
                lblAcc.innerText = 'Gunakan Akun';
                lblCat.innerText = 'Kategori Pengeluaran';
            } else {
                lblAcc.innerText = 'Masuk ke Akun';
                lblCat.innerText = 'Kategori Pemasukan';
            }

            let catOptions = '<option value="" disabled selected>Pilih Kategori...</option>';
            db.Categories.filter(c => c.Type === type).forEach(c => {
                catOptions += `<option value="${c.ID}">${c.Name}</option>`;
            });
            if (db.Categories.filter(c => c.Type === type).length === 0) {
                catOptions += `<option value="" disabled>Belum ada kategori ${type}</option>`;
            }
            setSelectHTML('TrxCategory', catOptions);

        } else if (type === 'Transfer') {
            wrapAcc.classList.add('hidden');
            wrapFrom.classList.remove('hidden');
            wrapTo.classList.remove('hidden');
            wrapCat.classList.add('hidden');

            document.getElementById('TrxAccount').required = false;
            document.getElementById('TrxFromAccount').required = true;
            document.getElementById('TrxToAccount').required = true;
            document.getElementById('TrxCategory').required = false;
        }
    }

    function handleTrxSubmit(e) {
        e.preventDefault();

        const id = document.getElementById('TrxID').value;
        const typeElement = document.querySelector('input[name="Type"]:checked');
        if (!typeElement) return;
        const type = typeElement.value;
        const date = document.getElementById('TrxDate').value;
        const amount = Number(document.getElementById('TrxAmount').value);
        const note = document.getElementById('TrxNote').value;

        let fromAcc = '', toAcc = '', catId = '';

        if (type === 'Expense') {
            fromAcc = document.getElementById('TrxAccount').value;
            catId = document.getElementById('TrxCategory').value;
        } else if (type === 'Income') {
            toAcc = document.getElementById('TrxAccount').value;
            catId = document.getElementById('TrxCategory').value;
        } else if (type === 'Transfer') {
            fromAcc = document.getElementById('TrxFromAccount').value;
            toAcc = document.getElementById('TrxToAccount').value;
            catId = '';

            if (fromAcc === toAcc) {
                Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Akun asal dan tujuan tidak boleh sama.' });
                return;
            }
        }

        let db = getAppData();
        let sourceAccId = fromAcc;
        let needsWarning = false;
        let warningText = '';

        if (sourceAccId) {
            const sAcc = db.Accounts.find(a => a.ID === sourceAccId);
            // ZETTBOT FIX: Gunakan Saldo Bebas (Saldo - Alokasi Goal) untuk pengecekan
            let freeBalance = sAcc ? (Number(sAcc.Balance) - Number(sAcc.GoalAllocated || 0)) : 0;
            
            if (id) {
                const oldTrx = db.Transactions.find(t => t.ID === id);
                if (oldTrx && oldTrx.FromAccountID === sourceAccId) {
                    freeBalance += oldTrx.Amount;
                } else if (oldTrx && oldTrx.ToAccountID === sourceAccId) {
                    freeBalance -= oldTrx.Amount;
                }
            }
            
            if (freeBalance - amount < 0) {
                needsWarning = true;
                const actualBalance = sAcc ? Number(sAcc.Balance) : 0;
                
                if (actualBalance - amount < 0) {
                    warningText = `Transaksi ini akan menyebabkan <b>Saldo AKTUAL</b> akun <b>${sAcc ? sAcc.Name : 'Utama'}</b> menjadi minus. Lanjutkan?`;
                } else {
                    warningText = `Transaksi ini melebihi <b>Saldo BEBAS</b> akun <b>${sAcc ? sAcc.Name : 'Utama'}</b> (Dana sudah teralokasi untuk Goal). Lanjutkan?`;
                }
            }
        }

        const processSubmit = () => {
            Swal.fire({ title: 'Memproses Transaksi...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });

            setTimeout(() => {
                let db = getAppData();
                const snapshot = JSON.stringify(db);

                const newTrx = {
                    ID: id || 'TRX-' + Date.now(),
                    Date: date,
                    Type: type,
                    FromAccountID: fromAcc,
                    ToAccountID: toAcc,
                    CategoryID: catId,
                    Amount: amount,
                    Note: note
                };

                if (id) {
                    const oldIdx = db.Transactions.findIndex(t => t.ID === id);
                    if (oldIdx > -1) {
                        revertTransactionEffect(db, db.Transactions[oldIdx]);
                        db.Transactions[oldIdx] = newTrx;
                    }
                    db = syncAccountGoalAllocations(db);
                } else {
                    // Optimized path for new trx
                    saveTransaction(newTrx);
                    // Reload db context after unshift in saveTransaction
                    db = getAppData();
                }

                if (fromAcc) {
                    let fIdx = db.Accounts.findIndex(a => a.ID === fromAcc);
                    if (fIdx > -1) db.Accounts[fIdx].Balance -= amount;
                }
                if (toAcc) {
                    let tIdx = db.Accounts.findIndex(a => a.ID === toAcc);
                    if (tIdx > -1) db.Accounts[tIdx].Balance += amount;
                }

                const actionLabel = id ? "Update" : "Create";
                addAuditLog(actionLabel, "Trx " + type + " " + formatRp(amount));

                // Standard Sync (ZETTBOT FIX: Menggunakan jalur spesifik transaksi)
                if (id) {
                    updateTransactionRow(newTrx);
                }
                saveMasterData('Accounts', db.Accounts);

                // ZETTBOT FIX: OPTIMISTIC UI RE-RENDER INSTAN
                if (typeof renderTransactions === 'function') renderTransactions();
                if (typeof loadDashboardData === 'function') loadDashboardData();
                if (typeof renderAccounts === 'function') renderAccounts();
                if (typeof currentDetailAccId !== 'undefined' && currentDetailAccId && typeof renderAccountHistory === 'function') {
                    renderAccountHistory();
                }

                closeTransactionModal();

                // Auto-advance langganan jika ini adalah pembayaran dari markSubPaid
                if (window._pendingRecurringAdvance && !id) {
                    advanceRecurringNextDue(window._pendingRecurringAdvance);
                    window._pendingRecurringAdvance = null;
                    if (typeof renderSubscriptions === 'function') renderSubscriptions();
                }

                Swal.fire({ icon: 'success', title: 'Transaksi Sukses', showConfirmButton: false, timer: 1500 });
            }, 500);
        };

        if (needsWarning) {
            Swal.fire({
                title: 'Warning Saldo Tidak Mencukupi',
                html: warningText,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Ya, Lanjutkan'
            }).then((result) => {
                if (result.isConfirmed) processSubmit();
            });
        } else {
            processSubmit();
        }
    }

    function triggerFlash(el) {
        if (!el) return;
        el.classList.remove('flash-active');
        void el.offsetWidth;
        el.classList.add('flash-active');
        setTimeout(() => el.classList.remove('flash-active'), 800);
    }

    // Smart Edit: buka modal yang sesuai berdasarkan ReferenceType transaksi
    function getSmartEditButton(t, mode) {
        const deskBtn = (onclick, icon, title, color = 'blue') =>
            `<button onclick="${onclick}" class="p-1.5 text-slate-400 hover:text-${color}-500 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg transition-colors" title="${title}"><i class="ph-bold ${icon}"></i></button>`;
        const mobBtn = (onclick, icon, label, color = 'blue') =>
            `<button onclick="${onclick}" class="flex-1 py-2 text-sm font-bold text-${color}-600 dark:text-${color}-400 bg-${color}-50 dark:bg-${color}-900/30 hover:bg-${color}-100 dark:hover:bg-${color}-900/50 rounded-xl transition-colors flex items-center justify-center gap-1.5"><i class="ph-bold ${icon} text-lg"></i> ${label}</button>`;
        const disBtn = (title) => mode === 'desktop'
            ? `<button class="p-1.5 text-slate-300 dark:text-slate-600 bg-white dark:bg-slate-800 border-transparent rounded-lg cursor-not-allowed" title="${title}"><i class="ph-bold ph-pencil-slash"></i></button>`
            : `<button class="flex-1 py-2 text-sm font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 border border-transparent rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5" title="${title}"><i class="ph-bold ph-pencil-slash text-lg"></i> Tdk dpt diedit</button>`;

        if (!t.ReferenceType) {
            return mode === 'desktop'
                ? deskBtn(`openTransactionModal('${t.ID}')`, 'ph-pencil-simple', 'Edit Transaksi')
                : mobBtn(`openTransactionModal('${t.ID}')`, 'ph-pencil-simple', 'Edit');
        }
        if (t.ReferenceType === 'Goal') {
            return mode === 'desktop'
                ? deskBtn(`openQuickAction('fundGoal','${t.ReferenceID}')`, 'ph-target', 'Edit Goal Top-Up', 'emerald')
                : mobBtn(`openQuickAction('fundGoal','${t.ReferenceID}')`, 'ph-target', 'Edit Goal', 'emerald');
        }
        if (t.ReferenceType === 'DebtPayment') {
            return mode === 'desktop'
                ? deskBtn(`openPayDebtGeneralModal('${t.ID}')`, 'ph-credit-card', 'Edit Bayar Utang', 'violet')
                : mobBtn(`openPayDebtGeneralModal('${t.ID}')`, 'ph-credit-card', 'Edit Utang', 'violet');
        }
        if (t.ReferenceType === 'AssetPurchase') {
            return mode === 'desktop'
                ? deskBtn(`openAssetModal('${t.ReferenceID}')`, 'ph-buildings', 'Edit Aset', 'amber')
                : mobBtn(`openAssetModal('${t.ReferenceID}')`, 'ph-buildings', 'Edit Aset', 'amber');
        }
        // AssetSale → disabled
        return disBtn('Aset sudah dijual. Tidak dapat diedit.');
    }

    function resetTrxFilters() {
        setSelectValue('main-filter-type', 'All');
        setSelectValue('main-filter-quick', 'All');
        setSelectValue('main-filter-budget', 'All');
        setSelectValue('main-filter-account', 'All');
        document.getElementById('main-filter-note').value = '';

        const startInput = document.getElementById('main-filter-start');
        const endInput = document.getElementById('main-filter-end');

        startInput.value = '';
        endInput.value = '';
        endInput.disabled = true;

        // Reset Categories
        const checkBoxes = document.querySelectorAll('input[name="filter-cat-check"]');
        checkBoxes.forEach(cb => cb.checked = false);
        updateCategoryLabel();

        renderTransactions();
    }

    function handleStartDateChange() {
        const startInput = document.getElementById('main-filter-start');
        const endInput = document.getElementById('main-filter-end');
        const quickSelect = document.getElementById('main-filter-quick');

        if (quickSelect.value !== 'All') {
            setSelectValue('main-filter-quick', 'All');
        }

        if (startInput.value) {
            endInput.disabled = false;
            endInput.min = startInput.value;

            if (endInput.value && endInput.value < startInput.value) {
                endInput.value = startInput.value;
                triggerFlash(endInput);
            }
        } else {
            endInput.disabled = true;
            endInput.value = '';
        }
        renderTransactions();
    }

    function applyQuickDate() {
        const val = document.getElementById('main-filter-quick').value;
        const startInput = document.getElementById('main-filter-start');
        const endInput = document.getElementById('main-filter-end');

        const today = new Date();
        const formatYMD = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dNum = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dNum}`;
        };

        if (val === 'All') {
            startInput.value = '';
            endInput.value = '';
            endInput.disabled = true;
        }
        else {
            endInput.disabled = false;
            if (val === 'Today') { startInput.value = formatYMD(today); endInput.value = formatYMD(today); }
            else if (val === 'Yesterday') { let y = new Date(today); y.setDate(y.getDate() - 1); startInput.value = formatYMD(y); endInput.value = formatYMD(y); }
            else if (val === 'ThisWeek') {
                let first = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
                let start = new Date(today.setDate(first));
                let end = new Date(start); end.setDate(start.getDate() + 6);
                startInput.value = formatYMD(start); endInput.value = formatYMD(end);
            }
            else if (val === 'ThisMonth') {
                let start = new Date(today.getFullYear(), today.getMonth(), 1);
                let end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                startInput.value = formatYMD(start); endInput.value = formatYMD(end);
            }
            else if (val === 'LastMonth') {
                let start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                let end = new Date(today.getFullYear(), today.getMonth(), 0);
                startInput.value = formatYMD(start); endInput.value = formatYMD(end);
            }
            triggerFlash(startInput);
            triggerFlash(endInput);
        }

        renderTransactions();
    }

    function renderTransactions() {
        const db = getAppData();
        const typeFilter = document.getElementById('main-filter-type').value;
        const startDate = document.getElementById('main-filter-start').value;
        const endDate = document.getElementById('main-filter-end').value;
        const container = document.getElementById('ui-main-transactions');

        container.innerHTML = '';

        const noteFilter = document.getElementById('main-filter-note').value.toLowerCase();
        const budgetFilter = document.getElementById('main-filter-budget').value;
        const accountFilter = document.getElementById('main-filter-account') ? document.getElementById('main-filter-account').value : 'All';
        const selectedCats = Array.from(document.querySelectorAll('input[name="filter-cat-check"]:checked')).map(cb => cb.value);

        let trxs = db.Transactions;

        // Apply Filters
        if (typeFilter !== 'All') trxs = trxs.filter(t => t.Type === typeFilter);
        if (startDate) trxs = trxs.filter(t => t.Date >= startDate);
        if (endDate) trxs = trxs.filter(t => t.Date <= endDate);
        if (noteFilter) trxs = trxs.filter(t => (t.Note || "").toLowerCase().includes(noteFilter) || (t.Amount || "").toString().includes(noteFilter));
        if (selectedCats.length > 0) trxs = trxs.filter(t => selectedCats.includes(t.CategoryID));
        if (accountFilter !== 'All') {
            trxs = trxs.filter(t => t.FromAccountID === accountFilter || t.ToAccountID === accountFilter);
        }

        // Update Mobile UI State
        updateFilterUIState();

        if (trxs.length === 0) {
            container.innerHTML = `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center"><i class="ph-fill ph-magnifying-glass text-4xl text-slate-300 dark:text-slate-700 mb-3"></i><p class="text-slate-500 font-medium">Tidak ada transaksi yang cocok.</p></div>`;
            return;
        }

        const getAccName = (id) => { if (!id) return '-'; const a = db.Accounts.find(x => x.ID === id); return a ? a.Name : id; };
        const getCatName = (id) => { if (!id) return '-'; const c = db.Categories.find(x => x.ID === id); return c ? c.Name : id; };
        const getCatIcon = (id) => { if (!id) return 'ph-tag'; const c = db.Categories.find(x => x.ID === id); return c ? (c.Icon || 'ph-tag') : 'ph-tag'; };

        let cardsHTML = `<div class="md:hidden flex flex-col">`;
        let tableHTML = `
        <div class="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <tr><th class="px-5 py-4 font-bold">Tanggal</th><th class="px-5 py-4 font-bold">Detail</th><th class="px-5 py-4 font-bold">Dari</th><th class="px-5 py-4 font-bold">Ke</th><th class="px-5 py-4 font-bold text-right">Nominal</th><th class="px-5 py-4 font-bold text-center">Aksi</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
      `;

        let sortedTrxs = [...trxs].sort((a, b) => {
            const dateDiff = new Date(b.Date) - new Date(a.Date);
            if (dateDiff !== 0) return dateDiff;
            // Sorting ID descending fallback (terbaru di atas jika tanggal sama)
            return (b.ID || '').toString().localeCompare((a.ID || '').toString());
        });

        let lastDateFormatted = '';

        sortedTrxs.forEach(t => {
            const isExpense = t.Type === 'Expense';
            const isIncome = t.Type === 'Income';
            const color = isExpense ? 'text-rose-500' : (isIncome ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300');
            const sign = isExpense ? '-' : (isIncome ? '+' : '');
            const displayDate = new Date(t.Date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            const iconName = t.Type === 'Transfer' ? 'ph-swap' : getCatIcon(t.CategoryID);

            // ZettBOT Visual FEEDBACK: Flash filling for AI trx
            const flashClass = recentAITrxIds.has(t.ID) ? 'flash-active' : '';

            // Grouping Header for Mobile Cards
            if (displayDate !== lastDateFormatted) {
                cardsHTML += `<div class="px-2 mb-1.5 mt-4 first:mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><i class="ph-bold ph-calendar-blank"></i> ${displayDate}</div>`;
                lastDateFormatted = displayDate;
            }

            tableHTML += `
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${flashClass}">
            <td class="px-5 py-4 text-slate-500 whitespace-nowrap">${displayDate}</td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                        <i class="ph-bold ${iconName}"></i>
                    </div>
                    <div class="min-w-0 max-w-[200px] lg:max-w-xs">
                        <div class="font-bold text-slate-800 dark:text-slate-200 truncate" title="${t.Note || t.Type}">${t.Note || t.Type}</div>
                        <div class="text-xs text-slate-500 truncate" title="${t.Type === 'Transfer' ? 'Transfer' : getCatName(t.CategoryID)}">${t.Type === 'Transfer' ? 'Transfer' : getCatName(t.CategoryID)}</div>
                    </div>
                </div>
            </td>
            <td class="px-5 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">${getAccName(t.FromAccountID)}</td>
            <td class="px-5 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">${getAccName(t.ToAccountID)}</td>
            <td class="px-5 py-4 font-bold text-right whitespace-nowrap ${color}">${sign}${formatRp(t.Amount)}</td>
            <td class="px-5 py-4 text-center">
                <div class="flex items-center justify-center gap-2 opacity-100 group-hover:opacity-100 transition-opacity">
                    ${getSmartEditButton(t, 'desktop')}
                    <button onclick="deleteTrx('${t.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg transition-colors" title="Hapus Transaksi"><i class="ph-bold ph-trash"></i></button>
                </div>
            </td>
          </tr>
        `;

            cardsHTML += `
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-1.5 ${flashClass}">
            
            <!-- Compact Header (Always Visible) -->
            <div class="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group select-none gap-3" onclick="toggleTransactionCard(this)">
              
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                  <i class="ph-bold ${iconName} text-lg"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="font-bold text-sm text-slate-800 dark:text-slate-200 truncate" title="${t.Note || t.Type}">${t.Note || t.Type}</div>
                  <div class="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span class="truncate" title="${t.Type === 'Transfer' ? 'Transfer' : getCatName(t.CategoryID)}">${t.Type === 'Transfer' ? 'Transfer' : getCatName(t.CategoryID)}</span>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center gap-2 shrink-0">
                <div class="font-bold text-sm ${color} text-right whitespace-nowrap">${sign}${formatRp(t.Amount)}</div>
                <div class="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <i class="ph-bold ph-caret-down text-slate-400 text-xs chevron-icon transition-transform duration-300"></i>
                </div>
              </div>
            </div>

            <!-- Expandable Detail (Hidden by Default) -->
            <div class="transition-all duration-300 ease-in-out" style="max-height: 0px; overflow: hidden;">
              <div class="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                <div class="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <span class="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wide">Kategori</span> 
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-300">${t.Type === 'Transfer' ? 'Transfer' : getCatName(t.CategoryID)}</span>
                  </div>
                  ${isExpense || t.Type === 'Transfer' ? `<div><span class="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wide">Dari Akun</span> <span class="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-1">${getAccName(t.FromAccountID)}</span></div>` : ''}
                  ${isIncome || t.Type === 'Transfer' ? `<div><span class="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wide">Ke Akun</span> <span class="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-1">${getAccName(t.ToAccountID)}</span></div>` : ''}
                </div>
                
                <div class="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 border-dashed">
                  ${getSmartEditButton(t, 'mobile')}
                  <button onclick="deleteTrx('${t.ID}')" class="flex-1 py-2 text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition-colors flex items-center justify-center gap-1.5"><i class="ph-bold ph-trash text-lg"></i> Hapus</button>
                </div>
              </div>
            </div>

          </div>
        `;
        });

        tableHTML += `</tbody></table></div>`;
        cardsHTML += `</div>`;
        container.innerHTML = tableHTML + cardsHTML;

        // Clear AI Flash effect after render
        if (recentAITrxIds.size > 0) {
            setTimeout(() => {
                recentAITrxIds.clear();
                // We don't need to re-render, the class is already there but won't be on next render
            }, 2000);
        }
    }

    function deleteTrx(id) {
        const dbRef = getAppData();
        const trxIdx = dbRef.Transactions.findIndex(t => t.ID === id);
        if (trxIdx === -1) return;
        const trx = dbRef.Transactions[trxIdx];

        let warningMsg = "Saldo akun akan disesuaikan kembali.";
        if (trx.ReferenceType === 'Goal') {
            warningMsg = "Menghapus transaksi ini akan mengurangi alokasi Goal yang terhubung! Saldo juga akan disesuaikan kembali.";
        } else if (trx.ReferenceType === 'DebtPayment') {
            warningMsg = "Menghapus transaksi ini akan membatalkan status bayar pada utang terkait! Saldo juga akan disesuaikan kembali.";
        } else if (trx.ReferenceType === 'AssetPurchase') {
            warningMsg = "Menghapus transaksi ini akan MENGHAPUS data aset dan utang terkait, serta mengembalikan saldo.";
        } else if (trx.ReferenceType === 'AssetSale') {
            warningMsg = "Menghapus transaksi ini akan MENGEMBALIKAN data aset yang sudah dijual, serta mengembalikan saldo.";
        }

        Swal.fire({
            title: 'Hapus Transaksi?',
            text: warningMsg,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus!'
        }).then((result) => {
            if (result.isConfirmed) {
                let db = getAppData();
                const liveTrxIdx = db.Transactions.findIndex(t => t.ID === id);
                if (liveTrxIdx > -1) {
                    revertTransactionEffect(db, db.Transactions[liveTrxIdx]);
                    db.Transactions.splice(liveTrxIdx, 1);
                    db = syncAccountGoalAllocations(db);
                    addAuditLog("Delete", "Trx ID: " + id);

                    // Sync (ZETTBOT FIX: Menggunakan jalur spesifik transaksi)
                    deleteTransactionRow(id);
                    saveMasterData('Accounts', db.Accounts);

                    // ZETTBOT FIX: OPTIMISTIC UI RE-RENDER INSTAN
                    if (typeof renderTransactions === 'function') renderTransactions();
                    if (typeof loadDashboardData === 'function') loadDashboardData();
                    if (typeof renderAccounts === 'function') renderAccounts();
                    if (typeof currentDetailAccId !== 'undefined' && currentDetailAccId && typeof renderAccountHistory === 'function') {
                        renderAccountHistory();
                    }

                    Swal.fire('Terhapus!', 'Transaksi & Data terhubung telah dibatalkan.', 'success');
                }
            }
        });
    }

    function exportTransactionsPDF() {
        const db = getAppData();
        const typeFilterVal = document.getElementById('main-filter-type').value;
        const typeFilterText = document.getElementById('main-filter-type').options[document.getElementById('main-filter-type').selectedIndex].text;
        const quickFilterText = document.getElementById('main-filter-quick').options[document.getElementById('main-filter-quick').selectedIndex].text;
        const startDate = document.getElementById('main-filter-start').value;
        const endDate = document.getElementById('main-filter-end').value;
        
        const noteFilter = document.getElementById('main-filter-note').value.toLowerCase();
        const accountFilter = document.getElementById('main-filter-account').value;
        const selectedCats = Array.from(document.querySelectorAll('input[name="filter-cat-check"]:checked')).map(cb => cb.value);

        let periodeText = 'Semua Waktu';
        if (startDate && endDate) {
            if (startDate === endDate) {
                periodeText = new Date(startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
            } else {
                periodeText = `${new Date(startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} - ${new Date(endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;
            }
        } else if (quickFilterText !== 'Semua Waktu') {
            periodeText = quickFilterText;
        }

        let typeFilterTextFull = typeFilterText;
        if (accountFilter !== 'All') {
            const acc = db.Accounts.find(x => x.ID === accountFilter);
            if (acc) typeFilterTextFull += ` (${acc.Name})`;
        }

        let trxs = db.Transactions;
        if (typeFilterVal !== 'All') trxs = trxs.filter(t => t.Type === typeFilterVal);
        if (startDate) trxs = trxs.filter(t => t.Date >= startDate);
        if (endDate) trxs = trxs.filter(t => t.Date <= endDate);
        if (noteFilter) trxs = trxs.filter(t => (t.Note || "").toLowerCase().includes(noteFilter) || (t.Amount || "").toString().includes(noteFilter));
        if (selectedCats.length > 0) trxs = trxs.filter(t => selectedCats.includes(t.CategoryID));
        if (accountFilter !== 'All') {
            trxs = trxs.filter(t => t.FromAccountID === accountFilter || t.ToAccountID === accountFilter);
        }

        if (trxs.length === 0) {
            Swal.fire({ icon: 'info', title: 'Kosong', text: 'Tidak ada data transaksi untuk dicetak pada filter ini.' });
            return;
        }        trxs.sort((a, b) => new Date(b.Date) - new Date(a.Date));

        const getAccName = (id) => { if (!id) return '-'; const a = db.Accounts.find(x => x.ID === id); return a ? a.Name : id; };
        const getCatName = (id) => { if (!id) return '-'; const c = db.Categories.find(x => x.ID === id); return c ? c.Name : id; };

        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // --- PDF HEADER ---
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(249, 115, 22); // brand-500
        doc.text('Excellearn Laporan', 14, 22);

        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text('Histori Mutasi Keuangan', 14, 30);

        // Header Info (Right)
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate-500
        const rightX = 196;
        doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, rightX, 18, { align: 'right' });
        doc.text(`Periode: ${periodeText}`, rightX, 23, { align: 'right' });
        doc.text(`Tipe Filter: ${typeFilterTextFull}`, rightX, 28, { align: 'right' });

        // --- SUMMARY BAR ---
        let totalIncome = 0;
        let totalExpense = 0;
        trxs.forEach(t => {
            if (t.Type === 'Income') totalIncome += t.Amount;
            if (t.Type === 'Expense') totalExpense += t.Amount;
        });

        // Background for summary
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(14, 38, 182, 12, 2, 2, 'F');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.text(`TOTAL MASUK: +${formatRp(totalIncome)}`, 20, 45.5);
        
        doc.setTextColor(225, 29, 72); // rose-600
        const expenseX = 190;
        doc.text(`TOTAL KELUAR: -${formatRp(totalExpense)}`, expenseX, 45.5, { align: 'right' });

        // --- TABLE ---
        const tableBody = trxs.map(t => {
            const isTransfer = t.Type === 'Transfer';
            const dateStr = new Date(t.Date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            let typeLabel = 'Transfer';
            if (t.Type === 'Income') typeLabel = 'Masuk';
            if (t.Type === 'Expense') typeLabel = 'Keluar';

            let noteText = t.Note || (isTransfer ? 'Transfer Antar Akun' : getCatName(t.CategoryID));
            let accInfo = isTransfer ? `${getAccName(t.FromAccountID)} -> ${getAccName(t.ToAccountID)}` : getAccName(t.FromAccountID || t.ToAccountID);
            
            const amountPrefix = t.Type === 'Expense' ? '-' : (t.Type === 'Income' ? '+' : '');
            
            return [
                dateStr,
                typeLabel,
                noteText,
                accInfo,
                `${amountPrefix}${formatRp(t.Amount)}`
            ];
        });

        doc.autoTable({
            startY: 55,
            head: [['Tanggal', 'Tipe', 'Catatan / Kategori', 'Akun', 'Nominal']],
            body: tableBody,
            theme: 'striped',
            headStyles: { 
                fillColor: [30, 41, 59], // slate-800
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 22 }, // Date
                1: { halign: 'center', cellWidth: 18 }, // Type
                2: { fontStyle: 'bold', cellWidth: 'auto' }, // Note
                3: { fontSize: 8, cellWidth: 40 }, // Accounts
                4: { halign: 'right', fontStyle: 'bold', cellWidth: 35 } // Amount
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                valign: 'middle'
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 4) {
                    const rowData = trxs[data.row.index];
                    if (rowData.Type === 'Income') data.cell.styles.textColor = [16, 185, 129]; // emerald-500
                    if (rowData.Type === 'Expense') data.cell.styles.textColor = [239, 68, 68]; // rose-500
                }
            }
        });

        // Success notification
        doc.save(`Excellearn_Report_${new Date().getTime()}.pdf`);
        Swal.fire({ 
            icon: 'success', 
            title: 'Berhasil', 
            text: 'PDF berhasil diunduh sebagai teks (Searchable).', 
            timer: 2000, 
            showConfirmButton: false 
        });
    }

    function toggleTransactionCard(element) {
        const content = element.nextElementSibling;
        const icon = element.querySelector('.chevron-icon');
        if (content.style.maxHeight && content.style.maxHeight !== '0px') {
            content.style.maxHeight = '0px';
            icon.classList.remove('rotate-180');
        } else {
            content.style.maxHeight = content.scrollHeight + 'px';
            icon.classList.add('rotate-180');
        }
    }

    // --- ADVANCED FILTERS LOGIC ---
    function toggleAllFilters() {
        const extra = document.getElementById('trx-filter-extra');
        const icon = document.getElementById('icon-toggle-filters');
        if (!extra) return;
        const isExpanded = extra.classList.toggle('expanded');

        if (icon) {
            if (isExpanded) icon.classList.add('rotate-180');
            else icon.classList.remove('rotate-180');
        }

        // Mobile summary visibility
        if (window.innerWidth < 768) {
            const summary = document.getElementById('trx-filter-summary');
            if (isExpanded) {
                if (summary) summary.classList.add('hidden');
            } else {
                updateFilterUIState();
            }

            // Toggle extra mobile items in Row 1
            document.querySelectorAll('.mobile-filter-extra').forEach(el => {
                if (isExpanded) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            });
        }
    }

    function toggleCategoryDropdown() {
        const dropdown = document.getElementById('category-multiselect-dropdown');
        if (!dropdown) return;
        dropdown.classList.toggle('active');

        const closeDropdown = (e) => {
            const container = document.getElementById('category-filter-container');
            if (container && !container.contains(e.target)) {
                dropdown.classList.remove('active');
                document.removeEventListener('click', closeDropdown);
            }
        };
        if (dropdown.classList.contains('active')) {
            setTimeout(() => document.addEventListener('click', closeDropdown), 10);
        }
    }

    function populateFilterOptions() {
        const db = getAppData();

        // Populate Budgets
        let budOptions = '<option value="All">Semua Budget</option>';
        if (db.Budgets) {
            db.Budgets.forEach(b => {
                budOptions += `<option value="${b.ID}">${b.Name}</option>`;
            });
        }
        setSelectHTML('main-filter-budget', budOptions);

        // Populate Accounts (NEW)
        let accOptions = '<option value="All">Semua Akun</option>';
        if (db.Accounts) {
            db.Accounts.sort((a, b) => a.Name.localeCompare(b.Name)).forEach(acc => {
                accOptions += `<option value="${acc.ID}">${acc.Name}</option>`;
            });
        }
        setSelectHTML('main-filter-account', accOptions);

        // Populate Categories Multiselect
        const catDropdown = document.getElementById('category-multiselect-dropdown');
        if (!catDropdown) return;

        let catHTML = '';
        if (db.Categories) {
            db.Categories.forEach(c => {
                catHTML += `
                    <label class="multiselect-item">
                        <input type="checkbox" name="filter-cat-check" value="${c.ID}" onchange="updateCategoryLabel(); renderTransactions();" class="w-4 h-4 rounded text-brand-500">
                        <span class="text-sm text-slate-700 dark:text-slate-300 ml-2">${c.Name}</span>
                    </label>
                `;
            });
        }
        catDropdown.innerHTML = catHTML || '<div class="p-4 text-xs text-slate-400">Belum ada kategori.</div>';
    }

    function updateCategoryLabel() {
        const checked = document.querySelectorAll('input[name="filter-cat-check"]:checked');
        const label = document.getElementById('category-multiselect-label');
        if (!label) return;

        if (checked.length === 0) {
            label.innerText = 'Semua Kategori';
            label.classList.add('text-slate-500');
        } else if (checked.length === 1) {
            label.innerText = checked[0].nextElementSibling.innerText;
            label.classList.remove('text-slate-500');
        } else {
            label.innerText = `${checked.length} Kategori Dipilih`;
            label.classList.remove('text-slate-500');
        }
    }

    function handleBudgetFilterChange() {
        const budgetSelect = document.getElementById('main-filter-budget');
        if (!budgetSelect) return;
        const budgetId = budgetSelect.value;
        const db = getAppData();

        // Reset category checks first
        document.querySelectorAll('input[name="filter-cat-check"]').forEach(cb => cb.checked = false);

        if (budgetId !== 'All') {
            const budget = db.Budgets.find(b => b.ID === budgetId);
            if (budget && budget.LinkedCategories) {
                budget.LinkedCategories.forEach(catId => {
                    const cb = document.querySelector(`input[name="filter-cat-check"][value="${catId}"]`);
                    if (cb) cb.checked = true;
                });

                // Flash animation on category trigger
                const trigger = document.getElementById('category-multiselect-trigger');
                if (trigger) triggerFlash(trigger);
            }
        }

        updateCategoryLabel();
        renderTransactions();
    }

    function updateFilterUIState() {
        const isMobile = window.innerWidth < 768;
        const typeEl = document.getElementById('main-filter-type');
        const quickEl = document.getElementById('main-filter-quick');
        const noteEl = document.getElementById('main-filter-note');
        const budgetEl = document.getElementById('main-filter-budget');
        const accountEl = document.getElementById('main-filter-account');

        if (!typeEl || !quickEl) return;

        const type = typeEl.value;
        const quick = quickEl.value;
        const note = noteEl ? noteEl.value : '';
        const budget = budgetEl ? budgetEl.value : 'All';
        const account = accountEl ? accountEl.value : 'All';
        const cats = document.querySelectorAll('input[name="filter-cat-check"]:checked').length;
        const startDate = document.getElementById('main-filter-start').value;
        const endDate = document.getElementById('main-filter-end').value;

        let count = 0;
        let summaryLines = [];

        if (type !== 'All') { count++; summaryLines.push(type === 'Income' ? 'Masuk' : (type === 'Expense' ? 'Keluar' : 'Transfer')); }
        if (quick !== 'All') { count++; summaryLines.push(quickEl.options[quickEl.selectedIndex].text); }
        if (note) count++;
        if (budget !== 'All') count++;
        if (account !== 'All') { count++; summaryLines.push('Akun Spesifik'); }
        if (cats > 0) count++;
        if (startDate || endDate) count++;

        // Update Badge (Both Mobile and Desktop Toggle)
        const badge = document.getElementById('mobile-filter-badge');
        const desktopToggleBtn = document.getElementById('btn-toggle-filters');
        
        if (count > 0) {
            if (badge) {
                badge.innerText = count;
                badge.classList.remove('hidden');
            }
            if (desktopToggleBtn) {
                const label = desktopToggleBtn.querySelector('span');
                if (label) label.innerText = `Semua Filter (${count})`;
                desktopToggleBtn.classList.add('text-brand-500', 'bg-brand-50', 'dark:bg-brand-900/30');
            }
        } else {
            if (badge) badge.classList.add('hidden');
            if (desktopToggleBtn) {
                const label = desktopToggleBtn.querySelector('span');
                if (label) label.innerText = `Semua Filter`;
                desktopToggleBtn.classList.remove('text-brand-500', 'bg-brand-50', 'dark:bg-brand-900/30');
            }
        }

        if (isMobile) {
            const summaryEl = document.getElementById('trx-filter-summary');
            const extra = document.getElementById('trx-filter-extra');
            if (count > 0 && summaryEl) {
                summaryEl.innerText = summaryLines.join(' • ');
                if (extra && !extra.classList.contains('expanded')) {
                    summaryEl.classList.remove('hidden');
                } else {
                    summaryEl.classList.add('hidden');
                }
            } else if (summaryEl) {
                summaryEl.classList.add('hidden');
            }
        }
    }

    // ==========================================
    // ZETTBOT AI TRACKER LOGIC
    // ==========================================
    let recentAITrxIds = new Set(); // Melacak transaksi baru dari AI untuk visual feedback

    function openAIModal() {
        lockBodyScroll();
        document.getElementById('modal-ai').classList.remove('hidden');
        pushModalState('modal-ai');

        const aiInput = document.getElementById('ai-input');
        if (aiInput) {
            // ZettBOT FIX: Memaksa OS (terutama iPad/iOS) untuk memunculkan fitur Dictate (Mic)
            aiInput.setAttribute('spellcheck', 'true');
            aiInput.setAttribute('inputmode', 'text');
            aiInput.setAttribute('lang', 'id-ID'); // Memaksa dictation fokus ke Bahasa Indonesia
            aiInput.setAttribute('autocomplete', 'on');
        }

        // ZettBOT UX: Autofocus delay sedikit agar transisi modal selesai
        setTimeout(() => {
            if (aiInput) aiInput.focus();
        }, 150);
    }

    function closeAIModal() {
        unlockBodyScroll();
        document.getElementById('modal-ai').classList.add('hidden');
        const aiInput = document.getElementById('ai-input');
        aiInput.value = '';
        aiInput.style.height = ''; // Reset height to default
    }

    function submitAIChat(e) {
        e.preventDefault();
        const inputStr = document.getElementById('ai-input').value.trim();

        if (!inputStr || inputStr.length < 3) {
            Swal.fire({
                toast: true, position: 'top', icon: 'warning',
                title: 'Ketik lebih detail',
                showConfirmButton: false, timer: 2000
            });
            return;
        }

        // 1. Ubah State jadi Loading (agar tidak dobel klik)
        const btnSubmit = document.getElementById('btn-ai-submit');
        const inputField = document.getElementById('ai-input');

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-xl"></i>';
        inputField.disabled = true;

        // 2. Ambil konteks JSON (Hanya ambil yg penting untuk irit token)
        const db = getAppData();
        const rawAccounts = db.Accounts.map(a => ({ ID: a.ID, Name: a.Name, Type: a.Type }));
        const rawCategories = db.Categories.map(c => ({ ID: c.ID, Name: c.Name, Type: c.Type, Description: c.Description }));

        // ZETTBOT: Baca dari localStorage terbaru, bukan window.appSession (anti-stale)
        const freshSession = JSON.parse(
            localStorage.getItem('excellearn_session') || 
            sessionStorage.getItem('excellearn_session') || '{}'
        );
        
        // Andalkan server-side token refresh saja — Anti dual-refresh race condition
        google.script.run
            .withSuccessHandler(handleAIResponse)
            .withFailureHandler(function(err) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="ph-bold ph-paper-plane-right text-lg"></i>';
                inputField.disabled = false;
                Swal.fire({ toast: true, position: 'top-end', icon: 'error', 
                    title: 'Gagal Mengirim', text: String(err), 
                    showConfirmButton: false, timer: 4000 });
            })
            .processAITransaction(
                freshSession.idToken || '', 
                inputStr, 
                JSON.stringify(rawAccounts), 
                JSON.stringify(rawCategories), 
                freshSession.refreshToken || ''
            );
    }

    function handleAIResponse(res) {
        // Reset UI Loading state
        const btnSubmit = document.getElementById('btn-ai-submit');
        const inputField = document.getElementById('ai-input');

        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="ph-bold ph-paper-plane-right text-lg"></i>';
        inputField.disabled = false;

        // Validasi Error (Gagal Paham atau Token Gagal Refresh di Backend)
        if (res.error) {
            Swal.fire({
                toast: true, position: 'top-end', icon: 'error',
                title: res.authError ? 'Sesi Habis' : 'Hmm, Coba ulangi...',
                text: res.message || 'Teks tidak dikenali sebagai transaksi.',
                showConfirmButton: false, timer: 4000
            });
            inputField.value = '';
            inputField.focus();
            
            // ZETTBOT FIX: Auto logout jika sesi benar-benar expired & refresh gagal
            if (res.authError && typeof logoutUser === 'function') {
               setTimeout(logoutUser, 2000);
            }
            return;
        }

        // ZETTBOT FIX: Update idToken & refreshToken di frontend jika backend refresh otomatis
        if (res.data && res.data.newIdToken) {
            console.log('ZETTBOT: Backend Auto-Refreshed Token. Syncing to frontend...');
            window.appSession.idToken = res.data.newIdToken;
            if (res.data.newRefreshToken) {
                window.appSession.refreshToken = res.data.newRefreshToken;
            }
            window.appSession.loginTime = new Date().toISOString();
            
            try {
                let s = localStorage.getItem('excellearn_session');
                if (s) {
                    s = JSON.parse(s);
                    s.idToken = res.data.newIdToken;
                    s.refreshToken = res.data.newRefreshToken || s.refreshToken;
                    s.loginTime = window.appSession.loginTime;
                    localStorage.setItem('excellearn_session', JSON.stringify(s));
                    sessionStorage.setItem('excellearn_session', JSON.stringify(s));
                }
            } catch(e) {}
        }

        // Ambil Data Parsing dari AI (V2: Support Multi-Trx)
        const transactions = res.data.transactions || [];
        recentAITrxIds.clear(); // Reset sebelum list baru

        let db = getAppData();
        const settings = getProfileSettings();

        // Prepare batch array
        const newAuditLogs = [];

        // Loop setiap transaksi
        transactions.forEach((trx, index) => {
            // 1. Auto-generate ID & Date
            trx.ID = 'TRX-AI-' + Date.now() + '-' + index;
            if (!trx.Date) trx.Date = new Date().toLocaleDateString('en-CA');

            // 2. Fallback Akun Default (ZettBOT IDEA: Gunakan Profile Settings)
            if (settings.DefaultAIAccount) {
                if ((trx.Type === 'Expense' || trx.Type === 'Transfer') && (!trx.FromAccountID || trx.FromAccountID.includes('kosong'))) {
                    trx.FromAccountID = settings.DefaultAIAccount;
                }
                if ((trx.Type === 'Income' || trx.Type === 'Transfer') && (!trx.ToAccountID || trx.ToAccountID.includes('kosong'))) {
                    trx.ToAccountID = settings.DefaultAIAccount;
                }
            }

            // 3. Adjust Balance secara Lokal (Optimistic UI)
            if (trx.Type === 'Expense' || trx.Type === 'Transfer') {
                let fIdx = db.Accounts.findIndex(a => a.ID === trx.FromAccountID);
                if (fIdx > -1) db.Accounts[fIdx].Balance -= trx.Amount;
            }
            if (trx.Type === 'Income' || trx.Type === 'Transfer') {
                let tIdx = db.Accounts.findIndex(a => a.ID === trx.ToAccountID);
                if (tIdx > -1) db.Accounts[tIdx].Balance += trx.Amount;
            }

            // 4. Masukkan ke List Flash Feedback
            recentAITrxIds.add(trx.ID);

            // 5. Prepare Audit Log secara lokal (ZettBOT FIX: Hindari concurrent request)
            const timestamp = new Date().toLocaleTimeString('id-ID');
            newAuditLogs.unshift({
                ID: 'AUD-' + Date.now() + '-' + index,
                Timestamp: timestamp,
                Action: "Create",
                Entity: "Trx AI Multi: " + trx.Note + " (" + formatRp(trx.Amount) + ")",
                Details: "",
                User: "Local"
            });
        });

        // 6. Update Lokal Database Secara Massal
        db.AuditLogs.unshift(...newAuditLogs);
        db.AuditLogs = db.AuditLogs.slice(0, 10);

        // 7. Push Batch ke Backend dengan minimal API Request
        saveTransactionsBatch(transactions);
        saveMasterData('AuditLogs', db.AuditLogs);
        saveMasterData('Accounts', db.Accounts); // Sinkronisasi Background Akun

        // Re-render UI
        if (typeof loadDashboardData === 'function') loadDashboardData();
        if (typeof renderTransactions === 'function') renderTransactions();

        // Haptic Feedback & Tutup Modal
        if (navigator.vibrate) navigator.vibrate(50);
        closeAIModal();

        // Notifikasi Sukses
        Swal.fire({
            toast: true, position: 'top-end', icon: 'success',
            title: 'Berhasil Dicatat!',
            text: `${transactions.length} transaksi telah ditambahkan.`,
            showConfirmButton: false, timer: 3000
        });
    }
