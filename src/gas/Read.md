# Google Apps Script — Setup Guide

## Langkah 1: Buat Google Spreadsheet

Buat spreadsheet baru di Google Sheets, lalu catat **Spreadsheet ID** dari URL-nya:

```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_ADA_DI_SINI/edit
```

Buat 3 sheet dengan nama persis seperti ini:
| Nama Sheet | Keterangan |
|----------------|---------------------------------------|
| `Peminjaman` | Data peminjaman masuk (auto dibuat) |
| `Jadwal Aslab` | Jadwal piket aslab per hari |
| `Users` | Mapping nomor HP → Telegram Chat ID |

### Format Sheet "Jadwal Aslab"

| Tanggal (dd/MM/yyyy) | Nama Aslab | No HP (+62...) |
| -------------------- | ---------- | -------------- |
| 08/04/2026           | Budi S.    | +6281234567890 |

### Format Sheet "Users"

| No HP (+62...) | Telegram Chat ID |
| -------------- | ---------------- |
| +6281234567890 | 123456789        |

> **Cara dapat Telegram Chat ID peminjam:** Minta peminjam kirim pesan ke bot kamu dulu (/start), lalu jalankan `getUpdates` di browser:
> `https://api.telegram.org/botTOKEN_KAMU/getUpdates`

---

## Langkah 2: Buat Apps Script Project

1. Buka [script.google.com](https://script.google.com)
2. Klik **New Project**
3. Copy-paste seluruh isi `Code.gs` ke editor
4. **PENTING:** Update bagian `CONFIG` di baris paling atas:

```javascript
var CONFIG = {
  SPREADSHEET_ID: "ID_SPREADSHEET_KAMU",
  SHEET_PEMINJAMAN: "Peminjaman",
  SHEET_ASLAB: "Jadwal Aslab",
  TELEGRAM_BOT_TOKEN: "TOKEN_BOT_KAMU",
  TELEGRAM_CS_CHAT_ID: "-ID_GROUP_CS_KAMU", // pakai minus kalau group
};
```

5. Juga **ganti fungsi `doPost`** dengan versi yang ada di comment bawah file (yang handle dua source: React + Telegram webhook)

---

## Langkah 3: Deploy sebagai Web App

1. Klik **Deploy** → **New Deployment**
2. Pilih type: **Web app**
3. Settings:
   - Execute as: **Me**
   - Who has access: **Anyone** (penting! agar frontend bisa POST)
4. Klik **Deploy**
5. Copy **Web App URL** → simpan untuk langkah berikutnya

---

## Langkah 4: Setup di Frontend (.env)

Buka `.env` di project React, tambahkan:

```
VITE_GAS_URL=https://script.google.com/macros/s/XXXX/exec
```

> **Keamanan:** Bot token sekarang tersimpan di Apps Script (server-side), bukan di frontend. Aman! ✅

---

## Langkah 5: Setup Telegram Webhook

Di Apps Script editor, jalankan fungsi `setupWebhook` **sekali saja**:

1. Pilih fungsi `setupWebhook` dari dropdown
2. Klik **Run**
3. Cek **Execution Log** — harus ada `"ok": true`

Ini mendaftarkan GAS URL kamu sebagai penerima callback tombol Approve/Decline dari Telegram.

---

## Langkah 6: Test Flow

1. Buka website → klik **Pinjam Lab / Alat**
2. Isi form → Submit
3. Cek grup Telegram CS → harus muncul notifikasi dengan tombol Approve/Decline
4. Klik **Approve**
5. Cek Spreadsheet → status berubah jadi `APPROVED`
6. Peminjam dapat pesan Telegram (jika sudah register via bot)

---

## Troubleshooting

**Form submit tapi tidak ada notif Telegram:**

- Cek Execution Log di Apps Script (View → Execution Log)
- Pastikan `TELEGRAM_CS_CHAT_ID` benar (group pakai prefix `-`)

**Tombol Approve/Decline tidak respon:**

- Jalankan `setupWebhook` lagi
- Pastikan GAS deployment sudah di-redeploy setelah edit kode

**Peminjam tidak dapat notif:**

- Pastikan peminjam sudah pernah /start ke bot
- Cek sheet `Users` apakah chat_id sudah terisi
