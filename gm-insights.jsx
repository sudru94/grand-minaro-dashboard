/* Grand Minaro — Diagnostics (rule-based findings) + Budget Planner simulator */
const GMI = window.GM;

function categoryAggregates(campaigns, selectedMonth) {
  const isAll = selectedMonth === "All Time";
  const sel = campaigns.filter(function (c) { return isAll || c.month === selectedMonth; });
  const acc = { Rooms: { spend: 0, chats: 0 }, Couple: { spend: 0, chats: 0 }, Wedding: { spend: 0, chats: 0 }, Other: { spend: 0, chats: 0 } };
  sel.forEach(function (c) {
    const k = GMI.categoryOf(c.campaignName);
    acc[k].spend += c.spend; acc[k].chats += c.msgConversations;
  });
  const tones = { Rooms: "var(--c-rooms)", Couple: "var(--c-couple)", Wedding: "var(--c-wedding)", Other: "var(--c-other)" };
  return ["Rooms", "Couple", "Wedding", "Other"].map(function (k) {
    return { key: k, spend: acc[k].spend, chats: acc[k].chats, cpa: acc[k].chats > 0 ? acc[k].spend / acc[k].chats : 0, tone: tones[k] };
  });
}

function buildFindings(campaigns, summary, selectedMonth, cats) {
  const isAll = selectedMonth === "All Time";
  const sel = campaigns.filter(function (c) { return isAll || c.month === selectedMonth; });
  const totalSpend = sel.reduce(function (s, c) { return s + c.spend; }, 0);
  const totalChats = sel.reduce(function (s, c) { return s + c.msgConversations; }, 0);
  const avgCPA = totalChats > 0 ? totalSpend / totalChats : 0;
  const ms = summary.find(function (s) { return s.month === selectedMonth; });
  const out = [];
  const C = {};
  cats.forEach(function (c) { C[c.key] = c; });

  if (C.Wedding.chats > 0 && avgCPA > 0 && C.Wedding.cpa > avgCPA * 1.15) {
    out.push({ type: "alert", title: "Wedding campaigns running hot on CPA", desc: "Wedding ad sets convert chats at " + GMI.formatLKR(C.Wedding.cpa) + " — about " + Math.round((C.Wedding.cpa / avgCPA - 1) * 100) + "% above the " + GMI.formatLKR(avgCPA) + " account average. Tighten qualification before scaling." });
  }
  if (ms && ms.frequency > 3.2) {
    out.push({ type: "alert", title: "Frequency fatigue risk", desc: "Average frequency hit " + ms.frequency.toFixed(2) + "x in " + selectedMonth + ". Audiences are seeing repeat creative; refresh assets to protect the " + ms.ctr.toFixed(2) + "% CTR." });
  }
  if (C.Rooms.chats > 0) {
    out.push({ type: "success", title: "Rooms is your efficiency engine", desc: "Rooms bookings generate chats at just " + GMI.formatLKR(C.Rooms.cpa) + " each — the leanest cost per conversation in the account. Strong candidate for incremental budget." });
  }
  if (C.Couple.chats > 0) {
    out.push({ type: "tip", title: "Couple packages carry the volume", desc: "Couple campaigns drive " + GMI.fmtNum(C.Couple.chats) + " chats at " + GMI.formatLKR(C.Couple.cpa) + " each — the largest conversation source. Keep it funded and rotate fresh offers." });
  }
  if (isAll) {
    const best = summary.slice().filter(function (s) { return s.costPerMsgConv > 0; }).sort(function (a, b) { return a.costPerMsgConv - b.costPerMsgConv; })[0];
    if (best) out.push({ type: "tip", title: best.month + " is the blueprint", desc: "It booked " + GMI.fmtNum(best.msgConversations) + " chats at a record " + GMI.formatLKR(best.costPerMsgConv) + " per chat. Re-use its budget mix and creative cadence." });
  }
  if (out.length === 0) out.push({ type: "success", title: "Balanced account", desc: "Pacing channels conform to efficiency guidelines. Budget flows are stable across packages." });
  return { findings: out, avgCPA: avgCPA };
}

function Diagnostics(props) {
  const cats = categoryAggregates(props.campaigns, props.selectedMonth);
  const res = buildFindings(props.campaigns, props.summary, props.selectedMonth, cats);
  const ICON = { alert: "!", success: "↑", tip: "✦" };
  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
      <div className="panel-head">
        <div>
          <h2 className="panel-title"><span className="tick"></span>Performance Diagnostics</h2>
          <div className="panel-sub">Rule-based audit of conversion efficiency · {props.selectedMonth}</div>
        </div>
      </div>
      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        {res.findings.map(function (f, i) {
          return (
            <div key={i} className={"finding f-" + f.type}>
              <div className="fi">{ICON[f.type]}</div>
              <div>
                <p className="ft">{f.title}</p>
                <p className="fd">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "13px 20px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "JetBrains Mono", color: "var(--ink-faint)", flexWrap: "wrap", gap: "8px" }}>
        {cats.map(function (c) {
          return <span key={c.key}>{c.key}&nbsp;CPA&nbsp;<b style={{ color: c.tone }}>{c.chats > 0 ? GMI.formatLKR(c.cpa) : "—"}</b></span>;
        })}
      </div>
    </div>
  );
}

function BudgetPlanner(props) {
  const [strat, setStrat] = React.useState("current");
  const [budget, setBudget] = React.useState(150000);
  const cats = categoryAggregates(props.campaigns, props.selectedMonth);
  const C = {}; cats.forEach(function (c) { C[c.key] = c; });
  const isAll = props.selectedMonth === "All Time";
  const sel = props.campaigns.filter(function (c) { return isAll || c.month === props.selectedMonth; });
  const totalSpend = Math.max(sel.reduce(function (s, c) { return s + c.spend; }, 0), 1);
  const totalChats = Math.max(sel.reduce(function (s, c) { return s + c.msgConversations; }, 0), 1);
  const avgCPA = totalSpend / totalChats;

  const rCPA = C.Rooms.cpa || 151.3, cCPA = C.Couple.cpa || 140, wCPA = C.Wedding.cpa || 224;
  const meta = {
    current: { lbl: "Paced (current mix)", cpa: avgCPA, desc: "Budget expanded using the current package distribution." },
    rooms: { lbl: "Rooms efficiency push", cpa: rCPA, desc: "Routed to Rooms campaigns to exploit the lowest cost per chat." },
    couple: { lbl: "Couple scale-up", cpa: cCPA, desc: "Leaning into high-volume Couple package demand." },
    wedding: { lbl: "Wedding volume", cpa: wCPA, desc: "Adds wedding lead volume — raises chats but inflates CPA." },
  };
  const m = meta[strat];
  const extra = Math.round(budget / m.cpa);
  const savings = (1 - m.cpa / avgCPA) * 100;

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
      <div className="panel-head">
        <div>
          <h2 className="panel-title"><span className="tick"></span>Budget Planner</h2>
          <div className="panel-sub">Model incremental spend against package efficiency</div>
        </div>
      </div>
      <div style={{ padding: "18px 20px", flex: 1 }}>
        <label className="field-lbl">Allocation strategy</label>
        <div className="strat-grid">
          {["current", "rooms", "couple", "wedding"].map(function (s) {
            const labels = { current: "Paced", rooms: "Rooms Max", couple: "Couple", wedding: "Wedding" };
            return <button key={s} className={"strat-btn" + (s === strat ? " active" : "")} onClick={function () { setStrat(s); }}>{labels[s]}</button>;
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "18px" }}>
          <label className="field-lbl" style={{ marginBottom: 0 }}>Incremental spend</label>
          <span className="mono" style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent-bright)", whiteSpace: "nowrap" }}>{GMI.formatLKR(budget)}</span>
        </div>
        <input className="range" type="range" min="20000" max="500000" step="5000" value={budget} onChange={function (e) { setBudget(Number(e.target.value)); }} />

        <div className="sim-out">
          <div className="mono" style={{ fontSize: "9.5px", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent-bright)", fontWeight: 700 }}>{m.lbl}</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "12px", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--ink-dim)", fontWeight: 600 }}>Predicted chats</div>
              <div style={{ fontSize: "30px", fontWeight: 800, color: "var(--emerald)", lineHeight: 1, marginTop: "4px" }}>+{extra.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "var(--ink-dim)", fontWeight: 600, whiteSpace: "nowrap" }}>Projected CPA</div>
              <div className="mono" style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", marginTop: "6px", whiteSpace: "nowrap" }}>{GMI.formatLKR(m.cpa)}</div>
              {strat !== "current" && Math.abs(savings) > 0.5 && (
                <div className="mono" style={{ fontSize: "10px", fontWeight: 700, marginTop: "3px", color: savings >= 0 ? "var(--emerald)" : "#e3756b" }}>
                  {savings >= 0 ? "−" + savings.toFixed(0) + "% vs avg" : "+" + Math.abs(savings).toFixed(0) + "% vs avg"}
                </div>
              )}
            </div>
          </div>
        </div>
        <p style={{ fontSize: "10.5px", color: "var(--ink-faint)", marginTop: "12px", fontStyle: "italic", lineHeight: 1.5 }}>* {m.desc} Modeled on {props.selectedMonth} efficiency coefficients.</p>
      </div>
    </div>
  );
}

Object.assign(window, { Diagnostics: Diagnostics, BudgetPlanner: BudgetPlanner, categoryAggregates: categoryAggregates });
