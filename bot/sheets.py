import json
import logging
import os
import random
from datetime import datetime

logger = logging.getLogger(__name__)

import gspread
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

load_dotenv()

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SPREADSHEET_ID = os.environ["SPREADSHEET_ID"]

_gc = None


def _client():
    global _gc
    if _gc is None:
        creds_info = json.loads(os.environ["GOOGLE_CREDENTIALS"])
        creds = Credentials.from_service_account_info(creds_info, scopes=SCOPES)
        _gc = gspread.authorize(creds)
    return _gc


def _sheet(name: str):
    ss = _client().open_by_key(SPREADSHEET_ID)
    try:
        return ss.worksheet(name)
    except gspread.WorksheetNotFound:
        return ss.add_worksheet(name, rows=1000, cols=20)


PEMINJAMAN_HEADERS = [
    "ID", "Timestamp", "User ID", "Username", "Jenis", "Nama Item",
    "Nama", "Kelas", "Angkatan", "No HP", "Tanggal Pinjam",
    "Jam Mulai", "Jam Selesai", "Keterangan", "Status Pinjam",
    "Status Kembali", "Nama Aslab", "Catatan Aslab",
    "Jumlah", "File ID Foto Awal",
]
PENGEMBALIAN_HEADERS = [
    "ID Pengembalian", "ID Peminjaman", "Timestamp", "User ID", "Username",
    "Nama Item", "Keterangan Kembali", "File ID Foto", "Status",
]


def _ensure_headers(ws, headers):
    existing = ws.row_values(1)
    if not existing:
        ws.update([headers], "A1")
    elif existing != headers:
        first = existing[0] if existing else ""
        if first.startswith(("PJM-", "RET-")):
            logger.critical(
                "_ensure_headers: row 1 looks like real data (first_cell=%r) — refusing to overwrite", first
            )
            raise RuntimeError(f"Sheet row 1 contains data, not headers: {first!r}")
        logger.warning("_ensure_headers: row 1 differs from expected headers (first_cell=%r)", first)


def _gen_id(prefix="PJM") -> str:
    ts = datetime.now().strftime("%y%m%d%H%M%S")
    rand = str(random.randint(0, 999)).zfill(3)
    return f"{prefix}-{ts}-{rand}"


def _timestamp() -> str:
    return datetime.now().strftime("%d/%m/%Y %H:%M:%S")


def _v(row: list, i: int, default="") -> str:
    return row[i] if i < len(row) else default


def _norm_status(s) -> str:
    return (s or "").strip().casefold()


_COLORS = {
    "green":  {"red": 0.714, "green": 0.843, "blue": 0.659},  # approved / returned
    "red":    {"red": 0.918, "green": 0.600, "blue": 0.600},  # declined
    "yellow": {"red": 1.000, "green": 0.949, "blue": 0.800},  # waiting
    "orange": {"red": 0.988, "green": 0.894, "blue": 0.839},  # waiting_return
}

_STATUS_COLOR = {
    "waiting":        "yellow",
    "approved":       "green",
    "declined":       "red",
    "waiting_return": "orange",
    "returned":       "green",
    "return_declined":"red",
}


def _color_row(ws, row_idx: int, last_col: str, status: str):
    color_key = _STATUS_COLOR.get(status)
    if not color_key:
        return
    bg = _COLORS[color_key]
    ws.format(f"A{row_idx}:{last_col}{row_idx}", {"backgroundColor": bg})


# ── Peminjaman ──────────────────────────────────────────────

def add_peminjaman(data: dict, user_id: str, user_name: str) -> str:
    ws = _sheet("Peminjaman")
    _ensure_headers(ws, PEMINJAMAN_HEADERS)
    new_row = len(ws.get_all_values()) + 1
    pid = _gen_id("PJM")
    ws.update([[
        pid, _timestamp(), user_id, user_name,
        data["jenis"], data["namaItem"],
        data["nama"], data["kelas"], data["angkatan"], data["noHp"],
        data["tanggal"], data["jamMulai"], data["jamSelesai"], data["keterangan"],
        "waiting", "", "", "",
        data.get("jumlah", ""),
        "",
    ]], f"A{new_row}")
    _color_row(ws, new_row, "T", "waiting")
    return pid


def save_foto_ambil(pid: str, file_id: str):
    ws = _sheet("Peminjaman")
    for i, r in enumerate(ws.get_all_values(), start=1):
        if _v(r, 0) == PEMINJAMAN_HEADERS[0]:
            continue
        if _v(r, 0) == pid:
            ws.update_cell(i, 20, file_id)
            return


def get_peminjaman_by_user(user_id: str) -> list:
    rows = _sheet("Peminjaman").get_all_values()
    return [r for r in rows if _v(r, 0) != PEMINJAMAN_HEADERS[0] and _v(r, 2) == user_id]


def find_peminjaman_by_id(pid: str) -> list | None:
    rows = _sheet("Peminjaman").get_all_values()
    for r in rows:
        if _v(r, 0) == PEMINJAMAN_HEADERS[0]:
            continue
        if _v(r, 0) == pid:
            return r
    return None


def get_peminjaman_user_id(pid: str) -> str | None:
    row = find_peminjaman_by_id(pid)
    return _v(row, 2) if row else None


def update_peminjaman_status(pid: str, status: str, aslab_name: str):
    ws = _sheet("Peminjaman")
    for i, r in enumerate(ws.get_all_values(), start=1):
        if _v(r, 0) == PEMINJAMAN_HEADERS[0]:
            continue
        if _v(r, 0) == pid:
            ws.update_cell(i, 15, status)
            ws.update_cell(i, 17, aslab_name)
            _color_row(ws, i, "T", status)
            return


def update_peminjaman_return_status(pid: str, status: str):
    ws = _sheet("Peminjaman")
    for i, r in enumerate(ws.get_all_values(), start=1):
        if _v(r, 0) == PEMINJAMAN_HEADERS[0]:
            continue
        if _v(r, 0) == pid:
            ws.update_cell(i, 16, status)
            _color_row(ws, i, "T", status)
            return


# ── Pengembalian ─────────────────────────────────────────────

def add_pengembalian(
    peminjaman_id: str, user_id: str, user_name: str,
    nama_item: str, keterangan: str, file_id: str,
) -> str:
    ws = _sheet("Pengembalian")
    _ensure_headers(ws, PENGEMBALIAN_HEADERS)
    new_row = len(ws.get_all_values()) + 1
    rid = _gen_id("RET")
    ws.update([[
        rid, peminjaman_id, _timestamp(), user_id, user_name,
        nama_item, keterangan, file_id, "waiting_return",
    ]], f"A{new_row}")
    _color_row(ws, new_row, "I", "waiting_return")
    return rid


def find_pengembalian_by_id(rid: str) -> list | None:
    rows = _sheet("Pengembalian").get_all_values()
    for r in rows:
        if _v(r, 0) == PENGEMBALIAN_HEADERS[0]:
            continue
        if _v(r, 0) == rid:
            return r
    return None


def update_pengembalian_status(rid: str, status: str):
    ws = _sheet("Pengembalian")
    for i, r in enumerate(ws.get_all_values(), start=1):
        if _v(r, 0) == PENGEMBALIAN_HEADERS[0]:
            continue
        if _v(r, 0) == rid:
            ws.update_cell(i, 9, status)
            _color_row(ws, i, "I", status)
            return


# ── Atomic claim helpers (idempotent approve/decline) ─────────

def claim_peminjaman(pid: str, new_status: str, aslab_name: str, *, expect: str = "waiting") -> list | None:
    ws = _sheet("Peminjaman")
    rows = ws.get_all_values()
    for i, r in enumerate(rows, start=1):
        if _v(r, 0) == PEMINJAMAN_HEADERS[0]:
            continue
        if _v(r, 0) != pid:
            continue
        actual = _norm_status(_v(r, 14))
        if actual != expect:
            logger.warning(
                "claim_peminjaman: pid=%s row=%d len=%d status=%r expected=%r",
                pid, i, len(r), _v(r, 14), expect,
            )
            return None
        ws.update_cell(i, 15, new_status)
        ws.update_cell(i, 17, aslab_name)
        _color_row(ws, i, "T", new_status)
        if len(r) < 17:
            r += [""] * (17 - len(r))
        r[14] = new_status
        r[16] = aslab_name
        return r
    logger.warning("claim_peminjaman: pid=%s not found", pid)
    return None


def claim_pengembalian(rid: str, new_status: str, aslab_name: str, *, expect: str = "waiting_return") -> list | None:
    ws = _sheet("Pengembalian")
    rows = ws.get_all_values()
    for i, r in enumerate(rows, start=1):
        if _v(r, 0) == PENGEMBALIAN_HEADERS[0]:
            continue
        if _v(r, 0) != rid:
            continue
        actual = _norm_status(_v(r, 8))
        if actual != expect:
            logger.warning(
                "claim_pengembalian: rid=%s row=%d len=%d status=%r expected=%r",
                rid, i, len(r), _v(r, 8), expect,
            )
            return None
        ws.update_cell(i, 9, new_status)
        _color_row(ws, i, "I", new_status)
        pid = _v(r, 1)
        if pid:
            update_peminjaman_return_status(pid, new_status)
        if len(r) < 9:
            r += [""] * (9 - len(r))
        r[8] = new_status
        return r
    logger.warning("claim_pengembalian: rid=%s not found", rid)
    return None
