# Google Apps Script - Setup Telegram Full Flow

Script ini sekarang dirancang untuk flow peminjaman penuh lewat Telegram bot:

1. User daftar nomor HP di bot.
2. User isi form peminjaman langsung di chat bot lewat tombol dan input teks.
3. Bot simpan data ke Google Sheet.
4. Grup aslab menerima notifikasi dengan tombol `Approve` / `Decline`.
5. Hasil approve atau decline dikirim kembali ke chat ID peminjam.

## 1. Siapkan Google Spreadsheet

Buat spreadsheet baru lalu catat `Spreadsheet ID` dari URL:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

Gunakan sheet berikut:

| Nama Sheet | Fungsi |
| --- | --- |
| `Peminjaman` | Menyimpan data booking |
| `Jadwal Aslab` | Menyimpan aslab PJ per tanggal |
| `Users` | Mapping nomor HP, chat ID, state, draft form |
| `Debug Log` | Otomatis dibuat bila diperlukan |

Format `Jadwal Aslab`:

| Tanggal | Nama Aslab | No HP |
| --- | --- | --- |
| `29/04/2026` | `Budi S.` | `+6281234567890` |

## 2. Pasang Script di Google Apps Script

1. Buka `script.google.com`
2. Buat project baru
3. Copy isi file [Code.gs](/D:/programming/aslab-project/src/gas/Code.gs) ke editor
4. Update object `CONFIG`:

```javascript
var CONFIG = {
  SPREADSHEET_ID: "ID_SPREADSHEET_KAMU",
  SHEET_PEMINJAMAN: "Peminjaman",
  SHEET_ASLAB: "Jadwal Aslab",
  SHEET_USERS: "Users",
  TELEGRAM_BOT_TOKEN: "TOKEN_BOT_KAMU",
  TELEGRAM_CS_CHAT_ID: "-ID_GROUP_ASLAB",
  EXEC_URL: "URL_WEB_APP_KAMU",
  TIMEZONE: "Asia/Jakarta",
};
```

## 3. Deploy sebagai Web App

1. Klik `Deploy -> New deployment`
2. Pilih `Web app`
3. Set:
   - `Execute as: Me`
   - `Who has access: Anyone`
4. Klik `Deploy`
5. Copy URL hasil deploy
6. Tempel URL itu ke `CONFIG.EXEC_URL`
7. Deploy ulang bila `EXEC_URL` berubah

## 4. Aktifkan Webhook Telegram

Di editor Apps Script, jalankan fungsi:

```javascript
setupWebhook()
```

Kalau ingin reset webhook dan buang pending update:

```javascript
resetWebhookHard()
```

Cek status webhook:

```javascript
checkWebhook()
```

## 5. Flow User di Bot

Perintah utama:

- `/start` untuk registrasi nomor dan buka menu
- `/pinjam` untuk mulai form peminjaman
- `/status` untuk lihat daftar booking
- `/status BOOKxxxx` untuk lihat detail booking tertentu
- `/batalkan` untuk lihat daftar booking `WAITING`
- `/batalkan BOOKxxxx` untuk membatalkan booking tertentu
- `/batal` untuk menghentikan form yang sedang berjalan

Flow input user:

1. User kirim `/start`
2. User kirim nomor HP atau share contact
3. User pilih `Ajukan Peminjaman`
4. User isi nama, pilih kelas, angkatan, jenis peminjaman, item, tanggal, jam, dan keperluan
5. User klik `Kirim Permohonan`

## 6. Flow Approval Aslab

Saat booking masuk:

1. Grup aslab menerima detail booking
2. Ada tombol `Approve` dan `Decline`
3. Saat salah satu tombol ditekan:
   - status sheet diperbarui
   - info PJ disimpan jika approved
   - hasil dikirim ke chat ID peminjam

## 7. Catatan Penting

- Script ini tidak lagi bergantung pada React untuk submit peminjaman.
- `doPost` masih menyisakan fallback payload lama supaya migrasi tidak langsung memutus flow lama bila masih ada client yang belum dilepas.
- Kolom `Catatan` pada sheet `Peminjaman` dipakai untuk menyimpan metadata seperti `CHAT_ID` dan `SOURCE`.
- Jika token bot pernah terlanjur tersimpan di repo publik, sebaiknya lakukan rotate token di BotFather.

## 8. Debug

Fungsi bantu:

```javascript
debugBotIdentity()
debugUsers()
debugApproveManual()
resetUpdateId()
```

Kalau ada masalah:

- cek `Executions` di Apps Script
- cek sheet `Debug Log`
- pastikan bot sudah ada di grup aslab
- pastikan bot punya izin membaca callback button di grup
