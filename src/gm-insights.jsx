/* Grand Minaro — Insights: rule-based findings for the selected period */
import { formatLKR, fmtNum, categoryOf, CAT_TONE, FATIGUE_FREQ, periodAvgCPA } from "./gm-core.jsx";

export function categoryAggregates(campaigns, selectedMonth) {
  const isAll = selectedMonth === "All Time";
  const sel = campaigns.filter(function (c) { return isAll || c.month === selectedMonth; });
  const acc = { Rooms: { spend: 0, chats: 0 }, Couple: { spend: 0, chats: 0 }, Wedding: { spend: 0, chats: 0 }, Other: { spend: 0, chats: 0 } };
  sel.forEach(function (c) {
    const k = categoryOf(c.campaignName);
    acc[k].spend += c.spend; acc[k].chats += c.msgConversations;
  });
  return ["Rooms", "Couple", "Wedding", "Other"].map(function (k) {
    return { key: k, spend: acc[k].spend, chats: acc[k].chats, cpa: acc[k].chats > 0 ? acc[k].spend / acc[k].chats : 0, tone: CAT_TONE[k] };
  });
}

function buildFindings(campaigns, summary, selectedMonth, cats) {
  const isAll = selectedMonth === "All Time";
  const avgCPA = periodAvgCPA(summary, selectedMonth); // same figure as the KPI tile
  const ms = summary.find(function (s) { return s.month === selectedMonth; });
  const out = [];
  const C = {};
  cats.forEach(function (c) { C[c.key] = c; });

  if (C.Wedding.chats > 0 && avgCPA > 0 && C.Wedding.cpa > avgCPA * 1.15) {
    out.push({ type: "alert", title: "Wedding campaigns running hot on CPA", desc: "Wedding ad sets convert chats at " + formatLKR(C.Wedding.cpa) + " — about " + Math.round((C.Wedding.cpa / avgCPA - 1) * 100) + "% above the " + formatLKR(avgCPA) + " account average. Tighten qualification before scaling." });
  }
  if (ms && ms.frequency > FATIGUE_FREQ) {
    out.push({ type: "alert", title: "Frequency fatigue risk", desc: "Average frequency hit " + ms.frequency.toFixed(2) + "x in " + selectedMonth + ". Audiences are seeing repeat creative; refresh assets to protect the " + ms.ctr.toFixed(2) + "% CTR." });
  }
  // package claims are derived from the numbers, never assumed
  const pkgs = cats.filter(function (c) { return c.key !== "Other" && c.chats > 0; });
  const allChats = cats.reduce(function (s, c) { return s + c.chats; }, 0);
  const leanest = pkgs.slice().sort(function (a, b) { return a.cpa - b.cpa; })[0];
  const volume = pkgs.slice().sort(function (a, b) { return b.chats - a.chats; })[0];
  if (pkgs.length > 1 && leanest && avgCPA > 0 && leanest.cpa < avgCPA) {
    out.push({ type: "success", title: leanest.key + " is your efficiency engine", desc: leanest.key + " campaigns generate chats at " + formatLKR(leanest.cpa) + " each — the leanest cost per conversation of any package, " + Math.round((1 - leanest.cpa / avgCPA) * 100) + "% below the " + formatLKR(avgCPA) + " account average. Strong candidate for incremental budget." });
  }
  if (pkgs.length > 1 && volume && allChats > 0) {
    out.push({ type: "tip", title: volume.key + " carries the volume", desc: volume.key + " campaigns drive " + fmtNum(volume.chats) + " chats (" + Math.round(volume.chats / allChats * 100) + "% of all chats) at " + formatLKR(volume.cpa) + " each — the largest conversation source. Keep it funded and rotate fresh offers." });
  }
  if (isAll) {
    const best = summary.slice().filter(function (s) { return s.costPerMsgConv > 0; }).sort(function (a, b) { return a.costPerMsgConv - b.costPerMsgConv; })[0];
    if (best) out.push({ type: "tip", title: best.month + " is the blueprint", desc: "It booked " + fmtNum(best.msgConversations) + " chats at a record " + formatLKR(best.costPerMsgConv) + " per chat. Re-use its budget mix and creative cadence." });
  }
  if (out.length === 0) out.push({ type: "success", title: "Balanced account", desc: "Pacing channels conform to efficiency guidelines. Budget flows are stable across packages." });
  return { findings: out, avgCPA: avgCPA };
}

export function Insights(props) {
  const res = buildFindings(props.campaigns, props.summary, props.selectedMonth, props.cats);
  const ICON = { alert: "!", success: "↑", tip: "✦" };
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Insights</h2>
          <div className="card-sub">What stands out in {props.selectedMonth === "All Time" ? "the full history" : props.selectedMonth}</div>
        </div>
      </div>
      <ul className="insights">
        {res.findings.slice(0, 4).map(function (f, i) {
          return (
            <li key={i} className={"insight i-" + f.type}>
              <span className="ii" aria-hidden="true">{ICON[f.type]}</span>
              <div>
                <p className="it">{f.title}</p>
                <p className="id">{f.desc}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
