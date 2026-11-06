/* Grand Minaro — Content Tracker data source.
   Reads the "Content Plan" tab of the Grand Minaro Content Tracker sheet (a Planner
   export) via the same gviz CSV endpoint as the Meta Ads data. Columns are found by
   header name, so re-ordering columns in the sheet doesn't break anything.
   Raw rows are cached in localStorage; src/gm-content-data.js is the offline fallback. */
import { parseCSV } from "./gm-source.js";

const SHEET_ID = "1xxAfJenCV2nNcBLj4N_lq0-xX1HOYp20Z-Pge7Jmq3Q";
const GID = "0"; // "Content Plan" tab
const CACHE_KEY = "gm-content-cache-v1";

export const CONTENT_SHEET = {
  id: SHEET_ID,
  editUrl: "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/edit#gid=" + GID,
};

/* Workflow stages = the sheet's "Bucket" column, in the order work moves through. */
export const STAGES = [
  { key: "shoot", label: "Shoot planned", short: "Shoot", bucket: "content shoot list", tone: "var(--purple)" },
  { key: "editing", label: "Editing", short: "Editing", bucket: "editing in progress", tone: "var(--blue)" },
  { key: "approval", label: "Waiting for approval", short: "Approval", bucket: "management approval", tone: "var(--accent)" },
  { key: "approved", label: "Approved", short: "Approved", bucket: "approved", tone: "var(--green)" },
  { key: "scheduled", label: "Scheduled", short: "Scheduled", bucket: "scheduled", tone: "var(--teal)" },
  { key: "published", label: "Published", short: "Published", bucket: "published", tone: "var(--gray)" },
];
const STAGE_BY_BUCKET = {};
STAGES.forEach(function (s) { STAGE_BY_BUCKET[s.bucket] = s; });
export function stageOf(key) {
  return STAGES.find(function (s) { return s.key === key; }) || { key: "other", label: "Other", short: "Other", tone: "var(--gray)" };
}

/* Planner labels mix three things: content type, topic, and the staff member.
   Planner's unnamed colour labels arrive as "category14" etc. — given friendly names
   here. Rename a label in Planner and the new name shows up as-is. */
const TYPE_LABELS = { reels: "Reel", reel: "Reel", flyer: "Flyer", flyers: "Flyer", video: "Video", photos: "Photo", photo: "Photo", category23: "Photo" };
const TOPIC_LABELS = {
  category21: "Day Out", category14: "Food & Dining", category22: "Food & Dining",
  category17: "Engagement", category9: "Homecoming", apperance: "Appearance",
};
export const STAFF = ["Adithya", "Adil", "Yohan"];
const STAFF_LC = STAFF.map(function (s) { return s.toLowerCase(); });

const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/* "30-Oct-2026", "04-Sep-2026 13:40", "2026-10-30", "10/30/2026" -> local Date (or null) */
export function parseSheetDate(v) {
  const s = String(v || "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})[-\s/]([A-Za-z]{3})[A-Za-z]*[-\s/,]+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m && MON[m[2].toLowerCase()] != null) return new Date(+m[3], MON[m[2].toLowerCase()], +m[1], +(m[4] || 0), +(m[5] || 0));
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    // gviz uses the sheet's US default (M/D/Y) unless the day can't be a month
    const a = +m[1], b = +m[2];
    const day = a > 12 ? a : b, mon = a > 12 ? b : a;
    return new Date(+m[3], mon - 1, day, +(m[4] || 0), +(m[5] || 0));
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
/* whole calendar days from `from` to `to` (positive when `from` is in the past) */
export function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86400000);
}

/* Raw sheet rows (header first) -> { items, lastSynced } */
export function normalizeContent(rows) {
  if (!rows || !rows.length) return { items: [], lastSynced: null };
  const head = rows[0].map(function (h) { return String(h || "").trim().toLowerCase(); });
  function col(name, fallback) { const i = head.indexOf(name); return i === -1 ? fallback : i; }
  const C = {
    id: col("task id", 0), name: col("task name", 1), bucket: col("bucket", 2), status: col("status", 3),
    start: col("start date", 4), due: col("due date", 5), labels: col("labels", 7), synced: col("last synced", 8),
  };
  const items = [];
  let lastSynced = null;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = String(r[C.name] || "").replace(/\s+/g, " ").trim();
    const bucket = String(r[C.bucket] || "").trim();
    const synced = parseSheetDate(r[C.synced]);
    if (synced && (!lastSynced || synced > lastSynced)) lastSynced = synced;
    // blank rows, and placeholder tasks named after their own bucket (e.g. a task called "Published")
    if (!name || name.toLowerCase() === bucket.toLowerCase()) continue;

    const stage = STAGE_BY_BUCKET[bucket.toLowerCase()];
    const labels = String(r[C.labels] || "").split(",").map(function (l) { return l.trim(); }).filter(Boolean);
    let staff = null;
    const types = [], topics = [];
    labels.forEach(function (l) {
      const lc = l.toLowerCase();
      if (TYPE_LABELS[lc]) { if (types.indexOf(TYPE_LABELS[lc]) === -1) types.push(TYPE_LABELS[lc]); return; }
      const si = STAFF_LC.indexOf(lc);
      if (si !== -1) { if (!staff) staff = STAFF[si]; return; }
      if (TOPIC_LABELS[lc]) { if (topics.indexOf(TOPIC_LABELS[lc]) === -1) topics.push(TOPIC_LABELS[lc]); return; }
      if (/^category\d+$/.test(lc)) return; // an unnamed Planner label we have no name for
      if (topics.indexOf(l) === -1) topics.push(l);
    });

    items.push({
      id: String(r[C.id] || "") || name + i,
      name: name,
      stage: stage ? stage.key : "other",
      stageLabel: stage ? stage.label : (bucket || "Other"),
      types: types,                       // e.g. ["Reel", "Photo"]
      topics: topics,
      staff: staff,
      start: parseSheetDate(r[C.start]),
      due: parseSheetDate(r[C.due]),
    });
  }
  return { items: items, lastSynced: lastSynced };
}

/* ---------- fetch + cache ---------- */
function url() {
  return "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:csv&gid=" + GID + "&_=" + Date.now();
}

// a real Content Plan export always has the Task Name and Bucket headers
function looksValid(rows) {
  if (!rows || rows.length < 2) return false;
  const head = rows[0].map(function (h) { return String(h || "").trim().toLowerCase(); });
  return head.indexOf("task name") !== -1 && head.indexOf("bucket") !== -1;
}

export function loadCachedContent() {
  try {
    const d = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (d && looksValid(d.rows)) return d;
  } catch (e) { /* corrupt cache — ignore */ }
  return null;
}

export function fetchContentRows() {
  return fetch(url(), { cache: "no-store" }).then(function (r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.text();
  }).then(function (text) {
    const rows = parseCSV(text);
    if (!looksValid(rows)) throw new Error("Content sheet returned no task rows");
    const d = { rows: rows, at: Date.now() };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) { /* quota/private mode — ignore */ }
    return d;
  });
}
