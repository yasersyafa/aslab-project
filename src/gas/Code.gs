// ============================================================
// BOT TELEGRAM PEMINJAMAN LAB & BARANG
// Google Apps Script
// ============================================================

// ==================== KONFIGURASI ====================
const CONFIG = {
  BOT_TOKEN: "7108821821:AAHS_RoEcjtQSWFX1o_2yRlnrUV2cu6rgj4",
  GROUP_ASLAB_ID: "-4854968926", // Chat ID grup aslab (misal: -1001234567890)
  SPREADSHEET_ID: "1IfQvm2LjTJxDEE4lI49ZBSiG_hhAH1PjyTJgdBA4Hwc", // ID Google Spreadsheet
  WEBHOOK_URL:
    "https://script.google.com/macros/s/AKfycbxmRxztZsfXBRKGRBGB5PwhanIKa45mOyLISacQmRqrVjcNSRQn8Bwx77-VYpATQIQg/exec", // Deploy → Manage Deployments → copy URL ending in /exec (NOT /dev)

  // Nama sheet di spreadsheet
  SHEET_PEMINJAMAN: "Peminjaman",
  SHEET_PENGEMBALIAN: "Pengembalian",

  // Daftar Lab yang tersedia
  DAFTAR_LAB: [
    "Lab Komputer 1",
    "Lab Komputer 2",
    "Lab Jaringan",
    "Lab Multimedia",
    "Lab Elektronika",
    "Lab Fisika",
  ],

  // Daftar Barang yang tersedia
  DAFTAR_BARANG: [
    "Proyektor",
    "Laptop",
    "Kabel HDMI",
    "Extension Cord",
    "Mikrofon",
    "Kamera",
    "Tripod",
    "Speaker Portable",
  ],
};

const BASE_URL = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}`;

// ==================== ENTRY POINT ====================
function doPost(e) {
  try {
    const update = JSON.parse(e.postData.contents);

    const props = PropertiesService.getScriptProperties();
    const key = "u_" + update.update_id;
    if (props.getProperty(key)) {
      Logger.log("SKIP duplicate update_id: " + update.update_id);
      return ContentService.createTextOutput("OK").setMimeType(
        ContentService.MimeType.TEXT,
      );
    }
    props.setProperty(key, "1");
    cleanOldUpdateKeys(props, update.update_id);

    handleUpdate(update);
  } catch (err) {
    Logger.log("Error doPost: " + err.toString());
  }
  return ContentService.createTextOutput("OK").setMimeType(
    ContentService.MimeType.TEXT,
  );
}

function cleanOldUpdateKeys(props, currentId) {
  try {
    const keys = props.getKeys().filter((k) => k.startsWith("u_"));
    if (keys.length < 50) return;
    keys
      .map((k) => ({ k, id: parseInt(k.slice(2), 10) }))
      .filter(({ id }) => currentId - id > 200)
      .forEach(({ k }) => props.deleteProperty(k));
  } catch (_) {}
}

function handleUpdate(update) {
  // Handle callback query (tombol inline)
  if (update.callback_query) {
    handleCallbackQuery(update.callback_query);
    return;
  }

  // Hanya proses update.message — abaikan edited_message, channel_post, dll
  if (!update.message) return;

  const msg = update.message;

  // Abaikan jika tidak ada pengirim (forward dari channel, dll)
  if (!msg.from) return;

  // Handle pesan biasa
  const chatId = msg.chat.id;
  const text = msg.text || "";
  const userId = msg.from.id;
  const userName =
    msg.from.first_name + (msg.from.last_name ? " " + msg.from.last_name : "");

  // Cek apakah user sedang dalam sesi aktif
  const session = getSession(userId);

  // Handle foto untuk pengembalian
  if (msg.photo && session && session.step === "pengembalian_foto") {
    handleFotoPengembalian(msg, session, chatId, userId, userName);
    return;
  }

  // Handle command
  if (text.startsWith("/")) {
    const command = text.split(" ")[0].toLowerCase().split("@")[0];
    switch (command) {
      case "/start":
        handleStart(chatId, userName);
        break;
      case "/pinjam":
        handlePinjam(chatId, userId, userName);
        break;
      case "/status":
        handleStatus(chatId, userId);
        break;
      case "/pengembalian":
        handlePengembalian(chatId, userId, userName);
        break;
      default:
        sendMessage(
          chatId,
          "❓ Command tidak dikenal. Ketik /start untuk melihat daftar command.",
        );
    }
    return;
  }

  // Handle input dari sesi aktif
  if (session) {
    handleSessionInput(chatId, userId, userName, text, session);
  }
}

// ==================== COMMAND HANDLERS ====================

function handleStart(chatId, userName) {
  const text =
    `👋 Halo, *${escapeMarkdown(userName)}*!\n\n` +
    `Selamat datang di *Bot Peminjaman Lab & Barang* 🏫\n\n` +
    `Berikut adalah daftar command yang tersedia:\n\n` +
    `📌 /pinjam — Mengajukan peminjaman lab atau barang\n` +
    `📋 /status — Cek status peminjaman Anda\n` +
    `🔄 /pengembalian — Laporan pengembalian lab/barang\n` +
    `🤖 /start — Tampilkan pesan ini kembali\n\n` +
    `_Silakan pilih command di atas untuk memulai._`;

  sendMessage(chatId, text, { parse_mode: "Markdown" });
}

function handlePinjam(chatId, userId, userName) {
  // Hapus sesi lama jika ada
  deleteSession(userId);

  // Simpan sesi baru
  setSession(userId, {
    step: "pilih_jenis",
    chatId: chatId,
    userName: userName,
    data: {},
  });

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🏫 Lab", callback_data: "jenis_lab" },
        { text: "📦 Barang", callback_data: "jenis_barang" },
      ],
    ],
  };

  sendMessage(chatId, "📝 *Form Peminjaman*\n\nAnda ingin meminjam apa?", {
    parse_mode: "Markdown",
    reply_markup: JSON.stringify(keyboard),
  });
}

function handleStatus(chatId, userId) {
  const sheet = getSheet(CONFIG.SHEET_PEMINJAMAN);
  const data = sheet.getDataRange().getValues();

  const userIdStr = userId.toString();
  let results = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[2] && row[2].toString() === userIdStr) {
      const id = row[0];
      const jenisItem = row[4]; // lab/barang
      const namaItem = row[5]; // nama lab/barang
      const tglPinjam = row[10];
      const statusPinjam = row[14];
      const statusKembali = row[15];

      let statusLabel = "";
      if (statusPinjam === "waiting") {
        statusLabel = "⏳ Menunggu Persetujuan Aslab";
      } else if (statusPinjam === "approved") {
        if (statusKembali === "returned") {
          statusLabel = "✅ Selesai (Sudah Dikembalikan)";
        } else if (statusKembali === "waiting_return") {
          statusLabel = "🔄 Menunggu Konfirmasi Pengembalian";
        } else {
          statusLabel = "✅ Disetujui — Menunggu Pengembalian";
        }
      } else if (statusPinjam === "declined") {
        statusLabel = "❌ Ditolak oleh Aslab";
      }

      results.push(
        `🆔 ID: \`${id}\`\n` +
          `📌 ${jenisItem === "lab" ? "Lab" : "Barang"}: ${namaItem}\n` +
          `📅 Tanggal: ${tglPinjam}\n` +
          `📊 Status: ${statusLabel}`,
      );
    }
  }

  if (results.length === 0) {
    sendMessage(chatId, "📋 Anda belum memiliki riwayat peminjaman.");
  } else {
    const text =
      `📋 *Status Peminjaman Anda:*\n\n` +
      results.join("\n\n─────────────\n\n");
    sendMessage(chatId, text, { parse_mode: "Markdown" });
  }
}

function handlePengembalian(chatId, userId, userName) {
  deleteSession(userId);
  setSession(userId, {
    step: "pengembalian_id",
    chatId: chatId,
    userName: userName,
    data: {},
  });

  sendMessage(
    chatId,
    "🔄 *Form Pengembalian*\n\nSilakan masukkan *ID Peminjaman* Anda:\n_(Gunakan /status untuk melihat ID peminjaman Anda)_",
    { parse_mode: "Markdown" },
  );
}

// ==================== SESSION INPUT HANDLER ====================

function handleSessionInput(chatId, userId, userName, text, session) {
  const step = session.step;

  // Alur pinjam
  if (step === "input_nama") {
    session.data.nama = text;
    session.step = "input_kelas";
    setSession(userId, session);
    sendMessage(chatId, "📚 Masukkan *Kelas* Anda:", {
      parse_mode: "Markdown",
    });
  } else if (step === "input_kelas") {
    session.data.kelas = text;
    session.step = "input_angkatan";
    setSession(userId, session);
    sendMessage(chatId, "🎓 Masukkan *Angkatan* Anda (contoh: 2022):", {
      parse_mode: "Markdown",
    });
  } else if (step === "input_angkatan") {
    session.data.angkatan = text;
    session.step = "input_nohp";
    setSession(userId, session);
    sendMessage(chatId, "📱 Masukkan *No HP* Anda:", {
      parse_mode: "Markdown",
    });
  } else if (step === "input_nohp") {
    session.data.noHp = text;
    session.step = "input_tanggal";
    setSession(userId, session);
    sendMessage(
      chatId,
      "📅 Masukkan *Tanggal Peminjaman* (contoh: 27/04/2025):",
      { parse_mode: "Markdown" },
    );
  } else if (step === "input_tanggal") {
    session.data.tanggal = text;
    session.step = "input_jam_mulai";
    setSession(userId, session);
    sendMessage(chatId, "🕐 Masukkan *Jam Mulai* peminjaman (contoh: 08:00):", {
      parse_mode: "Markdown",
    });
  } else if (step === "input_jam_mulai") {
    session.data.jamMulai = text;
    session.step = "input_jam_selesai";
    setSession(userId, session);
    sendMessage(
      chatId,
      "🕕 Masukkan *Jam Selesai* peminjaman (contoh: 12:00):",
      { parse_mode: "Markdown" },
    );
  } else if (step === "input_jam_selesai") {
    session.data.jamSelesai = text;
    session.step = "input_keterangan";
    setSession(userId, session);
    sendMessage(chatId, "📝 Masukkan *Keterangan / Keperluan* peminjaman:", {
      parse_mode: "Markdown",
    });
  } else if (step === "input_keterangan") {
    session.data.keterangan = text;
    session.step = "konfirmasi";
    setSession(userId, session);
    showKonfirmasiPeminjaman(chatId, userId, session);

    // Alur pengembalian
  } else if (step === "pengembalian_id") {
    const peminjamanId = text.trim();
    const rowData = findPeminjamanById(peminjamanId);

    if (!rowData) {
      sendMessage(
        chatId,
        "❌ ID Peminjaman tidak ditemukan. Silakan cek kembali ID Anda dengan /status",
      );
      return;
    }

    const ownerUserId = rowData[2].toString();
    if (ownerUserId !== userId.toString()) {
      sendMessage(chatId, "⚠️ ID Peminjaman ini bukan milik Anda.");
      return;
    }

    if (rowData[14] !== "approved") {
      sendMessage(
        chatId,
        "⚠️ Peminjaman ini belum disetujui atau sudah dikembalikan.",
      );
      return;
    }

    session.data.peminjamanId = peminjamanId;
    session.data.rowData = rowData;
    session.step = "pengembalian_keterangan";
    setSession(userId, session);

    sendMessage(
      chatId,
      `✅ ID *${peminjamanId}* ditemukan!\n📌 ${rowData[4] === "lab" ? "Lab" : "Barang"}: *${rowData[5]}*\n\nMasukkan *keterangan pengembalian*:`,
      { parse_mode: "Markdown" },
    );
  } else if (step === "pengembalian_keterangan") {
    session.data.keteranganKembali = text;
    session.step = "pengembalian_foto";
    setSession(userId, session);

    sendMessage(
      chatId,
      "📷 Kirimkan *1 foto* kondisi lab/barang yang dikembalikan:",
      { parse_mode: "Markdown" },
    );
  }
}

// ==================== CALLBACK QUERY HANDLER ====================

function handleCallbackQuery(callbackQuery) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const userId = callbackQuery.from.id;
  const userName =
    callbackQuery.from.first_name +
    (callbackQuery.from.last_name ? " " + callbackQuery.from.last_name : "");

  answerCallbackQuery(callbackQuery.id);

  // Pilih jenis: lab atau barang
  if (data === "jenis_lab" || data === "jenis_barang") {
    const session = getSession(userId);
    if (!session) {
      sendMessage(chatId, "⚠️ Sesi habis. Kirim /pinjam untuk mulai ulang.");
      return;
    }

    const jenis = data === "jenis_lab" ? "lab" : "barang";
    session.data.jenis = jenis;
    session.step = "pilih_item";
    setSession(userId, session);

    const daftar = jenis === "lab" ? CONFIG.DAFTAR_LAB : CONFIG.DAFTAR_BARANG;
    const buttons = daftar.map((item) => [
      { text: item, callback_data: `item_${item}` },
    ]);

    editMessage(
      chatId,
      messageId,
      `📝 *Form Peminjaman*\n\nPilih ${jenis === "lab" ? "🏫 Lab" : "📦 Barang"} yang ingin dipinjam:`,
      {
        parse_mode: "Markdown",
        reply_markup: JSON.stringify({ inline_keyboard: buttons }),
      },
    );

    // Pilih item spesifik
  } else if (data.startsWith("item_")) {
    const session = getSession(userId);
    if (!session) {
      sendMessage(chatId, "⚠️ Sesi habis. Kirim /pinjam untuk mulai ulang.");
      return;
    }

    const namaItem = data.substring(5);
    session.data.namaItem = namaItem;
    session.step = "input_nama";
    setSession(userId, session);

    editMessage(
      chatId,
      messageId,
      `✅ Anda memilih: *${namaItem}*\n\nSekarang isi data diri Anda.\n\n👤 Masukkan *Nama Lengkap*:`,
      { parse_mode: "Markdown" },
    );

    // Konfirmasi submit peminjaman
  } else if (data === "konfirmasi_ya") {
    const session = getSession(userId);
    if (!session) {
      editMessage(chatId, messageId, "⚠️ Sesi habis. Kirim /pinjam untuk mulai ulang.");
      return;
    }

    editMessage(chatId, messageId, "⏳ Menyimpan data peminjaman...");
    submitPeminjaman(chatId, userId, userName, session);
    deleteSession(userId);
  } else if (data === "konfirmasi_tidak") {
    deleteSession(userId);
    editMessage(chatId, messageId, "❌ Pengajuan peminjaman dibatalkan.");

    // Aslab: approve peminjaman
  } else if (data.startsWith("approve_")) {
    const peminjamanId = data.substring(8);
    const aslabName = userName;
    processApproval(chatId, messageId, peminjamanId, "approved", aslabName);

    // Aslab: decline peminjaman
  } else if (data.startsWith("decline_")) {
    const peminjamanId = data.substring(8);
    const aslabName = userName;
    processApproval(chatId, messageId, peminjamanId, "declined", aslabName);

    // Aslab: approve pengembalian
  } else if (data.startsWith("approve_return_")) {
    const peminjamanId = data.substring(15);
    const aslabName = userName;
    processReturnApproval(
      chatId,
      messageId,
      peminjamanId,
      "approved",
      aslabName,
    );

    // Aslab: decline pengembalian
  } else if (data.startsWith("decline_return_")) {
    const peminjamanId = data.substring(15);
    const aslabName = userName;
    processReturnApproval(
      chatId,
      messageId,
      peminjamanId,
      "declined",
      aslabName,
    );
  }
}

// ==================== LOGIKA PEMINJAMAN ====================

function showKonfirmasiPeminjaman(chatId, userId, session) {
  const d = session.data;
  const text =
    `📋 *Konfirmasi Peminjaman*\n\n` +
    `📌 Jenis: *${d.jenis === "lab" ? "Lab" : "Barang"}*\n` +
    `🏷️ ${d.jenis === "lab" ? "Lab" : "Barang"}: *${escapeMarkdown(d.namaItem)}*\n` +
    `👤 Nama: *${escapeMarkdown(d.nama)}*\n` +
    `📚 Kelas: *${escapeMarkdown(d.kelas)}*\n` +
    `🎓 Angkatan: *${escapeMarkdown(d.angkatan)}*\n` +
    `📱 No HP: *${escapeMarkdown(d.noHp)}*\n` +
    `📅 Tanggal: *${escapeMarkdown(d.tanggal)}*\n` +
    `🕐 Jam: *${escapeMarkdown(d.jamMulai)} - ${escapeMarkdown(d.jamSelesai)}*\n` +
    `📝 Keterangan: *${escapeMarkdown(d.keterangan)}*\n\n` +
    `Apakah data di atas sudah benar?`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Ya, Kirim", callback_data: "konfirmasi_ya" },
        { text: "❌ Batal", callback_data: "konfirmasi_tidak" },
      ],
    ],
  };

  sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: JSON.stringify(keyboard),
  });
}

function submitPeminjaman(chatId, userId, userName, session) {
  const d = session.data;
  const peminjamanId = generateId();
  const timestamp = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  });

  const sheet = getSheet(CONFIG.SHEET_PEMINJAMAN);

  // Tambahkan header jika sheet kosong
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "ID",
      "Timestamp",
      "User ID",
      "Username",
      "Jenis",
      "Nama Item",
      "Nama",
      "Kelas",
      "Angkatan",
      "No HP",
      "Tanggal Pinjam",
      "Jam Mulai",
      "Jam Selesai",
      "Keterangan",
      "Status Pinjam",
      "Status Kembali",
      "Nama Aslab",
      "Catatan Aslab",
    ]);
  }

  sheet.appendRow([
    peminjamanId,
    timestamp,
    userId.toString(),
    userName,
    d.jenis,
    d.namaItem,
    d.nama,
    d.kelas,
    d.angkatan,
    d.noHp,
    d.tanggal,
    d.jamMulai,
    d.jamSelesai,
    d.keterangan,
    "waiting", // Status Pinjam
    "", // Status Kembali
    "", // Nama Aslab
    "", // Catatan Aslab
  ]);

  // Kirim konfirmasi ke peminjam
  sendMessage(
    chatId,
    `✅ *Pengajuan Berhasil Dikirim!*\n\n` +
      `🆔 ID Peminjaman: \`${peminjamanId}\`\n` +
      `📌 ${d.jenis === "lab" ? "Lab" : "Barang"}: *${escapeMarkdown(d.namaItem)}*\n` +
      `📅 ${d.tanggal}, ${d.jamMulai} - ${d.jamSelesai}\n\n` +
      `⏳ Menunggu persetujuan dari aslab...\n` +
      `Gunakan /status untuk memantau status peminjaman Anda.`,
    { parse_mode: "Markdown" },
  );

  // Kirim notifikasi ke grup aslab
  const aslabText =
    `🔔 *PENGAJUAN PEMINJAMAN BARU*\n\n` +
    `🆔 ID: \`${peminjamanId}\`\n` +
    `📌 Jenis: *${d.jenis === "lab" ? "Lab" : "Barang"}*\n` +
    `🏷️ ${d.jenis === "lab" ? "Lab" : "Barang"}: *${escapeMarkdown(d.namaItem)}*\n` +
    `👤 Nama: *${escapeMarkdown(d.nama)}*\n` +
    `📚 Kelas: *${escapeMarkdown(d.kelas)}* | Angkatan: *${escapeMarkdown(d.angkatan)}*\n` +
    `📱 No HP: ${d.noHp}\n` +
    `📅 Tanggal: *${escapeMarkdown(d.tanggal)}*\n` +
    `🕐 Jam: *${escapeMarkdown(d.jamMulai)} - ${escapeMarkdown(d.jamSelesai)}*\n` +
    `📝 Keterangan: ${escapeMarkdown(d.keterangan)}\n\n` +
    `Silakan setujui atau tolak pengajuan ini:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `approve_${peminjamanId}` },
        { text: "❌ Decline", callback_data: `decline_${peminjamanId}` },
      ],
    ],
  };

  sendMessage(CONFIG.GROUP_ASLAB_ID, aslabText, {
    parse_mode: "Markdown",
    reply_markup: JSON.stringify(keyboard),
  });
}

function processApproval(chatId, messageId, peminjamanId, status, aslabName) {
  const sheet = getSheet(CONFIG.SHEET_PEMINJAMAN);
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  let rowData = null;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === peminjamanId) {
      rowIndex = i + 1;
      rowData = data[i];
      break;
    }
  }

  if (rowIndex === -1) {
    editMessage(
      chatId,
      messageId,
      `⚠️ ID Peminjaman \`${peminjamanId}\` tidak ditemukan.`,
    );
    return;
  }

  if (rowData[14] !== "waiting") {
    editMessage(
      chatId,
      messageId,
      `⚠️ Peminjaman ini sudah diproses sebelumnya.`,
    );
    return;
  }

  // Update status di spreadsheet
  sheet.getRange(rowIndex, 15).setValue(status); // Status Pinjam (kolom O)
  sheet.getRange(rowIndex, 17).setValue(aslabName); // Nama Aslab (kolom Q)

  const statusLabel = status === "approved" ? "✅ DISETUJUI" : "❌ DITOLAK";
  const emoji = status === "approved" ? "✅" : "❌";

  // Update pesan di grup aslab
  editMessage(
    chatId,
    messageId,
    `${emoji} *Peminjaman ${statusLabel}*\n` +
      `🆔 ID: \`${peminjamanId}\`\n` +
      `🏷️ ${rowData[4] === "lab" ? "Lab" : "Barang"}: ${escapeMarkdown(rowData[5])}\n` +
      `👤 ${escapeMarkdown(rowData[6])}\n` +
      `👨‍💼 Diproses oleh: *${escapeMarkdown(aslabName)}*`,
    { parse_mode: "Markdown" },
  );

  // Kirim notifikasi ke peminjam
  const userChatId = rowData[2];
  const userMsg =
    status === "approved"
      ? `🎉 *Peminjaman Anda DISETUJUI!*\n\n` +
        `🆔 ID: \`${peminjamanId}\`\n` +
        `🏷️ ${rowData[4] === "lab" ? "Lab" : "Barang"}: *${escapeMarkdown(rowData[5])}*\n` +
        `📅 ${rowData[10]}, ${rowData[11]} - ${rowData[12]}\n\n` +
        `👨‍💼 Disetujui oleh: *${escapeMarkdown(aslabName)}*\n\n` +
        `Jangan lupa lakukan pengembalian tepat waktu ya! 😊\n` +
        `Gunakan /pengembalian untuk melaporkan pengembalian.`
      : `😔 *Peminjaman Anda DITOLAK*\n\n` +
        `🆔 ID: \`${peminjamanId}\`\n` +
        `🏷️ ${rowData[4] === "lab" ? "Lab" : "Barang"}: *${escapeMarkdown(rowData[5])}*\n\n` +
        `👨‍💼 Ditolak oleh: *${escapeMarkdown(aslabName)}*\n\n` +
        `Silakan ajukan peminjaman baru dengan /pinjam.`;

  sendMessage(userChatId, userMsg, { parse_mode: "Markdown" });
}

// ==================== LOGIKA PENGEMBALIAN ====================

function handleFotoPengembalian(msg, session, chatId, userId, userName) {
  const photo = msg.photo[msg.photo.length - 1]; // Ambil resolusi terbesar
  const fileId = photo.file_id;

  session.data.fotoFileId = fileId;
  deleteSession(userId);

  const d = session.data;
  const peminjamanId = d.peminjamanId;
  const rowData = d.rowData;

  // Simpan data pengembalian ke sheet
  const returnSheet = getSheet(CONFIG.SHEET_PENGEMBALIAN);
  if (returnSheet.getLastRow() === 0) {
    returnSheet.appendRow([
      "ID Pengembalian",
      "ID Peminjaman",
      "Timestamp",
      "User ID",
      "Username",
      "Nama Item",
      "Keterangan Kembali",
      "File ID Foto",
      "Status",
    ]);
  }

  const returnId = generateId("RET");
  const timestamp = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  });

  returnSheet.appendRow([
    returnId,
    peminjamanId,
    timestamp,
    userId.toString(),
    userName,
    rowData[5],
    d.keteranganKembali,
    fileId,
    "waiting_return",
  ]);

  // Update status di sheet peminjaman
  const peminjamanSheet = getSheet(CONFIG.SHEET_PEMINJAMAN);
  const peminjamanData = peminjamanSheet.getDataRange().getValues();
  for (let i = 1; i < peminjamanData.length; i++) {
    if (peminjamanData[i][0] === peminjamanId) {
      peminjamanSheet.getRange(i + 1, 16).setValue("waiting_return");
      break;
    }
  }

  // Konfirmasi ke peminjam
  sendMessage(
    chatId,
    `📤 *Laporan pengembalian dikirim!*\n\n` +
      `🆔 ID Peminjaman: \`${peminjamanId}\`\n` +
      `⏳ Menunggu konfirmasi dari aslab...`,
    { parse_mode: "Markdown" },
  );

  // Kirim foto + info ke grup aslab
  const caption =
    `🔔 *LAPORAN PENGEMBALIAN*\n\n` +
    `🆔 ID Peminjaman: \`${peminjamanId}\`\n` +
    `🆔 ID Pengembalian: \`${returnId}\`\n` +
    `🏷️ ${rowData[4] === "lab" ? "Lab" : "Barang"}: *${escapeMarkdown(rowData[5])}*\n` +
    `👤 Nama: *${escapeMarkdown(rowData[6])}*\n` +
    `📝 Keterangan: ${escapeMarkdown(d.keteranganKembali)}\n\n` +
    `Setujui pengembalian ini:`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "✅ Approve Pengembalian",
          callback_data: `approve_return_${returnId}`,
        },
        { text: "❌ Decline", callback_data: `decline_return_${returnId}` },
      ],
    ],
  };

  sendPhoto(CONFIG.GROUP_ASLAB_ID, fileId, caption, keyboard);
}

function processReturnApproval(chatId, messageId, returnId, status, aslabName) {
  const returnSheet = getSheet(CONFIG.SHEET_PENGEMBALIAN);
  const returnData = returnSheet.getDataRange().getValues();

  let rowIndex = -1;
  let rowData = null;

  for (let i = 1; i < returnData.length; i++) {
    if (returnData[i][0] === returnId) {
      rowIndex = i + 1;
      rowData = returnData[i];
      break;
    }
  }

  if (rowIndex === -1) {
    editMessage(
      chatId,
      messageId,
      `⚠️ ID Pengembalian \`${returnId}\` tidak ditemukan.`,
    );
    return;
  }

  if (rowData[8] !== "waiting_return") {
    editMessage(
      chatId,
      messageId,
      `⚠️ Pengembalian ini sudah diproses sebelumnya.`,
    );
    return;
  }

  const newStatus = status === "approved" ? "returned" : "return_declined";
  returnSheet.getRange(rowIndex, 9).setValue(newStatus);

  // Update status di sheet peminjaman
  const peminjamanId = rowData[1];
  const peminjamanSheet = getSheet(CONFIG.SHEET_PEMINJAMAN);
  const peminjamanData = peminjamanSheet.getDataRange().getValues();

  let userChatId = null;
  let namaItem = rowData[5];

  for (let i = 1; i < peminjamanData.length; i++) {
    if (peminjamanData[i][0] === peminjamanId) {
      peminjamanSheet.getRange(i + 1, 16).setValue(newStatus);
      userChatId = peminjamanData[i][2];
      break;
    }
  }

  const emoji = status === "approved" ? "✅" : "❌";
  const statusLabel = status === "approved" ? "DIKONFIRMASI" : "DITOLAK";

  // Update pesan di grup
  editMessage(
    chatId,
    messageId,
    `${emoji} *Pengembalian ${statusLabel}*\n` +
      `🆔 ID: \`${returnId}\`\n` +
      `🏷️ Item: ${escapeMarkdown(namaItem)}\n` +
      `👨‍💼 Diproses oleh: *${escapeMarkdown(aslabName)}*`,
    { parse_mode: "Markdown" },
  );

  // Notifikasi ke peminjam
  if (userChatId) {
    const userMsg =
      status === "approved"
        ? `🎉 *Pengembalian Berhasil Dikonfirmasi!*\n\n` +
          `🆔 ID Peminjaman: \`${peminjamanId}\`\n` +
          `🏷️ Item: *${escapeMarkdown(namaItem)}*\n\n` +
          `👨‍💼 Dikonfirmasi oleh: *${escapeMarkdown(aslabName)}*\n\n` +
          `Terima kasih telah mengembalikan dengan baik! 😊`
        : `⚠️ *Pengembalian Ditolak*\n\n` +
          `🆔 ID Peminjaman: \`${peminjamanId}\`\n` +
          `🏷️ Item: *${escapeMarkdown(namaItem)}*\n\n` +
          `👨‍💼 Ditolak oleh: *${escapeMarkdown(aslabName)}*\n\n` +
          `Silakan hubungi aslab untuk informasi lebih lanjut.`;

    sendMessage(userChatId, userMsg, { parse_mode: "Markdown" });
  }
}

// ==================== SESSION MANAGEMENT (PropertiesService) ====================

function getSession(userId) {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty("session_" + userId);
  return raw ? JSON.parse(raw) : null;
}

function setSession(userId, session) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("session_" + userId, JSON.stringify(session));
}

function deleteSession(userId) {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty("session_" + userId);
}

// ==================== SPREADSHEET HELPERS ====================

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function findPeminjamanById(id) {
  const sheet = getSheet(CONFIG.SHEET_PEMINJAMAN);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) return data[i];
  }
  return null;
}

// ==================== UTILITY ====================

function generateId(prefix) {
  prefix = prefix || "PJM";
  const now = new Date();
  const ts =
    now.getFullYear().toString().slice(-2) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${ts}-${rand}`;
}

function pad(n) {
  return n.toString().padStart(2, "0");
}

function escapeMarkdown(text) {
  return text ? String(text).replace(/[_*`\[]/g, "") : "";
}

// ==================== TELEGRAM API WRAPPERS ====================

function sendMessage(chatId, text, options) {
  options = options || {};
  const payload = Object.assign({ chat_id: chatId, text: text }, options);
  return callTelegramApi("sendMessage", payload);
}

function editMessage(chatId, messageId, text, options) {
  options = options || {};
  const payload = Object.assign(
    {
      chat_id: chatId,
      message_id: messageId,
      text: text,
    },
    options,
  );
  return callTelegramApi("editMessageText", payload);
}

function sendPhoto(chatId, fileId, caption, keyboard) {
  const payload = {
    chat_id: chatId,
    photo: fileId,
    caption: caption,
    parse_mode: "Markdown",
    reply_markup: JSON.stringify(keyboard),
  };
  return callTelegramApi("sendPhoto", payload);
}

function answerCallbackQuery(callbackQueryId, text) {
  const payload = { callback_query_id: callbackQueryId };
  if (text) payload.text = text;
  return callTelegramApi("answerCallbackQuery", payload);
}

function callTelegramApi(method, payload) {
  const url = `${BASE_URL}/${method}`;
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());
  if (!result.ok) {
    Logger.log(`Telegram API Error [${method}]: ` + JSON.stringify(result));
    try {
      const log = getSheet("Debug Log");
      log.appendRow([
        new Date(),
        method,
        JSON.stringify(payload).slice(0, 500),
        JSON.stringify(result).slice(0, 500),
      ]);
    } catch (_) {}
  }
  return result;
}

// ==================== SETUP WEBHOOK ====================

/**
 * Jalankan fungsi ini SEKALI untuk mendaftarkan webhook ke Telegram.
 * Ganti WEBHOOK_URL dengan URL Web App Google Apps Script Anda.
 */
function setWebhook() {
  const WEBHOOK_URL = CONFIG.WEBHOOK_URL;
  if (!WEBHOOK_URL) {
    Logger.log(
      "ERROR: Set CONFIG.WEBHOOK_URL to your /exec deployment URL first.",
    );
    return;
  }
  if (WEBHOOK_URL.includes("/dev")) {
    Logger.log(
      "ERROR: CONFIG.WEBHOOK_URL ends with /dev — must be /exec. Go to Deploy → Manage Deployments and copy the correct URL.",
    );
    return;
  }
  const url = `${BASE_URL}/setWebhook`;
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      url: WEBHOOK_URL,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    }),
  };
  const response = UrlFetchApp.fetch(url, options);
  Logger.log("Registered webhook URL: " + WEBHOOK_URL);
  Logger.log(response.getContentText());
}

/**
 * Jalankan fungsi ini untuk mengecek info webhook yang terpasang.
 */
function getWebhookInfo() {
  const url = `${BASE_URL}/getWebhookInfo`;
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}
