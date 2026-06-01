/* Grand Minaro — shared helpers + visual atoms. Exposes window.GM and atom components. */

// ---------- formatting ----------
function formatLKR(n, compact) {
  if (n == null || isNaN(n)) return "—";
  if (compact && Math.abs(n) >= 1000) {
    if (Math.abs(n) >= 1e6) return "LKR " + (n / 1e6).toFixed(2) + "M";
    return "LKR " + (n / 1e3).toFixed(0) + "K";
  }
  return "LKR " + Math.round(n).toLocaleString("en-US");
}
function fmtNum(n, compact) {
  if (n == null || isNaN(n)) return "—";
  if (compact !== false) {
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + "K";
  }
  return Math.round(n).toLocaleString("en-US");
}

// ---------- campaign categorisation ----------
const CATS = [
  { key: "Rooms",   match: "room",    tone: "var(--c-rooms)" },
  { key: "Couple",  match: "couple",  tone: "var(--c-couple)" },
  { key: "Wedding", match: "wedding", tone: "var(--c-wedding)" },
  { key: "Other",   match: null,      tone: "var(--c-other)" },
];
function categoryOf(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("room")) return "Rooms";
  if (n.includes("couple")) return "Couple";
  if (n.includes("wedding")) return "Wedding";
  return "Other";
}

// chronological month list straight from the snapshot
const MONTHS = (window.GM_MONTHLY || []).map(function (m) { return m.month; });

// ---------- tiny atoms ----------
function Sparkline(props) {
  var data = props.data || [];
  if (data.length <= 1) return null;
  var w = props.w || 116, h = props.h || 34, p = 3;
  var min = Math.min.apply(null, data), max = Math.max.apply(null, data);
  var range = max - min === 0 ? 1 : max - min;
  var pts = data.map(function (v, i) {
    var x = (i / (data.length - 1)) * (w - p * 2) + p;
    var y = h - ((v - min) / range) * (h - p * 2) - p;
    return x.toFixed(1) + "," + y.toFixed(1);
  });
  var last = pts[pts.length - 1].split(",");
  var gid = "spk" + (props.id || Math.round(Math.random() * 1e6));
  return (
    <svg width={w} height={h} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={props.color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={props.color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts.join(" ") + " " + last[0] + "," + h + " " + p + "," + h}
        fill={"url(#" + gid + ")"} stroke="none"
      />
      <polyline points={pts.join(" ")} fill="none" stroke={props.color}
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.4" fill={props.color} />
    </svg>
  );
}

function TrendChip(props) {
  var v = props.value;
  if (v == null || isNaN(v)) return null;
  var pos = v >= 0;
  // For cost metrics, lower is better: invert tone via props.invert
  var good = props.invert ? !pos : pos;
  var cls = good ? "chip-up" : "chip-down";
  var arrow = pos ? "▲" : "▼";
  return (
    <span className={"trend-chip " + cls}>
      <span className="trend-arrow">{arrow}</span>
      {(pos ? "+" : "") + v.toFixed(1) + "%"}
      {props.label ? <span className="trend-lbl">{props.label}</span> : null}
    </span>
  );
}

window.GM = {
  formatLKR: formatLKR,
  fmtNum: fmtNum,
  CATS: CATS,
  categoryOf: categoryOf,
  MONTHS: MONTHS,
};
Object.assign(window, { Sparkline: Sparkline, TrendChip: TrendChip });
