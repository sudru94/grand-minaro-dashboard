/* Grand Minaro — highlights: ActiveCampaigns (running this month) + TopCampaign spotlight */
import { formatLKR, fmtNum, categoryOf } from "./gm-core.jsx";

const CAT_TONE = { Rooms: "var(--c-rooms)", Couple: "var(--c-couple)", Wedding: "var(--c-wedding)", Other: "var(--c-other)" };

function CatBadge(props) {
  const k = categoryOf(props.name);
  return <span className="cat-badge" style={{ color: CAT_TONE[k], borderColor: CAT_TONE[k], background: "color-mix(in srgb," + CAT_TONE[k] + " 12%,transparent)" }}>{k}</span>;
}

// the current calendar month, formatted like the sheet labels ("Jun 2026")
export function currentMonthLabel() {
  const d = new Date();
  return d.toLocaleString("en-US", { month: "short" }) + " " + d.getFullYear();
}

// merge rows that share a campaign name (the same campaign can run across months)
function aggregateByName(rows) {
  const map = {};
  rows.forEach(function (c) {
    const a = map[c.campaignName] || (map[c.campaignName] = { name: c.campaignName, spend: 0, chats: 0, clicks: 0, months: {} });
    a.spend += c.spend; a.chats += c.msgConversations; a.clicks += c.clicks; a.months[c.month] = true;
  });
  return Object.keys(map).map(function (k) {
    const a = map[k];
    return { name: a.name, spend: a.spend, chats: a.chats, clicks: a.clicks, monthCount: Object.keys(a.months).length, cpa: a.chats > 0 ? a.spend / a.chats : 0 };
  });
}

/* Campaigns with spend in the current calendar month — the closest thing the
   sheet has to an "active" flag. Auto-rolls over each month. */
export function ActiveCampaigns(props) {
  const month = currentMonthLabel();
  const live = props.campaigns.filter(function (c) { return c.month === month && c.spend > 0; })
    .slice().sort(function (a, b) { return b.spend - a.spend; });

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
      <div className="panel-head">
        <div>
          <h2 className="panel-title"><span className="tick"></span>Active Campaigns</h2>
          <div className="panel-sub">{live.length > 0 ? live.length + " running in " + month + " · month-to-date figures" : "No spend recorded yet for " + month}</div>
        </div>
        {live.length > 0 && <span className="live-tag" style={{ alignSelf: "center" }}>● {live.length} Active</span>}
      </div>
      <div className="ac-list">
        {live.length === 0 ? (
          <div className="ac-empty">No campaigns have spend in {month} yet. New rows in the sheet's {month} tab will appear here automatically.</div>
        ) : live.map(function (c, i) {
          return (
            <div className="ac-row" key={i}>
              <span className="live-dot"></span>
              <div className="an">
                <div className="nm" title={c.campaignName}>{c.campaignName}</div>
                <div style={{ marginTop: "4px" }}><CatBadge name={c.campaignName} /></div>
              </div>
              <div className="ac-stats">
                <span className="st"><span className="lb">MTD Spend</span><b>{formatLKR(c.spend, true)}</b></span>
                <span className="st ac-chats"><span className="lb">Chats</span><b style={{ color: "var(--emerald)" }}>{c.msgConversations.toLocaleString()}</b></span>
                <span className="st ac-cpa"><span className="lb">Cost / Chat</span><b>{c.costPerMsgConv > 0 ? formatLKR(c.costPerMsgConv) : "—"}</b></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Best-performing campaign over the selected period, by balanced score:
   chats delivered × cost-efficiency vs the account average
   (score = chats × accountAvgCPA ÷ campaignCPA). Volume alone can't win if
   conversions were expensive; a cheap fluke can't win without volume. */
export function TopCampaign(props) {
  const isAll = props.selectedMonth === "All Time";
  const rows = props.campaigns.filter(function (c) { return isAll || c.month === props.selectedMonth; });
  const totalSpend = rows.reduce(function (s, c) { return s + c.spend; }, 0);
  const totalChats = rows.reduce(function (s, c) { return s + c.msgConversations; }, 0);
  const avgCPA = totalChats > 0 ? totalSpend / totalChats : 0;

  const ranked = aggregateByName(rows)
    .filter(function (a) { return a.chats >= 5 && a.cpa > 0; })
    .map(function (a) { a.score = a.chats * (avgCPA / a.cpa); return a; })
    .sort(function (a, b) { return b.score - a.score; });

  const top = ranked[0];
  const period = isAll ? "All Time" : props.selectedMonth;

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column" }}>
      <div className="panel-head">
        <div>
          <h2 className="panel-title"><span className="tick"></span>Top Campaign</h2>
          <div className="panel-sub">Best performer · chats × cost-efficiency · {period}</div>
        </div>
      </div>
      {!top ? (
        <div className="ac-empty">Not enough conversation volume in {period} to rank campaigns.</div>
      ) : (
        <div className="spot">
          <div className="spot-crown">🏆</div>
          <div className="spot-name" title={top.name}>{top.name}</div>
          <div style={{ marginTop: "7px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CatBadge name={top.name} />
            {isAll && <span className="spot-months">{top.monthCount} month{top.monthCount > 1 ? "s" : ""} active</span>}
          </div>
          <div className="spot-grid">
            <div className="spot-cell">
              <span className="lb">Chats Started</span>
              <b style={{ color: "var(--emerald)" }}>{top.chats.toLocaleString()}</b>
            </div>
            <div className="spot-cell">
              <span className="lb">Cost / Chat</span>
              <b>{formatLKR(top.cpa)}</b>
              {avgCPA > 0 && <small className={top.cpa <= avgCPA ? "good" : "bad"}>{top.cpa <= avgCPA ? "−" + Math.round((1 - top.cpa / avgCPA) * 100) + "% vs avg" : "+" + Math.round((top.cpa / avgCPA - 1) * 100) + "% vs avg"}</small>}
            </div>
            <div className="spot-cell">
              <span className="lb">Spend</span>
              <b>{formatLKR(top.spend, true)}</b>
            </div>
            <div className="spot-cell">
              <span className="lb">Clicks</span>
              <b>{fmtNum(top.clicks)}</b>
            </div>
          </div>
          {ranked.length > 1 && (
            <div className="runners">
              <span className="lb">Runners-up</span>
              {ranked.slice(1, 3).map(function (r, i) {
                return (
                  <div className="run-row" key={i}>
                    <span className="rk">#{i + 2}</span>
                    <span className="rn" title={r.name}>{r.name}</span>
                    <span className="rv">{r.chats.toLocaleString()} chats · {formatLKR(r.cpa)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
