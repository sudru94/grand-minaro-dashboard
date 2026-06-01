/* Grand Minaro — main app: header, hero, period filter, KPI cards, layout, tweaks, mount */
const { useState: uS, useEffect: uE } = React;
const G = window.GM;

/* ---- inline icons ---- */
const IC = {
  spend: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  chat: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1-.9-3.9A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" /></svg>,
  reach: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  ctr: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /></svg>,
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
  db: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
};

function KPICard(p) {
  return (
    <div className="kpi-card" style={{ "--kpi-tone": p.tone }}>
      {p.badge && <span className="badge-warn">{p.badge}</span>}
      <div className="kpi-top">
        <div>
          <div className="kpi-label">{p.label}</div>
          <div className="kpi-value">{p.value}</div>
        </div>
        <div className="kpi-ico">{p.ico}</div>
      </div>
      <div className="kpi-bottom">
        <div>
          <div className="kpi-sub">{p.sub}<small>{p.subSmall}</small></div>
          {p.trend != null && <div style={{ marginTop: "7px" }}><TrendChip value={p.trend} invert={p.trendInvert} label="vs prev" /></div>}
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
    const it = summary.find(function (m) { return m.month === selectedMonth; });
    spend = it.spend; imps = it.impressions; reach = it.reach; clicks = it.clicks; chats = it.msgConversations; freq = it.frequency;
    const idx = summary.findIndex(function (m) { return m.month === selectedMonth; });
    if (idx > 0) prev = summary[idx - 1];
  }
  const ctr = imps > 0 ? clicks / imps * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = imps > 0 ? spend / imps * 1000 : 0;
  const cpa = chats > 0 ? spend / chats : 0;
  const startRate = clicks > 0 ? chats / clicks * 100 : 0;
  const tr = function (cur, key) { return prev && prev[key] ? (cur - prev[key]) / prev[key] * 100 : null; };
  const series = function (key) {
    if (isAll) return summary.map(function (m) { return m[key]; });
    const idx = summary.findIndex(function (m) { return m.month === selectedMonth; });
    return summary.slice(Math.max(0, idx - 5), idx + 1).map(function (m) { return m[key]; });
  };
  return { spend: spend, imps: imps, reach: reach, clicks: clicks, chats: chats, freq: freq, ctr: ctr, cpc: cpc, cpm: cpm, cpa: cpa, startRate: startRate,
    spendTr: tr(spend, "spend"), chatsTr: tr(chats, "msgConversations"), reachTr: tr(reach, "reach"),
    s_spend: series("spend"), s_chats: series("msgConversations"), s_reach: series("reach"), s_ctr: series("ctr") };
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "gold"
}/*EDITMODE-END*/;

function relTime(ts) {
  if (!ts) return "";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.round(s / 60) + "m ago";
  return Math.round(s / 3600) + "h ago";
}

function App() {
  const monoSrc = (window.__resources && window.__resources.monogram) || "assets/gm-monogram.png";
  const sheetUrl = (window.GM_SHEET && window.GM_SHEET.editUrl) || "https://docs.google.com/spreadsheets/d/1kxG_5NN9wG3BJTrarOJjD66nz-2gX7ByPOc5CV1dow0/edit";
  const [summary, setSummary] = uS(window.GM_MONTHLY || []);
  const [campaigns, setCampaigns] = uS(window.GM_CAMPAIGNS || []);
  const [sync, setSync] = uS({ state: window.fetchLiveData ? "loading" : "baked", at: null, tabs: 11 });
  const [sel, setSel] = uS("All Time");
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [accentTick, setAccentTick] = uS(0);

  const loadLive = React.useCallback(function () {
    if (!window.fetchLiveData) { setSync({ state: "baked", at: null, tabs: 11 }); return; }
    setSync(function (s) { return { state: "loading", at: s.at, tabs: s.tabs }; });
    window.fetchLiveData().then(function (d) {
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
      console.warn("Live sheet sync failed — showing baked snapshot:", e);
      setSync({ state: "error", at: null, tabs: 11 });
    });
  }, []);

  uE(function () { loadLive(); }, [loadLive]);

  uE(function () {
    document.body.classList.toggle("accent-green", t.accent === "green");
    setAccentTick(function (x) { return x + 1; });
  }, [t.accent]);

  // guard: if a month is selected that the live data doesn't contain, fall back to All Time
  uE(function () {
    if (sel !== "All Time" && !summary.some(function (m) { return m.month === sel; })) setSel("All Time");
  }, [summary]);

  const months = ["All Time"].concat(summary.map(function (m) { return m.month; }).slice().reverse());

  const k = computeKPIs(summary, sel);
  const cats = window.categoryAggregates(campaigns, sel);
  const acc = t.accent === "green" ? "#36b277" : "#E8AE3C";

  const heroTitle = sel === "All Time" ? "The full campaign story, end to end." : sel + " — performance in focus.";
  const heroSub = sel === "All Time"
    ? "Ten months of Meta advertising for Grand Minaro — every rupee of spend, every conversation started, mapped across rooms, couple retreats and weddings."
    : "Filtered to " + sel + ". KPIs compare against the prior month; the trajectory chart highlights this period in context.";

  return (
    <div>
      {/* top bar */}
      <header className="topbar">
        <div className="wrap">
          <div className="brand">
            <img className="mono-mark" src={monoSrc} alt="Grand Minaro" />
            <span className="brand-divider"></span>
            <div>
              <div className="wm-name">GRAND MINARO</div>
              <div className="wm-sub">
                <span className="wm-tag">Meta Ads Intelligence</span>
                {sync.state === "live" && <span className="live-tag">● Live</span>}
              </div>
            </div>
          </div>
          <div className="top-actions">
            {(function () {
              const cfg = {
                loading: { dot: "dot pulse", main: "Syncing Sheets", sub: sync.tabs + " tabs · fetching…" },
                live: { dot: "dot pulse", main: "Sheets Connected", sub: sync.tabs + " tabs · synced " + relTime(sync.at) },
                baked: { dot: "dot warn", main: "Offline Snapshot", sub: campaigns.length + " campaigns · baked" },
                error: { dot: "dot err", main: "Sync Failed", sub: "showing snapshot · retry ↻" }
              }[sync.state] || { dot: "dot", main: "Sheets", sub: "" };
              return (
                <div className="status-chip" title={sync.state === "live" ? "Synced from Google Sheets" : sync.state === "error" ? "Could not reach the sheet — using baked snapshot" : ""}>
                  <span className={cfg.dot}></span>
                  <div>
                    <div className="s-main">{cfg.main}</div>
                    <div className="s-sub">{cfg.sub}</div>
                  </div>
                </div>
              );
            })()}
            <button className={"icon-btn" + (sync.state === "loading" ? " spinning" : "")} title="Refresh from Google Sheets" onClick={loadLive} disabled={sync.state === "loading"}>{IC.refresh}</button>
            <a className="src-btn" href={sheetUrl} target="_blank" rel="noreferrer">{IC.db} Source</a>
          </div>
        </div>
      </header>

      <main className="wrap fade-in">
        {/* hero */}
        <section className="hero">
          <div className="hero-eyebrow">Meta Ads Intelligence · Aug 2025 ▸ May 2026 · LKR</div>
          <div className="hero-row">
            <div>
              <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: heroTitle.replace("Grand Minaro", "<em>Grand Minaro</em>") }}></h1>
              <p className="hero-sub">{heroSub}</p>
            </div>
            <div className="hero-stat">
              <div className="hs-label">{sel === "All Time" ? "Total Spend · 10 Months" : sel + " Spend"}</div>
              <div className="hs-val"><span className="pfx">LKR</span>{G.formatLKR(k.spend, true).replace("LKR ", "")}</div>
              <div className="hs-meta">{k.chats.toLocaleString()} chats started · {G.fmtNum(k.reach)} reached</div>
            </div>
          </div>

          {/* period filter — pills on desktop, compact dropdown on small screens */}
          <div className="period-bar">
            <span className="period-lbl">Period</span>
            <div className="pills">
              {months.map(function (m) {
                return <button key={m} className={"pill" + (m === "All Time" ? " all" : "") + (sel === m ? " active" : "")} onClick={function () { setSel(m); }}>{m}</button>;
              })}
            </div>
            <select className="sel period-select" value={sel} onChange={function (e) { setSel(e.target.value); }} aria-label="Select period">
              {months.map(function (m) { return <option key={m} value={m}>{m}</option>; })}
            </select>
          </div>
        </section>

        {/* KPI grid */}
        <section className="kpi-grid">
          <KPICard label="Total Spend" tone="var(--accent)" ico={IC.spend}
            value={G.formatLKR(k.spend, true)} sub={"CPM " + G.formatLKR(k.cpm)} subSmall={G.fmtNum(k.imps) + " impressions"}
            trend={k.spendTr} spark={{ data: k.s_spend, color: acc }} />
          <KPICard label="Chats Started" tone="var(--emerald)" ico={IC.chat}
            value={k.chats.toLocaleString()} sub={"Cost / chat " + G.formatLKR(k.cpa)} subSmall="WhatsApp & Messenger"
            trend={k.chatsTr} spark={{ data: k.s_chats, color: "#36b277" }} />
          <KPICard label="Reach" tone="var(--c-wedding)" ico={IC.reach}
            value={G.fmtNum(k.reach)} sub={"Frequency " + k.freq.toFixed(2) + "x"} subSmall={"deduplicated audience"}
            trend={k.reachTr} spark={{ data: k.s_reach, color: "#4f9dd6" }}
            badge={k.freq >= 3.3 ? "Fatigue" : null} />
          <KPICard label="CTR · Link Clicks" tone="var(--accent)" ico={IC.ctr}
            value={k.ctr.toFixed(2) + "%"} sub={k.startRate.toFixed(1) + "% chat-start rate"} subSmall={G.fmtNum(k.clicks) + " clicks"}
            spark={{ data: k.s_ctr, color: acc }} />
        </section>

        {/* trends + donut */}
        <section className="split">
          <TrendsChart monthly={summary} selectedMonth={sel} accent={accentTick} />
          <CategorySplit cats={cats} period={sel} />
        </section>

        {/* diagnostics + planner */}
        <section className="split">
          <Diagnostics campaigns={campaigns} summary={summary} selectedMonth={sel} />
          <BudgetPlanner campaigns={campaigns} selectedMonth={sel} />
        </section>

        {/* table */}
        <section className="section">
          <CampaignTable campaigns={campaigns} selectedMonth={sel} />
        </section>
      </main>

      {/* footer */}
      <footer className="footer">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="foot-brand"><img className="foot-mark" src={monoSrc} alt="" /><h4 className="foot-h" style={{ margin: 0 }}>Grand Minaro Resort</h4></div>
              <p className="foot-p">Premium accommodation, boutique weddings and couple retreats. All campaigns ran on Meta (Facebook &amp; Instagram) driving Messenger and WhatsApp conversations, billed in Sri Lankan Rupees.</p>
            </div>
            <div>
              <h4 className="foot-h">Measurement Notes</h4>
              <ul className="foot-list">
                <li>Currency is <b>Sri Lankan Rupee (LKR)</b>.</li>
                <li>Conversions = <b>Messenger / WhatsApp chats started</b>.</li>
                <li>Attribution: 7-day click, 1-day view.</li>
                <li>Purchases, revenue &amp; ROAS are <b>N/A</b> — no conversion pixel on this account.</li>
              </ul>
            </div>
            <div>
              <h4 className="foot-h">Live Google Sheets</h4>
              <p className="foot-p">This dashboard reads a published spreadsheet across 11 monthly tabs. Edit rows or publish new tabs, then refresh to watch every chart, KPI and ledger update in place.</p>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 Grand Minaro Resort. All rights reserved.</span>
            <span>Meta Advertising Intelligence · v2.0</span>
          </div>
        </div>
      </footer>

      {/* tweaks */}
      <TweaksPanel>
        <TweakSection label="Accent emphasis" />
        <TweakRadio label="Accent" value={t.accent} options={["gold", "green"]} onChange={function (v) { setTweak("accent", v); }} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
