/* Grand Minaro — charts: TrendsChart (monthly line, one metric at a time) + CategorySplit donut */
import { useState, useRef, useEffect } from "react";
import { formatLKR, fmtNum } from "./gm-core.jsx";

// the chart fills its card: track the host's width and height
function useSize(minW, minH) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 720, h: minH });
  useEffect(function () {
    if (!ref.current) return;
    const ro = new ResizeObserver(function (e) {
      const r = e[0].contentRect;
      setSize({ w: Math.max(r.width, minW), h: Math.max(r.height, minH) });
    });
    ro.observe(ref.current);
    return function () { ro.disconnect(); };
  }, []);
  return [ref, size.w, size.h];
}

const METRICS = {
  spend: { name: "Spend", color: "var(--accent)", zero: true, fmt: function (v) { return formatLKR(v, true); } },
  msgConversations: { name: "Chats", color: "var(--green)", zero: true, fmt: function (v) { return fmtNum(v); } },
  costPerMsgConv: { name: "Per Chat", color: "var(--blue)", zero: false, fmt: function (v) { return formatLKR(v); } },
  ctr: { name: "CTR", color: "var(--accent)", zero: true, fmt: function (v) { return v.toFixed(2) + "%"; } },
};

export function Segmented(props) {
  return (
    <div className="segmented" role="radiogroup" aria-label={props.label}>
      {props.options.map(function (o) {
        const on = o.value === props.value;
        return (
          <button key={o.value} role="radio" aria-checked={on} className={on ? "on" : ""}
            onClick={function () { props.onChange(o.value); }}>
            {o.label}{o.count != null && <span className="ct">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TrendsChart(props) {
  const data = props.monthly;
  const selectedMonth = props.selectedMonth;
  const [metric, setMetric] = useState("spend");
  const [hi, setHi] = useState(null);
  const [ref, width, height] = useSize(280, 240);
  const M = METRICS[metric];

  const pad = { l: 76, r: 28, t: 16, b: 34 };
  const pts = data.map(function (m) { return { label: m.month, v: m[metric] || 0, raw: m }; });
  const vals = pts.map(function (p) { return p.v; });
  const vMax = Math.max.apply(null, vals.concat([0])) * 1.08 || 1;
  const vMin = M.zero ? 0 : Math.min.apply(null, vals) * 0.9;

  const X = function (i) { return pad.l + i * (width - pad.l - pad.r) / (pts.length - 1 || 1); };
  const Y = function (v) {
    const r = vMax - vMin === 0 ? 0.5 : (v - vMin) / (vMax - vMin);
    return height - pad.b - r * (height - pad.t - pad.b);
  };

  // the in-progress (month-to-date) point is the last one if it's the current calendar month
  const nowLabel = (function () { const d = new Date(); return d.toLocaleString("en-US", { month: "short" }) + " " + d.getFullYear(); })();
  const hasMTD = pts.length > 1 && pts[pts.length - 1].label === nowLabel;
  const solidEnd = hasMTD ? pts.length - 1 : pts.length;

  let line = "", area = "";
  for (let i = 0; i < solidEnd; i++) {
    const x = X(i), y = Y(pts[i].v);
    line += (i === 0 ? "M " : " L ") + x + " " + y;
    area += (i === 0 ? "M " + x + " " + (height - pad.b) + " L " : " L ") + x + " " + y;
    if (i === solidEnd - 1) area += " L " + x + " " + (height - pad.b) + " Z";
  }
  const mtdLine = hasMTD ? "M " + X(solidEnd - 1) + " " + Y(pts[solidEnd - 1].v) + " L " + X(pts.length - 1) + " " + Y(pts[pts.length - 1].v) : "";

  const grid = [0, 1, 2, 3].map(function (i) {
    const v = vMin + (i / 3) * (vMax - vMin);
    return { y: Y(v), v: v };
  });

  const selIdx = pts.findIndex(function (p) { return p.label === selectedMonth; });
  const act = hi != null ? hi : (selIdx >= 0 ? selIdx : null);
  const labelEvery = width < 520 ? 2 : 1;

  function onMove(e) {
    const r = ref.current.getBoundingClientRect();
    const mx = e.clientX - r.left;
    let best = 0, bd = Infinity;
    for (let i = 0; i < pts.length; i++) { const d = Math.abs(mx - X(i)); if (d < bd) { bd = d; best = i; } }
    setHi(best);
  }

  const summaryText = pts.map(function (p) { return p.label + ": " + M.fmt(p.v); }).join(", ");

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Monthly Trend</h2>
          <div className="card-sub">{data.length ? data[0].month + " – " + data[data.length - 1].month : ""}</div>
        </div>
        <Segmented label="Chart metric" value={metric} onChange={setMetric}
          options={Object.keys(METRICS).map(function (k) { return { value: k, label: METRICS[k].name }; })} />
      </div>

      <div className="chart-host" ref={ref} onMouseMove={onMove} onMouseLeave={function () { setHi(null); }}>
        <svg width={width} height={height} style={{ overflow: "visible", display: "block" }} role="img" aria-label={M.name + " by month. " + summaryText}>
          <defs>
            <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: M.color, stopOpacity: 0.22 }} />
              <stop offset="100%" style={{ stopColor: M.color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          {grid.map(function (g, i) {
            return (
              <g key={i}>
                <line x1={pad.l} y1={g.y} x2={width - pad.r} y2={g.y} className="grid-line" />
                <text x={pad.l - 10} y={g.y + 4} textAnchor="end" className="axis-text">{M.fmt(g.v)}</text>
              </g>
            );
          })}

          <path d={area} fill="url(#areaG)" />
          <path d={line} fill="none" style={{ stroke: M.color }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {hasMTD && <path d={mtdLine} fill="none" style={{ stroke: M.color }} strokeWidth="2.5" strokeDasharray="2 5" strokeLinecap="round" opacity="0.6" />}

          {pts.map(function (p, i) {
            if (i % labelEvery !== (pts.length - 1) % labelEvery) return null;
            return <text key={i} x={X(i)} y={height - pad.b + 22} textAnchor="middle" className={"axis-text" + (i === selIdx ? " on" : "")}>{p.label.split(" ")[0]}</text>;
          })}

          {act != null && (
            <g>
              <line x1={X(act)} y1={pad.t} x2={X(act)} y2={height - pad.b} className="cursor-line" />
              <circle cx={X(act)} cy={Y(pts[act].v)} r="5" className="dot-knob" style={{ stroke: M.color }} strokeWidth="2.5" />
            </g>
          )}
        </svg>

        {hi != null && (
          <div className="tip glass" style={{ left: Math.min(width - 170, Math.max(4, X(hi) - 80)) + "px", top: Math.max(0, Y(pts[hi].v) - 96) + "px" }}>
            <div className="tip-h">{pts[hi].label}{hi === pts.length - 1 && hasMTD ? " · to date" : ""}</div>
            <div className="tip-v" style={{ color: M.color }}>{M.fmt(pts[hi].v)}</div>
            <div className="tip-s">{fmtNum(pts[hi].raw.clicks)} clicks · {fmtNum(pts[hi].raw.msgConversations)} chats</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CategorySplit(props) {
  const cats = props.cats; // [{key, spend, chats, cpa, tone}]
  const total = cats.reduce(function (s, c) { return s + c.spend; }, 0) || 1;
  const R = 76, r = 54, cx = 90, cy = 90, gap = 0.02;
  let a0 = -Math.PI / 2;
  const shown = cats.filter(function (c) { return c.spend > 0; });
  const arcs = shown.map(function (c) {
    const frac = c.spend / total;
    const s = a0 + (shown.length > 1 ? gap : 0), e = a0 + frac * Math.PI * 2 - (shown.length > 1 ? gap : 0);
    const large = e - s > Math.PI ? 1 : 0;
    const p = function (rad, a) { return (cx + rad * Math.cos(a)) + " " + (cy + rad * Math.sin(a)); };
    const d = "M " + p(R, s) + " A " + R + " " + R + " 0 " + large + " 1 " + p(R, e) +
      " L " + p(r, e) + " A " + r + " " + r + " 0 " + large + " 0 " + p(r, s) + " Z";
    a0 += frac * Math.PI * 2;
    return { d: d, tone: c.tone, key: c.key };
  });

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Spend by Package</h2>
          <div className="card-sub">{props.period}</div>
        </div>
      </div>
      <div className="donut-wrap">
        <svg width="180" height="180" role="img" aria-label={"Spend by package: " + cats.map(function (c) { return c.key + " " + Math.round(c.spend / total * 100) + "%"; }).join(", ")}>
          {arcs.map(function (a, i) { return <path key={i} d={a.d} style={{ fill: a.tone }} />; })}
          <text x="90" y="86" textAnchor="middle" className="donut-cap">Total</text>
          <text x="90" y="106" textAnchor="middle" className="donut-val">{formatLKR(total, true).replace("LKR ", "")}</text>
        </svg>
        <ul className="legend">
          {cats.map(function (c, i) {
            return (
              <li key={i}>
                <i style={{ background: c.tone }}></i>
                <span className="ln">{c.key}</span>
                <span className="lv">{Math.round((c.spend / total) * 100)}%</span>
                <span className="lc">{c.chats > 0 ? formatLKR(c.cpa) + " / chat" : "No chats"}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
