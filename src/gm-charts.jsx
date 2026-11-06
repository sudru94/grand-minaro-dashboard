/* Grand Minaro — charts: TrendsChart (monthly columns, one metric at a time) + CategorySplit donut */
import { useState, useRef, useEffect, useLayoutEffect } from "react";
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
  spend: { name: "Spend", color: "var(--blue)", zero: true, fmt: function (v) { return formatLKR(v, true); } },
  msgConversations: { name: "Chats", color: "var(--green)", zero: true, fmt: function (v) { return fmtNum(v); } },
  costPerMsgConv: { name: "Per Chat", color: "var(--purple)", zero: true, fmt: function (v) { return formatLKR(v); } },
  ctr: { name: "CTR", color: "var(--accent)", zero: true, fmt: function (v) { return v.toFixed(2) + "%"; } },
};

export function Segmented(props) {
  // the selection thumb slides between segments (measured, so any label width works)
  const box = useRef(null);
  const [thumb, setThumb] = useState(null);
  useLayoutEffect(function () {
    const el = box.current; if (!el) return;
    function measure() {
      const on = el.querySelector("button.on");
      setThumb(on ? { x: on.offsetLeft, w: on.offsetWidth } : null);
    }
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return function () { ro.disconnect(); };
  }, [props.value, props.options.length]);
  return (
    <div className="segmented" role="radiogroup" aria-label={props.label} ref={box}>
      {thumb && <span className="seg-thumb" aria-hidden="true" style={{ transform: "translateX(" + thumb.x + "px)", width: thumb.w + "px" }} />}
      {props.options.map(function (o) {
        const on = o.value === props.value;
        return (
          <button key={o.value} role="radio" aria-checked={on} className={on ? "on" : ""}
            tabIndex={on ? 0 : -1}
            onKeyDown={function (e) {
              const index = props.options.findIndex(function (item) { return item.value === o.value; });
              const next = e.key === "ArrowRight" ? (index + 1) % props.options.length : e.key === "ArrowLeft" ? (index - 1 + props.options.length) % props.options.length : e.key === "Home" ? 0 : e.key === "End" ? props.options.length - 1 : null;
              if (next === null) return;
              e.preventDefault();
              props.onChange(props.options[next].value);
              e.currentTarget.parentElement.children[next].focus();
            }}
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
  const [ref, width, height] = useSize(260, 240);
  const M = METRICS[metric];
  if (!data.length) return <div className="card trend-card"><div className="card-head"><h2 className="card-title">Performance over time</h2></div><p className="empty">No monthly results available for this period.</p></div>;

  const pad = { l: 76, r: 28, t: 16, b: 34 };
  const pts = data.map(function (m) { return { label: m.month, v: m[metric] || 0, raw: m }; });
  const vals = pts.map(function (p) { return p.v; });
  const vMax = Math.max.apply(null, vals.concat([0])) * 1.08 || 1;
  const vMin = M.zero ? 0 : Math.min.apply(null, vals) * 0.9;

  // one band per month; X(i) is the band's centre, bars are capped at 24px wide
  const band = (width - pad.l - pad.r) / (pts.length || 1);
  const X = function (i) { return pad.l + band * (i + 0.5); };
  const barW = Math.max(4, Math.min(24, band * 0.62));
  const Y = function (v) {
    const r = vMax - vMin === 0 ? 0.5 : (v - vMin) / (vMax - vMin);
    return height - pad.b - r * (height - pad.t - pad.b);
  };

  // the in-progress (month-to-date) point is the last one if it's the current calendar month
  const nowLabel = (function () { const d = new Date(); return d.toLocaleString("en-US", { month: "short" }) + " " + d.getFullYear(); })();
  const hasMTD = pts.length > 1 && pts[pts.length - 1].label === nowLabel;
  const base = height - pad.b;

  // column with a 4px rounded data-end and a square foot on the baseline
  function barPath(i) {
    const x0 = X(i) - barW / 2, x1 = x0 + barW, y = Y(pts[i].v);
    const h = base - y; if (h <= 0) return "";
    const r = Math.min(4, h, barW / 2);
    return "M " + x0 + " " + base + " V " + (y + r) + " Q " + x0 + " " + y + " " + (x0 + r) + " " + y +
      " H " + (x1 - r) + " Q " + x1 + " " + y + " " + x1 + " " + (y + r) + " V " + base + " Z";
  }

  const grid = [0, 1, 2, 3].map(function (i) {
    const v = vMin + (i / 3) * (vMax - vMin);
    return { y: Y(v), v: v };
  });

  const selIdx = pts.findIndex(function (p) { return p.label === selectedMonth; });
  const hoverIndex = hi != null && pts.length ? Math.min(hi, pts.length - 1) : null;
  const act = hoverIndex != null ? hoverIndex : (selIdx >= 0 ? selIdx : null);
  const featured = pts[act != null ? act : pts.length - 1];
  const labelEvery = width < 520 ? 2 : 1;

  function onMove(e) {
    if (!pts.length) return;
    const r = ref.current.getBoundingClientRect();
    const mx = e.clientX - r.left;
    let best = 0, bd = Infinity;
    for (let i = 0; i < pts.length; i++) { const d = Math.abs(mx - X(i)); if (d < bd) { bd = d; best = i; } }
    setHi(best);
  }

  const summaryText = pts.map(function (p) { return p.label + ": " + M.fmt(p.v); }).join(", ");

  return (
    <div className="card trend-card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Performance over time</h2>
          <div className="card-sub">Monthly results · {data.length ? data[0].month + " – " + data[data.length - 1].month : "No data"}</div>
        </div>
        <Segmented label="Chart metric" value={metric} onChange={setMetric}
          options={Object.keys(METRICS).map(function (k) { return { value: k, label: METRICS[k].name }; })} />
      </div>

      <div className="chart-summary" aria-live="polite">
        <strong>{featured ? M.fmt(featured.v) : "—"}</strong>
        <span>{featured ? featured.label + (featured.label === nowLabel ? " · Month to date" : "") : "No monthly results"}</span>
      </div>
      <div className="chart-host" ref={ref} tabIndex={pts.length ? 0 : -1} role="group" aria-label="Interactive monthly chart. Use the left and right arrow keys to explore months."
        onPointerMove={onMove} onPointerLeave={function (e) { if (e.pointerType !== "touch") setHi(null); }}
        onFocus={function () { if (pts.length) setHi(selIdx >= 0 ? selIdx : pts.length - 1); }}
        onBlur={function () { setHi(null); }}
        onKeyDown={function (e) {
          if (!pts.length) return;
          const current = hoverIndex != null ? hoverIndex : pts.length - 1;
          const next = e.key === "ArrowLeft" ? Math.max(0, current - 1) : e.key === "ArrowRight" ? Math.min(pts.length - 1, current + 1) : e.key === "Home" ? 0 : e.key === "End" ? pts.length - 1 : null;
          if (next !== null) { e.preventDefault(); setHi(next); }
        }}>
        <svg width={width} height={height} style={{ overflow: "visible", display: "block" }} role="img" aria-label={M.name + " by month. " + summaryText}>
          <defs>
            {/* month-to-date bar: 45° hatch in the series colour, so "partial" isn't colour-alone */}
            <pattern id="mtdHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" style={{ fill: M.color }} opacity="0.18" />
              <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: M.color }} strokeWidth="2.5" opacity="0.75" />
            </pattern>
          </defs>

          {act != null && <rect x={X(act) - band / 2 + 1} y={pad.t} width={band - 2} height={base - pad.t} rx="6" className="col-hover" />}

          {grid.map(function (g, i) {
            return (
              <g key={i}>
                <line x1={pad.l} y1={g.y} x2={width - pad.r} y2={g.y} className="grid-line" />
                <text x={pad.l - 10} y={g.y + 4} textAnchor="end" className="axis-text">{M.fmt(g.v)}</text>
              </g>
            );
          })}

          <g key={metric + ":" + pts.length + ":" + Math.round(width)} className="bars-grow">
            {pts.map(function (p, i) {
              const mtd = hasMTD && i === pts.length - 1;
              const st = { animationDelay: (i * 28) + "ms" };
              if (!mtd) st.fill = M.color;
              return <path key={i} d={barPath(i)} fill={mtd ? "url(#mtdHatch)" : undefined}
                style={st} opacity={act != null && act !== i ? 0.55 : 1} className="bar" />;
            })}
          </g>

          {pts.map(function (p, i) {
            if (i % labelEvery !== (pts.length - 1) % labelEvery) return null;
            return <text key={i} x={X(i)} y={height - pad.b + 22} textAnchor="middle" className={"axis-text" + (i === selIdx ? " on" : "")}>{p.label.split(" ")[0]}</text>;
          })}

        </svg>

        {hoverIndex != null && (
          <div className="tip glass" style={{ left: Math.min(width - 170, Math.max(4, X(hoverIndex) - 80)) + "px", top: Math.max(0, Y(pts[hoverIndex].v) - 96) + "px" }}>
            <div className="tip-h">{pts[hoverIndex].label}{hoverIndex === pts.length - 1 && hasMTD ? " · to date" : ""}</div>
            <div className="tip-v" style={{ color: M.color }}>{M.fmt(pts[hoverIndex].v)}</div>
            <div className="tip-s">{fmtNum(pts[hoverIndex].raw.clicks)} clicks · {fmtNum(pts[hoverIndex].raw.msgConversations)} chats</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CategorySplit(props) {
  const cats = props.cats; // [{key, spend, chats, cpa, tone}]
  const total = cats.reduce(function (s, c) { return s + c.spend; }, 0);
  const denominator = total || 1;
  const R = 76, r = 54, cx = 90, cy = 90, gap = 0.02;
  let a0 = -Math.PI / 2;
  const shown = cats.filter(function (c) { return c.spend > 0; });
  const arcs = shown.map(function (c) {
    const frac = c.spend / denominator;
    const s = a0 + (shown.length > 1 ? gap : 0), e = a0 + frac * Math.PI * 2 - (shown.length > 1 ? gap : 0);
    const large = e - s > Math.PI ? 1 : 0;
    const p = function (rad, a) { return (cx + rad * Math.cos(a)) + " " + (cy + rad * Math.sin(a)); };
    const d = "M " + p(R, s) + " A " + R + " " + R + " 0 " + large + " 1 " + p(R, e) +
      " L " + p(r, e) + " A " + r + " " + r + " 0 " + large + " 0 " + p(r, s) + " Z";
    a0 += frac * Math.PI * 2;
    return { d: d, tone: c.tone, key: c.key };
  });

  return (
    <div className="card package-card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Budget distribution</h2>
          <div className="card-sub">Spend by package · {props.period}</div>
        </div>
      </div>
      <div className="donut-wrap">
        <svg width="152" height="152" viewBox="0 0 180 180" role="img" aria-label={total > 0 ? "Spend by package: " + cats.map(function (c) { return c.key + " " + Math.round(c.spend / denominator * 100) + "%"; }).join(", ") : "No campaign spend available for this period"}>
          <defs>
            <mask id="donutSweep" maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="180">
              <circle key={props.period + ":" + Math.round(total)} className="donut-sweep" cx="90" cy="90" r="65" fill="none" stroke="#fff"
                strokeWidth="32" pathLength="1" strokeDasharray="1 1" transform="rotate(-90 90 90)" />
            </mask>
          </defs>
          {total === 0 && <circle cx="90" cy="90" r="65" fill="none" stroke="var(--fill)" strokeWidth="22" />}
          <g mask="url(#donutSweep)">
            {shown.length === 1 ? <circle cx="90" cy="90" r="65" fill="none" stroke={shown[0].tone} strokeWidth="22" /> : arcs.map(function (a, i) { return <path key={i} d={a.d} style={{ fill: a.tone }} />; })}
          </g>
          <text x="90" y="86" textAnchor="middle" className="donut-cap">{total > 0 ? "Total" : "No spend"}</text>
          <text x="90" y="106" textAnchor="middle" className="donut-val">{total > 0 ? formatLKR(total, true).replace("LKR ", "") : "—"}</text>
        </svg>
        <ul className="legend">
          {cats.map(function (c, i) {
            return (
              <li key={i}>
                <i style={{ background: c.tone }}></i>
                <span className="ln">{c.key}</span>
                <span className="lv">{Math.round((c.spend / denominator) * 100)}%</span>
                <span className="lc">{c.chats > 0 ? formatLKR(c.cpa) + " / chat" : "No chats"}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
