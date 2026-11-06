/* Grand Minaro — shared helpers + visual atoms. */
import { useState, useEffect, useRef } from "react";

// ---------- motion ----------
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* Counts a number toward its target (ease-out, ~0.8s), restarting from whatever is
   on screen when the target changes. Instant under reduced motion. */
export function useCountUp(target, duration) {
  const dur = duration || 800;
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0);
  const shown = useRef(value);
  useEffect(function () {
    if (!isFinite(target) || prefersReducedMotion()) { shown.current = target; setValue(target); return; }
    const from = shown.current, start = performance.now();
    let raf = 0;
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 4); // easeOutQuart: fast start, soft landing
      const v = from + (target - from) * e;
      shown.current = v; setValue(v);
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return function () { cancelAnimationFrame(raf); };
  }, [target, dur]);
  return value;
}

/* A formatted number that counts up. The final value is exposed to assistive tech
   immediately; the ticking digits are hidden from it. */
export function CountUp(props) {
  const v = useCountUp(props.value, props.duration);
  const fmt = props.format || function (n) { return Math.round(n).toLocaleString("en-US"); };
  return <><span aria-hidden="true">{fmt(v)}</span><span className="sr-only">{fmt(props.value)}</span></>;
}

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
  // "couple" before "room": combo names like "Couple Package + Rooms" are couple packages
  if (n.includes("couple")) return "Couple";
  if (n.includes("room")) return "Rooms";
  if (n.includes("wedding")) return "Wedding";
  return "Other";
}
export function CatTag(props) {
  const k = categoryOf(props.name);
  return <span className="cat-tag"><i style={{ background: CAT_TONE[k] }}></i>{k}</span>;
}

// ---------- shared metrics ----------
// one frequency threshold for both the KPI "Fatigue" badge and the Insights alert
export const FATIGUE_FREQ = 3.2;

// account cost per chat for a period, from the Monthly Summary rows — the same
// source as the KPI tile, so every "average" on the page agrees
export function periodAvgCPA(summary, selectedMonth) {
  const rows = selectedMonth === "All Time" ? summary : summary.filter(function (m) { return m.month === selectedMonth; });
  const spend = rows.reduce(function (s, m) { return s + m.spend; }, 0);
  const chats = rows.reduce(function (s, m) { return s + m.msgConversations; }, 0);
  return chats > 0 ? spend / chats : 0;
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
      <path className="spark-area"
        d={"M " + pts.join(" L ") + " L " + last[0] + "," + h + " L " + p + "," + h + " Z"}
        fill={"url(#" + gid + ")"} stroke="none"
      />
      <path className="spark-line" d={"M " + pts.join(" L ")} pathLength="1" fill="none" style={{ stroke: props.color }}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="spark-dot" cx={last[0]} cy={last[1]} r="2.6" style={{ fill: props.color }} />
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
