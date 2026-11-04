/* Nokhada Workbench — small shared helpers. Pure functions, no DOM. */

/* Eastern Arabic (U+0660–0669) and Extended Arabic-Indic (U+06F0–06F9) digits
   become 0–9. The Arabic decimal separator (U+066B) becomes "." and the Arabic
   thousands separator (U+066C) becomes ",". */
export function normaliseDigits(value) {
  return String(value == null ? "" : value)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
}

function validYmd(y, m, d) {
  if (m < 1 || m > 12 || d < 1) return false;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= last;
}

function iso(y, m, d) {
  return String(y).padStart(4, "0") + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}

/* Accepts YYYY-MM-DD and DD/MM/YYYY (one- or two-digit day and month).
   Returns an ISO date string, or null if the text is not a real date. */
export function parseDate(value) {
  const s = normaliseDigits(value).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return validYmd(y, mo, d) ? iso(y, mo, d) : null;
  }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) {
    const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return validYmd(y, mo, d) ? iso(y, mo, d) : null;
  }
  return null;
}

/* Whole days since 1970-01-01 for an ISO date. */
export function dayNumber(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function isoFromDay(n) {
  const dt = new Date(n * 86400000);
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/* Inclusive day count: 2025-01-01 to 2025-01-31 is 31 days. */
export function daysInclusive(start, end) {
  return dayNumber(end) - dayNumber(start) + 1;
}

/* Days that two inclusive ranges share. */
export function overlapDays(aStart, aEnd, bStart, bEnd) {
  const s = Math.max(dayNumber(aStart), dayNumber(bStart));
  const e = Math.min(dayNumber(aEnd), dayNumber(bEnd));
  return Math.max(0, e - s + 1);
}

/* Splits an inclusive range into calendar-month pieces. */
export function monthSegments(start, end) {
  const out = [];
  let cur = dayNumber(start);
  const last = dayNumber(end);
  while (cur <= last) {
    const d = new Date(cur * 86400000);
    const monthEnd = Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0) / 86400000);
    const segEnd = Math.min(monthEnd, last);
    out.push({ start: isoFromDay(cur), end: isoFromDay(segEnd) });
    cur = segEnd + 1;
  }
  return out;
}

export function median(values) {
  if (!values.length) return null;
  const s = values.slice().sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function sum(values) {
  return values.reduce((a, b) => a + b, 0);
}

export function fmt(n, digits = 0) {
  if (n == null || Number.isNaN(n)) return "–";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/* Up to `max` decimals, trailing zeros dropped: 2.66155 → "2.66155", 0.4 → "0.4". */
export function fmtExact(n, max = 6) {
  if (n == null || Number.isNaN(n)) return "–";
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: max });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  return d + " " + MONTHS[m - 1] + " " + y;
}

export function fmtPeriod(start, end) {
  if (!start) return "";
  if (!end || start === end) return fmtDate(start);
  return fmtDate(start) + " – " + fmtDate(end);
}

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
}
