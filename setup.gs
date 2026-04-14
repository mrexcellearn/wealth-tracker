/**
 * ==========================================
 * SETUP UTILITIES — Excellearn Wealth Tracker
 * ==========================================
 */

var SETUP_CONFIG_TIMEZONE = 'Asia/Jakarta';

/**
 * TEST FUNCTION: Jalankan ini dulu untuk cek apakah project compile.
 */
function testMe() {
  return "✅ Project compiles! System is online.";
}

/**
 * setupUserDatabaseTemplate()
 * Menyiapkan struktur tab untuk Spreadsheet User (Template).
 */
function setupUserDatabaseTemplate() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- Transactions ---
    var sheetTrx = ss.getSheetByName('Transactions');
    if (!sheetTrx) {
      sheetTrx = ss.insertSheet('Transactions');
      var headers = ['ID', 'Type', 'Date', 'Amount', 'FromAccountID', 'ToAccountID', 'CategoryID', 'Note'];
      sheetTrx.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheetTrx.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#F7941D').setFontColor('white');
      sheetTrx.setFrozenRows(1);
    }

    // --- MasterData ---
    var sheetMD = ss.getSheetByName('MasterData');
    if (!sheetMD) {
      sheetMD = ss.insertSheet('MasterData');
      var headersMD = ['Key', 'Value'];
      sheetMD.getRange(1, 1, 1, headersMD.length).setValues([headersMD]);
      sheetMD.getRange(1, 1, 1, headersMD.length).setFontWeight('bold').setBackground('#7c2d12').setFontColor('white');
      sheetMD.setFrozenRows(1);

      var defaultKeys = [
        ['Accounts', '[]'],
        ['Categories', '[]'],
        ['Budgets', '[]'],
        ['Recurring', '[]'],
        ['Goals', '[]'],
        ['Assets', '[]'],
        ['Debts', '[]'],
        ['AuditLogs', '[]']
      ];
      sheetMD.getRange(2, 1, defaultKeys.length, 2).setValues(defaultKeys);
    }

    SpreadsheetApp.flush();
    return "✅ Success: Struktur template siap di " + ss.getName();
  } catch (err) {
    return "❌ Error Template: " + String(err);
  }
}

/**
 * populateDummyData()
 */
function populateDummyData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetTrx = ss.getSheetByName('Transactions');
    var sheetMD = ss.getSheetByName('MasterData');

    if (!sheetTrx || !sheetMD) {
      throw new Error("Tab 'Transactions' atau 'MasterData' tidak ditemukan.");
    }

    var todayStr = Utilities.formatDate(new Date(), SETUP_CONFIG_TIMEZONE, 'yyyy-MM-dd');
    var lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    var lastMonthYMD = Utilities.formatDate(lastMonth, SETUP_CONFIG_TIMEZONE, 'yyyy-MM-dd');

    var dummyMD = {
      'Accounts': [
        { ID: 'ACC-001', Name: 'BCA Utama', Type: 'Cash & Bank', Balance: 15000000, GoalAllocated: 0, Icon: 'ph-bank' },
        { ID: 'ACC-002', Name: 'Dompet Tunai', Type: 'Cash & Bank', Balance: 500000, GoalAllocated: 0, Icon: 'ph-wallet' },
        { ID: 'ACC-003', Name: 'Bibit Reksadana', Type: 'Investment', Balance: 25000000, GoalAllocated: 15000000, Icon: 'ph-chart-line' }
      ],
      'Categories': [
        { ID: 'CAT-001', Name: 'Makan & Minum', Type: 'Expense', Icon: 'ph-fork-knife' },
        { ID: 'CAT-002', Name: 'Transportasi', Type: 'Expense', Icon: 'ph-car' },
        { ID: 'CAT-003', Name: 'Gaji Pokok', Type: 'Income', Icon: 'ph-money' }
      ],
      'Budgets': [
        { ID: 'BUD-001', Name: 'Makan Bulanan', CategoryID: 'CAT-001', Amount: 3000000, Period: 'Monthly', Mode: 'Cumulative', RolloverType: 'Both', StartDate: lastMonthYMD, LinkedCategories: ['CAT-001'] }
      ],
      'Goals': [
        { ID: 'GOL-001', Name: 'Dana Darurat', TargetAmount: 50000000, AllocatedAmount: 15000000, Deadline: '2026-12-31', LinkedAccountID: 'ACC-003' }
      ],
      'Assets': [
        { ID: 'AST-001', Name: 'MacBook Pro', Date: '2024-01-01', OriginalValue: 25000000, MarketValue: 22000000, LinkedAccountID: 'ACC-001' }
      ],
      'Debts': [
        { ID: 'DBT-001', Name: 'Kartu Kredit', OriginalValue: 5000000, FinalValue: 5000000, PaidAmount: 3000000, Deadline: '2026-04-10', LinkedAccountID: 'ACC-001', AffectsAccountBalance: true }
      ],
      'Recurring': [],
      'AuditLogs': []
    };

    Object.keys(dummyMD).forEach(function(key) {
      mutateMasterDataInternal(ss, key, dummyMD[key]);
    });

    var dummyTrx = [
      ['TRX-001', 'Income', todayStr, 10000000, '', 'ACC-001', 'CAT-003', 'Gaji Maret'],
      ['TRX-002', 'Expense', todayStr, 50000, 'ACC-002', '', 'CAT-001', 'Beli Kopi'],
      ['TRX-003', 'Transfer', todayStr, 1000000, 'ACC-001', 'ACC-002', '', 'Isi Dompet']
    ];

    if (sheetTrx.getLastRow() > 1) {
      sheetTrx.getRange(2, 1, sheetTrx.getLastRow() - 1, sheetTrx.getLastColumn()).clearContent();
    }
    sheetTrx.getRange(2, 1, dummyTrx.length, dummyTrx[0].length).setValues(dummyTrx);

    SpreadsheetApp.flush();
    return "🚀 Berhasil! Dummy data telah masuk.";
  } catch (err) {
    return "❌ Gagal: " + String(err);
  }
}

function mutateMasterDataInternal(ss, key, payload) {
  var sheet = ss.getSheetByName('MasterData');
  var data = sheet.getDataRange().getValues();
  var rowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(key).trim()) {
      rowIdx = i + 1;
      break;
    }
  }
  var jsonString = JSON.stringify(payload);
  if (rowIdx > 0) {
    sheet.getRange(rowIdx, 2).setValue(jsonString);
  } else {
    sheet.appendRow([key, jsonString]);
  }
}

/**
 * Initialize Firebase Collections (Admin Only)
 */
/**
 * Initialize Firebase Collections (Admin Only)
 */
function setupFirebaseCollections(adminUid, demoUid) {
  try {
    var props = PropertiesService.getScriptProperties();
    var pId = props.getProperty('FIREBASE_PROJECT_ID');
    var aKey = props.getProperty('FIREBASE_API_KEY');

    if (!pId || !aKey) return "❌ Error: API Key/Project ID kosong.";

    var baseUrl = "https://firestore.googleapis.com/v1/projects/" + pId + "/databases/(default)/documents";

    var writeDoc = function(col, id, fields) {
      if (!id) return false;
      var url = baseUrl + "/" + col + "/" + id + "?key=" + aKey;
      // Gunakan PATCH agar bisa create atau update sekaligus (Upsert)
      var options = {
        method: 'patch',
        contentType: 'application/json',
        payload: JSON.stringify({ fields: fields }),
        muteHttpExceptions: true
      };
      var res = UrlFetchApp.fetch(url, options);
      return res.getResponseCode() === 200;
    };

    var adminEmail = "mr.excellearn@gmail.com";
    var aOk = true;
    if (adminUid) {
      aOk = writeDoc('users', adminUid, {
        email: { stringValue: adminEmail },
        fullName: { stringValue: "Admin Excellearn" },
        aiPromptCount: { integerValue: "0" },
        role: { stringValue: "admin" },
        level: { stringValue: "pro" },
        createdAt: { stringValue: new Date().toLocaleString() }
      });
    }

    var demoEmail = "demo@excellearn.online";
    var dOk = true;
    if (demoUid) {
      dOk = writeDoc('users', demoUid, {
        email: { stringValue: demoEmail },
        fullName: { stringValue: "Demo Account" },
        spreadsheetId: { stringValue: "160Iuz_nVydPUBIggM8f-LhT3t6JFq3FLDydnXRj5q4" },
        level: { stringValue: "basic" },
        createdAt: { stringValue: new Date().toLocaleString() }
      });
    }

    var lOk = writeDoc('licenses', 'EXCELLEARN-DEMO-KODE', {
      key: { stringValue: 'EXCELLEARN-DEMO-KODE' },
      status: { stringValue: 'active' },
      createdAt: { stringValue: new Date().toLocaleString() }
    });

    if (aOk && dOk && lOk) return "✅ Success: Firebase Initialized!";
    return "⚠️ Partial Success. Check logs.";
  } catch (err) {
    return "❌ Fatal: " + String(err);
  }
}


/**
 * CREATE ADMIN & DEMO USERS (Auth + Firestore)
 * Jalankan ini jika ingin mereset/membuat akun Admin & Demo dari nol.
 */
function createInitialUsers() {
  try {
    const adminEmail = "mr.excellearn@gmail.com";
    const adminPass = "12345678"; 
    
    const demoEmail = "demo@excellearn.online";
    const demoPass = "12345678"; 
    
    console.log("--- Memulai Pembuatan Akun Awal ---");

    let adminUid = "";
    let demoUid = "";

    // 1. Registrasi Auth & Ambil UID
    try {
      const res = firebaseSignUp(adminEmail, adminPass);
      adminUid = res.localId;
      console.log("✅ Auth Admin berhasil dibuat (UID: " + adminUid + ")");
    } catch(e) {
      if (e.message.includes("EMAIL_EXISTS")) {
        try {
          const res = firebaseSignIn(adminEmail, adminPass);
          adminUid = res.localId;
          console.log("ℹ️ Admin sudah ada, UID didapat dari SignIn (UID: " + adminUid + ")");
        } catch(e2) {
          console.error("❌ Gagal mendapatkan UID Admin eksisting: " + e2.message);
        }
      } else {
        console.error("❌ Auth Admin error: " + e.message);
      }
    }

    try {
      const res = firebaseSignUp(demoEmail, demoPass);
      demoUid = res.localId;
      console.log("✅ Auth Demo berhasil dibuat (UID: " + demoUid + ")");
    } catch(e) {
       if (e.message.includes("EMAIL_EXISTS")) {
        try {
          const res = firebaseSignIn(demoEmail, demoPass);
          demoUid = res.localId;
           console.log("ℹ️ Demo sudah ada, UID didapat dari SignIn (UID: " + demoUid + ")");
        } catch(e2) {
          console.error("❌ Gagal mendapatkan UID Demo eksisting: " + e2.message);
        }
      } else {
        console.error("❌ Auth Demo error: " + e.message);
      }
    }

    // 2. Inisialisasi Firestore Data menggunakan UID
    const result = setupFirebaseCollections(adminUid, demoUid);
    console.log("--- Proses Firestore Selesai ---");
    
    return "🚀 Selesai!\n\n" + 
           "Login Akun Admin:\n- Email: " + adminEmail + "\n- Pass: " + adminPass + "\n\n" +
           "Login Akun Demo:\n- Email: " + demoEmail + "\n- Pass: " + demoPass + "\n\n" +
           "Detail Firestore: " + result;

  } catch (err) {
    return "❌ Error Fatal: " + err.message;
  }
}

/**
 * DEBUG UTILITY: Cek apakah email terdaftar di Firebase Auth (via API Key saat ini).
 * Jalankan ini di Apps Script Editor untuk melihat status aslinya.
 */
function debugCheckAuth(email) {
  const emailToCheck = email || "demo@excellearn.online";
  const { projectId, apiKey } = getFirebaseConfig();
  
  console.log("--- DEBUG FIREBASE AUTH ---");
  console.log("Project ID: " + projectId);
  console.log("API Key: " + apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 3));
  console.log("Checking Email: " + emailToCheck);
  
  try {
    // Kita tes dengan mencoba 'signIn' tapi dengan password asal
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ email: emailToCheck, password: 'RANDOM_PASSWORD_TEST', returnSecureToken: true }),
      muteHttpExceptions: true
    });
    const data = JSON.parse(res.getContentText());
    
    if (data.error) {
      if (data.error.message === 'EMAIL_NOT_FOUND') {
        console.log("✅ HASIL: Email TIDAK ADA di Firebase Auth.");
        return "✅ Hasil: Email '" + emailToCheck + "' TIDAK ADA di Auth. Silakan register ulang.";
      } else if (data.error.message === 'EMAIL_EXISTS' || data.error.message === 'INVALID_PASSWORD') {
        // INVALID_PASSWORD berarti emailnya ada tapi password salah
        // EMAIL_EXISTS biasanya keluar di signUp, tapi di signInWithPassword kalo email ada tapi password ngasal dia keluar INVALID_PASSWORD
        console.log("❌ HASIL: Email ADA di Firebase Auth.");
        return "❌ Hasil: Email '" + emailToCheck + "' MASIH ADA di Auth. Harap hapus manual di Firebase Console.";
      } else {
        console.log("⚠️ Status: " + data.error.message);
        return "⚠️ Info: " + data.error.message;
      }
    }
    
    console.log("❓ Data unexpected: " + JSON.stringify(data));
    return "❓ Unexpected response (Mungkin password benar?).";
    
  } catch(e) {
    return "❌ Fatal: " + e.message;
  }
}

