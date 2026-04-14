    // --- Auth UI Helpers ---
    function toggleAuthTheme() {
        if (typeof toggleTheme === 'function') {
            toggleTheme();
            updateAuthThemeIcons();
        }
    }

    function updateAuthThemeIcons() {
        const isDark = document.documentElement.classList.contains('dark');
        const icons = [document.getElementById('themeIconDesktop'), document.getElementById('themeIconMobile')];
        icons.forEach(icon => {
            if (icon) {
                icon.className = isDark ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm';
            }
        });
    }

    let isAuthExpanded = false;
    function toggleExpand() {
        const card = document.getElementById('authCard');
        const wrapper = document.getElementById('appWrapper');
        const icon = document.getElementById('expandIcon');
        isAuthExpanded = !isAuthExpanded;

        if (isAuthExpanded) {
            wrapper.classList.remove('md:p-6');
            card.classList.remove('md:max-w-5xl', 'md:rounded-3xl', 'md:h-[80vh]', 'md:min-h-[550px]');
            card.classList.add('w-full', 'h-[100dvh]', 'rounded-none');
            icon.className = 'fas fa-compress text-sm';
        } else {
            wrapper.classList.add('md:p-6');
            card.classList.add('md:max-w-5xl', 'md:rounded-3xl', 'md:h-[80vh]', 'md:min-h-[550px]');
            card.classList.remove('w-full', 'h-[100dvh]', 'rounded-none');
            icon.className = 'fas fa-expand text-sm';
        }
    }

    function showAuthLoader(text) {
        document.getElementById('loaderText').innerText = text || 'Mengautentikasi...';
        document.getElementById('loaderOverlay').classList.remove('hidden');
    }

    function hideAuthLoader() {
        document.getElementById('loaderOverlay').classList.add('hidden');
    }

    function switchView(view) {
        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.add('view-hidden');
            el.style.display = 'none';
        });

        const target = document.getElementById(view + 'View');
        if (target) {
            target.classList.remove('view-hidden');
            target.style.display = 'block';
        }

        // Reset Forgot Password Steps if switching to/from it
        if (view === 'forgot') {
            switchFPStep(1);
        }
        document.getElementById('scrollArea').scrollTo({ top: 0, behavior: 'smooth' });
        hideErrorToast();
    }

    // --- Forgot Password Logic ---

    function handleForgotPasswordRequest(e) {
        if (e) e.preventDefault();

        const emailInput = document.getElementById('fpEmail');
        const email = emailInput ? emailInput.value.trim() : '';
        if (!email) return showErrorToast('Email wajib diisi!');

        const btn = document.getElementById('btnFPRequest');
        const text = document.getElementById('btnFPRequestText');

        const originalText = text.innerText;
        if (btn) {
            btn.disabled = true;
            text.innerText = 'Mengirim...';
        }
        showAuthLoader('Mengirim link reset password...');

        google.script.run
            .withSuccessHandler(res => {
                hideAuthLoader();
                if (btn) {
                    btn.disabled = false;
                    text.innerText = originalText;
                }
                if (res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Email Terkirim!',
                        html: 'Link reset password telah dikirim ke <b>' + email + '</b>. Silakan cek inbox (dan folder spam) Anda.',
                        confirmButtonText: 'Kembali ke Login',
                        confirmButtonColor: '#ea580c'
                    }).then(() => {
                        switchView('login');
                    });
                } else {
                    showErrorToast(res.message);
                }
            })
            .withFailureHandler(err => {
                hideAuthLoader();
                if (btn) {
                    btn.disabled = false;
                    text.innerText = originalText;
                }
                showErrorToast('Gagal mengirim reset link: ' + err);
            })
            .requestPasswordReset(email);
    }

    function showErrorToast(message) {
        const toast = document.getElementById('errorToast');
        const text = document.getElementById('errorToastText');
        text.innerText = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.remove('opacity-0', '-translate-y-2');
            toast.classList.add('opacity-100', 'translate-y-0');
        }, 10);
        setTimeout(() => hideErrorToast(), 5000);
    }

    function hideErrorToast() {
        const toast = document.getElementById('errorToast');
        if (!toast) return;
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', '-translate-y-2');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }

    function handleDemoLogin() {
        showAuthLoader('Mengakses Demo...');
        if (typeof google !== 'undefined') {
            google.script.run
                .withSuccessHandler(res => {
                    hideAuthLoader();
                    if (res.success) {
                        const sessionData = {
                            ...res.data,
                            loginTime: new Date().toISOString()
                        };
                        sessionStorage.setItem('excellearn_session', JSON.stringify(sessionData));
                        if (typeof enterApp === 'function') enterApp();
                    } else {
                        showErrorToast("Gagal masuk mode demo: " + res.message);
                    }
                })
                .loginUser('demo@excellearn.online', 'test12345678');
        }
    }

    function handleAuth(e, action) {
        e.preventDefault();
        hideErrorToast();

        if (action === 'login') {
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            showAuthLoader('Mengautentikasi...');

            if (typeof google !== 'undefined') {
                google.script.run
                    .withSuccessHandler(res => {
                        hideAuthLoader();
                        if (res.success) {
                            const sessionData = {
                                ...res.data,
                                loginTime: new Date().toISOString()
                            };
                            if (rememberMe) localStorage.setItem('excellearn_session', JSON.stringify(sessionData));
                            else sessionStorage.setItem('excellearn_session', JSON.stringify(sessionData));

                            if (typeof enterApp === 'function') enterApp();
                        } else {
                            showErrorToast(res.message);
                            document.getElementById('loginForm').classList.add('shake');
                            setTimeout(() => document.getElementById('loginForm').classList.remove('shake'), 500);
                        }
                    })
                    .loginUser(email, password);
            }
        } else {
            const btnReg = document.getElementById('btnRegister');
            if (btnReg) btnReg.disabled = true;

            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            const sheetUrl = document.getElementById('regSheetUrl').value.trim();
            const licenseKey = document.getElementById('regLicenseKey').value.trim();

            showAuthLoader('Menyiapkan Database...');
            if (typeof google !== 'undefined') {
                google.script.run
                    .withSuccessHandler(res => {
                        hideAuthLoader();
                        if (btnReg) btnReg.disabled = false;
                        if (res.success) {
                            Swal.fire('Berhasil', 'Setup selesai! Silakan login.', 'success');
                            switchView('login');
                        } else {
                            showErrorToast(res.message);
                        }
                    })
                    .withFailureHandler(err => {
                        hideAuthLoader();
                        if (btnReg) btnReg.disabled = false;
                        const msg = String(err);
                        if (msg.toLowerCase().includes('izin untuk mengakses') || msg.toLowerCase().includes('permission to access')) {
                            showErrorToast('Akses Ditolak: Anda belum membagikan Sheet (sebagai Editor) ke email sistem Google ini.');
                        } else {
                            showErrorToast('Koneksi terburuk atau System Error: ' + msg);
                        }
                        console.error('Setup Database Error:', err);
                    })
                    .registerUser(email, password, sheetUrl, licenseKey);
            }
        }
    }