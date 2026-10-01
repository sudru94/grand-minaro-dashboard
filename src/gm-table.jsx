/* Grand Minaro — sortable / searchable campaign table */
import { useState, useEffect } from "react";
import { formatLKR, fmtNum, categoryOf, CatTag } from "./gm-core.jsx";
import { Segmented } from "./gm-charts.jsx";

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

  const isAll = selectedMonth === "All Time";

  function Th(p) {
    const on = sf === p.f;
    return (
      <th className={on ? "sorted" : ""} style={p.style} aria-sort={on ? (so === "asc" ? "ascending" : "descending") : "none"}>
        <button onClick={function () { sort(p.f); }}>{p.children}<span className="ar" aria-hidden="true">{on ? (so === "asc" ? "▲" : "▼") : ""}</span></button>
      </th>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Campaigns</h2>
          <div className="card-sub">{filtered.length} in {selectedMonth}</div>
        </div>
        <div className="search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input type="search" value={q} onChange={function (e) { setQ(e.target.value); }} placeholder="Search" aria-label="Search campaigns" />
        </div>
      </div>

      <div className="filter-bar">
        <Segmented label="Package" value={cat} onChange={setCat}
          options={["All", "Rooms", "Couple", "Wedding", "Other"].map(function (k) { return { value: k, label: k, count: counts[k] }; })} />
      </div>

      <div className="tbl-scroll">
        <table className="gm">
          <thead>
            <tr>
              <Th f="campaignName">Campaign</Th>
              {isAll && <Th f="month" style={{ textAlign: "left" }}>Month</Th>}
              <Th f="spend">Spend</Th>
              <Th f="clicks">Clicks</Th>
              <Th f="ctr">CTR</Th>
              <Th f="msgConversations">Chats</Th>
              <Th f="costPerMsgConv">Per Chat</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="7" className="no-rows">No campaigns match “{q}”.</td></tr>
            ) : rows.map(function (c, i) {
              return (
                <tr key={i}>
                  <td>
                    <div className="cname" title={c.campaignName}>{c.campaignName}</div>
                    <CatTag name={c.campaignName} />
                  </td>
                  {isAll && <td style={{ textAlign: "left" }} className="dim">{c.month}</td>}
                  <td className="strong">{formatLKR(c.spend)}</td>
                  <td>{fmtNum(c.clicks)}</td>
                  <td>{c.ctr.toFixed(1)}%</td>
                  <td className="strong">{c.msgConversations.toLocaleString()}</td>
                  <td>{c.costPerMsgConv > 0 ? formatLKR(c.costPerMsgConv) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && !props.printAll && (
        <div className="pager">
          <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}</span>
          <div className="pg-btns">
            <button className="pg-btn" aria-label="Previous page" disabled={page === 1} onClick={function () { setPage(page - 1); }}>‹</button>
            <button className="pg-btn" aria-label="Next page" disabled={page === totalPages} onClick={function () { setPage(page + 1); }}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}
