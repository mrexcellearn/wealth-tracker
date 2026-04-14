// ==========================================
// Excellearn Wealth Tracker — Backend (code.gs)
// Phase 1: Authentication via Firebase Auth + Firestore
// Phase 2: Backend API Construction
// ==========================================

/**
 * KONFIGURASI UTAMA
 * Firebase Auth + Firestore menggantikan sheet "Users".
 * FIREBASE_PROJECT_ID & FIREBASE_API_KEY di-set di Script Properties.
 */
const TIMEZONE = 'Asia/Jakarta';

/**
 * Helper: Ambil konfigurasi Firebase dari Script Properties.
 * @return {{ projectId: string, apiKey: string }}
 */
function getFirebaseConfig() {
  const props = PropertiesService.getScriptProperties();
  const projectId = props.getProperty('FIREBASE_PROJECT_ID');
  const apiKey = props.getProperty('FIREBASE_API_KEY');
  if (!projectId || !apiKey) {
    throw new Error('FIREBASE_PROJECT_ID atau FIREBASE_API_KEY belum di-set di Script Properties.');
  }
  return { projectId, apiKey };
}

function doGet(e) {
  // Routing untuk PWA Manifest & Service Worker
  if (e && e.parameter && e.parameter.get) {
    if (e.parameter.get === 'manifest') return getManifestJSON(e.parameter.host);
    if (e.parameter.get === 'sw') return getServiceWorkerJS();
  }

  // Selalu tampilkan index.html sebagai Single Page Application (SPA)
  const template = HtmlService.createTemplateFromFile('index');
  
  // URL Web App untuk kebutuhan frontend jika diperlukan
  template.scriptUrl = ScriptApp.getService().getUrl();
  
  return template.evaluate()
    .setTitle('Excellearn Wealth Tracker')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Fungsi pembantu untuk menyisipkan file HTML lain ke dalam template utama.
 * Contoh penggunaan: <?!= include('styles'); ?>
 * * @param {string} filename Nama file HTML tanpa ekstensi .html
 * @return {string} Konten file HTML
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}

/**
 * Mengembalikan JSON Manifest untuk PWA.
 * @param {string} host Optional host for start_url override (e.g. GitHub domain)
 */
function getManifestJSON(host) {
  const startUrl = host ? `https://${host}/` : getAppUrl();
  const manifest = {
    "name": "Excellearn Wealth Tracker",
    "short_name": "Excellearn",
    "description": "Premium Wealth & Financial Tracker by Zettbos",
    "start_url": startUrl,
    "display": "standalone",
    "background_color": "#0f172a",
    "theme_color": "#ea580c",
    "orientation": "portrait",
    "icons": [
      {
        "src": "https://img.icons8.com/color/512/financial-growth-analysis.png", // Fallback icon
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
      }
    ]
  };
  
  return ContentService.createTextOutput(JSON.stringify(manifest))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Mengembalikan Service Worker (Basic) untuk PWA.
 */
function getServiceWorkerJS() {
  const swCode = `
    const CACHE_NAME = 'excellearn-v1';
    self.addEventListener('install', (event) => {
      self.skipWaiting();
    });
    self.addEventListener('fetch', (event) => {
      // Basic strategy: Network first with fallback
      event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    });
  `;
  
  return ContentService.createTextOutput(swCode)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * Mengembalikan URL Web App agar frontend bisa redirect antar halaman.
 * @return {string} URL Web App saat ini
 */
function getAppUrl() {
  return ScriptApp.getService().getUrl();
}

// ==========================================
// FIREBASE AUTH HELPER FUNCTIONS
// ==========================================

/**
 * Firebase Auth REST: Sign Up (Buat akun baru).
 * @param {string} email
 * @param {string} password
 * @return {{ localId: string, idToken: string, email: string }}
 */
function firebaseSignUp(email, password) {
  const { apiKey } = getFirebaseConfig();
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ email, password, returnSecureToken: true }),
    muteHttpExceptions: true
  });
  const json = JSON.parse(res.getContentText());
  if (json.error) throw new Error(json.error.message);
  return json;
}

/**
 * Firebase Auth REST: Sign In (Login).
 * @param {string} email
 * @param {string} password
 * @return {{ localId: string, idToken: string, email: string }}
 */
function firebaseSignIn(email, password) {
  const { apiKey } = getFirebaseConfig();
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ email, password, returnSecureToken: true }),
    muteHttpExceptions: true
  });
  const json = JSON.parse(res.getContentText());
  if (json.error) throw new Error(json.error.message);
  return json;
}

/**
 * Verifikasi Firebase ID Token (Keamanan Utama)
 * Menggunakan REST API Identity Toolkit.
 * @param {string} idToken Token dari sisi client
 * @return {Object} Data user { localId, email }
 */
function verifyFirebaseIdToken(idToken) {
  const { apiKey } = getFirebaseConfig();
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken }),
    muteHttpExceptions: true
  });
  const json = JSON.parse(res.getContentText());
  if (json.error || !json.users || !json.users.length) {
    throw new Error('Token tidak valid atau manipulasi hak akses ditolak.');
  }
  return json.users[0]; // { localId, email, dll }
}

/**
 * Firebase Auth REST: Update password menggunakan idToken aktif.
 * @param {string} idToken Token dari sign-in session
 * @param {string} newPassword Password baru
 */
function firebaseChangePassword(idToken, newPassword) {
  const { apiKey } = getFirebaseConfig();
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken, password: newPassword, returnSecureToken: true }),
    muteHttpExceptions: true
  });
  const json = JSON.parse(res.getContentText());
  if (json.error) throw new Error(json.error.message);
  return json;
}

/**
 * Firebase Auth REST: Refresh ID Token menggunakan Refresh Token.
 * @param {string} refreshToken Token untuk refresh session
 * @return {Object} { id_token, refresh_token, expires_in, etc }
 */
function firebaseRefreshToken(refreshToken) {
  const { apiKey } = getFirebaseConfig();
  const url = `https://securetoken.googleapis.com/v1/token?key=${apiKey}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    muteHttpExceptions: true
  });
  const json = JSON.parse(res.getContentText());
  if (json.error) return { success: false, message: json.error.message };

  // Return in consistent format
  return {
    success: true,
    data: {
      idToken: json.id_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in
    }
  };
}

/**
 * Firebase Auth REST: Kirim email reset password.
 * @param {string} email Email user
 */
function firebaseSendPasswordReset(email) {
  const { apiKey } = getFirebaseConfig();
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
    muteHttpExceptions: true
  });
  const json = JSON.parse(res.getContentText());
  if (json.error) throw new Error(json.error.message);
  return json;
}

// ==========================================
// FIRESTORE HELPER FUNCTIONS
// ==========================================

/**
 * Simpan/update data user di Firestore collection "users".
 * Document ID = Firebase Auth UID (localId).
 * @param {string} uid Firebase UID
 * @param {Object} data Data user { email, spreadsheetId, role, createdAt }
 */
function firestoreSetUser(uid, data) {
  const { projectId, apiKey } = getFirebaseConfig();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?key=${apiKey}`;
  
  // Konversi object JS ke format Firestore fields
  const fields = {};
  Object.keys(data).forEach(key => {
    const val = data[key];
    if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (typeof val === 'number') fields[key] = { integerValue: String(val) };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else fields[key] = { stringValue: String(val) };
  });
  
  const res = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify({ fields }),
    muteHttpExceptions: true
  });
  const json = JSON.parse(res.getContentText());
  if (json.error) throw new Error(json.error.message);
  return json;
}

/**
 * Ambil data user dari Firestore berdasarkan UID.
 * @param {string} uid Firebase UID
 * @return {Object|null} Data user atau null jika tidak ditemukan
 */
function firestoreGetUser(uid) {
  const { projectId, apiKey } = getFirebaseConfig();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?key=${apiKey}`;
  
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const json = JSON.parse(res.getContentText());
  
  if (json.error) {
    if (json.error.code === 404) return null;
    throw new Error(json.error.message);
  }
  
  // Konversi Firestore fields ke plain object
  return parseFirestoreFields(json.fields);
}

/**
 * Ambil data lisensi dari Firestore berdasarkan License Key.
 */
function firestoreGetLicense(key) {
  const { projectId, apiKey } = getFirebaseConfig();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/licenses/${key}?key=${apiKey}`;
  
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const json = JSON.parse(res.getContentText());
  if (json.error) return null;
  return parseFirestoreFields(json.fields);
}

/**
 * Update data lisensi di Firestore.
 */
function firestoreUpdateLicense(key, data) {
  const { projectId, apiKey } = getFirebaseConfig();
  const fields = {};
  const updateMasks = [];

  Object.keys(data).forEach(k => {
    const val = data[k];
    if (typeof val === 'string') fields[k] = { stringValue: val };
    else if (typeof val === 'number') fields[k] = { integerValue: String(val) };
    else fields[k] = { stringValue: String(val) };

    updateMasks.push(`updateMask.fieldPaths=${k}`);
  });
  
  const queryParams = `key=${apiKey}&${updateMasks.join('&')}`;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/licenses/${key}?${queryParams}`;
  
  const res = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify({ fields }),
    muteHttpExceptions: true
  });
  const json = JSON.parse(res.getContentText());
  if (json.error) throw new Error(json.error.message);
  return true;
}

/**
 * Helper: Parse Firestore fields format ke plain JS object.
 */
function parseFirestoreFields(fields) {
  if (!fields) return {};
  const result = {};
  Object.keys(fields).forEach(key => {
    const field = fields[key];
    if (field.stringValue !== undefined) result[key] = field.stringValue;
    else if (field.integerValue !== undefined) result[key] = Number(field.integerValue);
    else if (field.booleanValue !== undefined) result[key] = field.booleanValue;
    else if (field.doubleValue !== undefined) result[key] = field.doubleValue;
    else result[key] = null;
  });
  return result;
}

// ==========================================
// PHASE 1: AUTHENTICATION (Firebase)
// ==========================================

/**
 * Login user via Firebase Auth.
 * @param {string} email Email user
 * @param {string} password Password plain text
 * @return {Object} { success, message, data? }
 */
function loginUser(email, password) {
  try {
    if (!email || !password) {
      return { success: false, message: 'Email dan password wajib diisi.' };
    }

    // 1. Sign in via Firebase Auth
    const authResult = firebaseSignIn(email.toLowerCase().trim(), password);
    
    // 2. Ambil metadata user dari Firestore
    const userData = firestoreGetUser(authResult.localId);
    if (!userData) {
      return { success: false, message: 'Data user tidak ditemukan di database. Hubungi admin.' };
    }

    return {
      success: true,
      message: 'Login berhasil!',
      data: {
        userId: authResult.localId,
        email: authResult.email,
        spreadsheetId: userData.spreadsheetId || '',
        role: userData.role || 'user',
        level: userData.level || 'basic',
        fullName: userData.fullName || '',
        defaultAiAccount: userData.defaultAiAccount || '',
        idToken: authResult.idToken,
        refreshToken: authResult.refreshToken,
        expiresIn: authResult.expiresIn
      }
    };

  } catch (err) {
    console.error('loginUser Error:', err);
    // Firebase error messages dalam bahasa Inggris, terjemahkan
    const msg = String(err.message);
    if (msg.includes('EMAIL_NOT_FOUND') || msg.includes('INVALID_PASSWORD') || msg.includes('INVALID_LOGIN_CREDENTIALS')) {
      return { success: false, message: 'Email atau password salah.' };
    }
    if (msg.includes('USER_DISABLED')) {
      return { success: false, message: 'Akun Anda telah dinonaktifkan.' };
    }
    if (msg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
      return { success: false, message: 'Terlalu banyak percobaan. Coba lagi nanti.' };
    }
    return { success: false, message: 'Terjadi kesalahan pada server: ' + msg };
  }
}

/**
 * Register user baru via Firebase Auth + Firestore + Lisensi Paywall.
 * Tetap memvalidasi URL Google Sheet milik user.
 * @param {string} email Email user
 * @param {string} password Password plain text
 * @param {string} sheetUrl URL Google Sheet milik user
 * @param {string} licenseKey Kode Lisensi untuk divalidasi
 * @return {Object} { success, message }
 */
function registerUser(email, password, sheetUrl, licenseKey) {
  try {
    if (!email || !password || !sheetUrl || !licenseKey) {
      return { success: false, message: 'Semua field wajib diisi (termasuk Kode Lisensi).' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, message: 'Format email tidak valid.' };
    }

    if (password.length < 6) {
      return { success: false, message: 'Password minimal 6 karakter.' };
    }

    // Validasi URL Sheet
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match || !match[1]) {
      return { success: false, message: 'URL Sheet tidak valid.' };
    }
    const userSheetId = match[1];

    // Cek jika user menggunakan template ZettBOT
    const TEMPLATE_ID = '1XbP_ZZjREDOZZ9uHXP6hNfbqwVP3Lf8U3SdzoIxHWHo';
    if (userSheetId === TEMPLATE_ID) {
      return { success: false, message: 'URL Sheet tidak valid. Anda menggunakan link Template utama ZettBOT. Harap "Make a copy" terlebih dahulu dan berikan akses Editor.' };
    }

    // Cek apakah Sheet bisa diakses
    let userSS;
    try {
      userSS = SpreadsheetApp.openById(userSheetId);
    } catch (accessErr) {
      return { success: false, message: 'Tidak bisa mengakses Sheet. Pastikan Anda mengubah akses share menjadi "Anyone with the link" -> "Editor".' };
    }

    // Validasi tab wajib
    const tabTransactions = userSS.getSheetByName('Transactions');
    const tabMasterData = userSS.getSheetByName('MasterData');
    if (!tabTransactions || !tabMasterData) {
      return { success: false, message: 'Sheet tidak valid. Gunakan template dari ZettBOT.' };
    }

    // Pastikan kita memiliki hak akses EDITOR (write permission test)
    try {
      const testRange = tabMasterData.getRange(1, 1);
      const originalValue = testRange.getValue();
      testRange.setValue(originalValue);
      SpreadsheetApp.flush();
    } catch (writeErr) {
      return { success: false, message: 'Akses Ditolak: Spreadsheet Anda bersifat "Viewer" (View-Only). Silakan buka menu Share dan ubah ke "Anyone with the link" -> "Editor".' };
    }
    
    // 0. VALIDASI KODE LISENSI
    const cleanKey = licenseKey.trim().toUpperCase();
    const licenseData = firestoreGetLicense(cleanKey);
    // Token valid jika statusnya 'active' atau 'booked'
    if (!licenseData || (licenseData.status !== 'active' && licenseData.status !== 'booked')) {
      return { success: false, message: 'Kode Lisensi TIDAK VALID atau SUDAH DIGUNAKAN.' };
    }

    // 1. Buat akun di Firebase Auth
    const emailLower = email.toLowerCase().trim();
    let authResult;
    try {
      authResult = firebaseSignUp(emailLower, password);
    } catch (authErr) {
      const msg = String(authErr.message);
      if (msg.includes('EMAIL_EXISTS')) {
        return { success: false, message: 'Email sudah terdaftar.' };
      }
      throw authErr;
    }

    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'dd/MM/yyyy HH:mm:ss');

    // 2. Simpan metadata user ke Firestore
    firestoreSetUser(authResult.localId, {
      email: emailLower,
      spreadsheetId: userSheetId,
      role: 'user',
      level: 'pro',
      fullName: '',
      defaultAiAccount: '',
      aiPromptCount: 0,
      aiLastPromptDate: timestamp.split(' ')[0], // Simpan tanggal saja
      createdAt: timestamp
    });
    
    // 3. Matikan / tandai License Key sebagai 'used'
    firestoreUpdateLicense(cleanKey, {
      status: 'used',
      usedBy: authResult.localId,
      usedAt: timestamp
    });

    return { success: true, message: 'Registrasi berhasil!' };

  } catch (err) {
    console.error('registerUser Error:', err);
    return { success: false, message: 'Error: ' + err.message };
  }
}

/**
 * UBAH PASSWORD USER (dari Profil).
 * Membutuhkan idToken dari sesi login aktif.
 * @param {string} email Email user (untuk verifikasi)
 * @param {string} oldPassword Password lama (untuk re-authenticate)
 * @param {string} newPassword Password baru
 */
function changeUserPassword(email, oldPassword, newPassword) {
  try {
    if (!email || !oldPassword || !newPassword) {
      return { success: false, message: 'Semua field wajib diisi.' };
    }
    if (newPassword.length < 6) {
      return { success: false, message: 'Password baru minimal 6 karakter.' };
    }

    // 1. Re-authenticate: Login dulu dengan password lama untuk dapat idToken fresh
    let authResult;
    try {
      authResult = firebaseSignIn(email.toLowerCase().trim(), oldPassword);
    } catch (authErr) {
      const msg = String(authErr.message);
      if (msg.includes('INVALID_PASSWORD') || msg.includes('INVALID_LOGIN_CREDENTIALS')) {
        return { success: false, message: 'Password lama yang dimasukkan salah.' };
      }
      throw authErr;
    }

    // 2. Update password menggunakan idToken yang baru
    firebaseChangePassword(authResult.idToken, newPassword);

    return { success: true, message: 'Password berhasil diubah' };
  } catch (err) {
    console.error('changeUserPassword Error:', err);
    return { success: false, message: 'Error sistem: ' + err.message };
  }
}

/**
 * Update User Profile Metadata (Nama, Default AI Account)
 * @param {string} idToken Token dari sisi client
 * @param {string} fullName Nama Lengkap
 * @param {string} defaultAiAccount Account ID
 */
function updateUserProfile(idToken, fullName, defaultAiAccount) {
  try {
    const userAuth = verifyFirebaseIdToken(idToken);
    if (!userAuth) {
      return { success: false, message: 'UNAUTHORIZED: Akses ditolak.' };
    }
    const uid = userAuth.localId;
    
    // Ambil eksisting agar tidak me-reset field lain
    const userData = firestoreGetUser(uid);
    if (!userData) return { success: false, message: 'Data profil tidak ditemukan.' };
    
    userData.fullName = fullName || '';
    userData.defaultAiAccount = defaultAiAccount || '';
    
    firestoreSetUser(uid, userData);
    
    return { 
      success: true, 
      message: 'Profil berhasil diperbarui.',
      data: { fullName: userData.fullName, defaultAiAccount: userData.defaultAiAccount }
    };
  } catch (err) {
    return { success: false, message: 'Gagal update profil: ' + err.message };
  }
}

// ==========================================
// PHASE 2: BACKEND API CONSTRUCTION
// ==========================================

/**
 * Request reset password via Firebase Auth (Opsi A).
 * Firebase mengirim email dengan link reset otomatis.
 * @param {string} email Email user
 */
function requestPasswordReset(email) {
  try {
    if (!email) return { success: false, message: 'Email wajib diisi.' };
    
    const emailLower = email.toLowerCase().trim();
    firebaseSendPasswordReset(emailLower);
    
    return { success: true, message: 'Link reset password telah dikirim ke email Anda. Silakan cek inbox.' };
  } catch (err) {
    console.error('requestPasswordReset Error:', err);
    const msg = String(err.message);
    if (msg.includes('EMAIL_NOT_FOUND')) {
      return { success: false, message: 'Email tidak terdaftar.' };
    }
    return { success: false, message: 'Server error: ' + msg };
  }
}




function fetchMasterData(spreadsheetId) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('MasterData');
    if (!sheet) return { success: false, message: 'Tab MasterData tidak ditemukan.' };

    const allData = sheet.getDataRange().getValues();
    const result = {};

    for (let i = 1; i < allData.length; i++) {
      const key = String(allData[i][0]).trim();
      const jsonValue = String(allData[i][1]).trim();
      if (key) {
        try {
          result[key] = JSON.parse(jsonValue);
        } catch (e) {
          result[key] = jsonValue;
        }
      }
    }
    return { success: true, data: result };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function fetchTransactions(spreadsheetId) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('Transactions');
    if (!sheet) return { success: false, message: 'Tab Transactions tidak ditemukan.' };

    const allData = sheet.getDataRange().getValues();
    if (allData.length <= 1) return { success: true, data: [] };

    const headers = allData[0].map(h => String(h).trim());
    const transactions = [];

    for (let i = 1; i < allData.length; i++) {
      // ZETTBOT FIX: Hindari membaca baris kosong (phantom rows dari copy template)
      const rowStr = allData[i].join('').trim();
      if (rowStr === '') continue;
      
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        let val = allData[i][j];
        if (val instanceof Date) val = Utilities.formatDate(val, TIMEZONE, 'yyyy-MM-dd');
        row[headers[j]] = val;
      }
      transactions.push(row);
    }
    return { success: true, data: transactions };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Menggabungkan fetchMasterData + fetchTransactions dalam satu panggilan.
 * Optimasi v3.6.1: mengurangi dari 2 API calls menjadi 1.
 */
function fetchFullAppData(spreadsheetId) {
  try {
    const masterResult = fetchMasterData(spreadsheetId);
    const trxResult = fetchTransactions(spreadsheetId);
    return {
      success: true,
      data: {
        master: (masterResult && masterResult.success) ? masterResult.data : {},
        transactions: (trxResult && trxResult.success) ? trxResult.data : [],
        serverTimestamp: new Date().toLocaleTimeString('id-ID')
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function mutateMasterData(spreadsheetId, key, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Tunggu sampai 10 detik agar antrean terselesaikan
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('MasterData');
    if (!sheet) return { success: false, message: 'Sheet not found' };

    const allData = sheet.getDataRange().getValues();
    let targetRow = -1;
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][0]).trim() === String(key).trim()) {
        targetRow = i + 1;
        break;
      }
    }

    let finalPayload = payload;
    if (String(key).trim() === 'AuditLogs') {
      let logs = (typeof payload === 'string') ? JSON.parse(payload) : payload;
      if (Array.isArray(logs)) {
        // Sliding Window: Hanya simpan 10 log terbaru
        logs = logs.slice(0, 10);
        finalPayload = logs;
      }
    }

    const jsonString = (typeof finalPayload === 'string') ? finalPayload : JSON.stringify(finalPayload);
    if (targetRow > 0) {
      sheet.getRange(targetRow, 2).setValue(jsonString);
    } else {
      sheet.appendRow([String(key).trim(), jsonString]);
    }
    SpreadsheetApp.flush();
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  } finally {
    lock.releaseLock();
  }
}

function appendTransaction(spreadsheetId, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(3000);
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('Transactions');
    if (!sheet) return { success: false, message: 'Sheet not found' };

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(h => payload[String(h).trim()] !== undefined ? payload[String(h).trim()] : '');
    
    sheet.appendRow(newRow);
    SpreadsheetApp.flush();
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Batch append transaksi ke Google Sheet.
 * ZettBOT: Menggunakan setValues() batch — BUKAN loop appendRow() cell-by-cell.
 * @param {string} spreadsheetId - ID spreadsheet target
 * @param {Array<Object>} payloads - Array of transaction objects
 * @returns {Object} { success: boolean, message?: string }
 */
function appendTransactions(spreadsheetId, payloads) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Timeout lebih lama karena batch bisa besar
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('Transactions');
    if (!sheet) return { success: false, message: 'Sheet Transactions tidak ditemukan' };

    // Ambil header sekali saja — Memory Logic pattern
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Proses di memori: map semua payload ke format baris Sheet
    const newRows = payloads.map(function(payload) {
      return headers.map(function(h) {
        var key = String(h).trim();
        return payload[key] !== undefined ? payload[key] : '';
      });
    });

    // Tulis semua baris sekaligus — Batch setValues()
    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
      SpreadsheetApp.flush(); // Real-time sync wajib
    }
    return { success: true, count: newRows.length };
  } catch (err) {
    return { success: false, message: err.message };
  } finally {
    lock.releaseLock();
  }
}

function updateTransaction(spreadsheetId, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('Transactions');
    if (!sheet) return { success: false, message: 'Sheet not found' };

    const allData = sheet.getDataRange().getValues();
    if (allData.length <= 1) return { success: false, message: 'No data to update' };
    
    const headers = allData[0].map(h => String(h).trim());
    let targetRow = -1;
    const idColIdx = headers.indexOf('ID');

    if (idColIdx === -1) return { success: false, message: 'ID column not found in sheet' };

    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][idColIdx]).trim() === String(payload.ID).trim()) {
        targetRow = i + 1; // Konversi index array ke Row Google Sheet (1-based)
        break;
      }
    }

    if (targetRow > -1) {
      const newRow = headers.map((h, index) => {
        let key = String(h).trim();
        return payload[key] !== undefined ? payload[key] : allData[targetRow - 1][index];
      });
      
      sheet.getRange(targetRow, 1, 1, headers.length).setValues([newRow]);
      SpreadsheetApp.flush(); // Real-time sync ke Google Sheets
      return { success: true };
    } else {
      return { success: false, message: 'Transaction ID not found: ' + payload.ID };
    }
  } catch (err) {
    return { success: false, message: err.message };
  } finally {
    lock.releaseLock();
  }
}

function deleteTransaction(spreadsheetId, trxId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(3000);
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName('Transactions');
    if (!sheet) return { success: false, message: 'Sheet not found' };

    const allData = sheet.getDataRange().getValues();
    if (allData.length <= 1) return { success: false, message: 'No data to delete' };

    const headers = allData[0].map(h => String(h).trim());
    let targetRow = -1;
    const idColIdx = headers.indexOf('ID');

    for (let i = 1; i < allData.length; i++) {
      if (idColIdx > -1 && String(allData[i][idColIdx]).trim() === String(trxId).trim()) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow > -1) {
      sheet.deleteRow(targetRow);
      SpreadsheetApp.flush(); // Real-time sync ke Google Sheets
      return { success: true };
    } else {
      return { success: false, message: 'Transaction ID not found' };
    }
  } catch (err) {
    return { success: false, message: err.message };
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// ZETTBOT AI INTEGRATION - GEMINI 3.1 FLASH LITE
// ==========================================
function processAITransaction(idToken, text, rawAccountsStr, rawCategoriesStr, refreshToken) {
  try {
    let activeToken = idToken;
    let refreshResult = null; // ZETTBOT FIX: Hindari Error Is Not Defined
    let userAuth = null;
    
    // ZETTBOT FIX: Coba verifikasi token. Jika gagal karena expired, refresh server-side.
    try {
      userAuth = verifyFirebaseIdToken(activeToken);
    } catch (authErr) {
      // Token expired — coba refresh server-side menggunakan refreshToken
      if (!refreshToken) {
        return { error: true, authError: true, message: 'Sesi habis. Silakan logout dan login kembali.' };
      }
      console.log('ZETTBOT: idToken expired, attempting server-side refresh. Error was:', authErr.message);
      refreshResult = firebaseRefreshToken(refreshToken);
      if (!refreshResult || !refreshResult.success) {
        return { error: true, authError: true, message: 'Sesi tidak dapat diperbaharui. Silakan logout dan login kembali.' };
      }
      activeToken = refreshResult.data.idToken;
      // Verifikasi ulang dengan token yang baru
      try {
        userAuth = verifyFirebaseIdToken(activeToken);
      } catch (e2) {
        return { error: true, authError: true, message: 'Sesi baru ditolak. Silakan logout dan login kembali.' };
      }
    }
    
    if (!userAuth) {
      return { error: true, authError: true, message: 'UNAUTHORIZED: Sesi kadaluarsa. Silahkan login kembali.' };
    }
    const uid = userAuth.localId;
    const userData = firestoreGetUser(uid);
    if (!userData) return { error: true, message: 'Data profil tidak ditemukan di database.' };

    const today = new Date();
    const currentDateYMD = Utilities.formatDate(today, TIMEZONE, 'yyyy-MM-dd');

    // ZettBOT: Cek Limit AI Harian (Max 10 per hari untuk non-pro)
    if (userData.level !== 'pro' && userData.role !== 'admin') {
       let count = Number(userData.aiPromptCount) || 0;
       
       if (userData.aiLastPromptDate !== currentDateYMD) {
          count = 0; // Reset beda hari
       }
       
       if (count >= 10) {
          return { error: true, message: 'Batas penggunaan AI (10 prompt/hari) telah habis. Silakan coba lagi besok.' };
       }
       
       // Update kuota di awalan (optimistic)
       userData.aiPromptCount = count + 1;
       userData.aiLastPromptDate = currentDateYMD;
       try { firestoreSetUser(uid, userData); } catch (e) {}
    }

    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) {
        return { error: true, message: 'Sistem: GEMINI_API_KEY belum di-set di Script Properties.' };
    }

    // ZettBOT Fix: Inject Konteks Waktu Server (Timezone Asia/Jakarta)
    const currentDateFull = Utilities.formatDate(today, TIMEZONE, 'EEEE, dd MMMM yyyy HH:mm:ss');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;

    // ZettBOT Fix: Prompt Engineering Diperketat untuk Multi-Transaksi (Max 10)
    const systemPrompt = `Kamu adalah asisten AI pencatat keuangan (Expense Tracker) yang sangat akurat.
Tugasmu adalah menganalisis teks natural dari user menjadi struktur data JSON transaksi yang valid.
User bisa memberikan lebih dari satu transaksi dalam satu pesan (maksimal 10 transaksi).
SELALU kembalikan hasilnya dalam format array "transactions", bahkan jika hanya ada 1 transaksi.

KONTEKS WAKTU SAAT INI (SANGAT PENTING):
- Waktu server saat ini: ${currentDateFull}
- Tanggal default (Hari Ini): ${currentDateYMD}

ATURAN WAKTU:
1. Jika user tidak menyebutkan tanggal spesifik, WAJIB gunakan tanggal hari ini: "${currentDateYMD}".
2. Jika user menyebut "kemarin", kurangi 1 hari dari ${currentDateYMD}.
3. Jika user menyebut nama hari/bulan tanpa tahun, asumsikan itu di tahun ini berjalan.
4. Output tanggal di JSON (key "Date") WAJIB format "YYYY-MM-DD".

Referensi Data Akun (JSON):
${rawAccountsStr}

Referensi Data Kategori (JSON):
${rawCategoriesStr}

Aturan Ketat Parsing Transaksi:
1. Tentukan Type transaksi ("Expense", "Income", "Transfer") untuk setiap transaksi yang ditemukan.
   - [PENTING: TARIK TUNAI/TRANSFER] Jika teks mengandung kata "tarik tunai", "ambil duit", "transfer ke dompet", dsb, tipe WAJIB "Transfer".
2. Penentuan Akun (AccountID) - WAJIB IKUTI INI:
   - Expense: Isi FromAccountID (sumber dana), ToAccountID biarkan string kosong ("").
   - Income: Isi ToAccountID (tujuan dana), FromAccountID biarkan string kosong ("").
   - Transfer: WAJIB isi FromAccountID (sumber dana) DAN ToAccountID (tujuan dana).
3. Tentukan CategoryID yang paling relevan. Jika Transfer, CategoryID bisa diisi kategori khusus transfer jika ada, atau biarkan kosong ("").
4. ATURAN AKUN PENTING: Jika user MENYEBUTKAN nama bank/dompet spesifik (misal "BCA", "Gopay", "Cash"), cocokkan dengan data Referensi Akun di atas. Jika user TIDAK menyebutkan nama bank/dompet apa pun, WAJIB biarkan FromAccountID dan/atau ToAccountID sebagai string kosong (""). JANGAN menebak akun. Sistem akan otomatis menentukan akun default.
5. Konversi nominal: "25k" -> 25000, "15.5rb" -> 15500, "1jt" -> 1000000.
6. Tulis deskripsi rapi di field "Note".
7. JIKA input teks sama sekali tidak ada hubungannya dengan keuangan, kembalikan JSON: {"error": true, "message": "Teks tidak dikenali sebagai transaksi"}.

FORMAT OUTPUT JSON YANG DIHARAPKAN (JANGAN ADA MARKDOWN):
{
  "transactions": [
    {
      "Date": "YYYY-MM-DD",
      "Type": "Expense|Income|Transfer",
      "Amount": angka_tanpa_kutip,
      "CategoryID": "string_id_atau_kosong",
      "FromAccountID": "string_id_atau_kosong",
      "ToAccountID": "string_id_atau_kosong",
      "Note": "string_deskripsi"
    }
  ]
}`;

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: text }] }],
      generationConfig: { responseMimeType: "application/json" }
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const jsonRes = JSON.parse(response.getContentText());

    if (jsonRes.error) {
      return { error: true, message: jsonRes.error.message };
    }

    const aiText = jsonRes.candidates[0].content.parts[0].text;
    const aiData = JSON.parse(aiText);

    // Jika AI mengembalikan error terstruktur
    if (aiData.error) return { error: true, message: aiData.message };
    
    // Pastikan output selalu array (support single maupun multi)
    const transactions = aiData.transactions || [];
    if (transactions.length === 0) {
        return { error: true, message: 'Gemini gagal mendeteksi transaksi dari teks tersebut.' };
    }

    // ZETTBOT FIX: Sertakan token baru jika tadi sempat auto-refresh di backend
    const tokenRefreshed = (activeToken !== idToken);

    return { 
      error: false, 
      data: { 
        transactions: transactions,
        newIdToken: tokenRefreshed ? activeToken : null,
        newRefreshToken: tokenRefreshed ? refreshResult.data.refreshToken : null
      }, 
      message: 'Berhasil menganalisis ' + transactions.length + ' transaksi.' 
    };

  } catch (err) {
    if (err.message === 'Sesi habis. Silakan logout dan login kembali.') {
       return { error: true, authError: true, message: err.message };
    }
    return { error: true, message: 'Koneksi ke AI Gagal: ' + err.message };
  }
}

// ==========================================
// PHASE 3: ADMIN & MONETIZATION ENDPOINTS
// ==========================================

/**
 * Helper: Verifikasi jika caller adalah Admin.
 * @param {string} idToken Token auth dari frontend
 * @return {Object|null} Auth payload jika valid dan admin, null jika tidak.
 */
function verifyAdmin(idToken) {
  try {
    const userAuth = verifyFirebaseIdToken(idToken);
    if (!userAuth || !userAuth.email) return null;
    // Email hardcode admin
    if (userAuth.email !== 'mr.excellearn@gmail.com') return null;
    return userAuth;
  } catch (e) {
    return null;
  }
}

/**
 * GET Data Dashboard Admin
 * @param {string} idToken Token auth
 * @return {Object} { success, message, data }
 */
function getAdminDashboardData(idToken) {
  try {
    const adminAuth = verifyAdmin(idToken);
    if (!adminAuth) {
      return { success: false, message: 'UNAUTHORIZED: Akses ditolak. Token tidak valid atau hak akses kurang.' };
    }

    const { projectId, apiKey } = getFirebaseConfig();
    
    // Fetch Users API (Max 1000 for simplicity without pagination)
    const usersUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?pageSize=1000&key=${apiKey}`;
    const usersRes = UrlFetchApp.fetch(usersUrl, { muteHttpExceptions: true });
    
    // Fetch Licenses API
    const licensesUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/licenses?pageSize=1000&key=${apiKey}`;
    const licensesRes = UrlFetchApp.fetch(licensesUrl, { muteHttpExceptions: true });

    const usersData = JSON.parse(usersRes.getContentText());
    const licensesData = JSON.parse(licensesRes.getContentText());

    if (usersData.error || licensesData.error) {
       throw new Error("Gagal mengambil data dari database.");
    }

    const usersList = (usersData.documents || []).map(doc => parseFirestoreFields(doc.fields));
    const licensesList = (licensesData.documents || []).map(doc => {
        const l = parseFirestoreFields(doc.fields);
        // Fallback jika API update sebelumnya menghapus key / createdAt
        if (!l.key && doc.name) {
            l.key = doc.name.split('/').pop(); // "projects/.../licenses/ID"
        }
        if (!l.createdAt) {
            l.createdAt = 'UNDEFINED';
        }
        return l;
    });

    const totalUsers = usersList.length;
    const activeLicenses = licensesList.filter(l => l.status === 'active').length;
    const bookedLicenses = licensesList.filter(l => l.status === 'booked').length;
    const usedLicenses = licensesList.filter(l => l.status === 'used').length;

    return {
      success: true,
      data: {
        stats: { totalUsers, activeLicenses, bookedLicenses, usedLicenses },
        users: usersList,
        licenses: licensesList.map(l => ({
            key: l.key,
            status: l.status,
            usedBy: l.usedBy || '-',
            bookedBy: l.bookedBy || '-',
            createdAt: l.createdAt
        }))
      }
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Generate License Keys baru (Admin Only)
 * @param {string} idToken Token auth
 * @param {number} qty Jumlah lisensi yang ingin dibuat
 */
function generateLicenseKeys(idToken, qty) {
  try {
    const adminAuth = verifyAdmin(idToken);
    if (!adminAuth) {
      return { success: false, message: 'UNAUTHORIZED: Akses ditolak.' };
    }

    if (!qty || qty < 1 || qty > 50) {
      return { success: false, message: 'Kuantitas harus antara 1-50.' };
    }

    const newKeys = [];
    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'dd/MM/yyyy HH:mm:ss');
    const { projectId, apiKey } = getFirebaseConfig();

    for (let i = 0; i < qty; i++) {
        // Generate random format: EXCL-XXXX-XXXX
        const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const key = `EXCL-${p1}-${p2}`;
        
        const payload = {
            fields: {
                key: { stringValue: key },
                status: { stringValue: 'active' },
                usedBy: { stringValue: '' },
                createdAt: { stringValue: timestamp }
            }
        };

        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/licenses/${key}?key=${apiKey}`;
        
        UrlFetchApp.fetch(url, {
            method: 'patch',
            contentType: 'application/json',
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        });

        newKeys.push(key);
    }

    return { success: true, message: `${qty} Lisensi berhasil dibuat.`, data: newKeys };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * UBAH STATUS LISENSI OLEH ADMIN (Booked/Active)
 * @param {string} idToken Token auth
 * @param {string} key Kode Lisensi
 * @param {string} newStatus Status baru ('booked' atau 'active')
 * @param {string} buyerName Nama pemesan (opsional)
 */
function updateLicenseStatusAdmin(idToken, key, newStatus, buyerName = '') {
  try {
    const adminAuth = verifyAdmin(idToken);
    if (!adminAuth) {
      return { success: false, message: 'UNAUTHORIZED: Akses ditolak.' };
    }

    const cleanKey = key.trim().toUpperCase();
    const licenseData = firestoreGetLicense(cleanKey);
    
    if (!licenseData) {
      return { success: false, message: 'Kode Lisensi tidak ditemukan di database.' };
    }

    const updatePayload = { status: newStatus };
    if (newStatus === 'booked') {
        updatePayload.bookedBy = buyerName.trim();
        updatePayload.usedBy = ''; // Reset jika dipulihkan dari used
        updatePayload.usedAt = '';
    } else {
        updatePayload.bookedBy = ''; // Reset jika dikembalikan ke active
        updatePayload.usedBy = '';
        updatePayload.usedAt = '';
    }

    firestoreUpdateLicense(cleanKey, updatePayload);
    return { success: true, message: `Status lisensi berhasil diubah menjadi ${newStatus}.` };
    
  } catch (err) {
    return { success: false, message: 'Error backend: ' + err.message };
  }
}

// ==========================================
// HEADLESS API: doPost() JSON Router
// Menerima request dari frontend (GitHub Pages)
// via fetch() dengan Content-Type: text/plain
// ==========================================

/**
 * JSON API Gateway untuk arsitektur headless.
 * Frontend mengirim { action, params, idToken, refreshToken }
 * Backend merutekan ke fungsi yang sesuai.
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const params = body.params || [];
    const idToken = body.idToken || '';

    // ═══ OPEN ENDPOINTS (tidak perlu login) ═══
    const openEndpoints = {
      'loginUser':            () => loginUser(...params),
      'registerUser':         () => registerUser(...params),
      'requestPasswordReset': () => requestPasswordReset(...params),
      'firebaseRefreshToken': () => firebaseRefreshToken(...params),
    };

    if (openEndpoints[action]) {
      return jsonResponse(openEndpoints[action]());
    }

    // ═══ TOKEN GUARD + OWNERSHIP GUARD (with CacheService for speed) ═══
    // Cache token verification for 50 minutes to avoid 2x Firebase calls per request
    const tokenHash = idToken.substring(idToken.length - 32); // Last 32 chars as fingerprint
    const cache = CacheService.getScriptCache();
    const cacheKey = 'auth_' + tokenHash;
    let userAuth, userSpreadsheetId;

    const cached = cache.get(cacheKey);
    if (cached) {
      // ⚡ FAST PATH: token sudah di-cache, skip network calls
      const parsed = JSON.parse(cached);
      userAuth = { localId: parsed.uid };
      userSpreadsheetId = parsed.ssId;
    } else {
      // 🔒 FULL VERIFICATION: pertama kali token ini dipakai
      try {
        userAuth = verifyFirebaseIdToken(idToken);
      } catch (authErr) {
        // Auto-refresh token server-side (ZettBOT Fix untuk multi-call token expired)
        const refreshToken = body.refreshToken || '';
        if (!refreshToken) {
          return jsonResponse({
            success: false,
            message: 'UNAUTHORIZED: Sesi kadaluarsa dan tidak ada refresh token.',
            authError: true
          });
        }
        
        console.log('[API POST] idToken expired, attempting server-side refresh. Error:', authErr.message);
        const refreshResult = firebaseRefreshToken(refreshToken);
        if (!refreshResult || !refreshResult.success) {
          return jsonResponse({
            success: false,
            message: 'UNAUTHORIZED: Gagal memperbarui sesi. Sesi telah kadaluarsa permanen.',
            authError: true
          });
        }
        
        // Use the newly minted token
        const newIdToken = refreshResult.data.idToken;
        try {
          userAuth = verifyFirebaseIdToken(newIdToken);
          // Set variables to inject new tokens into response later
          body._newIdToken = newIdToken;
          body._newRefreshToken = refreshResult.data.refreshToken;
        } catch (e2) {
          return jsonResponse({
            success: false,
            message: 'UNAUTHORIZED: Sesi baru ditolak.',
            authError: true
          });
        }
      }
      
      // Ambil spreadsheetId dari Firestore
      const userData = firestoreGetUser(userAuth.localId);
      userSpreadsheetId = (userData && userData.spreadsheetId) || '';
      // Cache selama 50 menit (token Firebase expire 60 menit)
      // Gunakan token hash dari token yang valid (bisa jadi token asli atau yang baru di-refresh)
      const validToken = body._newIdToken || idToken;
      const validTokenHash = validToken.substring(validToken.length - 32);
      cache.put('auth_' + validTokenHash, JSON.stringify({ uid: userAuth.localId, ssId: userSpreadsheetId }), 3000);
    }

    // OWNERSHIP GUARD: cek spreadsheetId jika ada di params
    const firstParam = params[0];
    if (firstParam && typeof firstParam === 'string' && firstParam.length >= 30 && firstParam.length <= 60) {
      if (userSpreadsheetId && userSpreadsheetId !== firstParam) {
        return jsonResponse({
          success: false,
          message: 'FORBIDDEN: Anda tidak memiliki akses ke spreadsheet ini.'
        });
      }
    }

    // ═══ PROTECTED DATA ENDPOINTS ═══
    const protectedEndpoints = {
      // Data CRUD
      'fetchMasterData':        () => fetchMasterData(...params),
      'fetchTransactions':      () => fetchTransactions(...params),
      'fetchFullAppData':       () => fetchFullAppData(...params),
      'mutateMasterData':       () => mutateMasterData(...params),
      'appendTransaction':      () => appendTransaction(...params),
      'appendTransactions':     () => appendTransactions(...params),
      'updateTransaction':      () => updateTransaction(...params),
      'deleteTransaction':      () => deleteTransaction(...params),
      // Profile
      'updateUserProfile':      () => updateUserProfile(...params),
      'changeUserPassword':     () => changeUserPassword(...params),
      // AI
      'processAITransaction':   () => processAITransaction(...params),
      // Admin
      'getAdminDashboardData':  () => getAdminDashboardData(...params),
      'generateLicenseKeys':    () => generateLicenseKeys(...params),
      'updateLicenseStatusAdmin': () => updateLicenseStatusAdmin(...params),
    };

    if (protectedEndpoints[action]) {
      let rawResult = protectedEndpoints[action]();
      
      // Inject new tokens if they were refreshed server-side
      if (body._newIdToken) {
        if (typeof rawResult === 'object' && rawResult !== null) {
          rawResult.newIdToken = body._newIdToken;
          rawResult.newRefreshToken = body._newRefreshToken;
        }
      }
      return jsonResponse(rawResult);
    }

    return jsonResponse({ success: false, message: 'Unknown action: ' + action });

  } catch (err) {
    return jsonResponse({ success: false, message: 'Server error: ' + err.message });
  }
}

/**
 * Helper: Membungkus data menjadi JSON response untuk ContentService.
 * @param {Object} data - Object yang akan di-serialize ke JSON
 * @return {TextOutput} Response JSON
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}