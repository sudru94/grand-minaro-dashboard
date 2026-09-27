/* Grand Minaro — Insights: rule-based findings for the selected period */
import { formatLKR, fmtNum, categoryOf, CAT_TONE } from "./gm-core.jsx";

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
  const sel = campaigns.filter(function (c) { return isAll || c.month === selectedMonth; });
  const totalSpend = sel.reduce(function (s, c) { return s + c.spend; }, 0);
  const totalChats = sel.reduce(function (s, c) { return s + c.msgConversations; }, 0);
  const avgCPA = totalChats > 0 ? totalSpend / totalChats : 0;
  const ms = summary.find(function (s) { return s.month === selectedMonth; });
  const out = [];
  const C = {};
  cats.forEach(function (c) { C[c.key] = c; });

  if (C.Wedding.chats > 0 && avgCPA > 0 && C.Wedding.cpa > avgCPA * 1.15) {
    out.push({ type: "alert", title: "Wedding campaigns running hot on CPA", desc: "Wedding ad sets convert chats at " + formatLKR(C.Wedding.cpa) + " — about " + Math.round((C.Wedding.cpa / avgCPA - 1) * 100) + "% above the " + formatLKR(avgCPA) + " account average. Tighten qualification before scaling." });
  }
  if (ms && ms.frequency > 3.2) {
    out.push({ type: "alert", title: "Frequency fatigue risk", desc: "Average frequency hit " + ms.frequency.toFixed(2) + "x in " + selectedMonth + ". Audiences are seeing repeat creative; refresh assets to protect the " + ms.ctr.toFixed(2) + "% CTR." });
  }
  if (C.Rooms.chats > 0) {
    out.push({ type: "success", title: "Rooms is your efficiency engine", desc: "Rooms bookings generate chats at just " + formatLKR(C.Rooms.cpa) + " each — the leanest cost per conversation in the account. Strong candidate for incremental budget." });
  }
  if (C.Couple.chats > 0) {
    out.push({ type: "tip", title: "Couple packages carry the volume", desc: "Couple campaigns drive " + fmtNum(C.Couple.chats) + " chats at " + formatLKR(C.Couple.cpa) + " each — the largest conversation source. Keep it funded and rotate fresh offers." });
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
