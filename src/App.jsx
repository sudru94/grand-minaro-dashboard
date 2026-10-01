/* Grand Minaro — main app: glass toolbar, title + period, KPI tiles, sections */
import { useState, useEffect, useCallback, useRef } from "react";
import { formatLKR, fmtNum, Sparkline, TrendChip } from "./gm-core.jsx";
import { TrendsChart, CategorySplit } from "./gm-charts.jsx";
import { Insights, categoryAggregates } from "./gm-insights.jsx";
import { CampaignTable } from "./gm-table.jsx";
import { ActiveCampaigns, TopCampaign } from "./gm-highlights.jsx";
import { exportCampaignsCSV, exportMonthlyCSV } from "./gm-export.js";
import { fetchLiveData, loadCachedData, GM_SHEET } from "./gm-source.js";
import monoSrc from "../assets/gm-monogram.png";

/* ---- inline icons ---- */
const IC = {
  refresh: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>,
  share: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>,
  chevron: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 9 5 5 5-5" /></svg>,
};

function LineIcon({ name, size = 18 }) {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    performance: <><path d="M4 4v16h16" /><path d="m7 14 4-5 4 3 5-7" /></>,
    campaigns: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M8 5V3h8v2M3 11h18M10 11v3h4v-3" /></>,
    insights: <><path d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0l-1 2H9z" /></>,
    sheet: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M4 9h16M4 15h16M10 9v12" /></>,
    spend: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h3" /></>,
    chats: <><path d="M21 11a8 8 0 0 1-8 8H7l-4 3V11a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z" /><path d="M8 11h8M8 15h5" /></>,
    reach: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 20v-2a6 6 0 0 0-4-5" /></>,
    ctr: <><path d="m5 3 14 9-7 1-3 7zM14 14l5 6" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Performance" },
  { id: "campaigns", label: "Campaigns" },
  { id: "insights", label: "Insights" },
];

function KPICard(p) {
  return (
    <div className={"kpi kpi-" + p.icon}>
      <div className="kpi-top"><div className="kpi-label">{p.label}{p.badge && <span className="badge">{p.badge}</span>}</div><span className="kpi-icon"><LineIcon name={p.icon} /></span></div>
      <div className="kpi-value">{p.value}</div>
      <div className="kpi-foot">
        <div>
          <div className="kpi-sub">{p.sub}</div>
          {p.trend != null && <TrendChip value={p.trend} invert={p.trendInvert} label={p.trendLabel} />}
        </div>
        {p.spark && <Sparkline data={p.spark.data} color={p.spark.color} id={p.label} />}
      </div>
    </div>
  );
}

function computeKPIs(summary, selectedMonth) {
  const isAll = selectedMonth === "All Time";
  let spend, imps, reach, clicks, chats, freq, prev;
  if (isAll) {
    const totals = window.GM_TOTALS || null;
    spend = summary.reduce(function (s, m) { return s + m.spend; }, 0);
    imps = summary.reduce(function (s, m) { return s + m.impressions; }, 0);
    // de-duplicated grand-total reach & frequency come straight off the sheet's GRAND TOTAL row
    reach = totals && totals.reach ? totals.reach : 1914301;
    clicks = summary.reduce(function (s, m) { return s + m.clicks; }, 0);
    chats = summary.reduce(function (s, m) { return s + m.msgConversations; }, 0);
    freq = totals && totals.frequency ? totals.frequency : 2.40;
  } else {
    const idx = summary.findIndex(function (m) { return m.month === selectedMonth; });
    const it = summary[idx];
    spend = it.spend; imps = it.impressions; reach = it.reach; clicks = it.clicks; chats = it.msgConversations; freq = it.frequency;
    if (idx > 0) prev = summary[idx - 1];
  }
  const ctr = imps > 0 ? clicks / imps * 100 : 0;
  const cpm = imps > 0 ? spend / imps * 1000 : 0;
  const cpa = chats > 0 ? spend / chats : 0;
  const tr = function (cur, key) { return prev && prev[key] ? (cur - prev[key]) / prev[key] * 100 : null; };
  const series = function (key) {
    if (isAll) return summary.map(function (m) { return m[key]; });
    const idx = summary.findIndex(function (m) { return m.month === selectedMonth; });
    return summary.slice(Math.max(0, idx - 5), idx + 1).map(function (m) { return m[key]; });
  };
  return { spend: spend, imps: imps, reach: reach, clicks: clicks, chats: chats, freq: freq, ctr: ctr, cpm: cpm, cpa: cpa,
    prevLabel: prev ? "vs " + prev.month.split(" ")[0] : null,
    spendTr: tr(spend, "spend"), chatsTr: tr(chats, "msgConversations"), reachTr: tr(reach, "reach"),
    s_spend: series("spend"), s_chats: series("msgConversations"), s_reach: series("reach"), s_ctr: series("ctr") };
}

function relTime(ts) {
  if (!ts) return "";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.round(s / 60) + "m ago";
  return Math.round(s / 3600) + "h ago";
}

// hydrate once from the last successful sync so repeat visits paint instantly
const CACHED = loadCachedData();
if (CACHED && CACHED.totals) window.GM_TOTALS = CACHED.totals;

export default function App() {
  const sheetUrl = GM_SHEET.editUrl;
  const [summary, setSummary] = useState(CACHED ? CACHED.monthly : (window.GM_MONTHLY || []));
  const [campaigns, setCampaigns] = useState(CACHED ? CACHED.campaigns : (window.GM_CAMPAIGNS || []));
  const [sync, setSync] = useState(CACHED
    ? { state: "live", at: CACHED.at, tabs: CACHED.tabs }
    : { state: "loading", at: null, tabs: 11 });
  const [sel, setSel] = useState("All Time");
  const [exportOpen, setExportOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const exportTriggerRef = useRef(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [, setTick] = useState(0); // keeps "synced Xm ago" honest between refreshes

  useEffect(function () {
    const id = setInterval(function () { setTick(function (t) { return t + 1; }); }, 30000);
    return function () { clearInterval(id); };
  }, []);

  useEffect(function () {
    function trackSection() {
      let current = "overview";
      NAV_ITEMS.forEach(function (item) {
        const section = document.getElementById(item.id);
        if (section && section.getBoundingClientRect().top <= 180) current = item.id;
      });
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) current = "insights";
      setActiveSection(current);
    }
    window.addEventListener("scroll", trackSection, { passive: true });
    return function () { window.removeEventListener("scroll", trackSection); };
  }, []);

  // close the export menu on any outside click or Escape
  useEffect(function () {
    if (!exportOpen) return;
    document.querySelector(".menu [role=menuitem]")?.focus();
    function close(e) { if (!e.target.closest(".export-wrap")) setExportOpen(false); }
    function esc(e) { if (e.key === "Escape") { setExportOpen(false); exportTriggerRef.current?.focus(); } }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return function () { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [exportOpen]);

  // PDF report: enter report mode (table fully expanded), print, then restore
  useEffect(function () {
    if (!printing) return;
    const t = setTimeout(function () { window.print(); }, 80); // let report mode render first
    function done() { setPrinting(false); }
    window.addEventListener("afterprint", done);
    return function () { clearTimeout(t); window.removeEventListener("afterprint", done); };
  }, [printing]);

  const loadLive = useCallback(function (quiet) {
    if (quiet !== true) setSync(function (s) { return { state: "loading", at: s.at, tabs: s.tabs }; });
    fetchLiveData().then(function (d) {
      if (d && d.monthly && d.monthly.length) {
        window.GM_MONTHLY = d.monthly;
        window.GM_CAMPAIGNS = d.campaigns;
        window.GM_TOTALS = d.totals || null;
        setSummary(d.monthly);
        setCampaigns(d.campaigns);
        setSync({ state: "live", at: d.at, tabs: d.tabs });
      } else {
        setSync({ state: "baked", at: null, tabs: 11 });
      }
    }).catch(function (e) {
      console.warn("Live sheet sync failed — showing last good data:", e);
      // if cached/live data is already on screen, keep it instead of flashing an error
      setSync(function (s) { return s.state === "live" ? s : { state: "error", at: null, tabs: s.tabs }; });
    });
  }, []);

  // revalidate on load — quietly when cache already painted the page
  useEffect(function () { loadLive(Boolean(CACHED)); }, [loadLive]);

  // keep the latest sync time + printing flag in refs for the auto-refresh loop
  const lastSyncRef = useRef(0);
  const printingRef = useRef(false);
  useEffect(function () { if (sync.at) lastSyncRef.current = sync.at; }, [sync.at]);
  useEffect(function () { printingRef.current = printing; }, [printing]);

  // live auto-refresh: quietly re-sync when the tab regains focus (e.g. after editing
  // the sheet in another tab) and on a gentle background poll while visible — so the
  // dashboard reflects sheet edits without a manual reload.
  useEffect(function () {
    const POLL = 90000, MIN_GAP = 15000;
    function maybeRefresh() {
      if (document.visibilityState !== "visible" || printingRef.current) return;
      if (Date.now() - lastSyncRef.current < MIN_GAP) return;
      loadLive(true);
    }
    const id = setInterval(maybeRefresh, POLL);
    document.addEventListener("visibilitychange", maybeRefresh);
    window.addEventListener("focus", maybeRefresh);
    return function () {
      clearInterval(id);
      document.removeEventListener("visibilitychange", maybeRefresh);
      window.removeEventListener("focus", maybeRefresh);
    };
  }, [loadLive]);

  // first-visit loading pulse on the headline figures
  useEffect(function () {
    document.body.classList.toggle("gm-loading", sync.state === "loading");
    return function () { document.body.classList.remove("gm-loading"); };
  }, [sync.state]);

  // guard: if a month is selected that the live data doesn't contain, fall back to All Time
  useEffect(function () {
    if (sel !== "All Time" && !summary.some(function (m) { return m.month === sel; })) setSel("All Time");
  }, [summary]);

  const months = ["All Time"].concat(summary.map(function (m) { return m.month; }).slice().reverse());
  const k = computeKPIs(summary, sel);
  const cats = categoryAggregates(campaigns, sel);

  const monthCount = summary.length;
  const rangeLabel = monthCount ? summary[0].month + " – " + summary[monthCount - 1].month : "";

  const status = {
    loading: { dot: "dot pulse", text: "Syncing…" },
    live: { dot: "dot", text: "Live · synced " + relTime(sync.at) },
    baked: { dot: "dot warn", text: "Offline snapshot" },
    error: { dot: "dot err", text: "Couldn’t sync · showing saved data" }
  }[sync.state] || { dot: "dot", text: "" };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#overview">Skip to dashboard</a>
      <aside className="sidebar" aria-label="Dashboard sidebar">
        <a className="sidebar-brand" href="#overview">
          <span className="brand-mark"><img src={monoSrc} alt="" /></span>
          <span><strong>Grand Minaro</strong><small>RESORT</small></span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Dashboard sections">
          {NAV_ITEMS.map(function (item) {
            return <a key={item.id} href={"#" + item.id} className={activeSection === item.id ? "nav-link active" : "nav-link"} aria-current={activeSection === item.id ? "location" : undefined}><LineIcon name={item.id} /><span>{item.label}</span></a>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <a className="source-link" href={sheetUrl} target="_blank" rel="noreferrer"><LineIcon name="sheet" /><span>Google Sheets<small>Connected data source</small></span><LineIcon name="arrow" size={14} /></a>
          <div className="sidebar-note">Grand Minaro Resort<span>Meta Ads Intelligence</span></div>
        </div>
      </aside>
      <div className="dashboard-body">
      <div className="scroll-edge" aria-hidden="true"></div>

      {/* Translucent toolbar keeps controls visible while content scrolls. */}
      <header className="toolbar-wrap">
        <div className="toolbar glass">
          <div className="brand">
            <img className="mono-mark" src={monoSrc} alt="" />
            <div className="brand-text">
              <div className="wm-name">Marketing workspace <span className="toolbar-slash">/</span> <span className="toolbar-page">Meta Ads</span></div>
              <div className="status" role="status" title={sync.state === "error" ? "Could not reach the Google Sheet" : ""}>
                <span className={status.dot}></span>{status.text}
              </div>
            </div>
          </div>
          <div className="actions">
            <button className={"icon-btn" + (sync.state === "loading" ? " spinning" : "")} aria-label="Refresh data" title="Refresh data"
              onClick={function () { loadLive(false); }} disabled={sync.state === "loading"}>{IC.refresh}</button>
            <div className="export-wrap">
              <button className="export-btn" ref={exportTriggerRef} aria-label="Export" title="Export" aria-expanded={exportOpen} aria-haspopup="menu"
                onKeyDown={function (e) { if (e.key === "ArrowDown") { e.preventDefault(); setExportOpen(true); } }}
                onClick={function () { setExportOpen(function (o) { return !o; }); }}>{IC.share}<span>Export</span>{IC.chevron}</button>
              {exportOpen && (
                <div className="menu glass" role="menu" aria-label="Export options" onKeyDown={function (e) {
                  const items = Array.from(e.currentTarget.querySelectorAll("[role=menuitem]")).filter(function (el) { return el.getClientRects().length > 0; });
                  const index = items.indexOf(document.activeElement);
                  const next = e.key === "ArrowDown" ? (index + 1) % items.length : e.key === "ArrowUp" ? (index - 1 + items.length) % items.length : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : null;
                  if (next !== null) { e.preventDefault(); items[next]?.focus(); }
                }}>
                  <button role="menuitem" onClick={function () { exportCampaignsCSV(campaigns, sel); setExportOpen(false); }}>
                    Campaigns (CSV)<small>{sel}</small>
                  </button>
                  <button role="menuitem" onClick={function () { exportMonthlyCSV(summary, window.GM_TOTALS); setExportOpen(false); }}>
                    Monthly Summary (CSV)<small>{monthCount} months</small>
                  </button>
                  <button role="menuitem" onClick={function () { setExportOpen(false); setPrinting(true); }}>
                    PDF Report<small>Print-ready dashboard</small>
                  </button>
                  <a className="menu-sheet" role="menuitem" href={sheetUrl} target="_blank" rel="noreferrer">
                    Open Google Sheet<small>Source data</small>
                  </a>
                </div>
              )}
            </div>
            <a className="btn-primary" href={sheetUrl} target="_blank" rel="noreferrer">Open Sheet <LineIcon name="arrow" size={14} /></a>
          </div>
        </div>
      </header>

      <main className="wrap fade-in">
        {/* large title + period */}
        <section className="title-row" id="overview" aria-labelledby="dashboard-title">
          <div>
            <div className="eyebrow">META ADS INTELLIGENCE</div>
            <div className="print-meta">Meta Ads Report · {sel} · Generated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
            <h1 className="large-title" id="dashboard-title">Marketing overview.</h1>
            <p className="subtitle">{sel === "All Time" ? rangeLabel + " · " + monthCount + " months of performance" : sel + " · Compared with the previous month"}</p>
          </div>
          <label className="popup">
            <span className="period-label">Reporting period</span>
            <select value={sel} onChange={function (e) { setSel(e.target.value); }}>
              {months.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
            </select>
            {IC.chevron}
          </label>
        </section>

        {/* KPI tiles */}
        <section className="kpi-grid">
          <KPICard icon="spend" label="Total spend" value={formatLKR(k.spend, true)}
            sub={"CPM " + formatLKR(k.cpm) + " · " + fmtNum(k.imps) + " impressions"}
            trend={k.spendTr} trendLabel={k.prevLabel} spark={{ data: k.s_spend, color: "var(--blue)" }} />
          <KPICard icon="chats" label="Chats started" value={k.chats.toLocaleString()}
            sub={formatLKR(k.cpa) + " per chat"}
            trend={k.chatsTr} trendLabel={k.prevLabel} spark={{ data: k.s_chats, color: "var(--green)" }} />
          <KPICard icon="reach" label="People reached" value={fmtNum(k.reach)}
            sub={"Frequency " + k.freq.toFixed(2) + "×"}
            trend={k.reachTr} trendLabel={k.prevLabel} spark={{ data: k.s_reach, color: "var(--blue)" }}
            badge={k.freq >= 3.3 ? "Fatigue" : null} />
          <KPICard icon="ctr" label="Click-through rate" value={k.ctr.toFixed(2) + "%"}
            sub={fmtNum(k.clicks) + " link clicks"}
            spark={{ data: k.s_ctr, color: "var(--accent)" }} />
        </section>

        <section className="split charts-split" id="performance" aria-label="Performance charts">
          <TrendsChart monthly={summary} selectedMonth={sel} />
          <CategorySplit cats={cats} period={sel} />
        </section>

        <section className="split highlights-split" aria-label="Campaign highlights">
          <ActiveCampaigns campaigns={campaigns} />
          <TopCampaign campaigns={campaigns} selectedMonth={sel} />
        </section>

        <section className="section" id="campaigns" aria-label="Campaign explorer">
          <CampaignTable campaigns={campaigns} selectedMonth={sel} printAll={printing} />
        </section>

        <section className="section" id="insights" aria-label="Performance insights">
          <Insights campaigns={campaigns} summary={summary} selectedMonth={sel} cats={cats} />
        </section>
      </main>

      <footer className="footer wrap">
        <p>Chats are Messenger and WhatsApp conversations started. Attribution: 7-day click, 1-day view. Revenue and ROAS aren’t tracked on this account.</p>
        <p>© 2026 Grand Minaro Resort · Data from Google Sheets{sync.tabs ? " (" + sync.tabs + " tabs)" : ""}</p>
      </footer>
      </div>
    </div>
  );
}
