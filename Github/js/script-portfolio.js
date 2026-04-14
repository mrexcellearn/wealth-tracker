    // ==========================================
    // PORTFOLIO MODULE (Assets + Debts + Pay Debt)
    // ==========================================

    // --- ASSETS ---
    function renderAssets() {
        const db = getAppData();
        const container = document.getElementById('ui-assets-container');
        const filterSelect = document.getElementById('main-asset-filter');
        if (!container) return;

        const currentFilterVal = filterSelect.value;
        let html = '<option value="All">Semua Akun Aset</option>';
        db.Accounts.filter(a => a.Type === 'Asset').forEach(acc => {
            html += `<option value="${acc.ID}">${acc.Name}</option>`;
        });
        setSelectHTML('main-asset-filter', html);

        if (Array.from(filterSelect.options).some(opt => opt.value === currentFilterVal)) {
            setSelectValue('main-asset-filter', currentFilterVal);
        } else {
            setSelectValue('main-asset-filter', 'All');
        }

        container.innerHTML = '';
        let assets = db.Assets || [];
        const currentFilter = filterSelect.value;

        if (currentFilter !== 'All') {
            assets = assets.filter(a => a.LinkedAccountID === currentFilter);
        }

        if (assets.length === 0) {
            container.innerHTML = `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center"><i class="ph-fill ph-buildings text-4xl text-purple-300 dark:text-purple-700 mb-3"></i><p class="text-slate-500 font-medium">Belum ada data aset tercatat.</p></div>`;
            return;
        }

        const getAccName = (id) => { const a = db.Accounts.find(x => x.ID === id); return a ? a.Name : '-'; };

        const calcChange = (orig, mkt) => {
            if (!orig || orig === 0) return { pct: 0, isPos: true, isZero: true };
            const diff = mkt - orig;
            const pct = (diff / orig) * 100;
            return { pct: pct.toFixed(2), isPos: pct > 0, isZero: pct === 0, diff: diff };
        };

        let totalOrig = 0;
        let totalMarket = 0;
        assets.forEach(ast => {
            totalOrig += Number(ast.OriginalValue);
            totalMarket += Number(ast.MarketValue);
        });

        const totChange = calcChange(totalOrig, totalMarket);
        let totBadgeColor = 'text-slate-500';
        let totIconDir = 'ph-minus';
        if (!totChange.isZero) {
            if (totChange.isPos) { totBadgeColor = 'text-emerald-500'; totIconDir = 'ph-trend-up'; }
            else { totBadgeColor = 'text-rose-500'; totIconDir = 'ph-trend-down'; }
        }
        const totBadgeHTML = `<span class="${totBadgeColor} font-bold flex items-center justify-end gap-1"><i class="ph-bold ${totIconDir}"></i> ${totChange.isPos && !totChange.isZero ? '+' : ''}${totChange.pct}%</span>`;

        let tableHTML = `
      <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="px-4 py-3 font-normal"><i class="ph-bold ph-buildings mr-1"></i> Nama Aset</th>
              <th class="px-4 py-3 font-normal"><i class="ph-bold ph-bank mr-1"></i> Akun</th>
              <th class="px-4 py-3 font-normal"><i class="ph-bold ph-calendar-blank mr-1"></i> Tgl Perolehan</th>
              <th class="px-4 py-3 font-normal text-right"><i class="ph-bold ph-money mr-1"></i> Nilai Beli</th>
              <th class="px-4 py-3 font-normal text-right"><i class="ph-bold ph-trend-up mr-1"></i> Nilai Pasar</th>
              <th class="px-4 py-3 font-normal text-right">Return (%)</th>
              <th class="px-4 py-3 font-normal text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
      `;

        let cardsHTML = `<div class="md:hidden flex flex-col gap-3">`;

        cardsHTML += `
        <div class="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex justify-between items-center shadow-sm">
            <div>
                <div class="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Total Nilai Pasar</div>
                <div class="font-bold text-slate-800 dark:text-slate-200 text-lg">${formatRp(totalMarket)}</div>
            </div>
            <div class="text-right">
                 <div class="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Return Total</div>
                 <div class="text-sm">${totBadgeHTML}</div>
            </div>
        </div>
      `;

        assets.sort((a, b) => new Date(b.Date) - new Date(a.Date)).forEach(ast => {
            const change = calcChange(ast.OriginalValue, ast.MarketValue);
            let badgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
            let iconDir = 'ph-minus';
            let textColor = 'text-slate-500';

            if (!change.isZero) {
                if (change.isPos) {
                    badgeColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
                    iconDir = 'ph-trend-up';
                    textColor = 'text-emerald-500';
                } else {
                    badgeColor = 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800/50';
                    iconDir = 'ph-trend-down';
                    textColor = 'text-rose-500';
                }
            }

            const badgeHTML = `<span class="${badgeColor} px-2 py-0.5 rounded border text-xs font-bold flex items-center justify-center gap-1 w-max ml-auto"><i class="ph-bold ${iconDir}"></i> ${change.isPos && !change.isZero ? '+' : ''}${change.pct}%</span>`;
            const displayDate = new Date(ast.Date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

            tableHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <td class="px-4 py-4 font-bold text-slate-800 dark:text-slate-200">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800/50"><i class="ph-fill ph-buildings"></i></div>
                  ${ast.Name}
                </div>
              </td>
              <td class="px-4 py-4 text-slate-600 dark:text-slate-400 text-xs">${getAccName(ast.LinkedAccountID)}</td>
              <td class="px-4 py-4 text-slate-500 text-xs">${displayDate}</td>
              <td class="px-4 py-4 text-right font-medium text-slate-500">${formatRp(ast.OriginalValue)}</td>
              <td class="px-4 py-4 text-right font-bold text-slate-800 dark:text-slate-200">${formatRp(ast.MarketValue)}</td>
              <td class="px-4 py-4">${badgeHTML}</td>
              <td class="px-4 py-4 text-right">
                <div class="opacity-100 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                  <button onclick="openQuickAction('sellAsset', '${ast.ID}')" class="p-1.5 text-emerald-500 hover:text-white hover:bg-emerald-500 transition-colors bg-emerald-50 dark:bg-emerald-900/20 rounded shadow-sm border border-emerald-200 dark:border-emerald-800" title="Jual Aset"><i class="ph-bold ph-storefront"></i></button>
                  <button onclick="openAssetModal('${ast.ID}')" class="p-1.5 text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700"><i class="ph-bold ph-pencil-simple"></i></button>
                  <button onclick="deleteAsset('${ast.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700"><i class="ph-bold ph-trash"></i></button>
                </div>
              </td>
            </tr>
          `;

            cardsHTML += `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group">
              <div class="flex justify-between items-start mb-3">
                <div class="flex gap-3 items-center">
                    <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800/50"><i class="ph-fill ph-buildings text-xl"></i></div>
                    <div>
                        <h3 class="font-bold text-lg text-slate-800 dark:text-slate-200 leading-tight">${ast.Name}</h3>
                        <p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><i class="ph-fill ph-bank"></i> ${getAccName(ast.LinkedAccountID)}</p>
                    </div>
                </div>
                ${badgeHTML}
              </div>
              
              <div class="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mb-3 grid grid-cols-2 gap-3">
                  <div>
                      <span class="block text-[10px] text-slate-400 uppercase mb-0.5">Nilai Beli</span>
                      <span class="font-medium text-slate-600 dark:text-slate-300 text-sm">${formatRp(ast.OriginalValue)}</span>
                  </div>
                  <div>
                      <span class="block text-[10px] text-slate-400 uppercase mb-0.5">Nilai Pasar</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200 text-sm">${formatRp(ast.MarketValue)}</span>
                  </div>
              </div>
              <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                <div class="text-xs text-slate-500 flex items-center gap-1"><i class="ph-bold ph-calendar-blank"></i> ${displayDate}</div>
                <div class="flex gap-2">
                  <button onclick="openQuickAction('sellAsset', '${ast.ID}')" class="p-1.5 text-emerald-500 hover:text-white hover:bg-emerald-500 transition-colors bg-emerald-50 dark:bg-emerald-900/20 rounded-lg shadow-sm border border-emerald-200 dark:border-emerald-800" title="Jual Aset"><i class="ph-bold ph-storefront text-lg"></i></button>
                  <button onclick="openAssetModal('${ast.ID}')" class="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><i class="ph-bold ph-pencil-simple text-lg"></i></button>
                  <button onclick="deleteAsset('${ast.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><i class="ph-bold ph-trash text-lg"></i></button>
                </div>
              </div>
            </div>
          `;
        });

        tableHTML += `</tbody></table></div>`;
        cardsHTML += `</div>`;
        container.innerHTML = tableHTML + cardsHTML;
    }

    function handleAstMethodChange() {
        const method = document.getElementById('AstMethod').value;
        const wrapSource = document.getElementById('wrap-ast-source-acc');
        const wrapDebt = document.getElementById('wrap-ast-debt-acc');

        if (method === 'BuyCash') {
            wrapSource.classList.remove('hidden');
            wrapDebt.classList.add('hidden');
            document.getElementById('AstSourceAccount').required = true;
            document.getElementById('AstDebtAccount').required = false;
        } else if (method === 'BuyDebt') {
            wrapSource.classList.add('hidden');
            wrapDebt.classList.remove('hidden');
            document.getElementById('AstSourceAccount').required = false;
            document.getElementById('AstDebtAccount').required = true;
        } else {
            wrapSource.classList.add('hidden');
            wrapDebt.classList.add('hidden');
            document.getElementById('AstSourceAccount').required = false;
            document.getElementById('AstDebtAccount').required = false;
        }
    }

    function openAssetModal(id = null) {
        lockBodyScroll();
        pushModalState('modal-asset');
        const db = getAppData();

        let accOptions = '<option value="" disabled selected>Pilih Akun...</option>';
        db.Accounts.filter(a => a.Type === 'Asset').forEach(acc => {
            accOptions += `<option value="${acc.ID}">${acc.Name}</option>`;
        });
        setSelectHTML('AstAccount', accOptions);

        let srcOptions = '<option value="" disabled selected>Pilih Akun...</option>';
        db.Accounts.filter(a => ['Cash & Bank', 'Investment'].includes(a.Type)).forEach(acc => {
            srcOptions += `<option value="${acc.ID}" data-balance="${acc.Balance - acc.GoalAllocated}">${acc.Name}</option>`;
        });
        setSelectHTML('AstSourceAccount', srcOptions);

        let debtOptions = '<option value="" disabled selected>Pilih Akun...</option>';
        db.Accounts.filter(a => ['Debt'].includes(a.Type)).forEach(acc => {
            debtOptions += `<option value="${acc.ID}" data-balance="${acc.Balance}">${acc.Name}</option>`;
        });
        setSelectHTML('AstDebtAccount', debtOptions);

        document.getElementById('modal-asset').classList.remove('hidden');
        resetAndSyncForm('form-asset');

        if (id) {
            document.getElementById('AstMethod').value = 'AdjustManual';
            document.getElementById('AstMethod').disabled = true;
            handleAstMethodChange();

            document.getElementById('modal-asset-title').innerText = 'Edit / Update Nilai Aset';
            const a = db.Assets.find(x => x.ID === id);
            if (a) {
                document.getElementById('AstID').value = a.ID;
                document.getElementById('AstName').value = a.Name;
                document.getElementById('AstOriginalValue').value = a.OriginalValue;
                document.getElementById('AstMarketValue').value = a.MarketValue;
                document.getElementById('AstDate').value = a.Date;
                setSelectValue('AstAccount', a.LinkedAccountID);
            }
        } else {
            document.getElementById('AstMethod').disabled = false;
            document.getElementById('AstMethod').value = 'AdjustManual';
            handleAstMethodChange();

            document.getElementById('modal-asset-title').innerText = 'Tambah Aset Baru';
            document.getElementById('AstID').value = '';
            document.getElementById('AstDate').value = new Date().toLocaleDateString('en-CA');
        }
    }

    function closeAssetModal() {
        unlockBodyScroll();
        document.getElementById('modal-asset').classList.add('hidden');
    }

    function saveAsset(e) {
        e.preventDefault();
        let db = getAppData();
        const id = document.getElementById('AstID').value;
        const accId = document.getElementById('AstAccount').value;
        const astName = document.getElementById('AstName').value;
        const oriVal = Number(document.getElementById('AstOriginalValue').value);
        const mktVal = Number(document.getElementById('AstMarketValue').value);
        const astDate = document.getElementById('AstDate').value;

        const method = document.getElementById('AstMethod').value;
        const sourceId = document.getElementById('AstSourceAccount').value;
        const debtAccId = document.getElementById('AstDebtAccount').value;
        const trackDebt = document.getElementById('AstTrackDebt').checked;

        if (!id) {
            if (method === 'BuyCash') {
                if (!sourceId) { Swal.fire('Gagal', 'Pilih sumber dana kas/bank.', 'error'); return; }

                const sourceAcc = db.Accounts.find(a => a.ID === sourceId);
                if (oriVal > (sourceAcc.Balance - sourceAcc.GoalAllocated)) {
                    Swal.fire({
                        title: 'Saldo Tidak Cukup',
                        html: `Pembelian aset ini akan membuat saldo bebas akun <b>${sourceAcc.Name}</b> menjadi minus. Lanjutkan?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#64748b',
                        confirmButtonText: 'Ya, Lanjutkan'
                    }).then((res) => {
                        if (res.isConfirmed) processSaveAsset(db, id, method, sourceId, debtAccId, trackDebt, astName, oriVal, mktVal, astDate, accId);
                    });
                    return;
                }
            } else if (method === 'BuyDebt') {
                if (!debtAccId) { Swal.fire('Gagal', 'Pilih akun utang sumber kredit.', 'error'); return; }
            }
        }

        processSaveAsset(db, id, method, sourceId, debtAccId, trackDebt, astName, oriVal, mktVal, astDate, accId);
    }

    function processSaveAsset(db, id, method, sourceId, debtAccId, trackDebt, astName, oriVal, mktVal, astDate, accId) {
        const newAst = {
            ID: id || 'AST-' + Date.now(),
            Name: astName,
            OriginalValue: oriVal,
            MarketValue: mktVal,
            Date: astDate,
            LinkedAccountID: accId,
            // Metadata pembelian (untuk cascading delete/revert)
            PurchaseMethod: id ? (db.Assets.find(x => x.ID === id)?.PurchaseMethod || 'AdjustManual') : (method || 'AdjustManual'),
            SourceAccountID: id ? (db.Assets.find(x => x.ID === id)?.SourceAccountID || null) : (sourceId || null),
            DebtAccountID: id ? (db.Assets.find(x => x.ID === id)?.DebtAccountID || null) : (debtAccId || null),
            LinkedTransactionID: id ? (db.Assets.find(x => x.ID === id)?.LinkedTransactionID || null) : null,
            LinkedDebtID: id ? (db.Assets.find(x => x.ID === id)?.LinkedDebtID || null) : null
        };

        if (id) {
            const idx = db.Assets.findIndex(x => x.ID === id);
            if (idx > -1) db.Assets[idx] = newAst;
        } else {
            db.Assets.push(newAst);

            if (method === 'BuyCash') {
                // Transfer: Sumber Dana (Cash) → Akun Aset
                const trxId = 'TRX-' + Date.now();
                const trx = {
                    ID: trxId, Date: astDate, Type: 'Transfer',
                    FromAccountID: sourceId, ToAccountID: accId,
                    CategoryID: '', Amount: oriVal,
                    Note: 'Beli Aset: ' + astName,
                    ReferenceType: 'AssetPurchase', ReferenceID: newAst.ID,
                    LinkedDebtPayments: null
                };
                saveTransaction(trx);
                newAst.LinkedTransactionID = trxId;

                const sIdx = db.Accounts.findIndex(a => a.ID === sourceId);
                if (sIdx > -1) db.Accounts[sIdx].Balance -= oriVal;
            } else if (method === 'BuyDebt') {
                // Transfer: Akun Utang → Akun Aset
                const trxId = 'TRX-' + Date.now();
                const trx = {
                    ID: trxId, Date: astDate, Type: 'Transfer',
                    FromAccountID: debtAccId, ToAccountID: accId,
                    CategoryID: '', Amount: oriVal,
                    Note: 'Beli Aset (Utang): ' + astName,
                    ReferenceType: 'AssetPurchase', ReferenceID: newAst.ID,
                    LinkedDebtPayments: null
                };
                saveTransaction(trx);
                newAst.LinkedTransactionID = trxId;

                const dIdx = db.Accounts.findIndex(a => a.ID === debtAccId);
                if (dIdx > -1) db.Accounts[dIdx].Balance -= oriVal;

                if (trackDebt) {
                    const debtId = 'DBT-' + Date.now();
                    const newDebt = {
                        ID: debtId,
                        Name: `Utang Aset: ${astName}`,
                        OriginalValue: oriVal,
                        FinalValue: oriVal,
                        PaidAmount: 0,
                        Deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA'),
                        LinkedAccountID: debtAccId,
                        AffectsAccountBalance: false, // Karena transaksi transfernya sudah mengurangi saldo sumber!
                        LinkedAssetID: newAst.ID // Link balik Debt → Asset
                    };
                    db.Debts.push(newDebt);
                    newAst.LinkedDebtID = debtId;
                }
            }
        }

        db = syncAssetAccountBalances(db);

        addAuditLog(id ? "Update" : "Create", "Aset: " + newAst.Name, method || "{}");

        // Standard Sync
        saveMasterData('Assets', db.Assets);
        saveMasterData('Accounts', db.Accounts);
        if (trackDebt || id) {
            saveMasterData('Debts', db.Debts);
        }

        closeAssetModal();
        Swal.fire({ icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    }

    function deleteAsset(id) {
        let db = getAppData();
        const ast = db.Assets.find(a => a.ID === id);
        if (!ast) return;

        const method = ast.PurchaseMethod || 'AdjustManual';

        if (method === 'AdjustManual') {
            // Aset tanpa transaksi → langsung hapus
            Swal.fire({
                title: 'Hapus Aset?',
                text: "Nilai aset akan dikeluarkan dari kalkulasi kekayaan.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Ya, Hapus!'
            }).then((result) => {
                if (result.isConfirmed) {
                    executeDeleteAsset(id, 'writeoff');
                }
            });
        } else {
            // Aset hasil pembelian → tampilkan 2 opsi
            Swal.fire({
                title: 'Hapus Aset?',
                html: `<div class="text-left text-sm space-y-3">
                    <p class="text-slate-600">Aset <b>${ast.Name}</b> dibuat melalui <b>${method === 'BuyCash' ? 'Pembelian Cash' : 'Pembelian Utang'}</b>.</p>
                    <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p class="font-bold text-amber-700 text-xs mb-1">🗑️ Hapus Aset Saja (Write-Off)</p>
                        <p class="text-[11px] text-amber-600">Aset dihapus, tapi transaksi & utang tetap ada. Cocok jika aset hilang/rusak.</p>
                    </div>
                    <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p class="font-bold text-red-700 text-xs mb-1">🔄 Batalkan Pembelian (Full Revert)</p>
                        <p class="text-[11px] text-red-600">Hapus aset + transaksi + utang terkait. Saldo dikembalikan. Cocok jika salah input.</p>
                    </div>
                </div>`,
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: '🗑️ Write-Off',
                denyButtonText: '🔄 Full Revert',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#f59e0b',
                denyButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
            }).then((result) => {
                if (result.isConfirmed) {
                    executeDeleteAsset(id, 'writeoff');
                } else if (result.isDenied) {
                    executeDeleteAsset(id, 'fullrevert');
                }
            });
        }
    }

    function executeDeleteAsset(id, mode) {
        let db = getAppData();
        const ast = db.Assets.find(a => a.ID === id);
        if (!ast) return;

        if (mode === 'fullrevert') {
            // Hapus transaksi terkait & revert saldo
            if (ast.LinkedTransactionID) {
                const trxIdx = db.Transactions.findIndex(t => t.ID === ast.LinkedTransactionID);
                if (trxIdx > -1) {
                    revertTransactionEffect(db, db.Transactions[trxIdx]);
                    db.Transactions.splice(trxIdx, 1);
                    deleteTransactionRow(ast.LinkedTransactionID);
                }
            }
            // Hapus debt terkait
            if (ast.LinkedDebtID) {
                db.Debts = db.Debts.filter(d => d.ID !== ast.LinkedDebtID);
            }
        }

        // Hapus aset
        db.Assets = db.Assets.filter(a => a.ID !== id);
        db = syncAssetAccountBalances(db);

        addAuditLog("Delete", "Aset: " + ast.Name, mode === 'fullrevert' ? 'Full Revert' : 'Write-Off');

        // Sync semua yang mungkin berubah
        saveMasterData('Assets', db.Assets);
        saveMasterData('Accounts', db.Accounts);
        if (mode === 'fullrevert') {
            saveMasterData('Debts', db.Debts);
        }

        // Re-render semua yang relevan
        if (typeof renderTransactions === 'function') renderTransactions();
        if (typeof loadDashboardData === 'function') loadDashboardData();
        if (typeof renderAccounts === 'function') renderAccounts();

        Swal.fire('Terhapus!', mode === 'fullrevert' ? 'Aset, transaksi & utang telah dibatalkan.' : 'Aset telah dihapus.', 'success');
    }

    // --- DEBTS ---
    function renderDebts() {
        const db = getAppData();
        const container = document.getElementById('ui-debts-container');
        const filterSelect = document.getElementById('main-debt-filter');
        if (!container) return;

        const currentFilterVal = filterSelect.value;
        let filterOptionsHTML = '<option value="All">Semua Akun Utang</option>';
        db.Accounts.filter(a => a.Type === 'Debt').forEach(acc => {
            filterOptionsHTML += `<option value="${acc.ID}">${acc.Name}</option>`;
        });
        setSelectHTML('main-debt-filter', filterOptionsHTML);

        if (Array.from(filterSelect.options).some(opt => opt.value === currentFilterVal)) {
            setSelectValue('main-debt-filter', currentFilterVal);
        } else {
            setSelectValue('main-debt-filter', 'All');
        }

        container.innerHTML = '';

        // Calculate Tracked vs Non-Tracked Summary
        let targetAccounts = db.Accounts.filter(a => a.Type === 'Debt');
        if (filterSelect.value !== 'All') {
            targetAccounts = targetAccounts.filter(a => a.ID === filterSelect.value);
        }

        let totalActualDebt = 0;
        let totalSurplus = 0;
        targetAccounts.forEach(acc => {
            if (acc.Balance < 0) {
                totalActualDebt += Math.abs(acc.Balance);
            } else {
                totalSurplus += acc.Balance;
            }
        });

        let debts = db.Debts || [];
        if (filterSelect.value !== 'All') {
            debts = debts.filter(d => d.LinkedAccountID === filterSelect.value);
        }

        let totalTrackedDebt = 0;
        debts.forEach(d => {
            const sisa = d.FinalValue - d.PaidAmount;
            if (sisa > 0) totalTrackedDebt += sisa;
        });

        let nonTrackedDebt = totalActualDebt - totalTrackedDebt;
        if (nonTrackedDebt < 0) nonTrackedDebt = 0; // Prevent UI glitch if data mismatch

        // Render Summary Module
        const summaryHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden">
                <div class="absolute right-0 top-0 opacity-10 text-rose-500 transform translate-x-4 -translate-y-4"><i class="ph-fill ph-warning-circle text-8xl"></i></div>
                <span class="text-xs font-bold uppercase text-rose-500 mb-1 z-10">Total Utang Aktual</span>
                <span class="text-3xl font-black text-rose-600 dark:text-rose-400 z-10">${formatRp(totalActualDebt)}</span>
                ${totalSurplus > 0 ? `<div class="mt-2 text-[10px] font-bold text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded w-max z-10">Terdapat Surplus: +${formatRp(totalSurplus)}</div>` : ''}
            </div>
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden shadow-sm">
                <div class="absolute right-0 top-0 opacity-[0.03] dark:opacity-[0.05] text-slate-800 dark:text-white transform translate-x-4 -translate-y-4"><i class="ph-fill ph-list-checks text-8xl"></i></div>
                <span class="text-xs font-bold uppercase text-slate-500 mb-1 z-10">Tercatat (Tracked Items)</span>
                <span class="text-2xl font-bold text-slate-800 dark:text-slate-200 z-10">${formatRp(totalTrackedDebt)}</span>
            </div>
            <div class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden shadow-sm">
                <div class="absolute right-0 top-0 opacity-[0.03] dark:opacity-[0.05] text-slate-800 dark:text-white transform translate-x-4 -translate-y-4"><i class="ph-fill ph-ghost text-8xl"></i></div>
                <span class="text-xs font-bold uppercase text-slate-500 mb-1 z-10">Selisih Bebas (Non-Tracked)</span>
                <span class="text-2xl font-bold text-slate-700 dark:text-slate-300 z-10">${formatRp(nonTrackedDebt)}</span>
            </div>
        </div>
      `;

        container.innerHTML = summaryHTML;

        if (debts.length === 0) {
            container.innerHTML += `<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center"><i class="ph-fill ph-hand-coins text-4xl text-rose-300 dark:text-rose-700 mb-3"></i><p class="text-slate-500 font-medium">Tidak ada rincian utang yang dilacak pada filter ini.</p></div>`;
            return;
        }

        const getAccName = (id) => { const a = db.Accounts.find(x => x.ID === id); return a ? a.Name : '-'; };

        let tableHTML = `
      <div class="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="px-4 py-3 font-normal"><i class="ph-bold ph-hand-coins mr-1"></i> Detail Utang</th>
              <th class="px-4 py-3 font-normal"><i class="ph-bold ph-bank mr-1"></i> Akun</th>
              <th class="px-4 py-3 font-normal text-right"><i class="ph-bold ph-money mr-1"></i> Sisa Utang</th>
              <th class="px-4 py-3 font-normal"><i class="ph-bold ph-chart-bar mr-1"></i> Progres Bayar</th>
              <th class="px-4 py-3 font-normal text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
      `;

        let cardsHTML = `<div class="md:hidden flex flex-col gap-3">`;

        debts.sort((a, b) => new Date(a.Deadline) - new Date(b.Deadline)).forEach(d => {
            const sisa = d.FinalValue - d.PaidAmount;
            const isLunas = sisa <= 0;
            const colorClass = isLunas ? 'bg-emerald-500' : 'bg-rose-500';
            const textClass = isLunas ? 'text-emerald-500' : 'text-rose-600 dark:text-rose-400';
            const pctRaw = (d.PaidAmount / d.FinalValue) * 100;
            const pct = Math.min(Math.max(pctRaw, 0), 100).toFixed(1);

            const dl = new Date(d.Deadline);
            const diffDays = Math.ceil((dl - new Date()) / (1000 * 60 * 60 * 24));
            let dlText = `${diffDays} hari lagi`;
            if (isLunas) dlText = 'LUNAS';
            else if (diffDays < 0) dlText = `Terlewat ${Math.abs(diffDays)} hari`;
            else if (diffDays > 365) dlText = `${(diffDays / 365).toFixed(1)} tahun`;

            tableHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <td class="px-4 py-4 font-bold text-slate-800 dark:text-slate-200">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg ${isLunas ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 border-emerald-100 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 border-rose-100 dark:border-rose-800/50'} flex items-center justify-center shrink-0 border"><i class="ph-fill ${isLunas ? 'ph-check-circle' : 'ph-hand-coins'}"></i></div>
                  <div>
                    <div>${d.Name}</div>
                    <div class="text-[10px] text-slate-500 font-normal mt-0.5"><i class="ph-bold ph-calendar-blank"></i> Jatuh Tempo: ${dlText}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4 text-slate-600 dark:text-slate-400 text-xs">${getAccName(d.LinkedAccountID)}</td>
              <td class="px-4 py-4 text-right">
                <div class="font-bold ${textClass}">${isLunas ? 'Rp 0' : formatRp(sisa)}</div>
                <div class="text-[10px] text-slate-500">Total: ${formatRp(d.FinalValue)}</div>
              </td>
              <td class="px-4 py-4 w-48">
                <div class="flex items-center gap-2">
                  <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div class="${colorClass} h-2 rounded-full transition-all" style="width: ${pct}%"></div>
                  </div>
                  <span class="text-xs font-bold text-slate-500 w-10 text-right">${pct}%</span>
                </div>
              </td>
              <td class="px-4 py-4 text-right">
                <div class="opacity-100 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                  <button onclick="openDebtModal('${d.ID}')" class="p-1.5 text-slate-400 hover:text-blue-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700"><i class="ph-bold ph-pencil-simple"></i></button>
                  <button onclick="deleteDebt('${d.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700"><i class="ph-bold ph-trash"></i></button>
                </div>
              </td>
            </tr>
          `;

            cardsHTML += `
            <div class="bg-white dark:bg-slate-900 border ${isLunas ? 'border-emerald-300 dark:border-emerald-800/50' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-5 shadow-sm relative overflow-hidden group">
              ${isLunas ? '<div class="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><i class="ph-bold ph-check"></i> LUNAS</div>' : ''}
              <div class="mb-3 flex justify-between items-start">
                <div>
                  <h3 class="font-bold text-lg text-slate-800 dark:text-slate-200 leading-tight">${d.Name}</h3>
                  <p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><i class="ph-fill ph-bank"></i> ${getAccName(d.LinkedAccountID)}</p>
                </div>
              </div>
              
              <div class="mb-4">
                <div class="flex justify-between items-end mb-1">
                  <div class="text-xs font-medium text-slate-500">Sisa Utang</div>
                  <div class="text-right">
                    <span class="text-lg font-bold ${textClass}">${isLunas ? 'Rp 0' : formatRp(sisa)}</span>
                    <span class="text-[10px] text-slate-400 block -mt-1">Telah Bayar: ${formatRp(d.PaidAmount)}</span>
                  </div>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div class="${colorClass} h-2.5 rounded-full transition-all" style="width: ${pct}%"></div>
                </div>
              </div>

              <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                <div class="text-xs text-slate-500 flex items-center gap-1"><i class="ph-bold ph-calendar-blank"></i> ${dlText}</div>
                <div class="flex gap-2">
                  <button onclick="openDebtModal('${d.ID}')" class="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><i class="ph-bold ph-pencil-simple text-lg"></i></button>
                  <button onclick="deleteDebt('${d.ID}')" class="p-1.5 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"><i class="ph-bold ph-trash text-lg"></i></button>
                </div>
              </div>
            </div>
          `;
        });

        tableHTML += `</tbody></table></div>`;
        cardsHTML += `</div>`;
        container.innerHTML += tableHTML + cardsHTML;
    }

    function handleDbtOriginalChange(val) {
        if (!isDbtFinalTouched) {
            document.getElementById('DbtFinalValue').value = val;
        }
    }

    function openDebtModal(id = null) {
        lockBodyScroll();
        pushModalState('modal-debt');
        const db = getAppData();
        isDbtFinalTouched = false;

        let accOptions = '<option value="" disabled selected>Pilih Akun Utang...</option>';
        db.Accounts.filter(a => a.Type === 'Debt').forEach(acc => {
            accOptions += `<option value="${acc.ID}" data-balance="${acc.Balance}">${acc.Name}</option>`;
        });
        setSelectHTML('DbtAccount', accOptions);

        document.getElementById('modal-debt').classList.remove('hidden');
        resetAndSyncForm('form-debt');
        document.getElementById('wrapper-dbt-affect').classList.remove('hidden');

        if (id) {
            document.getElementById('modal-debt-title').innerText = 'Edit Utang / Tagihan';
            document.getElementById('wrapper-dbt-affect').classList.add('hidden'); // Cannot change affect after created
            const d = db.Debts.find(x => x.ID === id);
            if (d) {
                isDbtFinalTouched = true;
                document.getElementById('DbtID').value = d.ID;
                document.getElementById('DbtName').value = d.Name;
                document.getElementById('DbtOriginalValue').value = d.OriginalValue;
                document.getElementById('DbtFinalValue').value = d.FinalValue;
                document.getElementById('DbtPaidAmount').value = d.PaidAmount;
                document.getElementById('DbtDeadline').value = d.Deadline;
                setSelectValue('DbtAccount', d.LinkedAccountID);
                setSelectValue('DbtAffectBalance', d.AffectsAccountBalance ? 'true' : 'false');
            }
        } else {
            document.getElementById('modal-debt-title').innerText = 'Tambah Utang Baru';
            document.getElementById('DbtID').value = '';
            document.getElementById('DbtPaidAmount').value = '0';
            setSelectValue('DbtAffectBalance', 'true');

            let nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            document.getElementById('DbtDeadline').value = nextYear.toLocaleDateString('en-CA');
        }
    }

    function closeDebtModal() {
        unlockBodyScroll();
        document.getElementById('modal-debt').classList.add('hidden');
    }

    function saveDebt(e) {
        e.preventDefault();
        let db = getAppData();
        const id = document.getElementById('DbtID').value;
        const accId = document.getElementById('DbtAccount').value;
        const finalVal = Number(document.getElementById('DbtFinalValue').value);
        const paidVal = Number(document.getElementById('DbtPaidAmount').value);
        const affectBalance = document.getElementById('DbtAffectBalance').value === 'true';

        if (paidVal > finalVal) {
            Swal.fire({ icon: 'warning', title: 'Invalid', text: 'Nominal telah dibayar tidak boleh melebihi nilai akhir.' });
            return;
        }

        const newDbt = {
            ID: id || 'DBT-' + Date.now(),
            Name: document.getElementById('DbtName').value,
            OriginalValue: Number(document.getElementById('DbtOriginalValue').value),
            FinalValue: finalVal,
            PaidAmount: paidVal,
            Deadline: document.getElementById('DbtDeadline').value,
            LinkedAccountID: accId,
            AffectsAccountBalance: id ? db.Debts.find(d => d.ID === id).AffectsAccountBalance : affectBalance
        };

        if (!id && affectBalance) {
            const outstanding = finalVal - paidVal;
            const accIdx = db.Accounts.findIndex(a => a.ID === accId);
            if (accIdx > -1) {
                db.Accounts[accIdx].Balance -= outstanding;
            }
        }

        if (id) {
            const idx = db.Debts.findIndex(x => x.ID === id);
            if (idx > -1) db.Debts[idx] = newDbt;
        } else {
            db.Debts.push(newDbt);
        }

        addAuditLog(id ? "Update" : "Create", "Utang: " + newDbt.Name);

        // Standard Sync
        saveMasterData('Debts', db.Debts);
        saveMasterData('Accounts', db.Accounts);

        closeDebtModal();
        Swal.fire({ icon: 'success', title: 'Tersimpan', showConfirmButton: false, timer: 1500 });
    }

    function deleteDebt(id) {
        Swal.fire({
            title: 'Hapus Catatan Utang?',
            text: "Jika mode Update Saldo aktif saat dibuat, menghapus ini TIDAK akan mengembalikan saldo akun utang Anda. Harap sesuaikan manual jika diperlukan.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Hapus!'
        }).then((result) => {
            if (result.isConfirmed) {
                let db = getAppData();
                db.Debts = db.Debts.filter(d => d.ID !== id);

                addAuditLog("Delete", "Debt ID: " + id);

                saveMasterData('Debts', db.Debts);

                Swal.fire('Terhapus!', 'Catatan utang telah dihapus.', 'success');
            }
        });
    }

    // --- PAY DEBT GENERAL (MULTIPLE ALLOCATION) ---
    function openPayDebtGeneralModal(trxId = null) {
        lockBodyScroll();
        pushModalState('modal-pay-debt-general');
        const db = getAppData();
        document.getElementById('modal-pay-debt-general').classList.remove('hidden');
        resetAndSyncForm('form-pay-debt-general');

        document.getElementById('PayDebtTrxID').value = trxId || '';

        let defaultDate = new Date().toLocaleDateString('en-CA');
        let defaultSource = '';
        let defaultDest = '';
        let defaultAmount = '';
        window._editDebtAllocations = null;

        if (trxId) {
            const trx = db.Transactions.find(t => t.ID === trxId);
            if (trx) {
                defaultDate = trx.Date;
                defaultSource = trx.FromAccountID;
                defaultDest = trx.ToAccountID;
                defaultAmount = trx.Amount;
                window._editDebtAllocations = trx.LinkedDebtPayments || [];
            }
        }

        document.getElementById('PayDebtDate').value = defaultDate;

        let sourceOpts = '<option value="" disabled selected>Pilih Sumber Dana...</option>';
        db.Accounts.filter(a => ['Cash & Bank', 'Investment'].includes(a.Type)).forEach(a => {
            const freeBalance = Number(a.Balance) - Number(a.GoalAllocated || 0);
            sourceOpts += `<option value="${a.ID}" data-balance="${freeBalance}">${a.Name}</option>`;
        });
        setSelectHTML('PayDebtSource', sourceOpts);
        if (defaultSource) setSelectValue('PayDebtSource', defaultSource);

        let destOpts = '<option value="" disabled selected>Pilih Akun Utang Tujuan...</option>';
        db.Accounts.filter(a => a.Type === 'Debt').forEach(a => {
            destOpts += `<option value="${a.ID}" data-balance="${a.Balance}">${a.Name}</option>`;
        });
        setSelectHTML('PayDebtDest', destOpts);
        if (defaultDest) setSelectValue('PayDebtDest', defaultDest);

        document.getElementById('PayDebtAmount').value = defaultAmount;

        document.getElementById('PayDebtAllocationContainer').innerHTML = '';
        document.getElementById('PayDebtUnallocatedInfo').innerHTML = '';

        const btnSubmit = document.getElementById('btn-submit-pay-debt');
        if (trxId) {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
            renderDebtAllocationList();
        } else {
            btnSubmit.disabled = true;
            btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    function closePayDebtGeneralModal() {
        unlockBodyScroll();
        document.getElementById('modal-pay-debt-general').classList.add('hidden');
    }

    function renderDebtAllocationList() {
        const db = getAppData();
        const destId = document.getElementById('PayDebtDest').value;
        const container = document.getElementById('PayDebtAllocationContainer');
        container.innerHTML = '';

        if (!destId) return;

        const targetAcc = db.Accounts.find(a => a.ID === destId);
        if (!targetAcc) return;

        let html = '<div class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 border-b border-slate-200 dark:border-slate-800 pb-1 mt-2">Distribusi Alokasi</div>';

        const activeDebts = db.Debts.filter(d => d.LinkedAccountID === destId && (d.FinalValue - d.PaidAmount > 0 || (window._editDebtAllocations && window._editDebtAllocations.find(a => a.DebtID === d.ID))));

        let totalTracked = 0;
        activeDebts.forEach(d => {
            let paymentAllocated = 0;
            if (window._editDebtAllocations) {
                const alloc = window._editDebtAllocations.find(a => a.DebtID === d.ID);
                if (alloc) paymentAllocated = Number(alloc.Amount);
            }
            const sisa = (d.FinalValue - d.PaidAmount) + paymentAllocated; // Include payment if editing
            totalTracked += sisa;
            html += `
                <div class="flex flex-col mb-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                    <div class="absolute right-0 top-0 opacity-[0.03] transform translate-x-2 -translate-y-2"><i class="ph-fill ph-list-checks text-6xl"></i></div>
                    <div class="flex justify-between items-center mb-2 relative z-10">
                        <span class="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">${d.Name}</span>
                        <span class="text-xs text-rose-500 font-medium shrink-0">Sisa: ${formatRp(sisa)}</span>
                    </div>
                    <div class="relative z-10">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rp</span>
                        <input type="number" class="debt-alloc-input w-full pl-8 pr-3 py-2 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 outline-none text-sm font-bold focus:ring-1 focus:ring-blue-500 transition-all text-blue-600 dark:text-blue-400" data-id="${d.ID}" data-max="${sisa}" value="${paymentAllocated}" oninput="calculateDebtAllocation()">
                    </div>
                </div>
            `;
        });

        const actualDebt = targetAcc.Balance < 0 ? Math.abs(targetAcc.Balance) : 0;
        let nonTracked = actualDebt - totalTracked;
        if (nonTracked < 0) nonTracked = 0;

        html += `
            <div class="flex flex-col mb-3 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 relative overflow-hidden opacity-80">
                <div class="absolute right-0 top-0 opacity-[0.03] transform translate-x-2 -translate-y-2"><i class="ph-fill ph-ghost text-6xl"></i></div>
                <div class="flex justify-between items-center mb-2 relative z-10">
                    <span class="text-sm font-bold text-slate-700 dark:text-slate-300 line-clamp-1">Utang Lain/Surplus (Non-Tracked)</span>
                    <span class="text-xs text-rose-500 font-medium shrink-0">Tercatat: ${formatRp(nonTracked)}</span>
                </div>
                <div class="relative z-10">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rp</span>
                    <input type="number" id="PayDebtNonTracked" class="w-full pl-8 pr-3 py-2 rounded-md bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 outline-none text-sm font-bold text-slate-500 cursor-not-allowed" value="0" disabled title="Akan terisi otomatis dari sisa pembayaran">
                </div>
            </div>
        `;

        container.innerHTML = html;
        calculateDebtAllocation();
    }

    function calculateDebtAllocation() {
        const totalPaymentInput = document.getElementById('PayDebtAmount');
        const totalPayment = Number(totalPaymentInput.value) || 0;

        const allocInputs = document.querySelectorAll('.debt-alloc-input');
        let totalAllocatedToTracked = 0;

        allocInputs.forEach(input => {
            let val = Number(input.value) || 0;
            const max = Number(input.getAttribute('data-max'));
            if (val > max) {
                val = max;
                input.value = val; // Force correct if exceeded
            }
            totalAllocatedToTracked += val;
        });

        const btnSubmit = document.getElementById('btn-submit-pay-debt');
        const infoWrap = document.getElementById('PayDebtUnallocatedInfo');
        const nonTrackedInput = document.getElementById('PayDebtNonTracked');

        if (totalAllocatedToTracked > totalPayment) {
            infoWrap.innerHTML = `<span class="text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded w-full flex items-center gap-1"><i class="ph-fill ph-warning-circle"></i> Alokasi tercatat (${formatRp(totalAllocatedToTracked)}) melebihi total pembayaran!</span>`;
            btnSubmit.disabled = true;
            btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
            if (nonTrackedInput) nonTrackedInput.value = 0;
        } else {
            const remainder = totalPayment - totalAllocatedToTracked;
            if (nonTrackedInput) nonTrackedInput.value = remainder;

            if (totalPayment > 0) {
                infoWrap.innerHTML = `<span class="text-[10px] text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded w-full flex items-center gap-1"><i class="ph-fill ph-check-circle"></i> Sisa Rp ${formatRp(remainder)} dialokasikan ke Non-Tracked/Surplus.</span>`;
                btnSubmit.disabled = false;
                btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                infoWrap.innerHTML = '';
                btnSubmit.disabled = true;
                btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    }

    function submitPayDebtGeneral(e) {
        e.preventDefault();
        let db = getAppData();

        const trxId = document.getElementById('PayDebtTrxID').value;
        const date = document.getElementById('PayDebtDate').value;
        const amount = Number(document.getElementById('PayDebtAmount').value);
        const sourceId = document.getElementById('PayDebtSource').value;
        const destId = document.getElementById('PayDebtDest').value;

        if (amount <= 0 || !sourceId || !destId) return;

        const processPayDebt = () => {
            Swal.fire({ title: 'Memproses Alokasi...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });

            setTimeout(() => {
                let db = getAppData(); // Refresh inside so it's clean
                let oldTrxRowIdx = -1;

                if (trxId) {
                    const oldTrxIdx = db.Transactions.findIndex(t => t.ID === trxId);
                    if (oldTrxIdx > -1) {
                        db = revertTransactionEffect(db, db.Transactions[oldTrxIdx]);
                        oldTrxRowIdx = oldTrxIdx;
                    }
                }

                // 3. Resolve Tracked Sub-Items
                const allocInputs = document.querySelectorAll('.debt-alloc-input');
                let logDetails = [];
                let linkedPayments = [];
                allocInputs.forEach(input => {
                    const debtId = input.getAttribute('data-id');
                    const allocVal = Number(input.value) || 0;

                    if (allocVal > 0) {
                        const debtIdx = db.Debts.findIndex(d => d.ID === debtId);
                        if (debtIdx > -1) {
                            db.Debts[debtIdx].PaidAmount += allocVal;
                            linkedPayments.push({ DebtID: debtId, Amount: allocVal });
                            logDetails.push(`${db.Debts[debtIdx].Name}: ${formatRp(allocVal)}`);
                        }
                    }
                });

                // 1. One Unified Transfer Log
                const trx = {
                    ID: trxId || 'TRX-' + Date.now(),
                    Date: date,
                    Type: 'Transfer',
                    FromAccountID: sourceId,
                    ToAccountID: destId,
                    CategoryID: '',
                    Amount: amount,
                    Note: 'Pembayaran Utang (Multi-Alokasi)',
                    ReferenceType: linkedPayments.length > 0 ? 'DebtPayment' : null,
                    ReferenceID: null,
                    LinkedDebtPayments: linkedPayments.length > 0 ? linkedPayments : null
                };
                
                if (trxId && oldTrxRowIdx > -1) {
                    db.Transactions[oldTrxRowIdx] = trx;
                    updateTransactionRow(trx);
                } else {
                    saveTransaction(trx);
                }

                // 2. Resolve Master Balance
                const sIdx = db.Accounts.findIndex(a => a.ID === sourceId);
                const dIdx = db.Accounts.findIndex(a => a.ID === destId);

                if (sIdx > -1) db.Accounts[sIdx].Balance -= amount;
                if (dIdx > -1) db.Accounts[dIdx].Balance += amount; // Utang gets + meaning it becomes 0 or surplus

                const nonTrackedVal = Number(document.getElementById('PayDebtNonTracked').value) || 0;
                if (nonTrackedVal > 0) {
                    logDetails.push(`Non-Tracked/Surplus: ${formatRp(nonTrackedVal)}`);
                }

                addAuditLog("System", (trxId ? "Update Bayar Utang" : "Bayar Utang") + ` Senilai ${formatRp(amount)} dari ${getAccName(sourceId)}`, logDetails.join(', '));

                // Standard Sync
                saveMasterData('Debts', db.Debts);
                saveMasterData('Accounts', db.Accounts);

                closePayDebtGeneralModal();
                Swal.fire({ icon: 'success', title: 'Pembayaran Sukses', text: 'Saldo telah disesuaikan dengan alokasi.', showConfirmButton: false, timer: 1500 });
                window._editDebtAllocations = null;
            }, 500);
        };

        const sAcc = db.Accounts.find(a => a.ID === sourceId);
        if (sAcc && (sAcc.Balance - amount < 0)) {
            Swal.fire({
                title: 'Saldo Tidak Cukup',
                html: `Pembayaran ini akan membuat saldo akun <b>${sAcc.Name}</b> menjadi minus. Lanjutkan?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Ya, Lanjutkan'
            }).then((res) => { if (res.isConfirmed) processPayDebt(); });
        } else {
            processPayDebt();
        }
    }