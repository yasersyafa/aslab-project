// ============================================================
// KONFIGURASI
// ============================================================
var CONFIG = {
  SPREADSHEET_ID: "1IfQvm2LjTJxDEE4lI49ZBSiG_hhAH1PjyTJgdBA4Hwc",
  SHEET_PEMINJAMAN: "Peminjaman",
  SHEET_ASLAB: "Jadwal Aslab",
  SHEET_USERS: "Users",
  TELEGRAM_BOT_TOKEN: "7108821821:AAHS_RoEcjtQSWFX1o_2yRlnrUV2cu6rgj4",
  TELEGRAM_CS_CHAT_ID: "-4854968926",
  EXEC_URL:
    "https://script.google.com/macros/s/AKfycbxqjFDARTGtHRtViZPSUiKReUlTaqM7UyQV-qjlM5NdVXdhPPPCvg1zbTLqY2xKTu8f/exec",
};

// ============================================================
// ENTRY POINT
// ============================================================
function doPost(e) {
  try {
    // Dari React frontend
    if (e.parameter && e.parameter.payload) {
      var body = JSON.parse(e.parameter.payload);
      var bookingId = body.bookingId || generateBookingId();
      saveToSheet(body, bookingId, new Date());
      sendNotifToAslab(body, bookingId);
      return jsonResponse({ status: "success", bookingId: bookingId });
    }

    // Dari Telegram webhook — langsung proses, return 200 cepat
    if (e.postData && e.postData.contents) {
      handleTelegramUpdate(e.postData.contents);
      return jsonResponse({ status: "ok" });
    }
  } catch (err) {
    Logger.log("doPost error: " + err.message);
  }
  return jsonResponse({ status: "ok" });
}

function doGet() {
  return jsonResponse({ status: "ok", message: "GAS is running" });
}

// ============================================================
// HANDLE UPDATE TELEGRAM
// ============================================================
function handleTelegramUpdate(rawBody) {
  var update = JSON.parse(rawBody);

  // ── Cegah duplicate ──
  var updateId = String(update.update_id);
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty("processed_" + updateId)) {
    Logger.log("SKIP duplicate update_id: " + updateId);
    return;
  }
  props.setProperty("processed_" + updateId, "1");
  cleanOldProperties(props, updateId);

  Logger.log("UPDATE: " + rawBody.substring(0, 300));

  // Pesan biasa
  if (update.message) {
    var msg = update.message;
    var text = msg.text || "";
    var chatId = String(msg.chat.id);
    var firstName =
      msg.from && msg.from.first_name ? msg.from.first_name : "User";

    if (text.indexOf("/start") === 0) {
      var parts = text.split(" ");
      var token = parts.length > 1 ? parts[1] : null; // ambil token kalau ada
      handleStart(chatId, firstName, token);
    }
    return;
  }

  // Callback approve/decline
  if (update.callback_query) {
    var query = update.callback_query;
    var cbData = query.data;
    var groupChatId = String(query.message.chat.id);
    var messageId = query.message.message_id;
    var aslabName =
      query.from.first_name +
      (query.from.last_name ? " " + query.from.last_name : "");
    var idx = cbData.indexOf("_");
    var action = cbData.substring(0, idx);
    var bookingId = cbData.substring(idx + 1);

    if (action === "approve") {
      processApprove(bookingId, aslabName, groupChatId, messageId, query.id);
    } else if (action === "decline") {
      processDecline(bookingId, aslabName, groupChatId, messageId, query.id);
    }
  }
}
function cleanOldProperties(props, currentId) {
  try {
    var all = props.getKeys();
    var keys = all.filter(function (k) {
      return k.indexOf("processed_") === 0;
    });
    if (keys.length > 20) {
      // Hapus yang paling lama
      keys.sort();
      for (var i = 0; i < keys.length - 20; i++) {
        props.deleteProperty(keys[i]);
      }
    }
  } catch (e) {
    Logger.log("cleanOldProperties error: " + e.message);
  }
}
// ============================================================
// /start — simpan Telegram ID, tampilkan ke user
// ============================================================
// Handle /start dengan token
function handleStart(chatId, firstName, token) {
  saveUserById(chatId, firstName, token);
  callTelegramAPI("sendMessage", {
    chat_id: chatId,
    text:
      "Halo <b>" +
      firstName +
      "</b>! 👋\n\n" +
      "✅ Akun Telegram kamu berhasil dihubungkan ke form peminjaman.\n\n" +
      "Kamu akan menerima notifikasi status peminjaman di sini.",
    parse_mode: "HTML",
  });
}

function saveUserById(chatId, firstName, token) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_USERS);
    sheet.appendRow(["Telegram ID", "Nama", "Token", "Terdaftar"]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#FF98AD");
  }

  var data = sheet.getDataRange().getValues();
  var now = Utilities.formatDate(
    new Date(),
    "Asia/Jakarta",
    "dd/MM/yyyy HH:mm",
  );

  // Update kalau chat_id sudah ada
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(chatId)) {
      sheet.getRange(i + 1, 2).setValue(firstName);
      if (token) sheet.getRange(i + 1, 3).setValue(token);
      sheet.getRange(i + 1, 4).setValue(now);
      SpreadsheetApp.flush();
      return;
    }
  }
  // Tambah baru
  sheet.appendRow([String(chatId), firstName, token || "", now]);
  SpreadsheetApp.flush();
}

// Endpoint: cek apakah token sudah terhubung ke chat_id
// Dipanggil dari React via polling
function checkToken(token) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2]) === String(token)) {
      return String(data[i][0]); // return chat_id
    }
  }
  return null;
}

// ============================================================
// SIMPAN USER KE SHEET USERS
// ============================================================
function saveUserById(chatId, firstName) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_USERS);
    sheet.appendRow(["Telegram ID", "Nama", "Terdaftar"]);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#FF98AD");
  }

  var data = sheet.getDataRange().getValues();
  var now = Utilities.formatDate(
    new Date(),
    "Asia/Jakarta",
    "dd/MM/yyyy HH:mm",
  );

  // Sudah ada — update saja
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(chatId)) {
      sheet.getRange(i + 1, 2).setValue(firstName);
      sheet.getRange(i + 1, 3).setValue(now);
      SpreadsheetApp.flush();
      Logger.log("saveUserById: UPDATED " + chatId);
      return;
    }
  }

  // Belum ada — tambah baru
  sheet.appendRow([String(chatId), firstName, now]);
  SpreadsheetApp.flush();
  Logger.log("saveUserById: APPENDED " + chatId);
}

// ============================================================
// SIMPAN PEMINJAMAN KE SHEET
// Kolom F sekarang = Telegram ID (bukan nomor HP)
// ============================================================
function saveToSheet(data, bookingId, timestamp) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_PEMINJAMAN);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "ID",
      "Timestamp",
      "Nama",
      "Kelas",
      "Angkatan",
      "Telegram ID",
      "Jenis",
      "Item",
      "Tanggal",
      "Jam Mulai",
      "Jam Selesai",
      "Keperluan",
      "Status",
      "Aslab PJ",
      "HP Aslab",
      "Catatan",
    ]);
    sheet.getRange(1, 1, 1, 16).setFontWeight("bold").setBackground("#FF98AD");
  }

  sheet.appendRow([
    bookingId,
    Utilities.formatDate(timestamp, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss"),
    data.name,
    "GT " + data.studentClass,
    data.studentYear,
    String(data.telegramId), // kolom F = Telegram ID
    data.borrowingType,
    data.item,
    data.borrowDate,
    data.borrowTime,
    data.returnTime,
    data.purpose,
    "WAITING",
    "",
    "",
    "",
  ]);
  SpreadsheetApp.flush();
}
function doGet(e) {
  // Polling cek token dari React
  if (e.parameter && e.parameter.checkToken) {
    var chatId = checkToken(e.parameter.checkToken);
    return jsonResponse({ connected: !!chatId, chatId: chatId });
  }
  return jsonResponse({ status: "ok", message: "GAS is running" });
}

// ============================================================
// NOTIFIKASI KE GRUP ASLAB
// ============================================================
function sendNotifToAslab(data, bookingId) {
  var msg =
    "🔔 <b>PERMOHONAN PEMINJAMAN BARU</b>\n\n" +
    "📋 ID: <code>" +
    bookingId +
    "</code>\n" +
    "👤 Nama: <b>" +
    data.name +
    "</b>\n" +
    "🎓 Kelas: GT " +
    data.studentClass +
    " " +
    data.studentYear +
    "\n" +
    "🆔 Telegram ID: <code>" +
    data.telegramId +
    "</code>\n\n" +
    "📦 Jenis: <b>" +
    data.borrowingType +
    "</b>\n" +
    "🏷️ Item: <b>" +
    data.item +
    "</b>\n" +
    "📅 Tanggal: " +
    formatDate(data.borrowDate) +
    "\n" +
    "⏰ Waktu: " +
    data.borrowTime +
    " – " +
    data.returnTime +
    "\n\n" +
    "💬 Keperluan:\n" +
    data.purpose;

  callTelegramAPI("sendMessage", {
    chat_id: CONFIG.TELEGRAM_CS_CHAT_ID,
    text: msg,
    parse_mode: "HTML",
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: "approve_" + bookingId },
          { text: "❌ Decline", callback_data: "decline_" + bookingId },
        ],
      ],
    }),
  });
}

// ============================================================
// APPROVE
// ============================================================
function processApprove(
  bookingId,
  aslabName,
  groupChatId,
  messageId,
  callbackQueryId,
) {
  var row = findRowByBookingId(bookingId);
  if (!row) {
    callTelegramAPI("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: "❌ Booking tidak ditemukan",
      show_alert: true,
    });
    return;
  }

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_PEMINJAMAN);
  var rowData = sheet.getRange(row, 1, 1, 16).getValues()[0];

  var telegramId = String(rowData[5]); // kolom F = Telegram ID
  var borrowDate = rowData[8];
  var borrowTime = String(rowData[9]);
  var returnTime = String(rowData[10]);
  var item = String(rowData[7]);
  var peminjamName = String(rowData[2]);
  var status = String(rowData[12]);

  if (status === "APPROVED" || status === "DECLINED") {
    callTelegramAPI("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: "⚠️ Sudah diproses: " + status,
      show_alert: true,
    });
    return;
  }

  var aslabPJ = getAslabPJ(borrowDate);
  var aslabNama = aslabPJ ? aslabPJ.nama : aslabName;
  var aslabHP = aslabPJ ? aslabPJ.phone : "-";

  sheet.getRange(row, 13).setValue("APPROVED").setBackground("#90EE90");
  sheet.getRange(row, 14).setValue(aslabNama);
  sheet.getRange(row, 15).setValue(aslabHP);

  var dateFormatted = formatDate(borrowDate);
  var msgPeminjam =
    "✅ <b>PERMOHONAN DISETUJUI!</b>\n\n" +
    "Halo <b>" +
    peminjamName +
    "</b>!\n\n" +
    "📋 ID: <code>" +
    bookingId +
    "</code>\n" +
    "🏷️ Item: <b>" +
    item +
    "</b>\n" +
    "📅 Tanggal: " +
    dateFormatted +
    "\n" +
    "⏰ Waktu: " +
    borrowTime +
    " – " +
    returnTime +
    "\n\n" +
    "👤 <b>Aslab Penanggung Jawab:</b>\n" +
    "• Nama: <b>" +
    aslabNama +
    "</b>\n" +
    "• HP: " +
    aslabHP +
    "\n\n" +
    "Silakan konfirmasi ke aslab PJ sebelum menggunakan. Terima kasih! 🙏";

  var sent = sendToPeminjam(telegramId, msgPeminjam);

  callTelegramAPI("editMessageText", {
    chat_id: groupChatId,
    message_id: messageId,
    text:
      "✅ <b>[APPROVED]</b> — <code>" +
      bookingId +
      "</code>\n" +
      "👤 " +
      peminjamName +
      " | 🏷️ " +
      item +
      "\n" +
      "📅 " +
      dateFormatted +
      " | " +
      borrowTime +
      " – " +
      returnTime +
      "\n\n" +
      "Disetujui: <b>" +
      aslabName +
      "</b> | PJ: <b>" +
      aslabNama +
      "</b>\n" +
      (sent ? "📨 Notif terkirim" : "⚠️ Peminjam belum /start bot"),
    parse_mode: "HTML",
  });
  callTelegramAPI("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: "✅ Approved!",
  });
}

// ============================================================
// DECLINE
// ============================================================
function processDecline(
  bookingId,
  aslabName,
  groupChatId,
  messageId,
  callbackQueryId,
) {
  var row = findRowByBookingId(bookingId);
  if (!row) {
    callTelegramAPI("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: "❌ Booking tidak ditemukan",
      show_alert: true,
    });
    return;
  }

  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_PEMINJAMAN);
  var rowData = sheet.getRange(row, 1, 1, 16).getValues()[0];

  var telegramId = String(rowData[5]); // kolom F = Telegram ID
  var peminjamName = String(rowData[2]);
  var item = String(rowData[7]);
  var status = String(rowData[12]);

  if (status === "APPROVED" || status === "DECLINED") {
    callTelegramAPI("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: "⚠️ Sudah diproses: " + status,
      show_alert: true,
    });
    return;
  }

  sheet.getRange(row, 13).setValue("DECLINED").setBackground("#FFB6B6");

  var msgPeminjam =
    "❌ <b>PERMOHONAN DITOLAK</b>\n\n" +
    "Halo <b>" +
    peminjamName +
    "</b>,\n\n" +
    "Maaf, peminjaman <b>" +
    item +
    "</b> tidak dapat disetujui.\n\n" +
    "📋 ID: <code>" +
    bookingId +
    "</code>\n\n" +
    "Hubungi aslab atau ajukan permohonan baru. 🙏";

  var sent = sendToPeminjam(telegramId, msgPeminjam);

  callTelegramAPI("editMessageText", {
    chat_id: groupChatId,
    message_id: messageId,
    text:
      "❌ <b>[DECLINED]</b> — <code>" +
      bookingId +
      "</code>\n" +
      "👤 " +
      peminjamName +
      " | 🏷️ " +
      item +
      "\n\n" +
      "Ditolak: <b>" +
      aslabName +
      "</b>\n" +
      (sent ? "📨 Notif terkirim" : "⚠️ Peminjam belum /start bot"),
    parse_mode: "HTML",
  });
  callTelegramAPI("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: "❌ Declined.",
  });
}

// ============================================================
// KIRIM PESAN KE PEMINJAM — langsung pakai Telegram ID
// ============================================================
function sendToPeminjam(telegramId, message) {
  if (!telegramId || telegramId === "" || telegramId === "-") {
    Logger.log("sendToPeminjam: telegramId kosong");
    return false;
  }
  var result = callTelegramAPI("sendMessage", {
    chat_id: telegramId,
    text: message,
    parse_mode: "HTML",
  });
  var ok = result && result.ok;
  Logger.log(
    "sendToPeminjam(" + telegramId + "): " + (ok ? "✅ OK" : "❌ GAGAL"),
  );
  return ok;
}

// ============================================================
// JADWAL ASLAB PJ
// ============================================================
function getAslabPJ(borrowDate) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CONFIG.SHEET_ASLAB);
    if (!sheet) return null;
    var data = sheet.getDataRange().getValues();
    var targetStr =
      borrowDate instanceof Date
        ? Utilities.formatDate(borrowDate, "Asia/Jakarta", "dd/MM/yyyy")
        : String(borrowDate);
    for (var i = 1; i < data.length; i++) {
      var d = data[i][0];
      var s =
        d instanceof Date
          ? Utilities.formatDate(d, "Asia/Jakarta", "dd/MM/yyyy")
          : String(d);
      if (s === targetStr)
        return { nama: String(data[i][1]), phone: String(data[i][2]) };
    }
  } catch (err) {
    Logger.log("getAslabPJ error: " + err.message);
  }
  return null;
}

// ============================================================
// HELPERS
// ============================================================
function findRowByBookingId(id) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var data = ss
    .getSheetByName(CONFIG.SHEET_PEMINJAMAN)
    .getDataRange()
    .getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) return i + 1;
  }
  return null;
}

function generateBookingId() {
  return (
    "BOOK" +
    Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd") +
    Math.floor(Math.random() * 900 + 100)
  );
}

function formatDate(d) {
  try {
    return Utilities.formatDate(
      new Date(d),
      "Asia/Jakarta",
      "EEEE, dd MMMM yyyy",
    );
  } catch (e) {
    return String(d);
  }
}

function callTelegramAPI(method, payload) {
  var res = UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + CONFIG.TELEGRAM_BOT_TOKEN + "/" + method,
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    },
  );
  var result = res.getContentText();
  Logger.log("TG [" + method + "]: " + result.substring(0, 200));
  return JSON.parse(result);
}

function jsonResponse(data) {
  var out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

// ============================================================
// SETUP & DEBUG
// ============================================================
function setupWebhook() {
  var result = callTelegramAPI("setWebhook", {
    url: CONFIG.EXEC_URL,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  Logger.log("setupWebhook: " + JSON.stringify(result));
}

function checkWebhook() {
  Logger.log(JSON.stringify(callTelegramAPI("getWebhookInfo", {})));
}

function debugUsers() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  if (!sheet) {
    Logger.log("Sheet Users tidak ada");
    return;
  }
  var data = sheet.getDataRange().getValues();
  Logger.log("Users (" + data.length + " rows):");
  for (var i = 0; i < data.length; i++) {
    Logger.log("  [" + i + "] " + JSON.stringify(data[i]));
  }
}

function debugApproveManual() {
  var bookingId = "ISIbookingiddisini";
  var row = findRowByBookingId(bookingId);
  if (!row) {
    Logger.log("❌ Booking tidak ditemukan");
    return;
  }
  var rowData = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    .getSheetByName(CONFIG.SHEET_PEMINJAMAN)
    .getRange(row, 1, 1, 16)
    .getValues()[0];
  Logger.log("Telegram ID di sheet: " + rowData[5]);
  var sent = sendToPeminjam(
    String(rowData[5]),
    "🧪 <b>TEST</b> — notif approve untuk booking <code>" +
      bookingId +
      "</code>",
  );
  Logger.log("Terkirim: " + sent);
}
