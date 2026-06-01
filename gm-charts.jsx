/* Grand Minaro — charts: TrendsChart (dual-axis monthly trajectory) + CategorySplit donut */
const { useState, useRef, useEffect, useMemo } = React;
const GM = window.GM;

function useWidth(min) {
  const ref = useRef(null);
  const [w, setW] = useState(720);
  useEffect(function () {
    if (!ref.current) return;
    const ro = new ResizeObserver(function (e) {
      const cw = e[0].contentRect.width;
      setW(Math.max(cw, min || 300));
    });
    ro.observe(ref.current);
    return function () { ro.disconnect(); };
  }, []);
  return [ref, w];
}

const METRIC_META = {
  spend: { name: "Spend", unit: "LKR", fmt: function (v) { return GM.formatLKR(v, true); } },
  msgConversations: { name: "Chats Started", unit: "", fmt: function (v) { return GM.fmtNum(v); } },
  ctr: { name: "CTR", unit: "%", fmt: function (v) { return v.toFixed(2) + "%"; } },
  cpc: { name: "Cost / Click", unit: "LKR", fmt: function (v) { return GM.formatLKR(v); } },
  cpm: { name: "CPM", unit: "LKR", fmt: function (v) { return GM.formatLKR(v); } },
  costPerMsgConv: { name: "Cost / Chat", unit: "LKR", fmt: function (v) { return GM.formatLKR(v); } },
};

function accentHex() {
  return getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#CF8A00";
}

function TrendsChart(props) {
  const data = props.monthly;
  const selectedMonth = props.selectedMonth;
  const [metric, setMetric] = useState("spend");
  const [overlay, setOverlay] = useState("msgConversations");
  const [hi, setHi] = useState(null);
  const [ref, width] = useWidth(320);
  const height = 318;
  const acc = props.accent; // re-render trigger when accent changes
  const accHex = accentHex();

  const pad = { l: 58, r: overlay !== "none" ? 56 : 22, t: 18, b: 38 };
  const pts = data.map(function (m) {
    return { label: m.month, p: m[metric], s: overlay !== "none" ? m[overlay] : null, raw: m };
  });

  const pVals = pts.map(function (p) { return p.p; });
  const pMax = Math.max.apply(null, pVals) * 1.08;
  const pMin = (metric === "spend" || metric === "msgConversations" || metric === "ctr") ? 0 : Math.min.apply(null, pVals) * 0.9;
  let sMax = 1, sMin = 0;
  if (overlay !== "none") {
    const sVals = pts.map(function (p) { return p.s; });
    sMax = Math.max.apply(null, sVals) * 1.08;
    sMin = (overlay === "ctr" || overlay === "msgConversations") ? 0 : Math.min.apply(null, sVals) * 0.9;
  }

  const X = function (i) { return pad.l + i * (width - pad.l - pad.r) / (pts.length - 1 || 1); };
  const Y = function (v, mx, mn) {
    const h = height - pad.t - pad.b;
    const r = mx - mn === 0 ? 0.5 : (v - mn) / (mx - mn);
    return height - pad.b - r * h;
  };

  let area = "", line = "", oline = "";
  pts.forEach(function (p, i) {
    const x = X(i), y = Y(p.p, pMax, pMin);
    area += (i === 0 ? "M " + x + " " + (height - pad.b) + " L " + x + " " + y : " L " + x + " " + y);
    line += (i === 0 ? "M " + x + " " + y : " L " + x + " " + y);
    if (i === pts.length - 1) area += " L " + x + " " + (height - pad.b) + " Z";
    if (overlay !== "none") {
      const ys = Y(p.s, sMax, sMin);
      oline += (i === 0 ? "M " + x + " " + ys : " L " + x + " " + ys);
    }
  });

  const ticks = 5;
  const grid = Array.from({ length: ticks }).map(function (_, i) {
    const r = i / (ticks - 1);
    return { y: Y(pMin + r * (pMax - pMin), pMax, pMin), pv: pMin + r * (pMax - pMin), sv: sMin + r * (sMax - sMin) };
  });

  const selIdx = pts.findIndex(function (p) { return p.label === selectedMonth; });

  function onMove(e) {
    const r = ref.current.getBoundingClientRect();
    const mx = e.clientX - r.left;
    let best = 0, bd = Infinity;
    for (let i = 0; i < pts.length; i++) { const d = Math.abs(mx - X(i)); if (d < bd) { bd = d; best = i; } }
    setHi(best);
  }

  const act = hi != null ? hi : (selIdx >= 0 ? selIdx : null);

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title"><span className="tick"></span>Performance &amp; Spend Trajectory</h2>
          <div className="panel-sub">Monthly trajectory · Aug 2025 – May 2026 · {selectedMonth === "All Time" ? "full account history" : selectedMonth + " highlighted"}</div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div>
            <label className="field-lbl">Primary</label>
            <select className="sel" value={metric} onChange={function (e) { setMetric(e.target.value); }}>
              <option value="spend">Spend (LKR)</option>
              <option value="msgConversations">Chats Started</option>
              <option value="ctr">CTR (%)</option>
              <option value="cpc">Cost / Click</option>
              <option value="cpm">CPM</option>
              <option value="costPerMsgConv">Cost / Chat</option>
            </select>
          </div>
          <div>
            <label className="field-lbl">Overlay</label>
            <select className="sel" value={overlay} onChange={function (e) { setOverlay(e.target.value); }}>
              <option value="none">None</option>
              <option value="msgConversations">Chats Started</option>
              <option value="ctr">CTR (%)</option>
              <option value="cpc">Cost / Click</option>
              <option value="costPerMsgConv">Cost / Chat</option>
            </select>
          </div>
        </div>
      </div>

      <div className="chart-host" ref={ref} onMouseMove={onMove} onMouseLeave={function () { setHi(null); }}>
        <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
          <defs>
            <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accHex} stopOpacity="0.26" />
              <stop offset="100%" stopColor={accHex} stopOpacity="0" />
            </linearGradient>
          </defs>

          {selIdx >= 0 && selectedMonth !== "All Time" && (
            <rect x={X(selIdx) - (width - pad.l - pad.r) / (pts.length - 1) / 2} y={pad.t}
              width={(width - pad.l - pad.r) / (pts.length - 1)} height={height - pad.t - pad.b}
              fill={accHex} opacity="0.07" />
          )}

          {grid.map(function (g, i) {
            return (
              <g key={i}>
                <line x1={pad.l} y1={g.y} x2={width - pad.r} y2={g.y} stroke="rgba(255,255,255,.06)" strokeDasharray="3 5" />
                <text x={pad.l - 10} y={g.y + 4} textAnchor="end" fill="#5e7686" fontSize="9.5" fontFamily="JetBrains Mono">{METRIC_META[metric].fmt(g.pv)}</text>
                {overlay !== "none" && (
                  <text x={width - pad.r + 10} y={g.y + 4} textAnchor="start" fill="#5e7686" fontSize="9.5" fontFamily="JetBrains Mono">{METRIC_META[overlay].fmt(g.sv)}</text>
                )}
              </g>
            );
          })}

          <path d={area} fill="url(#areaG)" />
          <path d={line} fill="none" stroke={accHex} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          {overlay !== "none" && <path d={oline} fill="none" stroke="#36b277" strokeWidth="1.9" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />}

          {pts.map(function (p, i) {
            return <text key={i} x={X(i)} y={height - pad.b + 20} textAnchor="middle" fill="#7c8fa0" fontSize="10" fontWeight="700">{p.label.split(" ")[0]}</text>;
          })}

          {act != null && (
            <g>
              <line x1={X(act)} y1={pad.t} x2={X(act)} y2={height - pad.b} stroke={accHex} strokeOpacity="0.4" strokeDasharray="2 3" />
              <circle cx={X(act)} cy={Y(pts[act].p, pMax, pMin)} r="5.5" fill="var(--bg-1)" stroke={accHex} strokeWidth="3" />
              {overlay !== "none" && <circle cx={X(act)} cy={Y(pts[act].s, sMax, sMin)} r="4.5" fill="var(--bg-1)" stroke="#36b277" strokeWidth="2.5" />}
            </g>
          )}
        </svg>

        {hi != null && (
          <div className="tip" style={{ left: Math.min(width - 190, Math.max(8, X(hi) - 86)) + "px", top: Math.max(6, Y(pts[hi].p, pMax, pMin) - 120) + "px" }}>
            <div className="tip-h"><span>{pts[hi].label}</span>{pts[hi].label === selectedMonth && <span className="daychip">SELECTED</span>}</div>
            <div className="tip-row"><span className="k">{METRIC_META[metric].name}</span><span className="v" style={{ color: accHex }}>{METRIC_META[metric].fmt(pts[hi].p)}</span></div>
            {overlay !== "none" && <div className="tip-row"><span className="k">{METRIC_META[overlay].name}</span><span className="v" style={{ color: "#36b277" }}>{METRIC_META[overlay].fmt(pts[hi].s)}</span></div>}
            <div className="tip-foot">
              <span>Clicks {GM.fmtNum(pts[hi].raw.clicks)}</span>
              <span>Imps {GM.fmtNum(pts[hi].raw.impressions)}</span>
              <span>CTR {pts[hi].raw.ctr}%</span>
              <span>CPC {GM.formatLKR(pts[hi].raw.cpc)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CategorySplit(props) {
  const cats = props.cats; // [{key, spend, chats, cpa, tone}]
  const total = cats.reduce(function (s, c) { return s + c.spend; }, 0) || 1;
  const R = 78, r = 50, cx = 96, cy = 96;
  let a0 = -Math.PI / 2;
  const arcs = cats.filter(function (c) { return c.spend > 0; }).map(function (c) {
    const frac = c.spend / total;
    const a1 = a0 + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const xi0 = cx + r * Math.cos(a1), yi0 = cy + r * Math.sin(a1);
    const xi1 = cx + r * Math.cos(a0), yi1 = cy + r * Math.sin(a0);
    const d = "M " + x0 + " " + y0 + " A " + R + " " + R + " 0 " + large + " 1 " + x1 + " " + y1 +
      " L " + xi0 + " " + yi0 + " A " + r + " " + r + " 0 " + large + " 0 " + xi1 + " " + yi1 + " Z";
    a0 = a1;
    return { d: d, tone: c.tone, key: c.key, frac: frac };
  });

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title"><span className="tick"></span>Budget by Package</h2>
          <div className="panel-sub">Spend share &amp; cost-per-chat efficiency · {props.period}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "26px", padding: "22px", flexWrap: "wrap" }}>
        <svg width="192" height="192" style={{ flexShrink: 0 }}>
          {arcs.map(function (a, i) { return <path key={i} d={a.d} fill={a.tone} opacity="0.92" />; })}
          <text x="96" y="90" textAnchor="middle" fill="#5e7686" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="1.5">TOTAL</text>
          <text x="96" y="108" textAnchor="middle" fill="#e9f0f3" fontSize="15" fontWeight="800" fontFamily="JetBrains Mono">{GM.formatLKR(total, true).replace("LKR ", "")}</text>
        </svg>
        <div className="cat-legend" style={{ flex: 1, minWidth: "190px" }}>
          {cats.map(function (c, i) {
            return (
              <div className="cat-row" key={i}>
                <span className="sw" style={{ background: c.tone }}></span>
                <span className="cn">{c.key}</span>
                <div style={{ textAlign: "right" }}>
                  <div className="cv">{((c.spend / total) * 100).toFixed(0)}%</div>
                  <div className="cc">{c.chats > 0 ? GM.formatLKR(c.cpa) + "/chat" : "no chats"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TrendsChart: TrendsChart, CategorySplit: CategorySplit, accentHex: accentHex });
