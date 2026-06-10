/* Grand Minaro — live Google Sheets data source.
   Reads the published spreadsheet via the gviz CSV endpoint (CORS-enabled for
   link-viewable sheets). Auto-discovers months from the Monthly Summary tab and
   fetches each month's campaign tab BY NAME — so newly added months (e.g. the
   current month-to-date) flow in automatically with no code change.
   Successful syncs are cached in localStorage (stale-while-revalidate) so repeat
   visits paint instantly. gm-data.js stays loaded as a last-resort fallback. */

const SHEET_ID = "1kxG_5NN9wG3BJTrarOJjD66nz-2gX7ByPOc5CV1dow0";
const SUMMARY_GID = "282783909"; // "Monthly Summary" tab (stable gid)
const CACHE_KEY = "gm-live-cache-v1";

const BASE = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:csv";

function gidUrl(gid) { return BASE + "&gid=" + gid + "&_=" + Date.now(); }
// monthly campaign tabs are named exactly like the summary labels ("Aug 2025", "Jun 2026", …)
function nameUrl(name) { return BASE + "&sheet=" + encodeURIComponent(name) + "&_=" + Date.now(); }

// RFC-4180-ish CSV parser -> array of rows (arrays of strings)
function parseCSV(text) {
  var rows = [], row = [], field = "", q = false, i = 0, n = text.length;
  while (i < n) {
    var c = text.charAt(i);
    if (q) {
      if (c === '"') {
        if (text.charAt(i + 1) === '"') { field += '"'; i += 2; continue; }
        q = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// strip "LKR", thousands commas and "%"; treat "-", "—", "", "N/A" as 0
function num(v) {
  if (v == null) return 0;
  var s = String(v).replace(/LKR/gi, "").replace(/,/g, "").replace(/%/g, "").trim();
  if (s === "" || s === "-" || s === "—" || /^n\/a$/i.test(s)) return 0;
  var f = parseFloat(s);
  return isNaN(f) ? 0 : f;
}

// TOTAL / GRAND TOTAL / Note rows that must not become data points.
// Matched by prefix only — real campaigns are named "Grand Minaro ..." and must survive.
function isMeta(name) {
  var s = (name || "").trim().toLowerCase();
  return s === "" ||
    s.indexOf("total") === 0 ||
    s.indexOf("grand total") === 0 ||
    s.indexOf("note") === 0;
}

function row11(r, extra) {
  var o = {
    spend: num(r[1]), impressions: num(r[2]), reach: num(r[3]), frequency: num(r[4]),
    cpm: num(r[5]), clicks: num(r[6]), ctr: num(r[7]), cpc: num(r[8]),
    msgConversations: num(r[9]), costPerMsgConv: num(r[10])
  };
  for (var k in extra) o[k] = extra[k];
  return o;
}

function parseSummary(rows) {
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var month = (rows[i][0] || "").trim();
    if (isMeta(month) || !/20\d{2}/.test(month)) continue;
    out.push(row11(rows[i], { month: month }));
  }
  return out;
}

// the GRAND TOTAL row carries the de-duplicated all-account reach & frequency
function parseTotals(rows) {
  for (var i = 1; i < rows.length; i++) {
    var name = (rows[i][0] || "").trim().toLowerCase();
    if (name.indexOf("grand total") === 0 || name.indexOf("total") === 0) {
      return row11(rows[i], {});
    }
  }
  return null;
}

function parseCampaigns(rows, month) {
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var name = (rows[i][0] || "").trim();
    if (isMeta(name)) continue;
    out.push(row11(rows[i], { campaignName: name, month: month }));
  }
  return out;
}

function fetchRows(u) {
  return fetch(u, { cache: "no-store" }).then(function (r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.text();
  }).then(parseCSV);
}

// ---------- localStorage cache (stale-while-revalidate) ----------
function saveCache(d) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) { /* quota/private mode — ignore */ }
}
export function loadCachedData() {
  try {
    var d = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (d && d.monthly && d.monthly.length && d.campaigns) return d;
  } catch (e) { /* corrupt cache — ignore */ }
  return null;
}

export function fetchLiveData() {
  // 1) read the Summary tab to discover which months exist
  return fetchRows(gidUrl(SUMMARY_GID)).then(function (summaryRows) {
    var monthly = parseSummary(summaryRows);     // chronological, as in the sheet
    var totals = parseTotals(summaryRows);
    var months = monthly.map(function (m) { return m.month; });

    // 2) fetch each month's campaign tab by name (auto-discovered). A missing or
    //    renamed tab fails soft (that month simply contributes no campaign rows).
    var jobs = months.map(function (name) {
      return fetchRows(nameUrl(name))
        .then(function (rows) { return parseCampaigns(rows, name); })
        .catch(function () { return []; });
    });

    return Promise.all(jobs).then(function (perMonth) {
      var campaigns = [];
      perMonth.forEach(function (list) { campaigns = campaigns.concat(list); });
      var result = { monthly: monthly, campaigns: campaigns, totals: totals, tabs: months.length + 1, at: Date.now() };
      saveCache(result);
      return result;
    });
  });
}

export const GM_SHEET = {
  id: SHEET_ID,
  summaryGid: SUMMARY_GID,
  editUrl: "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/edit"
};
