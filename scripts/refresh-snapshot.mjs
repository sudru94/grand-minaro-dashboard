/* Regenerates src/gm-data.js (the baked offline fallback) from the live Google Sheet.
   Uses the same gviz CSV endpoints and parsing rules as src/gm-source.js.
   Run: npm run refresh-snapshot */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SHEET_ID = "1kxG_5NN9wG3BJTrarOJjD66nz-2gX7ByPOc5CV1dow0";
const SUMMARY_GID = "282783909";
const BASE = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

function parseCSV(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
      continue;
    }
    if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") { /* skip */ }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function num(v) {
  if (v == null) return 0;
  const s = String(v).replace(/LKR/gi, "").replace(/,/g, "").replace(/%/g, "").trim();
  if (s === "" || s === "-" || s === "—" || /^n\/a$/i.test(s)) return 0;
  const f = parseFloat(s);
  return isNaN(f) ? 0 : f;
}

function isMeta(name) {
  const s = (name || "").trim().toLowerCase();
  return s === "" || s.startsWith("total") || s.startsWith("grand total") || s.startsWith("note");
}

const MONTH_LABEL = /^[A-Z][a-z]{2} 20\d{2}$/;
const hasFigures = (o) => o.spend !== 0 || o.impressions !== 0 || o.clicks !== 0;

function row11(r, extra) {
  return {
    ...extra,
    spend: num(r[1]), impressions: num(r[2]), reach: num(r[3]), frequency: num(r[4]),
    cpm: num(r[5]), clicks: num(r[6]), ctr: num(r[7]), cpc: num(r[8]),
    msgConversations: num(r[9]), costPerMsgConv: num(r[10]),
  };
}

async function fetchRows(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return parseCSV(await r.text());
}

const summaryRows = await fetchRows(`${BASE}&gid=${SUMMARY_GID}`);
const monthly = [];
for (let i = 1; i < summaryRows.length; i++) {
  const month = (summaryRows[i][0] || "").trim();
  if (isMeta(month) || !MONTH_LABEL.test(month)) continue;
  const { spend, impressions, reach, frequency, cpm, clicks, ctr, cpc, msgConversations, costPerMsgConv } = row11(summaryRows[i], {});
  monthly.push({ month, spend, impressions, reach, frequency, cpm, clicks, ctr, cpc, msgConversations, costPerMsgConv });
}
// the GRAND TOTAL row carries the all-account reach & frequency used by "All Time"
let totals = null;
for (let i = 1; i < summaryRows.length; i++) {
  const name = (summaryRows[i][0] || "").trim().toLowerCase();
  if (name.startsWith("grand total") || name.startsWith("total")) { totals = row11(summaryRows[i], {}); break; }
}
if (!monthly.length) throw new Error("No months parsed from the Monthly Summary tab — aborting (existing snapshot left untouched).");

const campaigns = [];
for (const m of monthly) {
  const rows = await fetchRows(`${BASE}&sheet=${encodeURIComponent(m.month)}`);
  for (let i = 1; i < rows.length; i++) {
    const name = (rows[i][0] || "").trim();
    if (isMeta(name) || MONTH_LABEL.test(name)) continue;
    if (!hasFigures(row11(rows[i], {}))) continue;
    const { spend, impressions, reach, frequency, cpm, clicks, ctr, cpc, msgConversations, costPerMsgConv } = row11(rows[i], {});
    campaigns.push({ campaignName: name, month: m.month, spend, impressions, reach, frequency, cpm, clicks, ctr, cpc, msgConversations, costPerMsgConv });
  }
  console.log(`  ${m.month}: ${campaigns.filter((c) => c.month === m.month).length} campaigns`);
}

const range = `${monthly[0].month} – ${monthly[monthly.length - 1].month}`;
const out = `/* Grand Minaro — baked Meta Ads snapshot (${range}). Spend in LKR. Conversions = WhatsApp/Messenger chats started. */
/**
 * Offline fallback snapshot of the Grand Minaro Meta Ads spreadsheet.
 * Regenerate with: npm run refresh-snapshot
 * Generated: ${new Date().toISOString()}
 */

window.GM_MONTHLY = ${JSON.stringify(monthly, null, 2)};

window.GM_CAMPAIGNS = ${JSON.stringify(campaigns, null, 2)};

window.GM_TOTALS = ${JSON.stringify(totals, null, 2)};
`;

const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "gm-data.js");
writeFileSync(dest, out);
console.log(`\nWrote ${dest}: ${monthly.length} months, ${campaigns.length} campaigns (${range}).`);

// ---- Content Tracker (separate sheet): raw rows, normalised at runtime by src/gm-content-source.js ----
const CONTENT_SHEET_ID = "1xxAfJenCV2nNcBLj4N_lq0-xX1HOYp20Z-Pge7Jmq3Q";
try {
  const contentRows = await fetchRows(`https://docs.google.com/spreadsheets/d/${CONTENT_SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`);
  const head = (contentRows[0] || []).map((h) => String(h).trim().toLowerCase());
  if (!head.includes("task name") || !head.includes("bucket") || contentRows.length < 2) throw new Error("no task rows");
  const body = contentRows.map((r) => "  " + JSON.stringify(r)).join(",\n");
  const contentOut = `/* Grand Minaro — baked Content Tracker snapshot (offline fallback for the Content section).
 * Raw sheet rows (header first); src/gm-content-source.js normalises them at runtime.
 * Regenerate with: npm run refresh-snapshot
 * Generated: ${new Date().toISOString()}
 */

window.GM_CONTENT_ROWS = [
${body}
];
`;
  const contentDest = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "gm-content-data.js");
  writeFileSync(contentDest, contentOut);
  console.log(`Wrote ${contentDest}: ${contentRows.length - 1} content rows.`);
} catch (e) {
  console.warn(`Content Tracker snapshot skipped (${e.message}) — existing src/gm-content-data.js left untouched.`);
}
