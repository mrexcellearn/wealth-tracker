    // ==========================================
    // SYSTEM UTILITIES & GLOBAL VARIABLES
    // ==========================================
    const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

    // Global variables
    let currentDetailAccId = null;
    let isDetailExpanded = false;
    let currentSubFilter = 'CurrentMonth'; // Global state for Subscriptions filter
    let isDbtFinalTouched = false; // State for Auto-fill Debt

    // Scroll Lock Utilities for Modals
    function lockBodyScroll() { document.body.style.overflow = 'hidden'; }
    function unlockBodyScroll() { document.body.style.overflow = ''; }

    // Default Hide Balance = true unless user explicitly set to false
    let isBalanceHidden = localStorage.getItem('excellearn_hide_balance') ? localStorage.getItem('excellearn_hide_balance') === 'true' : true;

    // ==========================================
    // PHASE 3: GLOBAL STATE & SESSION MANAGEMENT
    // ==========================================

    /**
     * window.appSession — Global session info (email, spreadsheetId, role).
     * Diisi dari localStorage saat app dimuat.
     */
    window.appSession = (function () {
        try {
            const raw = localStorage.getItem('excellearn_session') || sessionStorage.getItem('excellearn_session');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.email && parsed.spreadsheetId) return parsed;
            }
        } catch (e) { console.error('Session Parse Error:', e); }
        return {};
    })();

    /**
     * enterApp() — Transisi ke tampilan aplikasi utama.
     */
    function enterApp() {
        const authSection = document.getElementById('authSection');
        const appView = document.getElementById('appView');
        const loader = document.getElementById('spa-loader');

        // Update global session variable dari storage terbaru
        const raw = localStorage.getItem('excellearn_session') || sessionStorage.getItem('excellearn_session');
        if (raw) {
            try {
                window.appSession = JSON.parse(raw);

                // Munculkan menu Admin jika role valid
                if (window.appSession && window.appSession.role === 'admin') {
                    document.querySelectorAll('.nav-admin-item').forEach(el => el.classList.remove('hidden'));
                }
            } catch (e) { }
        }

        // Sembunyikan Auth, Tampilkan App
        if (authSection) authSection.classList.add('hidden');
        if (appView) appView.classList.remove('hidden');

        // Sembunyikan loader utama jika masih ada
        if (loader) {
            loader.classList.add('opacity-0');
            setTimeout(() => loader.remove(), 500);
        }

        // Initialize Data
        initAppData();
    }

    /**
     * exitApp() — Logout dan transisi ke tampilan Auth.
     */
    function exitApp() {
        // [ZETTBOT] Tutup semua modal sebelum logout agar bersih (mencegah session leaking)
        if (typeof closeAllActiveModals === 'function') {
            closeAllActiveModals();
        }

        localStorage.removeItem('excellearn_session');
        sessionStorage.removeItem('excellearn_session');
        window.appSession = {};
        window.appData = null;
        localStorage.removeItem(DB_KEY);

        const authSection = document.getElementById('authSection');
        const appView = document.getElementById('appView');

        if (appView) appView.classList.add('hidden');
        if (authSection) authSection.classList.remove('hidden');

        // Jika sedang di modal drawer, tutup dulu
        const drawer = document.getElementById('modal-drawer');
        if (drawer && !drawer.classList.contains('translate-y-full')) {
            if (typeof closeModalDrawer === 'function') closeModalDrawer();
        }

        // Reset view login (biar tidak di register view)
        if (typeof switchView === 'function') switchView('login');
    }

    window.appData = null;
    window.isLiveMode = false;

    function getAppData() {
        if (window.appData) {
            return window.appData;
        }
        return initMockData();
    }

    function saveAppData(db) {
        window.appData = db;
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }

    function initAppData() {
        const session = window.appSession;
        const spreadsheetId = session ? session.spreadsheetId : null;

        if (!spreadsheetId || spreadsheetId === 'LOCAL_MOCK' || typeof google === 'undefined' || !google.script) {
            console.log('[AppData] Mode Lokal — menggunakan mock data.');
            let db = initMockData();
            db = syncAccountGoalAllocations(db);
            db = syncAssetAccountBalances(db);
            window.appData = db;
            saveAppData(db);
            window.isLiveMode = false;
            loadDashboardData();
            return;
        }

        // --- Load from Cache immediately ---
        const cachedData = localStorage.getItem(DB_KEY);
        if (cachedData) {
            try {
                const db = JSON.parse(cachedData);
                window.appData = db;
                if (typeof renderProfile === 'function') renderProfile(); // Pemicu render profil saat data masuk
                console.log('[AppData] Loading from Cache...');
                loadDashboardData();
            } catch (e) {
                console.warn('[AppData] Cache corrupted, ignoring.');
            }
        }

        // --- Mode Live: Ambil data dari backend dalam satu kali tarikan (Optimasi ZettBOT) ---
        console.log('[AppData] Mode Live — mengambil data lengkap dari Sheet ID:', spreadsheetId);

        google.script.run
            .withSuccessHandler(function (res) {
                if (res && res.success && res.data) {
                    const data = res.data;
                    const md = data.master || {};
                    let db = {};

                    db.Accounts = md.Accounts || [];
                    db.Categories = md.Categories || [];
                    db.Budgets = md.Budgets || [];
                    db.Recurring = md.Recurring || [];
                    db.Goals = md.Goals || [];
                    db.Assets = md.Assets || [];
                    db.Debts = md.Debts || [];
                    db.AuditLogs = md.AuditLogs || [];
                    db.Settings = md.Settings || [];
                    db.Transactions = data.transactions || [];

                    db = syncAccountGoalAllocations(db);
                    db = syncAssetAccountBalances(db);

                    window.appData = db;
                    window.isLiveMode = true;
                    saveAppData(db);
                    loadDashboardData();

                    // [ZETTBOT] Refresh semua tampilan agar data langsung terlihat di layar apa pun
                    if (typeof refreshAllActiveViews === 'function') {
                        refreshAllActiveViews();
                    }

                    // [ZETTBOT] Sembunyikan indikator Pull to Refresh jika aktif
                    if (typeof hidePullRefreshIndicator === 'function') {
                        hidePullRefreshIndicator();
                    }

                    console.log(`[AppData] Data berhasil dimuat (${data.serverTimestamp}).`);
                } else {
                    console.warn('[AppData] fetchFullAppData gagal:', res ? res.message : 'Unknown error');
                    // Fallback jika gagal (bisa tetap pakai cache atau mock)
                    if (typeof hidePullRefreshIndicator === 'function') hidePullRefreshIndicator();
                }
            })
            .withFailureHandler(function (err) {
                console.error('[AppData] fetchFullAppData error:', err);
                if (typeof hidePullRefreshIndicator === 'function') hidePullRefreshIndicator();
            })
            .fetchFullAppData(spreadsheetId);
    }

    // ==========================================
    // OPTIMISTIC UI HELPERS
    // ==========================================

    function setButtonLoading(btn, loadingText) {
        if (typeof btn === 'string') btn = document.getElementById(btn);
        if (!btn) return '';
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('opacity-70', 'cursor-not-allowed');
        btn.innerHTML = `<i class="ph-bold ph-spinner animate-spin mr-1.5"></i> ${loadingText || 'Menyimpan...'}`;
        return original;
    }

    function resetButton(btn, originalHTML) {
        if (typeof btn === 'string') btn = document.getElementById(btn);
        if (!btn) return;
        btn.disabled = false;
        btn.classList.remove('opacity-70', 'cursor-not-allowed');
        btn.innerHTML = originalHTML;
    }

    function addAuditLog(action, entity, details = "") {
        const db = getAppData();
        const timestamp = new Date().toLocaleTimeString('id-ID');
        const newLog = {
            ID: 'AUD-' + Date.now(),
            Timestamp: timestamp,
            Action: action,
            Entity: entity,
            Details: details,
            User: "Local"
        };
        db.AuditLogs.unshift(newLog);
        db.AuditLogs = db.AuditLogs.slice(0, 10);
        saveMasterData('AuditLogs', db.AuditLogs);
    }

    function saveMasterData(key, payload) {
        const spreadsheetId = window.appSession.spreadsheetId;
        const snapshot = JSON.stringify(window.appData);

        const db = getAppData();
        db[key] = payload;
        if (key === 'AuditLogs' && Array.isArray(db[key])) {
            db[key] = db[key].slice(0, 10);
        }
        saveAppData(db);

        loadDashboardData();
        if (typeof renderBudgets === 'function') renderBudgets();
        if (typeof renderGoals === 'function') renderGoals();
        if (typeof renderAccounts === 'function') renderAccounts();
        if (typeof renderCategories === 'function') renderCategories();
        if (typeof renderAssets === 'function') renderAssets();
        if (typeof renderDebts === 'function') renderDebts();
        if (typeof renderSubscriptions === 'function') renderSubscriptions();

        if (spreadsheetId && spreadsheetId !== 'LOCAL_MOCK' && typeof google !== 'undefined' && google.script) {
            console.log(`[Sync] Menitipkan update ${key} ke background...`);
            google.script.run
                .withSuccessHandler((res) => {
                    if (res && res.success === false) {
                        if (res.authError) {
                            Swal.fire({ icon: 'error', title: 'Sesi Habis', text: 'Sesi login Anda telah kadaluarsa. Silakan login kembali.' }).then(() => {
                                if (typeof logoutUser === 'function') logoutUser();
                            });
                        } else {
                            rollbackAppData(snapshot, `Gagal sinkronisasi ${key}: ` + res.message);
                        }
                    } else console.log(`[Sync] ${key} berhasil disinkronisasi.`);
                })
                .withFailureHandler((err) => rollbackAppData(snapshot, `Gagal sinkronisasi ${key}: ` + err))
                .mutateMasterData(spreadsheetId, key, payload);
        }
    }

    function saveTransaction(payload) {
        const spreadsheetId = window.appSession.spreadsheetId;
        const snapshot = JSON.stringify(window.appData);

        const db = getAppData();
        db.Transactions.unshift(payload);
        saveAppData(db);

        loadDashboardData();
        if (typeof renderTransactions === 'function') renderTransactions();

        if (spreadsheetId && spreadsheetId !== 'LOCAL_MOCK' && typeof google !== 'undefined' && google.script) {
            google.script.run
                .withSuccessHandler((res) => {
                    if (res && res.success === false) {
                        if (res.authError) {
                            Swal.fire({ icon: 'error', title: 'Sesi Habis', text: 'Sesi login Anda telah kadaluarsa. Silakan login kembali.' }).then(() => {
                                if (typeof logoutUser === 'function') logoutUser();
                            });
                        } else {
                            rollbackAppData(snapshot, `Gagal mencatat transaksi: ` + res.message);
                        }
                    } else console.log(`[Sync] Transaksi berhasil disinkronisasi.`);
                })
                .withFailureHandler((err) => rollbackAppData(snapshot, `Gagal mencatat transaksi: ` + err))
                .appendTransaction(spreadsheetId, payload);
        }
    }

    function saveTransactionsBatch(payloads) {
        if (!payloads || payloads.length === 0) return;

        const spreadsheetId = window.appSession.spreadsheetId;
        const snapshot = JSON.stringify(window.appData);

        const db = getAppData();
        // Insert di awal karena Transactions diurutkan terbaru ke terlama
        db.Transactions.unshift(...payloads);
        saveAppData(db);

        loadDashboardData();
        if (typeof renderTransactions === 'function') renderTransactions();

        if (spreadsheetId && spreadsheetId !== 'LOCAL_MOCK' && typeof google !== 'undefined' && google.script) {
            google.script.run
                .withSuccessHandler((res) => {
                    if (res && res.success === false) {
                        if (res.authError) {
                            Swal.fire({ icon: 'error', title: 'Sesi Habis', text: 'Sesi login Anda telah kadaluarsa. Silakan login kembali.' }).then(() => {
                                if (typeof logoutUser === 'function') logoutUser();
                            });
                        } else {
                            rollbackAppData(snapshot, `Gagal mencatat transaksi massal: ` + res.message);
                        }
                    } else console.log(`[Sync] Batch ${payloads.length} transaksi berhasil.`);
                })
                .withFailureHandler((err) => rollbackAppData(snapshot, `Gagal mencatat transaksi massal: ` + err))
                .appendTransactions(spreadsheetId, payloads);
        }
    }

    function rollbackAppData(snapshot, errorMsg) {
        console.warn('[Rollback] Sinkronisasi gagal. Mengembalikan state...');
        window.appData = JSON.parse(snapshot);
        saveAppData(window.appData);

        loadDashboardData();
        if (typeof renderBudgets === 'function') renderBudgets();
        if (typeof renderGoals === 'function') renderGoals();
        if (typeof renderAccounts === 'function') renderAccounts();
        if (typeof renderCategories === 'function') renderCategories();
        if (typeof renderAssets === 'function') renderAssets();
        if (typeof renderDebts === 'function') renderDebts();
        if (typeof renderTransactions === 'function') renderTransactions();
        if (typeof renderSubscriptions === 'function') renderSubscriptions();

        Swal.fire({
            icon: 'error', title: 'Gagal Sinkronisasi',
            text: errorMsg + '. Data telah dikembalikan ke kondisi sebelumnya.',
            confirmButtonColor: '#F7941D'
        });
    }

    function logoutUser() {
        exitApp();
    }

    // ==========================================
    // CUSTOM SELECT UI ENGINE
    // ==========================================
    function updateCustomSelect(selectElement) {
        let wrapper = selectElement.closest('.custom-select-wrapper');

        if (!wrapper) {
            const originalClasses = selectElement.getAttribute('class') || '';

            wrapper = document.createElement('div');
            wrapper.className = 'custom-select-wrapper relative w-full';
            selectElement.parentNode.insertBefore(wrapper, selectElement);
            wrapper.appendChild(selectElement);
            selectElement.setAttribute('tabindex', '-1');
            selectElement.style.pointerEvents = 'none';
            selectElement.className = 'opacity-0 absolute inset-0 z-[-1] w-full h-full pointer-events-none select-none';

            const trigger = document.createElement('div');
            trigger.className = `custom-select-trigger flex items-center justify-between cursor-pointer transition-all hover:border-brand-500 ring-offset-2 dark:ring-offset-slate-900 ${originalClasses.replace(/w-full|hidden/g, '').trim()} w-full`;
            trigger.setAttribute('tabindex', '0');
            trigger.innerHTML = `<span class="selected-text truncate pointer-events-none w-full text-left"></span><i class="ph-bold ph-caret-down text-slate-400 shrink-0 ml-2 pointer-events-none"></i>`;
            wrapper.appendChild(trigger);

            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'custom-select-options absolute z-[100] w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl dark:shadow-black/50 max-h-60 overflow-y-auto hidden opacity-0 transition-opacity duration-200 py-1.5';
            wrapper.appendChild(optionsContainer);

            trigger.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                toggleCustomSelect(trigger);
            });

            trigger.addEventListener('focus', () => { trigger.classList.add('ring-2', 'ring-brand-500/20', 'border-brand-500'); });
            trigger.addEventListener('blur', () => { trigger.classList.remove('ring-2', 'ring-brand-500/20', 'border-brand-500'); });
            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault(); trigger.click();
                } else if (e.key === 'Escape') {
                    optionsContainer.classList.remove('opacity-100');
                    setTimeout(() => optionsContainer.classList.add('hidden'), 200);
                }
            });

            selectElement.addEventListener('invalid', () => {
                trigger.classList.add('border-rose-500', 'ring-2', 'ring-rose-500/20');
                setTimeout(() => trigger.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/20'), 3000);
            });

            selectElement.addEventListener('change', () => { syncCustomSelectUI(selectElement); });
        }

        syncCustomSelectUI(selectElement);
    }

    function syncCustomSelectUI(selectElement) {
        const wrapper = selectElement.closest('.custom-select-wrapper');
        if (!wrapper) return;

        const optionsContainer = wrapper.querySelector('.custom-select-options');
        const triggerText = wrapper.querySelector('.selected-text') || wrapper.querySelector('.select-label');
        const trigger = wrapper.querySelector('.custom-select-trigger');

        optionsContainer.innerHTML = '';

        const selectedOption = selectElement.options[selectElement.selectedIndex];
        const displayHtml = selectedOption ? selectedOption.innerHTML : 'Pilih...';
        triggerText.innerHTML = displayHtml;
        triggerText.dataset.original = displayHtml;

        if (selectedOption && selectedOption.disabled) {
            triggerText.classList.add('text-slate-400', 'dark:text-slate-500');
            triggerText.classList.remove('text-slate-800', 'dark:text-slate-200');
        } else {
            triggerText.classList.remove('text-slate-400', 'dark:text-slate-500');
            triggerText.classList.add('text-slate-800', 'dark:text-slate-200');
        }

        if (selectElement.disabled || selectElement.options.length === 0) {
            trigger.classList.add('opacity-50', 'cursor-not-allowed', 'bg-slate-100', 'dark:bg-slate-800/50');
            trigger.style.pointerEvents = 'none';
        } else {
            trigger.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-slate-100', 'dark:bg-slate-800/50');
            trigger.style.pointerEvents = 'auto';
        }

        Array.from(selectElement.options).forEach((option, index) => {
            if (option.disabled && option.value === "") return;

            const optionDiv = document.createElement('div');
            const isSelected = selectElement.selectedIndex === index;

            optionDiv.className = `select-option-item px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${isSelected ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`;

            let iconHtml = isSelected ? `<i class="ph ph-bold ph-check text-brand-500"></i>` : ``;
            optionDiv.innerHTML = `<span>${option.innerHTML}</span>${iconHtml}`;

            if (option.disabled) {
                optionDiv.className = 'px-4 py-2.5 text-sm text-slate-400 dark:text-slate-600 cursor-not-allowed bg-slate-50/50 dark:bg-slate-950/50';
            } else {
                optionDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectElement.selectedIndex = index;
                    triggerText.innerHTML = option.innerHTML;
                    triggerText.dataset.original = option.innerHTML;

                    optionsContainer.classList.remove('opacity-100');
                    setTimeout(() => optionsContainer.classList.add('hidden'), 200);

                    selectElement.dispatchEvent(new Event('change'));
                });
            }
            optionsContainer.appendChild(optionDiv);
        });

        let balanceEl = wrapper.nextElementSibling;
        if (!balanceEl || !balanceEl.classList.contains('custom-select-balance')) {
            balanceEl = document.createElement('div');
            balanceEl.className = 'custom-select-balance text-xs text-slate-500 mt-1.5 pl-1 hidden';
            wrapper.parentNode.insertBefore(balanceEl, wrapper.nextSibling);
        }

        if (selectedOption && selectedOption.dataset.balance !== undefined) {
            balanceEl.innerHTML = `Saldo bebas yang bisa digunakan: <span class="font-bold text-slate-700 dark:text-slate-300">${formatRp(Number(selectedOption.dataset.balance))}</span>`;
            balanceEl.classList.remove('hidden');
        } else {
            balanceEl.innerHTML = '';
            balanceEl.classList.add('hidden');
        }
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-wrapper')) {
            document.querySelectorAll('.custom-select-options:not(.hidden)').forEach(opt => {
                opt.classList.remove('opacity-100');
                setTimeout(() => opt.classList.add('hidden'), 200);
            });
        }
    });

    function toggleCustomSelect(triggerEl) {
        const wrapper = triggerEl.closest('.custom-select-wrapper');
        const optionsContainer = wrapper.querySelector('.custom-select-options');
        const triggerText = wrapper.querySelector('.selected-text') || wrapper.querySelector('.select-label');
        const selectElement = wrapper.querySelector('select');

        document.querySelectorAll('.custom-select-options:not(.hidden)').forEach(opt => {
            if (opt !== optionsContainer) {
                opt.classList.remove('opacity-100');
                const otherWrapper = opt.closest('.custom-select-wrapper');
                const otherTriggerText = otherWrapper.querySelector('.selected-text') || otherWrapper.querySelector('.select-label');
                if (otherTriggerText) {
                    otherTriggerText.classList.add('pointer-events-none');
                    if (otherTriggerText.dataset.original) {
                        otherTriggerText.innerHTML = otherTriggerText.dataset.original;
                    }
                }
                setTimeout(() => opt.classList.add('hidden'), 200);
            }
        });

        if (optionsContainer.classList.contains('hidden')) {
            const rect = triggerEl.getBoundingClientRect();
            if (window.innerHeight - rect.bottom < 250) {
                optionsContainer.classList.add('bottom-full', 'mb-2');
                optionsContainer.classList.remove('mt-2');
            } else {
                optionsContainer.classList.remove('bottom-full', 'mb-2');
                optionsContainer.classList.add('mt-2');
            }

            optionsContainer.classList.remove('hidden');

            if (selectElement.dataset.searchable === "true") {
                if (!triggerText.dataset.original) {
                    triggerText.dataset.original = triggerText.innerHTML;
                }
                triggerText.classList.remove('pointer-events-none');
                triggerText.innerHTML = `
                    <input type="text" class="custom-select-morph-search w-full bg-transparent outline-none border-none p-0 text-sm font-medium" 
                        placeholder="Cari..." autocomplete="off">
                `;
                const searchInput = triggerText.querySelector('input');
                searchInput.focus();
                searchInput.onclick = (e) => e.stopPropagation();
                searchInput.oninput = (e) => {
                    const term = e.target.value.toLowerCase();
                    const items = optionsContainer.querySelectorAll('.select-option-item');
                    let foundAny = false;
                    items.forEach(item => {
                        const text = item.textContent.toLowerCase();
                        const isMatch = text.includes(term);
                        item.classList.toggle('hidden', !isMatch);
                        if (isMatch) foundAny = true;
                    });

                    let noResult = optionsContainer.querySelector('.no-results-msg');
                    if (!foundAny) {
                        if (!noResult) {
                            noResult = document.createElement('div');
                            noResult.className = 'no-results-msg px-4 py-3 text-xs text-slate-400 text-center italic';
                            noResult.innerText = 'Tidak ada hasil ditemukan';
                            optionsContainer.appendChild(noResult);
                        }
                    } else if (noResult) noResult.remove();
                };
            }

            setTimeout(() => {
                optionsContainer.classList.add('opacity-100');
            }, 10);
        } else {
            optionsContainer.classList.remove('opacity-100');
            triggerText.classList.add('pointer-events-none');
            if (triggerText.dataset.original) {
                triggerText.innerHTML = triggerText.dataset.original;
            }
            setTimeout(() => optionsContainer.classList.add('hidden'), 200);
        }
    }

    function initAllCustomSelects() {
        document.querySelectorAll('select').forEach(select => {
            updateCustomSelect(select);
        });
    }

    function setSelectValue(id, val) {
        const sel = document.getElementById(id);
        if (sel) { sel.value = val; syncCustomSelectUI(sel); }
    }

    function setSelectHTML(id, html) {
        const sel = document.getElementById(id);
        if (sel) { sel.innerHTML = html; updateCustomSelect(sel); }
    }

    function resetAndSyncForm(formId) {
        document.getElementById(formId).reset();
        document.getElementById(formId).querySelectorAll('select').forEach(syncCustomSelectUI);
    }

    const CATEGORY_ICONS = [
        'ph-tag', 'ph-money', 'ph-wallet', 'ph-coins', 'ph-credit-card', 'ph-bank', 'ph-piggy-bank', 'ph-receipt', 'ph-calculator', 'ph-chart-pie',
        'ph-fork-knife', 'ph-coffee', 'ph-pizza', 'ph-hamburger', 'ph-bowl-food', 'ph-cooking-pot', 'ph-ice-cream', 'ph-beer-bottle', 'ph-wine',
        'ph-shopping-cart', 'ph-bag', 'ph-handbag', 'ph-t-shirt', 'ph-sneaker', 'ph-gift', 'ph-monitor', 'ph-device-mobile', 'ph-game-controller',
        'ph-car', 'ph-bus', 'ph-taxi', 'ph-train', 'ph-airplane', 'ph-gas-pump', 'ph-bicycle', 'ph-moped',
        'ph-house', 'ph-wrench', 'ph-plug-zap', 'ph-lightning', 'ph-drop', 'ph-tree-palm', 'ph-couch', 'ph-television',
        'ph-heartbeat', 'ph-pill', 'ph-first-aid', 'ph-stethoscope', 'ph-syringe', 'ph-graduation-cap', 'ph-books', 'ph-pencil',
        'ph-paw-print', 'ph-dog', 'ph-cat', 'ph-bird', 'ph-briefcase', 'ph-users', 'ph-user', 'ph-baby',
        'ph-movie-projection', 'ph-microphone', 'ph-microphone-stage', 'ph-barbell', 'ph-soccer-ball', 'ph-heart', 'ph-sparkles', 'ph-star',
        'ph-smiley', 'ph-confetti', 'ph-balloon', 'ph-ticket', 'ph-camera', 'ph-speaker-high', 'ph-headset', 'ph-umbrella',
        'ph-cloud-rain', 'ph-sun', 'ph-moon', 'ph-leaf', 'ph-flower-tulip', 'ph-fish', 'ph-eyeglasses', 'ph-watch', 'ph-sketch-logo'
    ];

    // ==========================================
    // DATABASE & MOCK DATA
    // ==========================================
    const DB_KEY = 'excellearn_mock_v8';
    function initMockData() {
        if (!localStorage.getItem(DB_KEY)) {
            const todayYMD = new Date().toLocaleDateString('en-CA');
            let lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            lastMonth.setDate(1);
            const lastMonthYMD = lastMonth.toLocaleDateString('en-CA');

            let overdueDate = new Date();
            overdueDate.setDate(overdueDate.getDate() - 3);

            let nextWeekDate = new Date();
            nextWeekDate.setDate(nextWeekDate.getDate() + 5);

            let nextYearDate = new Date();
            nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);

            const initialData = {
                Accounts: [
                    { ID: 'ACC-1', Name: 'Dompet Tunai', Type: 'Cash & Bank', Balance: 2500000, GoalAllocated: 0 },
                    { ID: 'ACC-2', Name: 'BCA Utama', Type: 'Cash & Bank', Balance: 15000000, GoalAllocated: 5000000 },
                    { ID: 'ACC-3', Name: 'Credit Card HSBC', Type: 'Debt', Balance: -500000, GoalAllocated: 0 },
                    { ID: 'ACC-4', Name: 'Bibit Reksadana', Type: 'Investment', Balance: 35000000, GoalAllocated: 15000000 },
                    { ID: 'ACC-5', Name: 'Logam Mulia', Type: 'Asset', Balance: 12000000, GoalAllocated: 0 }
                ],
                Transactions: [
                    { ID: 'TRX-2', Date: todayYMD, Type: 'Expense', FromAccountID: 'ACC-2', ToAccountID: '', CategoryID: 'CAT-2', Amount: 1500000, Note: 'Makan Bulan Ini', ReferenceType: null, ReferenceID: null, LinkedDebtPayments: null },
                    { ID: 'TRX-OLD', Date: lastMonthYMD, Type: 'Expense', FromAccountID: 'ACC-2', ToAccountID: '', CategoryID: 'CAT-2', Amount: 6000000, Note: 'Makan Bulan Lalu', ReferenceType: null, ReferenceID: null, LinkedDebtPayments: null },
                    { ID: 'TRX-3', Date: todayYMD, Type: 'Expense', FromAccountID: 'ACC-2', ToAccountID: '', CategoryID: 'CAT-3', Amount: 300000, Note: 'Bensin & Tol', ReferenceType: null, ReferenceID: null, LinkedDebtPayments: null },
                    { ID: 'TRX-GOAL', Date: todayYMD, Type: 'Transfer', FromAccountID: 'ACC-2', ToAccountID: 'ACC-4', CategoryID: '', Amount: 15000000, Note: 'Top-Up Dana Darurat', ReferenceType: 'Goal', ReferenceID: 'GOL-1', LinkedDebtPayments: null },
                    { ID: 'TRX-DEBT', Date: todayYMD, Type: 'Transfer', FromAccountID: 'ACC-2', ToAccountID: 'ACC-3', CategoryID: '', Amount: 2500000, Note: 'Bayar Cicilan Laptop', ReferenceType: 'DebtPayment', ReferenceID: null, LinkedDebtPayments: [{ DebtID: 'DBT-1', Amount: 2500000 }] }
                ],
                Categories: [
                    { ID: 'CAT-1', Name: 'Gaji', Type: 'Income', Icon: 'ph-money' },
                    { ID: 'CAT-2', Name: 'Makanan & Groceries', Type: 'Expense', Icon: 'ph-fork-knife' },
                    { ID: 'CAT-3', Name: 'Transportasi', Type: 'Expense', Icon: 'ph-car' },
                    { ID: 'CAT-4', Name: 'Work & Learning', Type: 'Expense', Icon: 'ph-briefcase' }
                ],
                Budgets: [
                    { ID: 'BDG-1', Name: "Kebutuhan Bulanan", Amount: 5000000, Period: 'Monthly', Mode: 'Cumulative', RolloverType: 'Overspend', LinkedCategories: ['CAT-2'], StartDate: lastMonthYMD }
                ],
                Recurring: [
                    { ID: 'SUB-1', Name: 'Notion+', Amount: 115093, Frequency: 'Monthly', CategoryID: 'CAT-4', AccountID: 'ACC-3', NextDue: nextWeekDate.toLocaleDateString('en-CA'), Status: 'Active' },
                    { ID: 'SUB-2', Name: 'YouTube Premium', Amount: 44289, Frequency: 'Monthly', CategoryID: 'CAT-4', AccountID: 'ACC-3', NextDue: overdueDate.toLocaleDateString('en-CA'), Status: 'Active' }
                ],
                Goals: [
                    { ID: 'GOL-1', Name: 'Dana Darurat (6 Bulan)', TargetAmount: 50000000, AllocatedAmount: 15000000, Deadline: nextYearDate.toLocaleDateString('en-CA'), LinkedAccountID: 'ACC-4' },
                    { ID: 'GOL-2', Name: 'Liburan Jepang', TargetAmount: 20000000, AllocatedAmount: 5000000, Deadline: '2026-08-01', LinkedAccountID: 'ACC-2' }
                ],
                Assets: [
                    { ID: 'AST-1', Name: 'Emas Antam 10g', Date: '2023-01-15', OriginalValue: 9500000, MarketValue: 12000000, LinkedAccountID: 'ACC-5' }
                ],
                Debts: [
                    { ID: 'DBT-1', Name: 'Cicilan Laptop', OriginalValue: 10000000, FinalValue: 10000000, PaidAmount: 2500000, Deadline: nextYearDate.toLocaleDateString('en-CA'), LinkedAccountID: 'ACC-3', AffectsAccountBalance: true }
                ],
                AuditLogs: []
            };
            localStorage.setItem(DB_KEY, JSON.stringify(initialData));
        }
        return JSON.parse(localStorage.getItem(DB_KEY));
    }

    // ==========================================
    // SYNC & CALCULATION HELPERS
    // ==========================================
    function syncAccountGoalAllocations(db) {
        db.Accounts.forEach(acc => acc.GoalAllocated = 0);
        db.Goals.forEach(g => {
            if (g.LinkedAccountID) {
                let accIdx = db.Accounts.findIndex(a => a.ID === g.LinkedAccountID);
                if (accIdx > -1) {
                    db.Accounts[accIdx].GoalAllocated += Number(g.AllocatedAmount);
                }
            }
        });
        return db;
    }

    function syncAssetAccountBalances(db) {
        db.Accounts.forEach(acc => {
            if (acc.Type === 'Asset') {
                let totalMarketValue = 0;
                db.Assets.forEach(ast => {
                    if (ast.LinkedAccountID === acc.ID) {
                        totalMarketValue += Number(ast.MarketValue);
                    }
                });
                acc.Balance = totalMarketValue;
            }
        });
        return db;
    }

    function calculateBudgetStatus(budget, allTransactions) {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        const linkedCats = Array.isArray(budget.LinkedCategories) ? budget.LinkedCategories : [];
        const linkedTrxs = allTransactions.filter(t => t.Type === 'Expense' && linkedCats.includes(t.CategoryID));

        let effectiveLimit = Number(budget.Amount);
        let currentMonthSpent = 0;
        let surplusDeficit = 0;

        linkedTrxs.forEach(t => {
            const d = new Date(t.Date);
            if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
                currentMonthSpent += Number(t.Amount);
            }
        });

        if (budget.Mode === 'Cumulative' && budget.StartDate) {
            const startDate = new Date(budget.StartDate);
            const firstDayThisMonth = new Date(currentYear, currentMonth, 1);

            if (startDate < firstDayThisMonth) {
                let pastSpent = 0;
                let monthsPassed = 0;
                let tempDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                while (tempDate < firstDayThisMonth) {
                    monthsPassed++;
                    tempDate.setMonth(tempDate.getMonth() + 1);
                }
                const totalAllocatedPast = monthsPassed * Number(budget.Amount);
                linkedTrxs.forEach(t => {
                    const d = new Date(t.Date);
                    if (d >= startDate && d < firstDayThisMonth) pastSpent += Number(t.Amount);
                });
                surplusDeficit = totalAllocatedPast - pastSpent;
                if (budget.RolloverType === 'Overspend' && surplusDeficit < 0) effectiveLimit += surplusDeficit;
                else if (budget.RolloverType === 'Underspend' && surplusDeficit > 0) effectiveLimit += surplusDeficit;
                else if (budget.RolloverType === 'Both') effectiveLimit += surplusDeficit;
            }
        }

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const currentDay = today.getDate();
        const timeElapsedPercent = (currentDay / daysInMonth) * 100;
        const safeLimit = Math.max(effectiveLimit, 0.01);
        let percentSpent = (currentMonthSpent / safeLimit) * 100;

        return {
            ...budget, effectiveLimit, spentThisMonth: currentMonthSpent, percentSpent, timeElapsedPercent, surplusDeficit
        };
    }

    function revertTransactionEffect(db, trx) {
        let amt = Number(trx.Amount);
        if (trx.Type === 'Expense' && trx.FromAccountID) {
            let fIdx = db.Accounts.findIndex(a => a.ID === trx.FromAccountID);
            if (fIdx > -1) db.Accounts[fIdx].Balance += amt;
        } else if (trx.Type === 'Income' && trx.ToAccountID) {
            let tIdx = db.Accounts.findIndex(a => a.ID === trx.ToAccountID);
            if (tIdx > -1) db.Accounts[tIdx].Balance -= amt;
        } else if (trx.Type === 'Transfer') {
            let fIdx = db.Accounts.findIndex(a => a.ID === trx.FromAccountID);
            let tIdx = db.Accounts.findIndex(a => a.ID === trx.ToAccountID);
            if (fIdx > -1) db.Accounts[fIdx].Balance += amt;
            if (tIdx > -1) db.Accounts[tIdx].Balance -= amt;
        }

        if (trx.ReferenceType === 'Goal' && trx.ReferenceID) {
            let gIdx = db.Goals.findIndex(g => g.ID === trx.ReferenceID);
            if (gIdx > -1) db.Goals[gIdx].AllocatedAmount -= amt;
        } else if (trx.ReferenceType === 'DebtPayment' && Array.isArray(trx.LinkedDebtPayments)) {
            trx.LinkedDebtPayments.forEach(alloc => {
                let dIdx = db.Debts.findIndex(d => d.ID === alloc.DebtID);
                if (dIdx > -1) {
                    db.Debts[dIdx].PaidAmount -= Number(alloc.Amount);
                }
            });
        } else if (trx.ReferenceType === 'AssetPurchase' && trx.ReferenceID) {
            // Hapus data aset terkait
            const ast = db.Assets.find(a => a.ID === trx.ReferenceID);
            if (ast) {
                // Hapus debt terkait jika ada
                if (ast.LinkedDebtID) {
                    db.Debts = db.Debts.filter(d => d.ID !== ast.LinkedDebtID);
                    saveMasterData('Debts', db.Debts);
                }
                db.Assets = db.Assets.filter(a => a.ID !== trx.ReferenceID);
                db = syncAssetAccountBalances(db);
                saveMasterData('Assets', db.Assets);
            }
        } else if (trx.ReferenceType === 'AssetSale' && trx.LinkedAssetSnapshot) {
            // Restore aset dari snapshot
            const restored = trx.LinkedAssetSnapshot;
            const existingIdx = db.Assets.findIndex(a => a.ID === restored.ID);
            if (existingIdx > -1) {
                db.Assets[existingIdx] = restored;
            } else {
                db.Assets.push(restored);
            }
            db = syncAssetAccountBalances(db);
            saveMasterData('Assets', db.Assets);
        }
    }

    function toggleHideBalance() {
        isBalanceHidden = !isBalanceHidden;
        localStorage.setItem('excellearn_hide_balance', isBalanceHidden);
        loadDashboardData();
    }

    // ==========================================
    // GLOBAL MODAL CLOSER (The Escape Hatch)
    // ==========================================
    function closeAllActiveModals() {
        const activeModals = [
            'modal-transaction', 'modal-account', 'modal-category',
            'modal-budget', 'modal-goal', 'modal-asset', 'modal-debt',
            'modal-quick-action', 'modal-account-detail', 'mobile-menu-sheet',
            'modal-ai', 'modal-profile'
        ];

        let modalClosed = false;
        activeModals.forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.classList.contains('hidden') && !el.classList.contains('translate-y-full')) {
                // Execute proper closing animation/state cleanup based on modal type
                if (id === 'modal-account-detail') {
                    if (typeof closeAccountDetail === 'function') closeAccountDetail();
                } else if (id === 'mobile-menu-sheet') {
                    if (typeof closeMobileMenu === 'function') closeMobileMenu();
                } else if (id === 'modal-ai') {
                    if (typeof closeAIModal === 'function') closeAIModal();
                } else {
                    const closeFn = 'close' + id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('').replace('Modal', '') + 'Modal';
                    if (typeof window[closeFn] === 'function') window[closeFn]();
                    else el.classList.add('hidden');
                }
                modalClosed = true;
            }
        });

        // Jika tidak ada modal terbuka tapi FAB menu menyala, tutup FAB menu
        if (!modalClosed && typeof currentFabState !== 'undefined' && currentFabState) {
            toggleFabMenu(false);
            modalClosed = true;
        }

        return modalClosed;
    }

    // ==========================================
    // MAIN APP INIT & NAVIGATION
    // ==========================================
    let topSpendChartInstance = null;

    window.addEventListener("DOMContentLoaded", () => {
        // Init Theme
        if (localStorage.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        }

        // Init Sidebar
        const sidebar = document.getElementById('sidebar');
        const detailBackdrop = document.getElementById('modal-account-detail');
        if (sidebar && localStorage.getItem('excellearn_sidebar_collapsed') === 'true') {
            sidebar.classList.add('collapsed');
            if (detailBackdrop) {
                detailBackdrop.classList.remove('md:left-64');
                detailBackdrop.classList.add('md:left-[88px]');
            }
        }

        initAppData();
        initAllCustomSelects();

        setTimeout(() => { showTab('dashboard'); }, 500);

        // Session & Auth UI Check
        const session = localStorage.getItem('excellearn_session') || sessionStorage.getItem('excellearn_session');
        const authSection = document.getElementById('authSection');
        const appView = document.getElementById('appView');
        const loader = document.getElementById('spa-loader');

        if (session) {
            try {
                const parsed = JSON.parse(session);
                if (parsed && parsed.email && parsed.spreadsheetId) {
                    enterApp();
                    return;
                }
            } catch (e) {
                console.error('Session Error:', e);
                localStorage.removeItem('excellearn_session');
            }
        }

        if (authSection) authSection.classList.remove('hidden');
        if (appView) appView.classList.add('hidden');

        if (loader) {
            loader.classList.add('opacity-0');
            setTimeout(() => loader.remove(), 500);
        }

        // SW Registration
        if ('serviceWorker' in navigator && !window.isInIframe) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(reg => {
                        console.log('SW Registered!', reg);
                        window.isPWAReady = true;
                    })
                    .catch(err => console.log('SW Registration failed: ', err));
            });
        }

        // Native Back Handling (Swipe on Mobile)
        window.addEventListener('popstate', (event) => {
            const modalClosed = closeAllActiveModals();
            if (!modalClosed && event.state && event.state.type === 'tab') {
                showTab(event.state.tab);
            }
        });
    });

    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('excellearn_sidebar_collapsed', sidebar.classList.contains('collapsed'));

        const detailBackdrop = document.getElementById('modal-account-detail');
        if (detailBackdrop) {
            if (sidebar.classList.contains('collapsed')) {
                detailBackdrop.classList.remove('md:left-64');
                detailBackdrop.classList.add('md:left-[88px]');
            } else {
                detailBackdrop.classList.remove('md:left-[88px]');
                detailBackdrop.classList.add('md:left-64');
            }
        }
    }

    function toggleTheme() {
        const html = document.documentElement;
        const textEl = document.getElementById('theme-toggle-text');

        if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            localStorage.theme = 'light';
            if (textEl) textEl.innerText = 'Dark Mode';
        } else {
            html.classList.add('dark');
            localStorage.theme = 'dark';
            if (textEl) textEl.innerText = 'Light Mode';
        }

        if (topSpendChartInstance) {
            loadDashboardData();
        }
    }

    function showTab(tabId) {
        window.currentTab = tabId;
        if (typeof closeAccountDetail === 'function') closeAccountDetail();

        // Sidebar Highlight
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('bg-brand-50', 'text-brand-600', 'dark:bg-brand-900/20', 'dark:text-brand-400');
                btn.classList.remove('text-slate-500', 'dark:text-slate-400');
            } else {
                btn.classList.remove('bg-brand-50', 'text-brand-600', 'dark:bg-brand-900/20', 'dark:text-brand-400', 'hover:bg-slate-100');
                btn.classList.add('text-slate-500', 'dark:text-slate-400');
            }
        });

        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        const activeTab = document.getElementById('tab-' + tabId);
        if (activeTab) activeTab.classList.remove('hidden');

        document.querySelectorAll('.nav-btn, .nav-btn-mobile').forEach(el => {
            el.classList.remove('text-brand-500', 'active', 'bg-brand-50', 'dark:bg-brand-900/20');
            el.classList.add('text-slate-500', 'dark:text-slate-400');
            const icon = el.querySelector('i');
            if (icon) icon.classList.replace('ph-fill', 'ph');
        });

        const activeDesktopBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
        if (activeDesktopBtn) {
            activeDesktopBtn.classList.remove('text-slate-500', 'dark:text-slate-400');
            activeDesktopBtn.classList.add('text-brand-500', 'active', 'bg-brand-50', 'dark:bg-brand-900/20');
            const icon = activeDesktopBtn.querySelector('i');
            if (icon) icon.classList.replace('ph', 'ph-fill');
        }

        let mobileGroupId = tabId;
        if (['budgets', 'goals'].includes(tabId)) mobileGroupId = 'planning';
        else if (['assets', 'debts'].includes(tabId)) mobileGroupId = 'portfolio';
        else if (['subscriptions', 'accounts', 'categories'].includes(tabId)) mobileGroupId = 'more';

        const activeMobileBtn = document.querySelector(`.nav-btn-mobile[data-group="${mobileGroupId}"]`);
        if (activeMobileBtn) {
            activeMobileBtn.classList.remove('text-slate-500', 'dark:text-slate-400');
            activeMobileBtn.classList.add('text-brand-500', 'active');
            const icon = activeMobileBtn.querySelector('i');
            if (icon) icon.classList.replace('ph', 'ph-fill');
        }

        if (tabId === 'transactions') {
            const mFilterQuick = document.getElementById('main-filter-quick');
            if (mFilterQuick && mFilterQuick.value === 'All') {
                setSelectValue('main-filter-quick', 'ThisMonth');
                if (typeof applyQuickDate === 'function') applyQuickDate();
            } else {
                if (typeof renderTransactions === 'function') renderTransactions();
            }
            if (typeof populateFilterOptions === 'function') populateFilterOptions();
            if (typeof updateCategoryLabel === 'function') updateCategoryLabel();
        }
        if (tabId === 'budgets' && typeof renderBudgets === 'function') renderBudgets();
        if (tabId === 'accounts' && typeof renderAccounts === 'function') renderAccounts();
        if (tabId === 'categories' && typeof renderCategories === 'function') renderCategories();
        if (tabId === 'goals' && typeof renderGoals === 'function') renderGoals();
        if (tabId === 'assets' && typeof renderAssets === 'function') renderAssets();
        if (tabId === 'debts' && typeof renderDebts === 'function') renderDebts();
        if (tabId === 'subscriptions') {
            setSelectValue('main-sub-filter', 'CurrentMonth');
            if (typeof setSubFilter === 'function') setSubFilter('CurrentMonth');
        }

        if (typeof updateFABContext === 'function') updateFABContext(tabId);

        if (window.isPWAReady) {
            history.pushState({ tab: tabId, type: 'tab' }, '', '');
        }
    }

    // --- SMART FAB LOGIC ---
    let currentFabState = false;
    let currentFabSingleAction = null;

    const fabConfigs = {
        'dashboard': [{ icon: 'ph-plus', label: 'Catat Transaksi', action: 'openTransactionModal()' }],
        'transactions': [{ icon: 'ph-plus', label: 'Catat Transaksi', action: 'openTransactionModal()' }],
        'budgets': [
            { icon: 'ph-plus', label: 'Catat Transaksi', action: 'openTransactionModal()' },
            { icon: 'ph-target', label: 'Tambah Budget', action: 'openBudgetModal()' }
        ],
        'goals': [
            { icon: 'ph-plus', label: 'Catat Transaksi', action: 'openTransactionModal()' },
            { icon: 'ph-flag-pennant', label: 'Tambah Goal', action: 'openGoalModal()' }
        ],
        'assets': [
            { icon: 'ph-plus', label: 'Catat Transaksi', action: 'openTransactionModal()' },
            { icon: 'ph-bank', label: 'Tambah Aset', action: 'openAssetModal()' }
        ],
        'debts': [
            { icon: 'ph-plus', label: 'Catat Transaksi', action: 'openTransactionModal()' },
            { icon: 'ph-hand-coins', label: 'Tambah Utang', action: 'openDebtModal()' },
            { icon: 'ph-receipt', label: 'Bayar Tagihan', action: 'openPayDebtGeneralModal()' }
        ],
        'subscriptions': [
            { icon: 'ph-plus', label: 'Catat Transaksi', action: 'openTransactionModal()' },
            { icon: 'ph-calendar-check', label: 'Tambah Langganan', action: 'openSubModal()' }
        ],
        'accounts': [
            { icon: 'ph-plus', label: 'Catat Transaksi', action: 'openTransactionModal()' },
            { icon: 'ph-wallet', label: 'Tambah Akun', action: 'openAccountModal()' }
        ],
        'categories': [
            { icon: 'ph-plus', label: 'Catat Transaksi', action: 'openTransactionModal()' },
            { icon: 'ph-tag', label: 'Tambah Kategori', action: 'openCategoryModal()' }
        ]
    };

    function toggleFabMenu(forceState) {
        const fabMenu = document.getElementById('fab-menu');
        const fabIcon = document.getElementById('fab-icon');
        const fabMain = document.getElementById('fab-main');
        if (!fabMenu || !fabMain) return;

        let newState = forceState !== undefined ? forceState : !currentFabState;

        if (newState) {
            const fabBackdrop = document.getElementById('fab-backdrop');
            fabBackdrop.classList.remove('hidden');
            fabMenu.classList.remove('hidden');
            setTimeout(() => {
                fabMenu.classList.remove('opacity-0', 'translate-y-4');
                fabMenu.classList.add('opacity-100', 'translate-y-0');
                if (fabBackdrop) fabBackdrop.classList.add('opacity-100');
            }, 10);
            fabIcon.classList.add('rotate-45');
            fabMain.classList.replace('bg-brand-500', 'bg-slate-800');
            fabMain.classList.replace('shadow-brand-500/40', 'shadow-slate-800/40');
            if (document.documentElement.classList.contains('dark')) fabMain.classList.replace('bg-slate-800', 'bg-slate-700');
            currentFabState = true;
        } else {
            const fabBackdrop = document.getElementById('fab-backdrop');
            fabMenu.classList.remove('opacity-100', 'translate-y-0');
            fabMenu.classList.add('opacity-0', 'translate-y-4');

            if (fabBackdrop) {
                fabBackdrop.classList.remove('opacity-100');
                fabBackdrop.classList.add('hidden');
            }

            fabIcon.classList.remove('rotate-45');
            fabMain.classList.replace('bg-slate-800', 'bg-brand-500');
            if (document.documentElement.classList.contains('dark')) fabMain.classList.replace('bg-slate-700', 'bg-brand-500');
            fabMain.classList.replace('shadow-slate-800/40', 'shadow-brand-500/40');
            setTimeout(() => {
                if (!currentFabState) {
                    fabMenu.classList.add('hidden');
                }
            }, 300);
            currentFabState = false;
        }
    }

    function handleFabClick() {
        if (currentFabSingleAction) {
            eval(currentFabSingleAction);
        } else {
            toggleFabMenu();
        }
    }

    function updateFABContext(tabId) {
        const menu = document.getElementById('fab-menu');
        if (!menu) return;

        toggleFabMenu(false);

        const config = fabConfigs[tabId] || fabConfigs['dashboard'];

        if (config.length === 1) {
            currentFabSingleAction = config[0].action;
            menu.innerHTML = '';
        } else {
            currentFabSingleAction = null;
            let html = '';
            [...config].reverse().forEach((item) => {
                html += `
                    <div class="flex items-center justify-end gap-6 group cursor-pointer" onclick="toggleFabMenu(false); ${item.action}">
                        <span class="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold px-3 py-1.5 rounded-xl shadow border border-slate-100 dark:border-slate-700 select-none transition-transform group-hover:-translate-x-1">${item.label}</span>
                        <div class="w-12 h-12 bg-white dark:bg-slate-800 text-brand-500 rounded-full shadow border border-slate-100 dark:border-slate-700 flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95">
                            <i class="ph-bold ${item.icon} text-lg"></i>
                        </div>
                    </div>
                `;
            });
            menu.innerHTML = html;
        }
    }

    function openMobileMenu(type) {
        lockBodyScroll();
        const sheet = document.getElementById('mobile-menu-sheet');
        const overlay = document.getElementById('mobile-menu-overlay');
        const title = document.getElementById('mobile-menu-title');
        const content = document.getElementById('mobile-menu-content');

        overlay.classList.remove('hidden');
        void overlay.offsetWidth;
        overlay.classList.add('opacity-100');

        pushModalState('mobile-menu-sheet');

        setTimeout(() => {
            sheet.classList.remove('translate-y-full');
        }, 10);

        if (type === 'planning') {
            title.innerText = 'Perencanaan';
            content.innerHTML = `
            <button onclick="closeMobileMenu(); showTab('budgets')" class="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand-500 transition-colors">
                <div class="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center"><i class="ph-fill ph-wallet text-2xl"></i></div>
                <span class="font-bold text-sm text-slate-800 dark:text-slate-200">Budget Bulanan</span>
            </button>
            <button onclick="closeMobileMenu(); showTab('goals')" class="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand-500 transition-colors">
                <div class="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center"><i class="ph-fill ph-target text-2xl"></i></div>
                <span class="font-bold text-sm text-slate-800 dark:text-slate-200">Target Goals</span>
            </button>
        `;
        } else if (type === 'portfolio') {
            title.innerText = 'Manajemen Portofolio';
            content.innerHTML = `
            <button onclick="closeMobileMenu(); showTab('assets')" class="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 transition-colors">
                <div class="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-500 flex items-center justify-center"><i class="ph-fill ph-buildings text-2xl"></i></div>
                <span class="font-bold text-sm text-slate-800 dark:text-slate-200">Aset Tetap</span>
            </button>
            <button onclick="closeMobileMenu(); showTab('debts')" class="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-rose-500 transition-colors">
                <div class="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center"><i class="ph-fill ph-hand-coins text-2xl"></i></div>
                <span class="font-bold text-sm text-slate-800 dark:text-slate-200">Daftar Utang</span>
            </button>
        `;
        } else if (type === 'more') {
            title.innerText = 'Menu Lainnya';
            let moreHtml = `
            <button onclick="closeMobileMenu(); showTab('subscriptions')" class="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors">
                <div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center"><i class="ph-fill ph-arrows-clockwise text-2xl"></i></div>
                <span class="font-bold text-sm text-slate-800 dark:text-slate-200">Langganan</span>
            </button>
            <button onclick="closeMobileMenu(); showTab('accounts')" class="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-colors">
                <div class="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center"><i class="ph-fill ph-bank text-2xl"></i></div>
                <span class="font-bold text-sm text-slate-800 dark:text-slate-200">Daftar Akun</span>
            </button>
            <button onclick="closeMobileMenu(); showTab('categories')" class="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand-500 transition-colors col-span-2">
                <div class="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center"><i class="ph-fill ph-tag text-2xl"></i></div>
                <span class="font-bold text-sm text-slate-800 dark:text-slate-200">Kategori Transaksi</span>
            </button>
            `;

            if (window.appSession && window.appSession.role === 'admin') {
                moreHtml += `
            <button onclick="closeMobileMenu(); showTab('admin')" class="flex items-center justify-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/50 hover:bg-red-100 transition-colors col-span-2 text-red-500">
                <i class="ph-bold ph-shield-check text-xl"></i>
                <span class="font-bold text-sm">Admin Dashboard</span>
            </button>
                `;
            }

            moreHtml += `
            <button onclick="closeMobileMenu(); handleLogout()" class="flex items-center justify-center gap-3 p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 transition-colors col-span-2 text-rose-500">
                <i class="ph-bold ph-sign-out text-xl"></i>
                <span class="font-bold text-sm">Logout Sesi</span>
            </button>
            `;
            content.innerHTML = moreHtml;
        }
    }

    function handleLogout() {
        Swal.fire({
            title: 'Keluar Aplikasi?',
            text: 'Anda perlu login kembali untuk mengakses data.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Ya, Keluar',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                exitApp();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil Keluar',
                    showConfirmButton: false,
                    timer: 1500,
                    toast: true,
                    position: 'top-end'
                });
            }
        });
    }

    function closeMobileMenu() {
        unlockBodyScroll();
        const sheet = document.getElementById('mobile-menu-sheet');
        const overlay = document.getElementById('mobile-menu-overlay');
        if (sheet) sheet.classList.add('translate-y-full');
        if (overlay) {
            setTimeout(() => {
                overlay.classList.remove('opacity-100');
                setTimeout(() => overlay.classList.add('hidden'), 300);
            }, 300);
        }
    }

    /**
     * Helper to push state for modals to support Native Back
     */
    function pushModalState(modalId) {
        if (window.isPWAReady) {
            history.pushState({ modalId: modalId, type: 'modal' }, '', '');
        }
    }

    // ==========================================
    // BRIDGE FUNCTIONS
    // ==========================================
    function updateTransactionRow(payload) {
        if (!window.appSession || !window.appSession.spreadsheetId) return;
        google.script.run
            .withSuccessHandler(res => {
                if (res && res.success === false) console.warn('[Sync] Gagal update transaksi:', res.message);
                else console.log('[Sync] Transaksi berhasil di-update.');
            })
            .withFailureHandler(err => console.error('Gagal update transaksi:', err))
            .updateTransaction(window.appSession.spreadsheetId, payload);
    }

    function deleteTransactionRow(id) {
        if (!window.appSession || !window.appSession.spreadsheetId) return;
        google.script.run
            .withSuccessHandler(res => {
                if (res && res.success === false) console.warn('[Sync] Gagal hapus transaksi:', res.message);
                else console.log('[Sync] Transaksi berhasil dihapus.');
            })
            .withFailureHandler(err => console.error('Gagal hapus transaksi:', err))
            .deleteTransaction(window.appSession.spreadsheetId, id);
    }

    // ==========================================
    // ZETTBOT FIX: BULLETPROOF GLOBAL LISTENERS 
    // (Shortcut Ctrl+K, Escape Key & PWA Intercom)
    // ==========================================
    let lastAiToggleTime = 0;

    function safeToggleAI() {
        const now = Date.now();
        if (now - lastAiToggleTime < 300) return;
        lastAiToggleTime = now;

        const aiModal = document.getElementById('modal-ai');
        if (aiModal) {
            if (!aiModal.classList.contains('hidden')) {
                if (typeof closeAIModal === 'function') closeAIModal();
            } else {
                if (typeof openAIModal === 'function') openAIModal();
            }
        }
    }

    // Tangkap Global Keyboard Event (Shortcut & Esc)
    window.addEventListener('keydown', function (e) {
        // 1. Ctrl + K untuk Toggle AI
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            safeToggleAI();
        }

        // 2. Tombol Escape (Esc) untuk menutup semua Modal aktif
        if (e.key === 'Escape' || e.key === 'Esc') {
            const closedAny = closeAllActiveModals();
            if (closedAny) {
                e.preventDefault();
            }
        }
    });

    // Tangkap Sinyal Intercom dari Wrapper (PWA / GitHub Pages)
    window.addEventListener('message', function (event) {
        if (event.data === 'toggleAI') {
            safeToggleAI();
        }
        if (event.data === 'goBack') {
            // Trigger PopState agar memanggil logic closeAllActiveModals / kembali tab
            window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
        }
    });


    // ==========================================
    // MODULE: PROFILE & SETTINGS (Responsive Modal)
    // ==========================================
    window.openProfileModal = function () {
        lockBodyScroll();
        document.getElementById('modal-profile').classList.remove('hidden');
        showProfileView(); // Reset to info view
        renderProfile();
        pushModalState('modal-profile');
    };

    window.closeProfileModal = function () {
        unlockBodyScroll();
        document.getElementById('modal-profile').classList.add('hidden');
    };

    window.showProfileView = function () {
        document.getElementById('profile-view-info').classList.remove('hidden');
        document.getElementById('profile-view-password').classList.add('hidden');
        document.getElementById('profile-modal-title').innerText = 'Profile Settings';
    };

    window.showPasswordView = function () {
        document.getElementById('profile-view-info').classList.add('hidden');
        document.getElementById('profile-view-password').classList.remove('hidden');
        document.getElementById('profile-modal-title').innerText = 'Update Security';

        // Clear inputs
        document.getElementById('modal-pass-old').value = '';
        document.getElementById('modal-pass-new').value = '';
        document.getElementById('modal-pass-conf').value = '';
    };

    function getProfileSettings() {
        let session = {};
        try { session = JSON.parse(localStorage.getItem('excellearn_session') || sessionStorage.getItem('excellearn_session') || '{}'); } catch (e) { }

        let defaultName = session.email ? session.email.split('@')[0] : 'User';
        return {
            FullName: session.fullName || defaultName,
            DefaultAIAccount: session.defaultAiAccount || ''
        };
    }

    window.renderProfile = function () {
        const settings = getProfileSettings();
        const session = JSON.parse(localStorage.getItem('excellearn_session') || sessionStorage.getItem('excellearn_session') || '{}');

        // 1. Set Info
        const nameInput = document.getElementById('modal-prof-fullname');
        if (nameInput) nameInput.value = settings.FullName;

        if (document.getElementById('modal-prof-display-name')) document.getElementById('modal-prof-display-name').innerText = settings.FullName || 'User';
        if (document.getElementById('modal-prof-display-email')) document.getElementById('modal-prof-display-email').innerText = session.email || 'email@example.com';

        // 2. Set Dropdown Akun AI
        const aiSelect = document.getElementById('modal-prof-default-ai');
        if (aiSelect) {
            let db = getAppData();
            aiSelect.innerHTML = '<option value="">-- Select Default Account --</option>';
            if (db.Accounts && Array.isArray(db.Accounts)) {
                db.Accounts.forEach(acc => {
                    if (acc.Type !== 'Debt') {
                        const opt = document.createElement('option');
                        opt.value = acc.ID;
                        opt.textContent = acc.Name;
                        if (settings.DefaultAIAccount === acc.ID) opt.selected = true;
                        aiSelect.appendChild(opt);
                    }
                });
            }
            // ZETTBOT FIX: Sync custom UI to clear draft
            if (typeof syncCustomSelectUI === 'function') syncCustomSelectUI(aiSelect);
        }
    };

    window.saveProfileSettings = function () {
        const fullname = document.getElementById('modal-prof-fullname').value.trim();
        const defaultAi = document.getElementById('modal-prof-default-ai').value;

        if (!fullname) {
            Swal.fire('Info', 'Nama lengkap wajib diisi!', 'info'); return;
        }

        const btn = event.currentTarget || document.querySelector('button[onclick="saveProfileSettings()"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Processing...';

        google.script.run
            .withSuccessHandler(res => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (res.success) {
                    // Update Lokal Session
                    let sessionParams = {};
                    try { sessionParams = JSON.parse(localStorage.getItem('excellearn_session') || window.sessionStorage.getItem('excellearn_session') || '{}'); } catch (e) { }
                    sessionParams.fullName = res.data.fullName;
                    sessionParams.defaultAiAccount = res.data.defaultAiAccount;

                    localStorage.setItem('excellearn_session', JSON.stringify(sessionParams));
                    sessionStorage.setItem('excellearn_session', JSON.stringify(sessionParams));
                    window.appSession = sessionParams;

                    renderProfile();
                    Swal.fire({
                        toast: true, position: 'top-end', icon: 'success',
                        title: 'Profil Berhasil Disimpan', showConfirmButton: false, timer: 1500
                    });
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            })
            .withFailureHandler(err => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                Swal.fire('Error Sistem', err.message, 'error');
            })
            .updateUserProfile(window.appSession.idToken, fullname, defaultAi);
    };

    window.updatePassword = function () {
        const oldPass = document.getElementById('modal-pass-old').value;
        const newPass = document.getElementById('modal-pass-new').value;
        const confPass = document.getElementById('modal-pass-conf').value;

        if (!oldPass || !newPass || !confPass) { Swal.fire('Error', 'All fields are required!', 'error'); return; }
        if (newPass !== confPass) { Swal.fire('Error', 'New passwords do not match!', 'error'); return; }
        if (newPass.length < 6) { Swal.fire('Error', 'Password must be at least 6 characters!', 'error'); return; }

        const btn = document.getElementById('btn-modal-update-pass');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Processing...';

        google.script.run.withSuccessHandler(response => {
            btn.disabled = false;
            btn.innerHTML = originalText;

            if (response.success) {
                Swal.fire('Success!', 'Password updated. Please log in again.', 'success').then(() => {
                    handleLogout();
                });
            } else {
                Swal.fire('Failed', response.message, 'error');
            }
        }).withFailureHandler(err => {
            btn.disabled = false;
            btn.innerHTML = originalText;
            Swal.fire('Error', 'Gagal mengubah password: ' + err, 'error');
        }).changeUserPassword(window.appSession.email, oldPass, newPass);
    };
    // Initialize UI on load
    function initProfileUI() {
        const theme = localStorage.theme || 'system';
        const textEl = document.getElementById('theme-toggle-text');

        // Auto apply theme on reload
        const htmlObj = document.documentElement;
        if (theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            htmlObj.classList.add('dark');
            if (textEl) textEl.innerText = 'Light Mode';
        } else {
            htmlObj.classList.remove('dark');
            if (textEl) textEl.innerText = 'Dark Mode';
        }
    }

    // Eksekusi segera setelah dokumen dimuat
    document.addEventListener('DOMContentLoaded', () => {
        initProfileUI();
        initPullToRefresh();
    });

    // ==========================================
    // [ZETTBOT] PWA PULL TO REFRESH LOGIC
    // ==========================================

    let pullStartY = 0;
    let isPulling = false;
    const PULL_THRESHOLD = 70; // Jarak tarik untuk memicu refresh

    function initPullToRefresh() {
        const main = document.getElementById('main-content');
        const pullIndicator = document.getElementById('pull-refresh');
        const pullIcon = document.getElementById('pull-icon');
        const pullText = document.getElementById('pull-text');

        if (!main || !pullIndicator) return;

        main.addEventListener('touchstart', (e) => {
            // Hanya aktif jika sedang di posisi paling atas
            if (main.scrollTop <= 0) {
                pullStartY = e.touches[0].pageY;
            }
        }, { passive: true });

        main.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].pageY;
            const diff = currentY - pullStartY;

            // Jika ditarik ke bawah saat di puncak scroll
            if (main.scrollTop <= 0 && diff > 0) {
                isPulling = true;

                // Efek visual 'resistance' (tarikan terasa berat)
                const translateY = Math.min(diff * 0.4, PULL_THRESHOLD + 20);
                pullIndicator.style.transition = 'none'; // Matikan transisi saat ditarik manual
                pullIndicator.style.transform = `translateY(${translateY}px)`;

                // Putar icon panah jika melewati ambang batas
                if (translateY >= PULL_THRESHOLD) {
                    pullIcon.style.transform = 'rotate(180deg)';
                    pullText.innerText = 'Lepaskan untuk Update';
                } else {
                    pullIcon.style.transform = 'rotate(0deg)';
                    pullText.innerText = 'Tarik untuk Update';
                }

                // Mencegah scroll default browser jika sedang menarik pull-refresh
                if (diff > 10 && e.cancelable) e.preventDefault();
            }
        }, { passive: false });

        main.addEventListener('touchend', () => {
            if (!isPulling) return;
            isPulling = false;

            // Ambil nilai translateY saat ini dari inline style
            const style = pullIndicator.style.transform;
            const match = style.match(/translateY\((.*)px\)/);
            const currentY = match ? parseFloat(match[1]) : 0;

            pullIndicator.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

            if (currentY >= PULL_THRESHOLD) {
                triggerRefresh();
            } else {
                pullIndicator.style.transform = 'translateY(-100%)';
            }
        });
    }

    function triggerRefresh() {
        const pullIndicator = document.getElementById('pull-refresh');
        const pullIcon = document.getElementById('pull-icon');
        const spinner = document.getElementById('refresh-spinner');
        const pullText = document.getElementById('pull-text');

        if (!pullIndicator) return;

        // Visual loading state
        pullIndicator.style.transform = `translateY(${PULL_THRESHOLD}px)`;
        if (pullIcon) pullIcon.classList.add('hidden');
        if (spinner) spinner.classList.remove('hidden');
        if (pullText) pullText.innerText = 'Memperbarui Data...';

        // Trigger Sync Real-time dari backend (initAppData suda menghandle fetch dari sheet)
        console.log('[ZettBOT] Memicu penyegaran data dari Google Sheets...');
        initAppData();

        // Timeout pengaman jika sinkronisasi gagal/terlalu lama (15 detik)
        setTimeout(() => {
            hidePullRefreshIndicator();
        }, 15000);
    }

    function hidePullRefreshIndicator() {
        const pullIndicator = document.getElementById('pull-refresh');
        const pullIcon = document.getElementById('pull-icon');
        const spinner = document.getElementById('refresh-spinner');
        const pullText = document.getElementById('pull-text');

        if (!pullIndicator || pullIndicator.style.transform === 'translateY(-100%)') return;

        // Animasi keluar
        pullIndicator.style.transform = 'translateY(-100%)';

        // Reset state setelah animasi selesai
        setTimeout(() => {
            if (pullIcon) {
                pullIcon.classList.remove('hidden');
                pullIcon.style.transform = 'rotate(0deg)';
            }
            if (spinner) spinner.classList.add('hidden');
            if (pullText) pullText.innerText = 'Tarik untuk Update';
        }, 300);
    }

    // ==========================================
    // GLOBAL UI REFRESH
    // ==========================================
    function refreshAllActiveViews() {
        if (typeof loadDashboardData === 'function') loadDashboardData();
        if (typeof renderTransactions === 'function') renderTransactions();
        if (typeof renderBudgets === 'function') renderBudgets();
        if (typeof renderAccounts === 'function') renderAccounts();
        if (typeof renderGoals === 'function') renderGoals();
        if (typeof renderAssets === 'function') renderAssets();
        if (typeof renderDebts === 'function') renderDebts();
        if (typeof renderCategories === 'function') renderCategories();
        if (typeof renderSubscriptions === 'function') renderSubscriptions();
        if (typeof renderProfile === 'function') renderProfile();
        
        // If an account detail is open, refresh it specifically
        if (typeof currentDetailAccId !== 'undefined' && currentDetailAccId) {
            if (typeof renderAccountHistory === 'function') renderAccountHistory();
            if (typeof renderAccountAllocation === 'function') renderAccountAllocation();
            
            // Also update the header balances if elements exist
            const db = getAppData();
            const acc = db.Accounts.find(a => a.ID === currentDetailAccId);
            if (acc) {
                const headerBal = document.getElementById('det-header-balance');
                if (headerBal) headerBal.innerText = formatRp(acc.Balance);
            }
        }
    }
