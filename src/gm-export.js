/* Grand Minaro — client report exports (CSV downloads).
   Values come from the Google Sheet (untrusted), so string cells are guarded
   against CSV formula injection before quoting. */
import { categoryOf } from "./gm-core.jsx";

function esc(v) {
  if (typeof v === "number") return isFinite(v) ? String(v) : "";
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // formula-injection guard
  if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function download(filename, headers, rows) {
  const lines = [headers.map(esc).join(",")].concat(rows.map(function (r) { return r.map(esc).join(","); }));
  // BOM so Excel opens UTF-8 (rupee signs, dashes) correctly
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
}

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function stamp() { return new Date().toISOString().slice(0, 10); }
const r2 = function (n) { return Math.round(n * 100) / 100; };

/* Campaign-level report for the selected period (or all time). */
export function exportCampaignsCSV(campaigns, selectedMonth) {
  const isAll = selectedMonth === "All Time";
  const rows = campaigns
    .filter(function (c) { return isAll || c.month === selectedMonth; })
    .slice().sort(function (a, b) { return b.spend - a.spend; })
    .map(function (c) {
      return [c.campaignName, c.month, categoryOf(c.campaignName), r2(c.spend), c.impressions, c.reach,
        c.frequency, r2(c.cpm), c.clicks, c.ctr, r2(c.cpc), c.msgConversations, r2(c.costPerMsgConv)];
    });
  download(
    "grand-minaro-campaigns-" + slug(selectedMonth) + "-" + stamp() + ".csv",
    ["Campaign", "Month", "Category", "Spend (LKR)", "Impressions", "Reach", "Frequency", "CPM (LKR)", "Clicks", "CTR (%)", "CPC (LKR)", "Chats Started", "Cost per Chat (LKR)"],
    rows
  );
}

/* Month-by-month account summary, with the grand-total row when available. */
export function exportMonthlyCSV(monthly, totals) {
  const rows = monthly.map(function (m) {
    return [m.month, r2(m.spend), m.impressions, m.reach, m.frequency, r2(m.cpm), m.clicks, m.ctr, r2(m.cpc), m.msgConversations, r2(m.costPerMsgConv)];
  });
  if (totals) {
    rows.push(["GRAND TOTAL", r2(totals.spend), totals.impressions, totals.reach, totals.frequency,
      r2(totals.cpm), totals.clicks, totals.ctr, r2(totals.cpc), totals.msgConversations, r2(totals.costPerMsgConv)]);
  }
  download(
    "grand-minaro-monthly-summary-" + stamp() + ".csv",
    ["Month", "Spend (LKR)", "Impressions", "Reach", "Frequency", "CPM (LKR)", "Clicks", "CTR (%)", "CPC (LKR)", "Chats Started", "Cost per Chat (LKR)"],
    rows
  );
}
