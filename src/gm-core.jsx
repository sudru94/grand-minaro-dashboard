/* Grand Minaro — shared helpers + visual atoms. */

// ---------- formatting ----------
export function formatLKR(n, compact) {
  if (n == null || isNaN(n)) return "—";
  if (compact && Math.abs(n) >= 1000) {
    if (Math.abs(n) >= 1e6) return "LKR " + (n / 1e6).toFixed(2) + "M";
    return "LKR " + (n / 1e3).toFixed(0) + "K";
  }
  return "LKR " + Math.round(n).toLocaleString("en-US");
}
export function fmtNum(n, compact) {
  if (n == null || isNaN(n)) return "—";
  if (compact !== false) {
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + "K";
  }
  return Math.round(n).toLocaleString("en-US");
}

// ---------- campaign categorisation ----------
export const CAT_TONE = { Rooms: "var(--blue)", Couple: "var(--green)", Wedding: "var(--accent)", Other: "var(--gray)" };
export function categoryOf(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("room")) return "Rooms";
  if (n.includes("couple")) return "Couple";
  if (n.includes("wedding")) return "Wedding";
  return "Other";
}
export function CatTag(props) {
  const k = categoryOf(props.name);
  return <span className="cat-tag"><i style={{ background: CAT_TONE[k] }}></i>{k}</span>;
}

// ---------- tiny atoms ----------
export function Sparkline(props) {
  var data = props.data || [];
  if (data.length <= 1) return null;
  var w = props.w || 96, h = props.h || 32, p = 3;
  var min = Math.min.apply(null, data), max = Math.max.apply(null, data);
  var range = max - min === 0 ? 1 : max - min;
  var pts = data.map(function (v, i) {
    var x = (i / (data.length - 1)) * (w - p * 2) + p;
    var y = h - ((v - min) / range) * (h - p * 2) - p;
    return x.toFixed(1) + "," + y.toFixed(1);
  });
  var last = pts[pts.length - 1].split(",");
  var gid = "spk" + (props.id || Math.round(Math.random() * 1e6)).toString().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg width={w} height={h} viewBox={"0 0 " + w + " " + h} style={{ overflow: "visible", display: "block" }} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: props.color, stopOpacity: 0.2 }} />
          <stop offset="100%" style={{ stopColor: props.color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <polyline
        points={pts.join(" ") + " " + last[0] + "," + h + " " + p + "," + h}
        fill={"url(#" + gid + ")"} stroke="none"
      />
      <polyline points={pts.join(" ")} fill="none" style={{ stroke: props.color }}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" style={{ fill: props.color }} />
    </svg>
  );
}

export function TrendChip(props) {
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
