/* Grand Minaro — sortable / searchable campaign table */
import { useState, useEffect } from "react";
import { formatLKR, fmtNum, categoryOf } from "./gm-core.jsx";

export function CampaignTable(props) {
  const campaigns = props.campaigns, selectedMonth = props.selectedMonth;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sf, setSf] = useState("spend");
  const [so, setSo] = useState("desc");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(function () { setPage(1); }, [selectedMonth, q, cat, sf, so]);

  const period = campaigns.filter(function (c) { return selectedMonth === "All Time" || c.month === selectedMonth; });
  const periodSpend = Math.max(period.reduce(function (s, c) { return s + c.spend; }, 0), 1);
  const maxSpend = Math.max.apply(null, period.map(function (c) { return c.spend; }).concat([1]));

  const counts = { All: period.length, Rooms: 0, Couple: 0, Wedding: 0, Other: 0 };
  period.forEach(function (c) { counts[categoryOf(c.campaignName)]++; });

  const filtered = period.filter(function (c) {
    if (q && c.campaignName.toLowerCase().indexOf(q.toLowerCase()) === -1) return false;
    if (cat !== "All" && categoryOf(c.campaignName) !== cat) return false;
    return true;
  });
  // "MMM YYYY" -> sortable number, so the Month column sorts chronologically (not alphabetically)
  const MONTH_IDX = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  function monthKey(label) {
    const p = String(label).split(" ");
    return (parseInt(p[1], 10) || 0) * 12 + (MONTH_IDX[p[0]] != null ? MONTH_IDX[p[0]] : 0);
  }
  const sorted = filtered.slice().sort(function (a, b) {
    let av = a[sf], bv = b[sf];
    if (sf === "month") { av = monthKey(av); bv = monthKey(bv); }
    else if (typeof av === "string") return so === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return so === "asc" ? av - bv : bv - av;
  });
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  // report/print mode shows the entire ledger on one page
  const rows = props.printAll ? sorted : sorted.slice((page - 1) * pageSize, page * pageSize);

  function sort(f) { if (sf === f) setSo(so === "asc" ? "desc" : "asc"); else { setSf(f); setSo("desc"); } }

  const catTone = { Rooms: "var(--c-rooms)", Couple: "var(--c-couple)", Wedding: "var(--c-wedding)", Other: "var(--c-other)" };
  const activeBg = { All: "var(--accent)", Rooms: "var(--c-rooms)", Couple: "var(--c-couple)", Wedding: "var(--c-wedding)", Other: "var(--c-other)" };

  function Th(p) {
    return (
      <th className={(p.f ? "" : "nosort ") + (sf === p.f ? "sorted" : "")} style={p.style} onClick={p.f ? function () { sort(p.f); } : undefined}>
        {p.children}{p.f && <span className="ar">{sf === p.f ? (so === "asc" ? "▲" : "▼") : "⇅"}</span>}
      </th>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title"><span className="tick"></span>Campaign Ledger</h2>
          <div className="panel-sub">{filtered.length} campaigns · {selectedMonth} · sortable by any column</div>
        </div>
        <div className="search">
          <span className="si">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
          <input value={q} onChange={function (e) { setQ(e.target.value); }} placeholder="Search campaigns…" />
        </div>
      </div>

      <div className="toolbar" style={{ padding: "14px 20px" }}>
        {["All", "Rooms", "Couple", "Wedding", "Other"].map(function (k) {
          const on = cat === k;
          return (
            <button key={k} className={"fpill" + (on ? " active" : "")} style={on ? { background: activeBg[k], color: k === "Couple" || k === "All" ? "var(--accent-ink)" : "#fff" } : null} onClick={function () { setCat(k); }}>
              {k}<span className="ct" style={on ? { background: "rgba(255,255,255,.22)" } : null}>{counts[k]}</span>
            </button>
          );
        })}
      </div>

      <div className="tbl-scroll">
        <table className="gm">
          <thead>
            <tr>
              <Th f="campaignName">Campaign</Th>
              {selectedMonth === "All Time" && <Th f="month" style={{ textAlign: "left" }}>Month</Th>}
              <Th f="spend">Spend</Th>
              <Th>Budget Share</Th>
              <Th f="clicks">Clicks</Th>
              <Th f="ctr">CTR</Th>
              <Th f="cpc">CPC</Th>
              <Th f="msgConversations">Chats</Th>
              <Th f="costPerMsgConv">Cost / Chat</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "var(--ink-faint)" }}>No campaigns match “{q}”.</td></tr>
            ) : rows.map(function (c, i) {
              const k = categoryOf(c.campaignName);
              const share = (c.spend / periodSpend) * 100;
              return (
                <tr key={i}>
                  <td>
                    <div className="cname" title={c.campaignName}>{c.campaignName}</div>
                    <div className="cmeta">
                      <span className="cat-badge" style={{ color: catTone[k], borderColor: catTone[k], background: "color-mix(in srgb," + catTone[k] + " 12%,transparent)" }}>{k}</span>
                    </div>
                  </td>
                  {selectedMonth === "All Time" && <td style={{ textAlign: "left", color: "var(--ink-faint)" }}>{c.month}</td>}
                  <td className="v-strong">{formatLKR(c.spend)}</td>
                  <td>
                    <div className="share-cell">
                      <div className="share-bar"><i style={{ width: Math.max(6, c.spend / maxSpend * 100) + "%" }}></i></div>
                      <span style={{ color: "var(--ink-faint)", fontSize: "10px", width: "30px" }}>{share.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td>{fmtNum(c.clicks)}</td>
                  <td>{c.ctr.toFixed(1)}%</td>
                  <td>{formatLKR(c.cpc)}</td>
                  <td className="v-em">{c.msgConversations.toLocaleString()}</td>
                  <td className="v-strong">{c.costPerMsgConv > 0 ? formatLKR(c.costPerMsgConv) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && !props.printAll && (
        <div className="pager">
          <div className="info">Showing <b>{(page - 1) * pageSize + 1}</b>–<b>{Math.min(page * pageSize, sorted.length)}</b> of <b>{sorted.length}</b></div>
          <div className="pg-btns">
            <button className="pg-btn" disabled={page === 1} onClick={function () { setPage(page - 1); }}>‹</button>
            {Array.from({ length: totalPages }).map(function (_, i) {
              if (totalPages > 7 && Math.abs(i + 1 - page) > 2 && i !== 0 && i !== totalPages - 1) {
                if (i === 1 || i === totalPages - 2) return <span key={i} style={{ color: "var(--ink-faint)", padding: "0 2px" }}>…</span>;
                return null;
              }
              return <button key={i} className={"pg-btn" + (page === i + 1 ? " active" : "")} onClick={function () { setPage(i + 1); }}>{i + 1}</button>;
            })}
            <button className="pg-btn" disabled={page === totalPages} onClick={function () { setPage(page + 1); }}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}
