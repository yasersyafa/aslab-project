import html
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ConversationHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

import sheets

load_dotenv()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.environ["BOT_TOKEN"]
GROUP_ASLAB_ID = int(os.environ["GROUP_ASLAB_ID"])

DAFTAR_LAB = [
    "SAW 08.07 Lab Game Design", "SAW 08.01 Lab Game Art", "SAW 08.06 Lab Game Programming"
]

# /pinjam conversation states
(PILIH_JENIS, PILIH_ITEM, PILIH_JENIS_ITEM,
 INPUT_NAMA_BARANG, INPUT_JUMLAH, TAMBAH_ITEM,
 INPUT_NAMA, INPUT_KELAS, INPUT_ANGKATAN,
 INPUT_NOHP, INPUT_TANGGAL, INPUT_JAM_MULAI, INPUT_JAM_SELESAI,
 INPUT_KETERANGAN, KONFIRMASI) = range(15)

# /pengembalian conversation states
PENGEMBALIAN_ID, PENGEMBALIAN_KETERANGAN, PENGEMBALIAN_FOTO = range(3)

# /ambil conversation states
AMBIL_ID, AMBIL_FOTO = range(2)


def esc(text) -> str:
    return html.escape(str(text)) if text else ""


def _format_items(items: list) -> str:
    return ", ".join(f"{esc(it['nama'])} ({esc(it['jumlah'])})" for it in items)


# ── /start ───────────────────────────────────────────────────

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    name = esc(update.effective_user.first_name)
    await update.message.reply_text(
        f"👋 Halo, <b>{name}</b>!\n\n"
        "Selamat datang di <b>Bot Peminjaman Lab &amp; Barang</b> 🏫\n\n"
        "Daftar command:\n\n"
        "📌 /pinjam — Mengajukan peminjaman\n"
        "📋 /status — Cek status peminjaman\n"
        "📸 /ambil — Kirim foto kondisi awal saat ambil barang\n"
        "🔄 /pengembalian — Laporan pengembalian\n"
        "🤖 /start — Tampilkan pesan ini\n\n"
        "<i>Ketik /batal untuk membatalkan form yang sedang berjalan.</i>",
        parse_mode="HTML",
    )


# ── /status ──────────────────────────────────────────────────

async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    rows = sheets.get_peminjaman_by_user(user_id)
    if not rows:
        await update.message.reply_text("📋 Belum ada riwayat peminjaman.")
        return

    parts = []
    for row in rows:
        pid = sheets._v(row, 0)
        jenis = sheets._v(row, 4)
        nama_item = sheets._v(row, 5)
        tgl = sheets._v(row, 10)
        status_pinjam = sheets._v(row, 14)
        status_kembali = sheets._v(row, 15)

        if status_pinjam == "waiting":
            label = "⏳ Menunggu Persetujuan Aslab"
        elif status_pinjam == "approved":
            if status_kembali == "returned":
                label = "✅ Selesai (Sudah Dikembalikan)"
            elif status_kembali == "waiting_return":
                label = "🔄 Menunggu Konfirmasi Pengembalian"
            else:
                label = "✅ Disetujui — Menunggu Pengembalian"
        elif status_pinjam == "declined":
            label = "❌ Ditolak oleh Aslab"
        else:
            label = esc(status_pinjam)

        parts.append(
            f"🆔 ID: <code>{esc(pid)}</code>\n"
            f"📌 {'Lab' if jenis == 'lab' else 'Barang'}: {esc(nama_item)}\n"
            f"📅 Tanggal: {esc(tgl)}\n"
            f"📊 Status: {label}"
        )

    text = "📋 <b>Status Peminjaman Anda:</b>\n\n" + "\n\n─────────────\n\n".join(parts)
    await update.message.reply_text(text, parse_mode="HTML")


# ── /pinjam conversation ──────────────────────────────────────

async def pinjam_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    keyboard = [[
        InlineKeyboardButton("🏫 Lab", callback_data="jenis_lab"),
        InlineKeyboardButton("📦 Barang", callback_data="jenis_barang"),
    ]]
    await update.message.reply_text(
        "📝 <b>Form Peminjaman</b>\n\nAnda ingin meminjam apa?",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
    return PILIH_JENIS


async def pilih_jenis(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    jenis = "lab" if query.data == "jenis_lab" else "barang"
    context.user_data["jenis"] = jenis

    if jenis == "lab":
        buttons = [[InlineKeyboardButton(item, callback_data=f"item_{item}")] for item in DAFTAR_LAB]
        await query.edit_message_text(
            "📝 <b>Form Peminjaman</b>\n\nPilih 🏫 Lab yang ingin dipinjam:",
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(buttons),
        )
        return PILIH_ITEM
    else:
        keyboard = [[
            InlineKeyboardButton("1️⃣ 1 jenis barang", callback_data="item_count_single"),
            InlineKeyboardButton("📦 Lebih dari 1 jenis", callback_data="item_count_multi"),
        ]]
        await query.edit_message_text(
            "📦 Berapa jenis barang yang ingin dipinjam?\n\n"
            "<i>(Satu booking ID untuk semua barang)</i>",
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
        return PILIH_JENIS_ITEM


async def pilih_item(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    nama_item = query.data[5:]  # strip "item_"
    context.user_data["namaItem"] = nama_item

    await query.edit_message_text(
        f"✅ Anda memilih: <b>{esc(nama_item)}</b>\n\n"
        "Sekarang isi data diri Anda.\n\n"
        "👤 Masukkan <b>Nama Lengkap</b>:",
        parse_mode="HTML",
    )
    return INPUT_NAMA


async def pilih_jenis_item(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    context.user_data["multi_item"] = query.data == "item_count_multi"
    context.user_data["items"] = []

    await query.edit_message_text(
        "📦 Ketik <b>nama barang</b> yang ingin dipinjam:",
        parse_mode="HTML",
    )
    return INPUT_NAMA_BARANG


async def input_nama_barang(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["_current_nama"] = update.message.text
    await update.message.reply_text("🔢 Masukkan <b>jumlah</b> barang tersebut:", parse_mode="HTML")
    return INPUT_JUMLAH


async def input_jumlah(update: Update, context: ContextTypes.DEFAULT_TYPE):
    nama = context.user_data.pop("_current_nama", "")
    context.user_data["items"].append({"nama": nama, "jumlah": update.message.text})

    if context.user_data.get("multi_item"):
        items_text = "\n".join(
            f"  • {esc(it['nama'])} ({esc(it['jumlah'])})"
            for it in context.user_data["items"]
        )
        keyboard = [[
            InlineKeyboardButton("➕ Tambah barang lain", callback_data="tambah_item"),
            InlineKeyboardButton("✅ Selesai", callback_data="selesai_item"),
        ]]
        await update.message.reply_text(
            f"📋 <b>Barang yang dipinjam sejauh ini:</b>\n{items_text}\n\n"
            "Tambah barang lain atau selesai?",
            parse_mode="HTML",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
        return TAMBAH_ITEM
    else:
        await update.message.reply_text("👤 Masukkan <b>Nama Lengkap</b>:", parse_mode="HTML")
        return INPUT_NAMA


async def tambah_item(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "tambah_item":
        await query.edit_message_text(
            "📦 Ketik <b>nama barang</b> berikutnya:",
            parse_mode="HTML",
        )
        return INPUT_NAMA_BARANG
    else:  # selesai_item
        await query.edit_message_text(
            "✅ Daftar barang disimpan.\n\n👤 Masukkan <b>Nama Lengkap</b>:",
            parse_mode="HTML",
        )
        return INPUT_NAMA


async def input_nama(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["nama"] = update.message.text
    await update.message.reply_text("📚 Masukkan <b>Kelas</b> Anda (contoh: GTA):", parse_mode="HTML")
    return INPUT_KELAS


async def input_kelas(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["kelas"] = update.message.text
    await update.message.reply_text("🎓 Masukkan <b>Angkatan</b> Anda (contoh: 2022):", parse_mode="HTML")
    return INPUT_ANGKATAN


async def input_angkatan(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["angkatan"] = update.message.text
    await update.message.reply_text("📱 Masukkan <b>No HP</b> Anda:", parse_mode="HTML")
    return INPUT_NOHP


async def input_nohp(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["noHp"] = update.message.text
    await update.message.reply_text(
        "📅 Masukkan <b>Tanggal Peminjaman</b> (contoh: 27/04/2025):", parse_mode="HTML"
    )
    return INPUT_TANGGAL


async def input_tanggal(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["tanggal"] = update.message.text
    await update.message.reply_text("🕐 Masukkan <b>Jam Mulai</b> (contoh: 08:00):", parse_mode="HTML")
    return INPUT_JAM_MULAI


async def input_jam_mulai(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["jamMulai"] = update.message.text
    await update.message.reply_text("🕕 Masukkan <b>Jam Selesai</b> (contoh: 16:00):", parse_mode="HTML")
    return INPUT_JAM_SELESAI


async def input_jam_selesai(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["jamSelesai"] = update.message.text
    await update.message.reply_text("📝 Masukkan <b>Keterangan / Keperluan</b>:", parse_mode="HTML")
    return INPUT_KETERANGAN


async def input_keterangan(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["keterangan"] = update.message.text
    d = context.user_data
    jenis_label = "Lab" if d["jenis"] == "lab" else "Barang"
    keyboard = [[
        InlineKeyboardButton("✅ Ya, Kirim", callback_data="konfirmasi_ya"),
        InlineKeyboardButton("❌ Batal", callback_data="konfirmasi_tidak"),
    ]]

    if d["jenis"] == "barang":
        items_text = "\n".join(
            f"  • {esc(it['nama'])} ({esc(it['jumlah'])})"
            for it in d.get("items", [])
        )
        barang_lines = f"📦 Barang:\n{items_text}\n"
        nama_item_display = _format_items(d.get("items", []))
    else:
        barang_lines = ""
        nama_item_display = esc(d["namaItem"])

    await update.message.reply_text(
        f"📋 <b>Konfirmasi Peminjaman</b>\n\n"
        f"📌 Jenis: <b>{jenis_label}</b>\n"
        + (f"🏷️ {jenis_label}: <b>{nama_item_display}</b>\n" if d["jenis"] == "lab" else "")
        + barang_lines
        + f"👤 Nama: <b>{esc(d['nama'])}</b>\n"
        f"📚 Kelas: <b>{esc(d['kelas'])}</b>\n"
        f"🎓 Angkatan: <b>{esc(d['angkatan'])}</b>\n"
        f"📱 No HP: <b>{esc(d['noHp'])}</b>\n"
        f"📅 Tanggal: <b>{esc(d['tanggal'])}</b>\n"
        f"🕐 Jam: <b>{esc(d['jamMulai'])} - {esc(d['jamSelesai'])}</b>\n"
        f"📝 Keterangan: <b>{esc(d['keterangan'])}</b>\n\n"
        "Apakah data di atas sudah benar?",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
    return KONFIRMASI


async def konfirmasi_ya(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.edit_message_text("⏳ Menyimpan data peminjaman...")

    user = update.effective_user
    user_name = user.first_name + (" " + user.last_name if user.last_name else "")
    d = context.user_data

    # Build namaItem string for barang
    if d["jenis"] == "barang":
        d["namaItem"] = _format_items(d.get("items", []))
        d["jumlah"] = str(sum(
            int(it["jumlah"]) for it in d.get("items", [])
            if str(it["jumlah"]).isdigit()
        ))

    try:
        pid = sheets.add_peminjaman(d, str(user.id), user_name)
    except Exception as e:
        logger.error(f"add_peminjaman failed: {e}")
        await query.edit_message_text("❌ Gagal menyimpan data. Coba lagi nanti.")
        return ConversationHandler.END

    jenis_label = "Lab" if d["jenis"] == "lab" else "Barang"
    await query.edit_message_text(
        f"✅ <b>Pengajuan Berhasil Dikirim!</b>\n\n"
        f"🆔 ID Peminjaman: <code>{pid}</code>\n"
        f"📌 {jenis_label}: <b>{esc(d['namaItem'])}</b>\n"
        f"📅 {esc(d['tanggal'])}, {esc(d['jamMulai'])} - {esc(d['jamSelesai'])}\n\n"
        "⏳ Menunggu persetujuan dari aslab...\n"
        "Gunakan /status untuk memantau.",
        parse_mode="HTML",
    )

    keyboard = [[
        InlineKeyboardButton("✅ Approve", callback_data=f"approve_{pid}"),
        InlineKeyboardButton("❌ Decline", callback_data=f"decline_{pid}"),
    ]]

    if d["jenis"] == "barang":
        items_text = "\n".join(
            f"  • {esc(it['nama'])} ({esc(it['jumlah'])})"
            for it in d.get("items", [])
        )
        barang_lines = f"📦 Barang:\n{items_text}\n"
    else:
        barang_lines = f"🏷️ Lab: <b>{esc(d['namaItem'])}</b>\n"

    aslab_text = (
        f"🔔 <b>PENGAJUAN PEMINJAMAN BARU</b>\n\n"
        f"🆔 ID: <code>{pid}</code>\n"
        f"📌 Jenis: <b>{jenis_label}</b>\n"
        + barang_lines
        + f"👤 Nama: <b>{esc(d['nama'])}</b>\n"
        f"📚 Kelas: <b>{esc(d['kelas'])}</b> | Angkatan: <b>{esc(d['angkatan'])}</b>\n"
        f"📱 No HP: {esc(d['noHp'])}\n"
        f"📅 Tanggal: <b>{esc(d['tanggal'])}</b>\n"
        f"🕐 Jam: <b>{esc(d['jamMulai'])} - {esc(d['jamSelesai'])}</b>\n"
        f"📝 Keterangan: {esc(d['keterangan'])}\n\n"
        "Silakan setujui atau tolak:"
    )

    await context.bot.send_message(
        GROUP_ASLAB_ID,
        aslab_text,
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )

    context.user_data.clear()
    return ConversationHandler.END


async def konfirmasi_tidak(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.edit_message_text("❌ Pengajuan peminjaman dibatalkan.")
    context.user_data.clear()
    return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    await update.message.reply_text("❌ Form dibatalkan. Ketik /start untuk melihat menu.")
    return ConversationHandler.END


# ── /pengembalian conversation ────────────────────────────────

async def pengembalian_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    await update.message.reply_text(
        "🔄 <b>Form Pengembalian</b>\n\n"
        "Masukkan <b>ID Peminjaman</b> Anda:\n"
        "<i>(Gunakan /status untuk melihat ID)</i>",
        parse_mode="HTML",
    )
    return PENGEMBALIAN_ID


async def pengembalian_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    pid = update.message.text.strip()
    user_id = str(update.effective_user.id)

    row = sheets.find_peminjaman_by_id(pid)
    if not row:
        await update.message.reply_text("❌ ID tidak ditemukan. Cek kembali dengan /status")
        return PENGEMBALIAN_ID

    if sheets._v(row, 2) != user_id:
        await update.message.reply_text("⚠️ ID Peminjaman ini bukan milik Anda.")
        return PENGEMBALIAN_ID

    if sheets._v(row, 14) != "approved":
        await update.message.reply_text("⚠️ Peminjaman belum disetujui atau sudah dikembalikan.")
        return PENGEMBALIAN_ID

    context.user_data["peminjamanId"] = pid
    context.user_data["rowData"] = row
    jenis = "Lab" if sheets._v(row, 4) == "lab" else "Barang"

    await update.message.reply_text(
        f"✅ ID <b>{esc(pid)}</b> ditemukan!\n"
        f"📌 {jenis}: <b>{esc(sheets._v(row, 5))}</b>\n\n"
        "Masukkan <b>keterangan pengembalian</b>:",
        parse_mode="HTML",
    )
    return PENGEMBALIAN_KETERANGAN


async def pengembalian_keterangan(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["keteranganKembali"] = update.message.text
    await update.message.reply_text(
        "📷 Kirimkan <b>1 foto</b> kondisi lab/barang yang dikembalikan:",
        parse_mode="HTML",
    )
    return PENGEMBALIAN_FOTO


async def pengembalian_foto(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message.photo:
        await update.message.reply_text("⚠️ Kirimkan foto, bukan file lain.")
        return PENGEMBALIAN_FOTO

    file_id = update.message.photo[-1].file_id
    user = update.effective_user
    user_name = user.first_name + (" " + user.last_name if user.last_name else "")
    d = context.user_data
    row = d["rowData"]

    try:
        ret_id = sheets.add_pengembalian(
            peminjaman_id=d["peminjamanId"],
            user_id=str(user.id),
            user_name=user_name,
            nama_item=sheets._v(row, 5),
            keterangan=d["keteranganKembali"],
            file_id=file_id,
        )
        sheets.update_peminjaman_return_status(d["peminjamanId"], "waiting_return")
    except Exception as e:
        logger.error(f"add_pengembalian failed: {e}")
        await update.message.reply_text("❌ Gagal menyimpan data. Coba lagi nanti.")
        return ConversationHandler.END

    await update.message.reply_text(
        f"📤 <b>Laporan pengembalian dikirim!</b>\n\n"
        f"🆔 ID Peminjaman: <code>{esc(d['peminjamanId'])}</code>\n"
        "⏳ Menunggu konfirmasi dari aslab...",
        parse_mode="HTML",
    )

    jenis = "Lab" if sheets._v(row, 4) == "lab" else "Barang"
    keyboard = [[
        InlineKeyboardButton("✅ Approve Pengembalian", callback_data=f"approve_return_{ret_id}"),
        InlineKeyboardButton("❌ Decline", callback_data=f"decline_return_{ret_id}"),
    ]]
    await context.bot.send_photo(
        GROUP_ASLAB_ID,
        file_id,
        caption=(
            f"🔔 <b>LAPORAN PENGEMBALIAN</b>\n\n"
            f"🆔 ID Peminjaman: <code>{esc(d['peminjamanId'])}</code>\n"
            f"🆔 ID Pengembalian: <code>{esc(ret_id)}</code>\n"
            f"🏷️ {jenis}: <b>{esc(sheets._v(row, 5))}</b>\n"
            f"👤 Nama: <b>{esc(sheets._v(row, 6))}</b>\n"
            f"📝 Keterangan: {esc(d['keteranganKembali'])}\n\n"
            "Setujui pengembalian ini:"
        ),
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )

    context.user_data.clear()
    return ConversationHandler.END


# ── Aslab approval callbacks ──────────────────────────────────

async def handle_approval(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data
    aslab = update.effective_user
    aslab_name = aslab.first_name + (" " + aslab.last_name if aslab.last_name else "")

    if data.startswith("approve_return_"):
        rid = data[15:]
        row = sheets.find_pengembalian_by_id(rid)
        if not row:
            await query.edit_message_caption(f"⚠️ ID Pengembalian {esc(rid)} tidak ditemukan.")
            return
        if sheets._v(row, 8) != "waiting_return":
            await query.edit_message_caption("⚠️ Pengembalian sudah diproses.")
            return

        sheets.update_pengembalian_status(rid, "returned")
        pid = sheets._v(row, 1)
        sheets.update_peminjaman_return_status(pid, "returned")
        nama_item = sheets._v(row, 5)
        user_chat_id = sheets.get_peminjaman_user_id(pid)

        await query.edit_message_caption(
            f"✅ <b>Pengembalian DIKONFIRMASI</b>\n"
            f"🆔 ID: <code>{esc(rid)}</code>\n"
            f"🏷️ Item: {esc(nama_item)}\n"
            f"👨‍💼 Diproses oleh: <b>{esc(aslab_name)}</b>",
            parse_mode="HTML",
        )
        if user_chat_id:
            await context.bot.send_message(
                int(user_chat_id),
                f"🎉 <b>Pengembalian Berhasil Dikonfirmasi!</b>\n\n"
                f"🆔 ID Peminjaman: <code>{esc(pid)}</code>\n"
                f"🏷️ Item: <b>{esc(nama_item)}</b>\n\n"
                f"👨‍💼 Dikonfirmasi oleh: <b>{esc(aslab_name)}</b>\n\n"
                "Terima kasih telah mengembalikan dengan baik! 😊",
                parse_mode="HTML",
            )

    elif data.startswith("decline_return_"):
        rid = data[15:]
        row = sheets.find_pengembalian_by_id(rid)
        if not row:
            await query.edit_message_caption(f"⚠️ ID Pengembalian {esc(rid)} tidak ditemukan.")
            return
        if sheets._v(row, 8) != "waiting_return":
            await query.edit_message_caption("⚠️ Pengembalian sudah diproses.")
            return

        sheets.update_pengembalian_status(rid, "return_declined")
        pid = sheets._v(row, 1)
        sheets.update_peminjaman_return_status(pid, "return_declined")
        nama_item = sheets._v(row, 5)
        user_chat_id = sheets.get_peminjaman_user_id(pid)

        await query.edit_message_caption(
            f"❌ <b>Pengembalian DITOLAK</b>\n"
            f"🆔 ID: <code>{esc(rid)}</code>\n"
            f"🏷️ Item: {esc(nama_item)}\n"
            f"👨‍💼 Diproses oleh: <b>{esc(aslab_name)}</b>",
            parse_mode="HTML",
        )
        if user_chat_id:
            await context.bot.send_message(
                int(user_chat_id),
                f"⚠️ <b>Pengembalian Ditolak</b>\n\n"
                f"🆔 ID Peminjaman: <code>{esc(pid)}</code>\n"
                f"🏷️ Item: <b>{esc(nama_item)}</b>\n\n"
                f"👨‍💼 Ditolak oleh: <b>{esc(aslab_name)}</b>\n\n"
                "Silakan hubungi aslab untuk informasi lebih lanjut.",
                parse_mode="HTML",
            )

    elif data.startswith("approve_"):
        pid = data[8:]
        row = sheets.find_peminjaman_by_id(pid)
        if not row:
            await query.edit_message_text(f"⚠️ ID Peminjaman {esc(pid)} tidak ditemukan.")
            return
        if sheets._v(row, 14) != "waiting":
            await query.edit_message_text("⚠️ Peminjaman sudah diproses.")
            return

        sheets.update_peminjaman_status(pid, "approved", aslab_name)
        jenis = sheets._v(row, 4)
        jenis_label = "Lab" if jenis == "lab" else "Barang"
        result_text = (
            f"✅ <b>Peminjaman DISETUJUI</b>\n"
            f"🆔 ID: <code>{esc(pid)}</code>\n"
            f"🏷️ {jenis_label}: {esc(sheets._v(row, 5))}\n"
            f"👤 {esc(sheets._v(row, 6))}\n"
            f"👨‍💼 Diproses oleh: <b>{esc(aslab_name)}</b>"
        )
        if query.message.photo:
            await query.edit_message_caption(result_text, parse_mode="HTML")
        else:
            await query.edit_message_text(result_text, parse_mode="HTML")

        if jenis == "barang":
            user_msg = (
                f"🎉 <b>Peminjaman Anda DISETUJUI!</b>\n\n"
                f"🆔 ID: <code>{esc(pid)}</code>\n"
                f"🏷️ Barang: <b>{esc(sheets._v(row, 5))}</b>\n\n"
                f"👨‍💼 Disetujui oleh: <b>{esc(aslab_name)}</b>\n\n"
                "📸 Saat mengambil barang, gunakan /ambil untuk mengirim foto kondisi awal barang."
            )
        else:
            user_msg = (
                f"🎉 <b>Peminjaman Anda DISETUJUI!</b>\n\n"
                f"🆔 ID: <code>{esc(pid)}</code>\n"
                f"🏷️ Lab: <b>{esc(sheets._v(row, 5))}</b>\n"
                f"📅 {esc(sheets._v(row, 10))}, {esc(sheets._v(row, 11))} - {esc(sheets._v(row, 12))}\n\n"
                f"👨‍💼 Disetujui oleh: <b>{esc(aslab_name)}</b>\n\n"
                "Jangan lupa lakukan pengembalian tepat waktu! 😊\n"
                "Gunakan /pengembalian untuk melaporkan pengembalian."
            )

        await context.bot.send_message(
            int(sheets._v(row, 2)),
            user_msg,
            parse_mode="HTML",
        )

    elif data.startswith("decline_"):
        pid = data[8:]
        row = sheets.find_peminjaman_by_id(pid)
        if not row:
            await query.edit_message_text(f"⚠️ ID Peminjaman {esc(pid)} tidak ditemukan.")
            return
        if sheets._v(row, 14) != "waiting":
            await query.edit_message_text("⚠️ Peminjaman sudah diproses.")
            return

        sheets.update_peminjaman_status(pid, "declined", aslab_name)
        jenis_label = "Lab" if sheets._v(row, 4) == "lab" else "Barang"
        result_text = (
            f"❌ <b>Peminjaman DITOLAK</b>\n"
            f"🆔 ID: <code>{esc(pid)}</code>\n"
            f"🏷️ {jenis_label}: {esc(sheets._v(row, 5))}\n"
            f"👤 {esc(sheets._v(row, 6))}\n"
            f"👨‍💼 Diproses oleh: <b>{esc(aslab_name)}</b>"
        )
        if query.message.photo:
            await query.edit_message_caption(result_text, parse_mode="HTML")
        else:
            await query.edit_message_text(result_text, parse_mode="HTML")

        await context.bot.send_message(
            int(sheets._v(row, 2)),
            f"😔 <b>Peminjaman Anda DITOLAK</b>\n\n"
            f"🆔 ID: <code>{esc(pid)}</code>\n"
            f"🏷️ {jenis_label}: <b>{esc(sheets._v(row, 5))}</b>\n\n"
            f"👨‍💼 Ditolak oleh: <b>{esc(aslab_name)}</b>\n\n"
            "Silakan ajukan peminjaman baru dengan /pinjam.",
            parse_mode="HTML",
        )


# ── /ambil conversation (user foto kondisi awal saat ambil barang) ──

async def ambil_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    await update.message.reply_text(
        "📸 <b>Foto Kondisi Awal Barang</b>\n\n"
        "Masukkan <b>ID Peminjaman</b> barang yang ingin diambil:\n"
        "<i>(Gunakan /status untuk melihat ID)</i>",
        parse_mode="HTML",
    )
    return AMBIL_ID


async def ambil_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    pid = update.message.text.strip()
    user_id = str(update.effective_user.id)

    row = sheets.find_peminjaman_by_id(pid)
    if not row:
        await update.message.reply_text("❌ ID tidak ditemukan. Cek kembali dengan /status")
        return AMBIL_ID

    if sheets._v(row, 2) != user_id:
        await update.message.reply_text("⚠️ ID Peminjaman ini bukan milik Anda.")
        return AMBIL_ID

    if sheets._v(row, 4) != "barang":
        await update.message.reply_text("⚠️ Command ini hanya untuk peminjaman barang.")
        return AMBIL_ID

    if sheets._v(row, 14) != "approved":
        await update.message.reply_text("⚠️ Peminjaman belum disetujui.")
        return AMBIL_ID

    if sheets._v(row, 19):
        await update.message.reply_text("⚠️ Foto kondisi awal sudah pernah dikirim untuk ID ini.")
        return AMBIL_ID

    context.user_data["peminjamanId"] = pid
    context.user_data["rowData"] = row
    await update.message.reply_text(
        f"✅ ID <b>{esc(pid)}</b> ditemukan!\n"
        f"📦 Barang: <b>{esc(sheets._v(row, 5))}</b>\n\n"
        "📷 Kirimkan <b>foto kondisi barang saat ini</b> (sebelum dibawa):",
        parse_mode="HTML",
    )
    return AMBIL_FOTO


async def ambil_foto(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message.photo:
        await update.message.reply_text("⚠️ Kirimkan foto, bukan file lain.")
        return AMBIL_FOTO

    file_id = update.message.photo[-1].file_id
    d = context.user_data
    pid = d["peminjamanId"]
    row = d["rowData"]

    try:
        sheets.save_foto_ambil(pid, file_id)
    except Exception as e:
        logger.error(f"save_foto_ambil failed: {e}")
        await update.message.reply_text("❌ Gagal menyimpan foto. Coba lagi.")
        return ConversationHandler.END

    await update.message.reply_text(
        f"✅ <b>Foto kondisi awal tersimpan!</b>\n\n"
        f"🆔 ID: <code>{esc(pid)}</code>\n"
        "Selamat menggunakan barang. Jangan lupa kembalikan dengan /pengembalian.",
        parse_mode="HTML",
    )

    await context.bot.send_photo(
        GROUP_ASLAB_ID,
        file_id,
        caption=(
            f"📸 <b>FOTO KONDISI AWAL BARANG</b>\n\n"
            f"🆔 ID Peminjaman: <code>{esc(pid)}</code>\n"
            f"📦 Barang: <b>{esc(sheets._v(row, 5))}</b>\n"
            f"👤 Peminjam: <b>{esc(sheets._v(row, 6))}</b>"
        ),
        parse_mode="HTML",
    )

    context.user_data.clear()
    return ConversationHandler.END


# ── App setup ─────────────────────────────────────────────────

def main():
    import asyncio
    asyncio.set_event_loop(asyncio.new_event_loop())

    app = Application.builder().token(BOT_TOKEN).build()

    pinjam_conv = ConversationHandler(
        entry_points=[CommandHandler("pinjam", pinjam_start)],
        states={
            PILIH_JENIS:       [CallbackQueryHandler(pilih_jenis, pattern="^jenis_")],
            PILIH_ITEM:        [CallbackQueryHandler(pilih_item, pattern="^item_")],
            PILIH_JENIS_ITEM:  [CallbackQueryHandler(pilih_jenis_item, pattern="^item_count_")],
            INPUT_NAMA_BARANG: [MessageHandler(filters.TEXT & ~filters.COMMAND, input_nama_barang)],
            INPUT_JUMLAH:      [MessageHandler(filters.TEXT & ~filters.COMMAND, input_jumlah)],
            TAMBAH_ITEM:       [CallbackQueryHandler(tambah_item, pattern="^(tambah_item|selesai_item)$")],
            INPUT_NAMA:        [MessageHandler(filters.TEXT & ~filters.COMMAND, input_nama)],
            INPUT_KELAS:       [MessageHandler(filters.TEXT & ~filters.COMMAND, input_kelas)],
            INPUT_ANGKATAN:    [MessageHandler(filters.TEXT & ~filters.COMMAND, input_angkatan)],
            INPUT_NOHP:        [MessageHandler(filters.TEXT & ~filters.COMMAND, input_nohp)],
            INPUT_TANGGAL:     [MessageHandler(filters.TEXT & ~filters.COMMAND, input_tanggal)],
            INPUT_JAM_MULAI:   [MessageHandler(filters.TEXT & ~filters.COMMAND, input_jam_mulai)],
            INPUT_JAM_SELESAI: [MessageHandler(filters.TEXT & ~filters.COMMAND, input_jam_selesai)],
            INPUT_KETERANGAN:  [MessageHandler(filters.TEXT & ~filters.COMMAND, input_keterangan)],
            KONFIRMASI: [
                CallbackQueryHandler(konfirmasi_ya, pattern="^konfirmasi_ya$"),
                CallbackQueryHandler(konfirmasi_tidak, pattern="^konfirmasi_tidak$"),
            ],
        },
        fallbacks=[CommandHandler("batal", cancel)],
        allow_reentry=True,
    )

    pengembalian_conv = ConversationHandler(
        entry_points=[CommandHandler("pengembalian", pengembalian_start)],
        states={
            PENGEMBALIAN_ID:         [MessageHandler(filters.TEXT & ~filters.COMMAND, pengembalian_id)],
            PENGEMBALIAN_KETERANGAN: [MessageHandler(filters.TEXT & ~filters.COMMAND, pengembalian_keterangan)],
            PENGEMBALIAN_FOTO:       [MessageHandler(filters.PHOTO, pengembalian_foto)],
        },
        fallbacks=[CommandHandler("batal", cancel)],
        allow_reentry=True,
    )

    ambil_conv = ConversationHandler(
        entry_points=[CommandHandler("ambil", ambil_start)],
        states={
            AMBIL_ID:   [MessageHandler(filters.TEXT & ~filters.COMMAND, ambil_id)],
            AMBIL_FOTO: [MessageHandler(filters.PHOTO, ambil_foto)],
        },
        fallbacks=[CommandHandler("batal", cancel)],
        allow_reentry=True,
    )

    # Approval callbacks before conversation handlers so group buttons aren't swallowed
    app.add_handler(CallbackQueryHandler(handle_approval, pattern="^(approve|decline)"))
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(pinjam_conv)
    app.add_handler(pengembalian_conv)
    app.add_handler(ambil_conv)

    logger.info("Bot started (polling)...")
    app.run_polling(allowed_updates=["message", "callback_query"])


if __name__ == "__main__":
    main()
