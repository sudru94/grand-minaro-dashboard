/* Grand Minaro — live Google Sheets data source.
   Reads the published spreadsheet (Monthly Summary + 10 monthly campaign tabs)
   via the gviz CSV endpoint, which is CORS-enabled for link-viewable sheets.
   Exposes window.fetchLiveData() -> Promise<{ monthly, campaigns, tabs, at }>.
   gm-data.js stays loaded as an offline fallback snapshot. */
(function () {
  var SHEET_ID = "1kxG_5NN9wG3BJTrarOJjD66nz-2gX7ByPOc5CV1dow0";
  var SUMMARY_GID = "282783909";

  // gid -> month label, in chronological order (matches the sheet tabs)
  var MONTH_TABS = [
    { month: "Aug 2025", gid: "2079107181" },
    { month: "Sep 2025", gid: "1857755795" },
    { month: "Oct 2025", gid: "756992376" },
    { month: "Nov 2025", gid: "100729649" },
    { month: "Dec 2025", gid: "304225380" },
    { month: "Jan 2026", gid: "1864239759" },
    { month: "Feb 2026", gid: "1294466495" },
    { month: "Mar 2026", gid: "1388647459" },
    { month: "Apr 2026", gid: "295500893" },
    { month: "May 2026", gid: "1518451156" }
  ];

  function url(gid) {
    return "https://docs.google.com/spreadsheets/d/" + SHEET_ID +
      "/gviz/tq?tqx=out:csv&gid=" + gid + "&_=" + Date.now();
  }

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

  function fetchCSV(gid) {
    return fetch(url(gid), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " (gid " + gid + ")");
      return r.text();
    }).then(parseCSV);
  }

  function fetchLiveData() {
    var jobs = [fetchCSV(SUMMARY_GID)];
    MONTH_TABS.forEach(function (t) {
      jobs.push(fetchCSV(t.gid).then(function (rows) { return parseCampaigns(rows, t.month); }));
    });
    return Promise.all(jobs).then(function (res) {
      var summaryRows = res[0];
      var order = {};
      MONTH_TABS.forEach(function (t, i) { order[t.month] = i; });
      var monthly = parseSummary(summaryRows).sort(function (a, b) {
        var ai = order[a.month] == null ? 99 : order[a.month];
        var bi = order[b.month] == null ? 99 : order[b.month];
        return ai - bi;
      });
      var totals = parseTotals(summaryRows);
      var campaigns = [];
      for (var i = 1; i < res.length; i++) campaigns = campaigns.concat(res[i]);
      return { monthly: monthly, campaigns: campaigns, totals: totals, tabs: MONTH_TABS.length + 1, at: Date.now() };
    });
  }

  window.GM_SHEET = {
    id: SHEET_ID,
    summaryGid: SUMMARY_GID,
    monthTabs: MONTH_TABS,
    editUrl: "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/edit"
  };
  window.fetchLiveData = fetchLiveData;
})();
