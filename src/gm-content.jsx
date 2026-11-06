/* Grand Minaro — Content section: what's waiting for management approval, the
   production pipeline, the full content list, upcoming shoots and the team.
   Read-only: management approves by updating the sheet, and the dashboard follows. */
import { useState, useEffect } from "react";
import { Segmented } from "./gm-charts.jsx";
import { STAGES, stageOf, daysBetween } from "./gm-content-source.js";

const PAGE = 10;
// list order: what needs attention first, finished work last
const STAGE_PRIORITY = { approval: 0, editing: 1, shoot: 2, approved: 3, scheduled: 4, published: 5, other: 6 };

function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

export function fmtDate(d, now) {
  if (!d) return "—";
  const opts = { day: "numeric", month: "short" };
  if (!now || d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("en-GB", opts);
}

/* How long an item has been sitting in its current step, counted from its start date. */
export function waitInfo(item, now) {
  if (!item.start) return { days: null, text: "No start date", tone: "" };
  const d = daysBetween(item.start, now);
  if (d < 0) return { days: d, text: "Starts in " + plural(-d, "day"), tone: "" };
  if (d === 0) return { days: 0, text: "Since today", tone: "ok" };
  return { days: d, text: plural(d, "day"), tone: d > 7 ? "late" : d > 3 ? "warn" : "ok" };
}

/* For the sidebar badge + Overview banner. */
export function approvalSummary(items, now) {
  const waiting = items.filter(function (i) { return i.stage === "approval"; });
  let oldest = null;
  waiting.forEach(function (i) { const w = waitInfo(i, now); if (w.days != null && (oldest == null || w.days > oldest)) oldest = w.days; });
  return { count: waiting.length, oldestDays: oldest };
}

/* ---------- atoms ---------- */
const AVATAR_TONES = ["#0071e3", "#28845b", "#8965be", "#a57222", "#13798a", "#c93445"];
// fixed colours for the current team so similar initials (Adithya / Adil) stay distinct
const STAFF_TONES = { Adithya: "#0071e3", Adil: "#8965be", Yohan: "#28845b" };
function toneFor(name) {
  if (STAFF_TONES[name]) return STAFF_TONES[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}
export function Person(props) {
  if (!props.name) return <span className="person dim">Unassigned</span>;
  return (
    <span className="person">
      <span className="avatar" style={{ background: toneFor(props.name) }} aria-hidden="true">{props.name.charAt(0)}</span>
      {props.name}
    </span>
  );
}

function StageBadge(props) {
  const s = stageOf(props.stage);
  return <span className={"stage-badge st-" + s.key}><i style={{ background: s.tone }}></i>{props.stage === "other" ? props.label : s.short}</span>;
}

function Tags(props) {
  const it = props.item;
  const parts = [];
  if (it.types.length) parts.push(it.types.join(" + "));
  it.topics.forEach(function (t) { parts.push(t); });
  if (!parts.length) return null;
  return <span className="c-tags">{parts.map(function (p, i) { return <span key={i} className="c-tag">{p}</span>; })}</span>;
}

/* ---------- 1. waiting for management approval ---------- */
function ApprovalPanel(props) {
  const now = props.now;
  const waiting = props.items.filter(function (i) { return i.stage === "approval"; })
    .map(function (i) { return { item: i, wait: waitInfo(i, now) }; })
    .sort(function (a, b) { return (b.wait.days || 0) - (a.wait.days || 0); }); // longest wait first

  return (
    <div className={"card approval-card" + (waiting.length ? " has-items" : "")}>
      <div className="card-head">
        <div>
          <h2 className="card-title">
            Waiting for management approval
            <span className={"count-pill" + (waiting.length ? " on" : "")}>{waiting.length}</span>
          </h2>
          <div className="card-sub">{waiting.length
            ? "Longest wait first · days counted from each item’s start date"
            : "Nothing is waiting right now"}</div>
        </div>
      </div>
      {waiting.length === 0 ? (
        <div className="empty all-clear"><span className="tick" aria-hidden="true">✓</span>All clear. New items appear here when they move to “Management Approval” in the sheet.</div>
      ) : (
        <ul className="approval-grid">
          {waiting.map(function (w, i) {
            const it = w.item;
            return (
              <li key={it.id} className={"approval-item tone-" + (w.wait.tone || "none")} style={{ "--i": i }}>
                <div className="ap-wait">
                  <span className="ap-days">{w.wait.days != null && w.wait.days > 0 ? w.wait.days : (w.wait.days === 0 ? "0" : "—")}</span>
                  <span className="ap-unit">{w.wait.days === 1 ? "day waiting" : "days waiting"}</span>
                </div>
                <div className="ap-body">
                  <div className="ap-name" title={it.name}>{it.name}</div>
                  <Tags item={it} />
                  <div className="ap-meta">
                    <Person name={it.staff} />
                    <span>Started {fmtDate(it.start, now)}</span>
                    {w.wait.tone === "late" && <span className="late-flag">Needs a decision</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- 2. pipeline strip (doubles as the stage filter) ---------- */
function Pipeline(props) {
  const counts = {};
  props.items.forEach(function (i) { counts[i.stage] = (counts[i.stage] || 0) + 1; });
  return (
    <div className="card pipeline-card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Content pipeline</h2>
          <div className="card-sub">Where every piece is right now · tap a step to filter the list</div>
        </div>
      </div>
      <ol className="pipeline">
        {STAGES.map(function (s, idx) {
          const on = props.stage === s.key;
          const n = counts[s.key] || 0;
          return (
            <li key={s.key}>
              <button type="button" className={"pipe-step" + (on ? " on" : "") + (s.key === "approval" && n > 0 ? " attention" : "")}
                aria-pressed={on} onClick={function () { props.onStage(on ? null : s.key); }}
                style={{ "--tone": s.tone }}>
                <span className="pipe-num">Step {idx + 1}</span>
                {s.key === "approval" && n > 0 && <span className="pipe-flag"><i aria-hidden="true"></i>Action needed</span>}
                <span className="pipe-count">{n}</span>
                <span className="pipe-label">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- 3. full content list ---------- */
function ContentList(props) {
  const now = props.now;
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const [showAll, setShowAll] = useState(false);
  useEffect(function () { setShowAll(false); }, [q, type, props.stage]);

  const allTypes = [];
  props.items.forEach(function (i) { i.types.forEach(function (t) { if (allTypes.indexOf(t) === -1) allTypes.push(t); }); });
  const typeOrder = ["Reel", "Flyer", "Photo", "Video"];
  allTypes.sort(function (a, b) { return (typeOrder.indexOf(a) + 99) % 99 - (typeOrder.indexOf(b) + 99) % 99 || a.localeCompare(b); });

  const byStage = props.stage ? props.items.filter(function (i) { return i.stage === props.stage; }) : props.items;
  const typeCount = { All: byStage.length };
  byStage.forEach(function (i) { i.types.forEach(function (t) { typeCount[t] = (typeCount[t] || 0) + 1; }); });
  const ql = q.trim().toLowerCase();
  const filtered = byStage.filter(function (i) {
    if (type !== "All" && i.types.indexOf(type) === -1) return false;
    if (ql && (i.name + " " + i.topics.join(" ") + " " + (i.staff || "")).toLowerCase().indexOf(ql) === -1) return false;
    return true;
  }).sort(function (a, b) {
    const p = STAGE_PRIORITY[a.stage] - STAGE_PRIORITY[b.stage];
    if (p) return p;
    return (b.start ? b.start.getTime() : 0) - (a.start ? a.start.getTime() : 0); // newest first
  });
  const rows = props.printAll || showAll ? filtered : filtered.slice(0, PAGE);
  const st = props.stage ? stageOf(props.stage) : null;

  return (
    <div className="card content-list-card">
      <div className="card-head">
        <div>
          <h2 className="card-title">All content</h2>
          <div className="card-sub">{plural(filtered.length, "item")}{st ? " · " + st.label : ""}</div>
        </div>
        <div className="search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input type="search" value={q} onChange={function (e) { setQ(e.target.value); }} placeholder="Search content" aria-label="Search content" />
        </div>
      </div>
      <div className="filter-bar content-filters">
        <Segmented label="Content type" value={type} onChange={setType}
          options={["All"].concat(allTypes).map(function (t) { return { value: t, label: t === "All" ? "All" : t + "s", count: typeCount[t] || 0 }; })} />
        {st && (
          <button type="button" className="filter-chip" onClick={function () { props.onStage(null); }} aria-label={"Clear filter: " + st.label}>
            <i style={{ background: st.tone }}></i>{st.label}<span aria-hidden="true">✕</span>
          </button>
        )}
      </div>
      <ul className="c-list">
        {rows.length === 0 ? (
          <li className="no-rows">No content matches{q ? " “" + q + "”" : " this filter"}.</li>
        ) : rows.map(function (it) {
          const w = it.stage === "published" ? null : waitInfo(it, now);
          return (
            <li key={it.id} className="c-row">
              <StageBadge stage={it.stage} label={it.stageLabel} />
              <div className="c-main">
                <div className="c-title" title={it.name}>{it.name}</div>
                <div className="c-meta"><Tags item={it} /><Person name={it.staff} /></div>
              </div>
              <div className="c-when">
                {it.stage === "shoot" ? "Shoot " + fmtDate(it.start, now) : fmtDate(it.start, now)}
                {w && w.days != null && (it.stage === "shoot" ? <small>{shootWhen(it, now)}</small> : <small className={it.stage === "approval" ? "wait-" + w.tone : ""}>{w.days > 0 ? w.text + " in progress" : w.text}</small>)}
                {it.stage === "published" && <small>Started</small>}
              </div>
            </li>
          );
        })}
      </ul>
      {!props.printAll && filtered.length > PAGE && (
        <div className="pager">
          <span>{showAll ? "Showing all " + filtered.length : "Showing " + PAGE + " of " + filtered.length}</span>
          <button type="button" className="text-btn" onClick={function () { setShowAll(!showAll); }}>{showAll ? "Show less" : "Show all"}</button>
        </div>
      )}
    </div>
  );
}

function shootWhen(item, now) {
  if (!item.start) return "Date to be set";
  const d = daysBetween(now, item.start);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d > 1) return "In " + d + " days";
  return d === -1 ? "Yesterday" : -d + " days ago";
}

/* ---------- 4. upcoming shoots ---------- */
function UpcomingShoots(props) {
  const now = props.now;
  const shoots = props.items.filter(function (i) { return i.stage === "shoot"; })
    .sort(function (a, b) { return (a.start ? a.start.getTime() : Infinity) - (b.start ? b.start.getTime() : Infinity); });
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Upcoming shoots</h2>
          <div className="card-sub">{shoots.length ? plural(shoots.length, "shoot") + " on the list" : "No shoots planned yet"}</div>
        </div>
      </div>
      {shoots.length > 0 && (
        <ul className="shoot-list">
          {shoots.map(function (it) {
            return (
              <li key={it.id}>
                <span className="cal" aria-hidden="true">
                  <small>{it.start ? it.start.toLocaleDateString("en-GB", { month: "short" }) : "TBC"}</small>
                  <b>{it.start ? it.start.getDate() : "?"}</b>
                </span>
                <div className="c-main">
                  <div className="c-title" title={it.name}>{it.name}</div>
                  <div className="c-meta"><Person name={it.staff} /><span className="dim">{shootWhen(it, now)}</span></div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- 5. team ---------- */
function Team(props) {
  const map = {};
  props.items.forEach(function (i) {
    const k = i.staff || "Unassigned";
    const t = map[k] || (map[k] = { name: k, active: 0, done: 0 });
    if (i.stage === "published") t.done++; else t.active++;
  });
  const team = Object.keys(map).map(function (k) { return map[k]; })
    .filter(function (t) { return t.name !== "Unassigned" || t.active > 0; })
    .sort(function (a, b) { return b.active - a.active || b.done - a.done; });
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Team</h2>
          <div className="card-sub">Work in progress and published, by person</div>
        </div>
      </div>
      <ul className="team-list">
        {team.map(function (t) {
          return (
            <li key={t.name}>
              <Person name={t.name === "Unassigned" ? null : t.name} />
              <span className="team-stats">
                <span><b>{t.active}</b> in progress</span>
                <span><b>{t.done}</b> published</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- section ---------- */
export function ContentSection(props) {
  const now = props.now || new Date();
  const [stage, setStage] = useState(null);
  const items = props.items || [];
  function pickStage(s) {
    setStage(s);
    // bring the filtered list into view on small screens, where it sits far below the strip
    if (s && window.matchMedia && window.matchMedia("(max-width:1080px)").matches) {
      const el = document.getElementById("content-list");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  return (
    <>
      <div className="section-head">
        <div>
          <div className="eyebrow">CONTENT TRACKER</div>
          <h2 className="section-title">Content.</h2>
          <p className="subtitle">
            {plural(items.length, "piece")} of content
            {props.lastSynced ? " · sheet updated " + fmtDate(props.lastSynced, now) + ", " + props.lastSynced.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}
          </p>
        </div>
        <a className="btn-secondary" href={props.sheetUrl} target="_blank" rel="noreferrer">Open Content Sheet ↗</a>
      </div>
      <div className="reveal"><ApprovalPanel items={items} now={now} /></div>
      <div className="section reveal"><Pipeline items={items} stage={stage} onStage={pickStage} /></div>
      <div className="split content-split reveal">
        <div id="content-list" className="reveal-item"><ContentList items={items} now={now} stage={stage} onStage={setStage} printAll={props.printAll} /></div>
        <div className="side-stack reveal-item">
          <UpcomingShoots items={items} now={now} />
          <Team items={items} />
        </div>
      </div>
    </>
  );
}
