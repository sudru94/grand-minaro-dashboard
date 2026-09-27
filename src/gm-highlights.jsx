/* Grand Minaro — highlights: ActiveCampaigns (running this month) + TopCampaign spotlight */
import { formatLKR, fmtNum, CatTag } from "./gm-core.jsx";

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
   sheet has to an "active" flag. Auto-rolls over each month; until the new
   month's tab has rows, it falls back to the latest month with data. */
export function ActiveCampaigns(props) {
  const nowMonth = currentMonthLabel();
  function running(m) {
    return props.campaigns.filter(function (c) { return c.month === m && c.spend > 0; })
      .slice().sort(function (a, b) { return b.spend - a.spend; });
  }
  let month = nowMonth;
  let live = running(month);
  let fallback = false;
  if (live.length === 0) {
    // latest month that has any spend (campaign order follows the sheet's chronology)
    for (let i = props.campaigns.length - 1; i >= 0; i--) {
      if (props.campaigns[i].spend > 0) { month = props.campaigns[i].month; break; }
    }
    live = month === nowMonth ? live : running(month);
    fallback = live.length > 0;
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Active Campaigns</h2>
          <div className="card-sub">{live.length > 0
            ? (fallback
              ? "Nothing yet in " + nowMonth + " · showing " + month
              : live.length + " running in " + month + " · month to date")
            : "No spend recorded yet for " + month}</div>
        </div>
      </div>
      <div className="list">
        {live.length === 0 ? (
          <div className="empty">New rows in the sheet’s {month} tab will appear here automatically.</div>
        ) : live.map(function (c, i) {
          return (
            <div className="row" key={i}>
              <div className="row-main">
                <div className="row-title" title={c.campaignName}>{c.campaignName}</div>
                <CatTag name={c.campaignName} />
              </div>
              <div className="row-stats">
                <span><small>Spend</small>{formatLKR(c.spend, true)}</span>
                <span><small>Chats</small>{c.msgConversations.toLocaleString()}</span>
                <span className="hide-sm"><small>Per chat</small>{c.costPerMsgConv > 0 ? formatLKR(c.costPerMsgConv) : "—"}</span>
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
    <div className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Top Campaign</h2>
          <div className="card-sub">Most chats for the money · {period}</div>
        </div>
      </div>
      {!top ? (
        <div className="empty">Not enough conversations in {period} to rank campaigns.</div>
      ) : (
        <div className="spot">
          <div className="spot-name" title={top.name}>{top.name}</div>
          <div className="spot-meta">
            <CatTag name={top.name} />
            {isAll && <span>{top.monthCount} month{top.monthCount > 1 ? "s" : ""} active</span>}
          </div>
          <dl className="spot-grid">
            <div><dt>Chats</dt><dd>{top.chats.toLocaleString()}</dd></div>
            <div>
              <dt>Per chat</dt><dd>{formatLKR(top.cpa)}</dd>
              {avgCPA > 0 && <small className={top.cpa <= avgCPA ? "good" : "bad"}>{top.cpa <= avgCPA ? Math.round((1 - top.cpa / avgCPA) * 100) + "% below average" : Math.round((top.cpa / avgCPA - 1) * 100) + "% above average"}</small>}
            </div>
            <div><dt>Spend</dt><dd>{formatLKR(top.spend, true)}</dd></div>
            <div><dt>Clicks</dt><dd>{fmtNum(top.clicks)}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
