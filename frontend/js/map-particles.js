/**
 * 粒子与动效逻辑 — 多风格可选
 */

import { NODE_DELAY } from './config.js';
const _sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 出发点图标 SVG paths ──────────────────────────────────────
const ORIGIN_ICONS = {
  diamond:   'path://M0,-14 L10,0 L0,14 L-10,0 Z',
  crosshair: 'path://M-13,0 L-5,0 M5,0 L13,0 M0,-13 L0,-5 M0,5 L0,13 M-3,-3 L3,-3 L3,3 L-3,3 Z',
  hexagon:   'path://M0,-13 L11,-6.5 L11,6.5 L0,13 L-11,6.5 L-11,-6.5 Z',
  target:    'path://M0,-12 A12,12 0 1,1 -0.01,-12 Z M0,-6 A6,6 0 1,1 -0.01,-6 Z M-13,0 L-9,0 M9,0 L13,0 M0,-13 L0,-9 M0,9 L0,13',
  signal:    'path://M-11,-8 A14,14 0 0,1 11,-8 M-7,-2 A9,9 0 0,1 7,-2 M-3,4 A4,4 0 0,1 3,4 M0,10 L0,12',
};

// ── 出发点颜色主题 ───────────────────────────────────────────
const ICON_COLOR = { color: '#ff4b1f', shadowBlur: 24, shadowColor: 'rgba(255,75,31,0.8)' };

export function launchParticles(chart, originCoords, linesData, scatterData, flightTime, opts = {}) {
  const { originIcon = 'diamond', lineAnim = 'comet' } = opts;
  const symbol = ORIGIN_ICONS[originIcon] || ORIGIN_ICONS.diamond;

  // 出发点图标
  chart.setOption({
    series: [{
      id: 'origin', type: 'effectScatter', coordinateSystem: 'geo', zlevel: 4,
      symbol, symbolSize: originIcon === 'crosshair' ? 22 : 16,
      data: [{ name: 'ORIGIN', value: originCoords }],
      showEffectOn: 'render',
      rippleEffect: { brushType: 'stroke', scale: 3, period: 2 },
      itemStyle: ICON_COLOR, label: { show: false }
    }]
  });

  if (lineAnim === 'comet') {
    return _cometCanvas(chart, linesData, scatterData, flightTime);
  }
  _doLineAnim(chart, linesData, flightTime, lineAnim);
  return Promise.resolve();
}

// ── Canvas 彗星（comet 模式专用）────────────────────────────
// 二次贝塞尔点：与 ECharts curveness:0.22 保持一致
function _bezierCtrl(p0x, p0y, p2x, p2y, curveness = 0.22) {
  const mx = (p0x + p2x) / 2, my = (p0y + p2y) / 2;
  const dx = p2x - p0x,       dy = p2y - p0y;
  // 正值 curveness → 向右弯（与 ECharts curveness 同向）
  return [mx + dy * curveness, my - dx * curveness];
}
function _bezierPt(p0x, p0y, p1x, p1y, p2x, p2y, t) {
  const u = 1 - t;
  return [
    u * u * p0x + 2 * u * t * p1x + t * t * p2x,
    u * u * p0y + 2 * u * t * p1y + t * t * p2y,
  ];
}

function _cometCanvas(chart, linesData, scatterData, flightTime) {
  const container = chart.getDom();
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  const cvs = document.createElement('canvas');
  cvs.id = 'comet-canvas';
  cvs.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:4;';
  container.appendChild(cvs);
  const ctx = cvs.getContext('2d');

  // 预计算节点信息，用于到达时触发
  const nodeInfos = scatterData.map(node => {
    const cluster = node.value[2];
    const mc = cluster.universities
      ? cluster.universities.reduce((s, u) => s + (u.members?.length || 0), 0)
      : (cluster.members?.length || 1);
    return { node, finalSize: Math.min(7 + mc * 2, 12) };
  });

  const arrived = new Array(linesData.length).fill(false);
  const TRAIL = 0.25;
  const MAX_DELAY = 400; // 最大出发延迟 ms
  const DURATION_JITTER = 0.3; // 飞行时长随机波动 ±30%
  // 每条线独立随机：出发延迟 + 飞行时长，确保到达时间充分分散
  const lineParams = linesData.map(() => {
    const delay    = Math.random() * MAX_DELAY;
    const duration = flightTime * (1 - DURATION_JITTER + Math.random() * DURATION_JITTER * 2);
    return { delay, duration };
  });
  const totalDuration = flightTime * (1 + DURATION_JITTER) + MAX_DELAY;

  function resize() {
    cvs.width  = container.offsetWidth;
    cvs.height = container.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const startTime = performance.now();
  let rafId;

  return new Promise(resolve => {
    function frame(now) {
      const elapsed = now - startTime;
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0, 0, w, h);

      const allDone = elapsed >= totalDuration;
      linesData.forEach((line, i) => {
        const { delay, duration } = lineParams[i];
        const lineElapsed = elapsed - delay;
        if (lineElapsed <= 0) return;
        const t = Math.min(lineElapsed / duration, 1);

        const [ox, oy] = chart.convertToPixel('geo', line.coords[0]);
        const [ex, ey] = chart.convertToPixel('geo', line.coords[1]);
        const [cx, cy] = _bezierCtrl(ox, oy, ex, ey);

        // 已飞过的虚线路径
        ctx.save();
        ctx.setLineDash([4, 7]);
        ctx.strokeStyle = 'rgba(184,255,71,0.38)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const steps = 40;
        const [sx, sy] = _bezierPt(ox, oy, cx, cy, ex, ey, 0);
        ctx.moveTo(sx, sy);
        for (let s = 1; s <= steps; s++) {
          const st = (s / steps) * t;
          const [px, py] = _bezierPt(ox, oy, cx, cy, ex, ey, st);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();

        // 流光：前端亮、后端暗，无尖锐头部，纯绿渐变
        if (t < 1) {
          const tailStart = Math.max(0, t - TRAIL);
          const TAIL_STEPS = 24;
          for (let s = 0; s < TAIL_STEPS; s++) {
            const ta = tailStart + (t - tailStart) * (s / TAIL_STEPS);
            const tb = tailStart + (t - tailStart) * ((s + 1) / TAIL_STEPS);
            const frac = (s + 1) / TAIL_STEPS;
            const alpha = frac * frac * 0.95;
            const width = 1.2 + frac * 2.0;
            const [ax, ay] = _bezierPt(ox, oy, cx, cy, ex, ey, ta);
            const [bx, by] = _bezierPt(ox, oy, cx, cy, ex, ey, tb);
            ctx.save();
            ctx.strokeStyle = `rgba(184,255,71,${alpha.toFixed(3)})`;
            ctx.lineWidth = width;
            ctx.shadowBlur = frac * 8;
            ctx.shadowColor = '#b8ff47';
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
            ctx.restore();
          }
        }

        // 到达终点：触发节点亮起
        if (t >= 1 && !arrived[i]) {
          arrived[i] = true;
          const info = nodeInfos[i];
          if (info) _revealOneNode(chart, info, i, 0);
        }
      });

      if (!allDone) {
        rafId = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
        // 重绘一次只保留完整虚线
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        linesData.forEach((line) => {
          const [ox, oy] = chart.convertToPixel('geo', line.coords[0]);
          const [ex, ey] = chart.convertToPixel('geo', line.coords[1]);
          const [cx, cy] = _bezierCtrl(ox, oy, ex, ey);
          ctx.save();
          ctx.setLineDash([4, 7]);
          ctx.strokeStyle = 'rgba(184,255,71,0.38)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          const [sx, sy] = _bezierPt(ox, oy, cx, cy, ex, ey, 0);
          ctx.moveTo(sx, sy);
          for (let s = 1; s <= 40; s++) {
            const [px, py] = _bezierPt(ox, oy, cx, cy, ex, ey, s / 40);
            ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.restore();
        });
        resolve();
      }
    }
    rafId = requestAnimationFrame(frame);
  });
}

// 单个节点 easeOutBack 亮起，delay ms 后开始
function _revealOneNode(chart, { node, finalSize }, idx, delay = 0) {
  const DURATION = 700;
  setTimeout(() => {
    const t0 = performance.now();
    function frame(now) {
      const t = Math.min((now - t0) / DURATION, 1);
      const sz = Math.max(0.01, _easeOutBack(t) * finalSize);
      const op = Math.min(t * 2, 1);
      chart.setOption({ series: [{
        id: `target-${idx}`, type: 'effectScatter', coordinateSystem: 'geo', zlevel: 3,
        symbol: 'circle', symbolSize: sz, animation: false,
        data: [{ name: node.name, value: node.value,
          itemStyle: { color: node.nodeColor, opacity: op,
            shadowBlur: op * 14, shadowColor: node.nodeColor } }],
        showEffectOn: 'render',
        rippleEffect: { brushType: 'stroke', scale: 2.5, period: 1.8 },
        label: { show: false },
      }]});
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }, delay);
}

function _doLineAnim(chart, linesData, flightTime, style) {
  const p = flightTime / 1000;

  if (style === 'pulse') {
    // 脉冲波：3波密集短粒子，间隔偏移
    chart.setOption({ series: [
      { id:'comet1', type:'lines', coordinateSystem:'geo', zlevel:2,
        effect:{ show:true, period:p*0.5, trailLength:0.02, color:'#b8ff47', symbolSize:5 },
        lineStyle:{ color:'rgba(0,0,0,0)', width:0, curveness:0.18 }, data:linesData },
      { id:'comet2', type:'lines', coordinateSystem:'geo', zlevel:2,
        effect:{ show:true, period:p*0.5, trailLength:0.02, color:'#ffffff', symbolSize:3, delay:200 },
        lineStyle:{ color:'rgba(0,0,0,0)', width:0, curveness:0.18 }, data:linesData },
      { id:'comet3', type:'lines', coordinateSystem:'geo', zlevel:2,
        effect:{ show:true, period:p*0.5, trailLength:0.02, color:'#b8ff47', symbolSize:2, delay:400 },
        lineStyle:{ color:'rgba(0,0,0,0)', width:0, curveness:0.18 }, data:linesData },
    ]});

  } else if (style === 'laser') {
    // 直线闪射：无弯曲，极快单粒子
    chart.setOption({ series: [
      { id:'comet1', type:'lines', coordinateSystem:'geo', zlevel:2,
        effect:{ show:true, period:p*0.6, trailLength:0.0, color:'#b8ff47', symbolSize:8 },
        lineStyle:{ color:'rgba(184,255,71,0.12)', width:1.5, curveness:0 }, data:linesData },
      { id:'comet2', type:'lines', coordinateSystem:'geo', zlevel:2,
        effect:{ show:true, period:p*0.4, trailLength:0.0, color:'#ffffff', symbolSize:4 },
        lineStyle:{ color:'rgba(0,0,0,0)', width:0, curveness:0 }, data:linesData },
      { id:'comet3', type:'lines', coordinateSystem:'geo', zlevel:1,
        effect:{ show:false },
        lineStyle:{ color:'rgba(184,255,71,0.06)', width:3, curveness:0 }, data:linesData },
    ]});

  } else if (style === 'ghost') {
    // 鬼影数据包：6层慢速低透明度幽灵叠影
    const ghosts = [
      { id:'comet1', per:p*1.4, trail:0.6, color:'#b8ff47', sz:4, op:0.5 },
      { id:'comet2', per:p*1.1, trail:0.4, color:'#00ffcc', sz:3, op:0.35 },
      { id:'comet3', per:p*0.9, trail:0.7, color:'#b8ff47', sz:2, op:0.25 },
      { id:'comet4', per:p*1.6, trail:0.8, color:'#ffffff', sz:1.5, op:0.15 },
      { id:'comet5', per:p*0.7, trail:0.3, color:'#00ffcc', sz:2, op:0.3 },
      { id:'comet6', per:p*1.2, trail:0.5, color:'#b8ff47', sz:1, op:0.1 },
    ];
    chart.setOption({ series: ghosts.map(g => ({
      id:g.id, type:'lines', coordinateSystem:'geo', zlevel:2,
      effect:{ show:true, period:g.per, trailLength:g.trail, color:g.color, symbolSize:g.sz },
      lineStyle:{ color:'rgba(0,0,0,0)', width:0, curveness:0.28, opacity:g.op }, data:linesData
    }))});

  } else if (style === 'matrix') {
    // 矩阵数字流：极快多发，短尾
    chart.setOption({ series: [
      { id:'comet1', type:'lines', coordinateSystem:'geo', zlevel:2,
        effect:{ show:true, period:p*0.25, trailLength:0.04, color:'#00ff41', symbolSize:6 },
        lineStyle:{ color:'rgba(0,255,65,0.08)', width:0.5, curveness:0.15 }, data:linesData },
      { id:'comet2', type:'lines', coordinateSystem:'geo', zlevel:2,
        effect:{ show:true, period:p*0.18, trailLength:0.02, color:'#b8ff47', symbolSize:3, delay:80 },
        lineStyle:{ color:'rgba(0,0,0,0)', width:0, curveness:0.15 }, data:linesData },
      { id:'comet3', type:'lines', coordinateSystem:'geo', zlevel:2,
        effect:{ show:true, period:p*0.3, trailLength:0.06, color:'#aaffee', symbolSize:2, delay:160 },
        lineStyle:{ color:'rgba(0,0,0,0)', width:0, curveness:0.1 }, data:linesData },
    ]});

  } else if (style === 'radar') {
    // 雷达扫描：同心涟漪扩散 + 粗线慢飞
    chart.setOption({ series: [
      { id:'comet1', type:'lines', coordinateSystem:'geo', zlevel:2,
        effect:{ show:true, period:p*0.8, trailLength:0.35, color:'#b8ff47', symbolSize:5 },
        lineStyle:{ color:'rgba(184,255,71,0.15)', width:1, curveness:0.1 }, data:linesData },
      { id:'comet2', type:'lines', coordinateSystem:'geo', zlevel:2,
        effect:{ show:true, period:p*1.2, trailLength:0.5, color:'#00ffcc', symbolSize:2 },
        lineStyle:{ color:'rgba(0,0,0,0)', width:0, curveness:0.1 }, data:linesData },
      { id:'comet3', type:'effectScatter', coordinateSystem:'geo', zlevel:1,
        symbol:'circle', symbolSize:8,
        data:[{ name:'ORIGIN', value:linesData[0]?.coords[0]||[] }],
        showEffectOn:'render', rippleEffect:{ brushType:'fill', scale:12, period:1.2 },
        itemStyle:{ color:'rgba(0,255,204,0.0)' }, label:{ show:false } },
    ]});

  } else if (style === 'rotary') {
    // 旋转雷达模式：飞行阶段只做出发点大涟漪，不飞粒子
    // 连线和节点完全由 startRadarSweep 接管
    chart.setOption({ series: [
      { id:'comet3', type:'effectScatter', coordinateSystem:'geo', zlevel:1,
        symbol:'circle', symbolSize:14,
        data:[{ name:'ORIGIN', value:linesData[0]?.coords[0]||[] }],
        showEffectOn:'render', rippleEffect:{ brushType:'stroke', scale:20, period:0.8 },
        itemStyle:{ color:'rgba(0,255,204,0.0)' }, label:{ show:false } },
    ]});

  } else {
    // comet（默认）：单层彗星，头部小、拖尾长，密集循环
    chart.setOption({ series: [
      { id:'comet1', type:'lines', coordinateSystem:'geo', zlevel:2,
        effect:{ show:true, period:p*0.9, trailLength:0.35, color:'#b8ff47', symbolSize:4 },
        lineStyle:{ color:'rgba(0,0,0,0)', width:0, curveness:0.22 }, data:linesData },
      { id:'comet2', data:[], effect:{ show:false }, lineStyle:{ width:0 } },
      { id:'comet3', data:[], effect:{ show:false }, lineStyle:{ width:0 } },
    ]});
  }
}

// per-mode static line style after reveal
function _staticLineStyle(mode) {
  switch (mode) {
    case 'laser':
      return { line:{ color:'rgba(184,255,71,0.45)', width:1.5, curveness:0, opacity:1 } };
    case 'matrix':
      return { line:{ color:'rgba(0,255,65,0.35)',   width:1,   curveness:0.15, opacity:1 } };
    case 'ghost':
      return { line:{ color:'rgba(0,255,204,0.22)',  width:1,   curveness:0.28, opacity:1 } };
    case 'pulse':
      return { line:{ color:'rgba(184,255,71,0.38)', width:1,   curveness:0.18, opacity:1 } };
    case 'radar':
      return { line:{ color:'rgba(184,255,71,0.30)', width:1,   curveness:0.10, opacity:1 } };
    case 'rotary':
      return { line:{ color:'rgba(0,0,0,0)',         width:0,   curveness:0.08, opacity:0 } };
    default: // comet
      return { line:{ color:'rgba(184,255,71,0.18)', width:1,   curveness:0.22, opacity:1, type:[5,9] } };
  }
}


/**
 * 粒子落地后：静态底线 + 逐个亮起目标节点
 * arrivalDelay: 粒子飞行结束到第一个节点显示的额外等待（ms），默认0
 */
export async function revealTargets(chart, scatterData, linesData, colorMode, opts = {}) {
  const { nodeAnim = 'expand', lineAnim = 'comet' } = opts;

  // comet 模式：节点已由 _cometCanvas 触发，只需启动持续小彗星
  if (lineAnim === 'comet') {
    await _sleep(120);
    chart.setOption({ series: [{
      id: 'pulse-lines', type: 'lines', coordinateSystem: 'geo', zlevel: 1,
      effect: { show: true, period: 3.5, trailLength: 0.3,
                color: 'rgba(184,255,71,0.6)', symbolSize: 3 },
      lineStyle: { color: 'rgba(0,0,0,0)', width: 0, curveness: 0.22 }, data: linesData
    }]});
    return;
  }

  // 非 comet 模式：清粒子 → 铺静态底线 → 节点动画
  _clearCometSeries(chart);
  const staticStyle = _staticLineStyle(lineAnim);
  chart.setOption({ series: [
    { id: 'static-lines', type: 'lines', coordinateSystem: 'geo', zlevel: 0,
      lineStyle: staticStyle.line, data: linesData },
  ]});

  const nodeInfos = scatterData.map(node => {
    const cluster = node.value[2];
    const memberCount = cluster.universities
      ? cluster.universities.reduce((s, u) => s + (u.members?.length || 0), 0)
      : (cluster.members?.length || 1);
    return { node, finalSize: Math.min(7 + memberCount * 2, 12) };
  });

  if (lineAnim === 'rotary') {
    _clearCometSeries(chart);
    return _registerNodes(chart, nodeInfos, 0, 0.08);
  }

  let nodeAnimPromise;
  if (nodeAnim === 'scanline')      nodeAnimPromise = _animScanline(chart, nodeInfos);
  else if (nodeAnim === 'implode')  nodeAnimPromise = _animImplode(chart, nodeInfos);
  else if (nodeAnim === 'flicker')  nodeAnimPromise = _animFlicker(chart, nodeInfos);
  else if (nodeAnim === 'glitch')   nodeAnimPromise = _animGlitch(chart, nodeInfos);
  else if (nodeAnim === 'cascade')  nodeAnimPromise = _animCascade(chart, nodeInfos);
  else                               nodeAnimPromise = _animExpand(chart, nodeInfos);

  await nodeAnimPromise;
  await _fadeOutComets(chart, linesData, lineAnim);
}

// ── 节点动画辅助函数 ─────────────────────────────────────────

function _clearCometSeries(chart) {
  chart.setOption({ series: [
    { id:'comet1', data:[], effect:{ show:false }, lineStyle:{ width:0, opacity:0 } },
    { id:'comet2', data:[], effect:{ show:false }, lineStyle:{ width:0, opacity:0 } },
    { id:'comet3', data:[], effect:{ show:false }, lineStyle:{ width:0, opacity:0 } },
    { id:'comet4', data:[], effect:{ show:false }, lineStyle:{ width:0, opacity:0 } },
    { id:'comet5', data:[], effect:{ show:false }, lineStyle:{ width:0, opacity:0 } },
    { id:'comet6', data:[], effect:{ show:false }, lineStyle:{ width:0, opacity:0 } },
  ]});
}

// 节点亮起后：彗星逐步降速淡出，切换为持续慢流光
async function _fadeOutComets(chart, linesData, lineAnim) {
  // 先把彗星 period 拉长（视觉上减速）
  const slowPeriod = 3.5;
  chart.setOption({ series: [
    { id:'comet1', effect:{ period: slowPeriod, symbolSize:4, trailLength:0.25, color:'rgba(184,255,71,0.6)' } },
    { id:'comet2', effect:{ period: slowPeriod * 1.3, symbolSize:2, trailLength:0.15 } },
    { id:'comet3', effect:{ period: slowPeriod * 0.8, symbolSize:1.5, trailLength:0.1 } },
  ]});
  await _sleep(600);

  // 清除飞行粒子，切入持续慢流光（pulse-lines）
  _clearCometSeries(chart);
  chart.setOption({
    series: [{
      id:'pulse-lines', type:'lines', coordinateSystem:'geo', zlevel:1,
      effect:{ show: true, period: 3.5, trailLength:0.18,
               color:'rgba(184,255,71,0.45)', symbolSize:3 },
      lineStyle:{ color:'rgba(0,0,0,0)', width:0, curveness:0.22 }, data:linesData
    }]
  });
}

function _registerNodes(chart, nodeInfos, initSize = 0, initOp = 0) {
  chart.setOption({ series: nodeInfos.map(({ node, finalSize }, idx) => ({
    id:`target-${idx}`, type:'effectScatter', coordinateSystem:'geo', zlevel:3,
    symbol:'circle', symbolSize:initSize||0.01, animation:false,
    data:[{ name:node.name, value:node.value,
      itemStyle:{ color:node.nodeColor, opacity:initOp, shadowBlur:0 } }],
    showEffectOn:'render', rippleEffect:{ brushType:'stroke', scale:2.5, period:1.8 },
    label:{ show:false },
  }))});
}

function _easeOutBack(t) {
  if (t >= 1) return 1;
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function _rafLoop(nodeInfos, chart, getDelta, onDone) {
  const t0 = performance.now();
  function frame(now) {
    const elapsed = now - t0;
    const updates = []; let allDone = true;
    nodeInfos.forEach((info, idx) => {
      const u = getDelta(info, idx, elapsed);
      if (u) { updates.push(u); if (u._pending) allDone = false; }
    });
    if (updates.length) chart.setOption({ series: updates.map(u => { delete u._pending; return u; }) });
    if (!allDone) requestAnimationFrame(frame); else onDone();
  }
  requestAnimationFrame(frame);
}

// expand: 从中心放大 + easeOutBack (默认)
async function _animExpand(chart, nodeInfos) {
  _registerNodes(chart, nodeInfos);
  const DURATION = 600, STAGGER = NODE_DELAY;
  return new Promise(resolve => _rafLoop(nodeInfos, chart, ({ node, finalSize }, idx, elapsed) => {
    const ne = elapsed - idx * STAGGER; if (ne < 0) return { _pending:true };
    const t = Math.min(ne / DURATION, 1);
    const sz = Math.max(0.01, _easeOutBack(t) * finalSize), op = Math.min(t * 2.5, 1);
    return { id:`target-${idx}`, symbolSize:sz, _pending:t<1,
      data:[{ name:node.name, value:node.value,
        itemStyle:{ color:node.nodeColor, opacity:op, shadowBlur:op*14, shadowColor:node.nodeColor } }] };
  }, resolve));
}

// scanline: 从北到南按纬度排序，逐行扫亮
async function _animScanline(chart, nodeInfos) {
  const order = [...nodeInfos.keys()].sort((a,b) => nodeInfos[b].node.value[1] - nodeInfos[a].node.value[1]);
  _registerNodes(chart, nodeInfos);
  const STAGGER = 60;
  return new Promise(resolve => {
    order.forEach((idx, rank) => {
      const { node, finalSize } = nodeInfos[idx];
      setTimeout(() => chart.setOption({ series:[{
        id:`target-${idx}`, symbolSize:finalSize,
        data:[{ name:node.name, value:node.value,
          itemStyle:{ color:node.nodeColor, opacity:1, shadowBlur:14, shadowColor:node.nodeColor } }],
      }]}), rank * STAGGER);
    });
    setTimeout(resolve, order.length * STAGGER + 300);
  });
}

// implode: 从外向内收缩至目标大小
async function _animImplode(chart, nodeInfos) {
  _registerNodes(chart, nodeInfos, 0);
  const DURATION = 500, STAGGER = NODE_DELAY;
  return new Promise(resolve => _rafLoop(nodeInfos, chart, ({ node, finalSize }, idx, elapsed) => {
    const ne = elapsed - idx * STAGGER; if (ne < 0) return { _pending:true };
    const t = Math.min(ne / DURATION, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const sz = Math.max(0.01, finalSize * 2 - eased * finalSize);
    const op = Math.min(t * 2, 1);
    return { id:`target-${idx}`, symbolSize:sz, _pending:t<1,
      data:[{ name:node.name, value:node.value,
        itemStyle:{ color:node.nodeColor, opacity:op, shadowBlur:op*14, shadowColor:node.nodeColor } }] };
  }, resolve));
}

// flicker: 闪烁3次后稳定
async function _animFlicker(chart, nodeInfos) {
  _registerNodes(chart, nodeInfos, 0);
  const STAGGER = NODE_DELAY;
  const flickers = [0, 1, 0, 1, 0, 1, 0.4, 1];
  const FRAME_MS = 60;
  return new Promise(resolve => {
    let done = 0;
    nodeInfos.forEach(({ node, finalSize }, idx) => {
      setTimeout(() => {
        let frame = 0;
        const iv = setInterval(() => {
          const op = flickers[frame] ?? 1;
          chart.setOption({ series:[{ id:`target-${idx}`, symbolSize: op > 0 ? finalSize : 0.01,
            data:[{ name:node.name, value:node.value,
              itemStyle:{ color:node.nodeColor, opacity:op, shadowBlur:op*14, shadowColor:node.nodeColor } }] }] });
          frame++;
          if (frame >= flickers.length) {
            clearInterval(iv);
            if (++done === nodeInfos.length) resolve();
          }
        }, FRAME_MS);
      }, idx * STAGGER);
    });
  });
}

// glitch: 位置抖动后锁定
async function _animGlitch(chart, nodeInfos) {
  _registerNodes(chart, nodeInfos);
  return new Promise(resolve => {
    let done = 0;
    nodeInfos.forEach(({ node, finalSize }, idx) => {
      const [ox, oy] = node.value;
      let step = 0; const steps = 8;
      setTimeout(() => {
        const iv = setInterval(() => {
          const decay = 1 - step / steps;
          const jx = (Math.random() - 0.5) * 1.2 * decay;
          const jy = (Math.random() - 0.5) * 0.8 * decay;
          const op = step / steps;
          chart.setOption({ series:[{ id:`target-${idx}`, symbolSize:finalSize,
            data:[{ name:node.name, value:[ox+jx, oy+jy, node.value[2]],
              itemStyle:{ color:node.nodeColor, opacity:op, shadowBlur:op*14, shadowColor:node.nodeColor } }] }] });
          step++;
          if (step > steps) {
            clearInterval(iv);
            chart.setOption({ series:[{ id:`target-${idx}`, symbolSize:finalSize,
              data:[{ name:node.name, value:node.value,
                itemStyle:{ color:node.nodeColor, opacity:1, shadowBlur:14, shadowColor:node.nodeColor } }] }] });
            if (++done === nodeInfos.length) resolve();
          }
        }, 55);
      }, idx * NODE_DELAY);
    });
  });
}

// cascade: 按距离从近到远流水式（nodeInfos 已按距离排序）
async function _animCascade(chart, nodeInfos) {
  _registerNodes(chart, nodeInfos);
  const DURATION = 400, STAGGER = 80;
  return new Promise(resolve => _rafLoop(nodeInfos, chart, ({ node, finalSize }, idx, elapsed) => {
    const ne = elapsed - idx * STAGGER; if (ne < 0) return { _pending:true };
    const t = Math.min(ne / DURATION, 1);
    const op = 1 - Math.pow(1 - t, 3);
    return { id:`target-${idx}`, symbolSize:finalSize, _pending:t<1,
      data:[{ name:node.name, value:node.value,
        itemStyle:{ color:node.nodeColor, opacity:op, shadowBlur:op*14, shadowColor:node.nodeColor } }] };
  }, resolve));
}

/**
 * 旋转雷达扫描 — 在节点显示后持续运行
 * 拟真雷达屏幕：同心圆环、十字准线、磷光衰减轨迹、节点被扫到时留下光点并淡出
 */
export function startRadarSweep(chart, originCoords, scatterData) {
  const container = chart.getDom();
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  const cvs = document.createElement('canvas');
  cvs.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:5;';
  container.appendChild(cvs);
  const ctx = cvs.getContext('2d');

  const nodeInfos = scatterData.map(node => {
    const cluster = node.value[2];
    const mc = cluster.universities
      ? cluster.universities.reduce((s, u) => s + (u.members?.length || 0), 0)
      : (cluster.members?.length || 1);
    return { node, finalSize: Math.min(7 + mc * 2, 12) };
  });

  const brightness = new Float32Array(nodeInfos.length).fill(0.08);
  // blipAge counts rAF frames since last hit; used to fade the canvas blip dot
  const blipAge = new Float32Array(nodeInfos.length).fill(9999);

  const HIT_THRESH = 0.06;   // radians
  const RPM = 4;
  const RAD_PER_MS = (RPM / 60) * 2 * Math.PI / 1000;
  const TRAIL_RAD = 1.3;     // ~75° phosphor tail
  const TRAIL_STEPS = 48;

  let angle = -Math.PI / 2;  // start pointing north
  let prev = performance.now();
  let rafId;

  function resize() {
    cvs.width  = container.offsetWidth;
    cvs.height = container.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function frame(now) {
    const dt = Math.min(now - prev, 100); prev = now;
    angle = (angle + RAD_PER_MS * dt) % (2 * Math.PI);

    const [ox, oy] = chart.convertToPixel('geo', originCoords);
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);

    // ── compute radar radius from furthest node ───────────────────
    let R = Math.max(w, h) * 0.38;
    nodeInfos.forEach(({ node }) => {
      const [px, py] = chart.convertToPixel('geo', [node.value[0], node.value[1]]);
      R = Math.max(R, Math.hypot(px - ox, py - oy) * 1.15);
    });

    // ── concentric range rings ────────────────────────────────────
    ctx.save();
    ctx.setLineDash([3, 9]);
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(ox, oy, R * i / 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(184,255,71,${0.10 - i * 0.015})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // ── cross-hair ───────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(184,255,71,0.07)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 12]);
    ctx.beginPath();
    ctx.moveTo(ox - R * 1.05, oy); ctx.lineTo(ox + R * 1.05, oy);
    ctx.moveTo(ox, oy - R * 1.05); ctx.lineTo(ox, oy + R * 1.05);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ── phosphor persistence trail ───────────────────────────────
    // Cubic falloff: dim near tail, bright near leading edge
    for (let i = 0; i < TRAIL_STEPS; i++) {
      const t = (i + 1) / TRAIL_STEPS;          // 0=oldest tail, 1=leading edge
      const a0 = angle - TRAIL_RAD * (1 - t);
      const a1 = angle - TRAIL_RAD * (1 - (i + 1) / TRAIL_STEPS);
      const alpha = t * t * t * 0.28;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.arc(ox, oy, R * 1.02, a0, a1, false);
      ctx.closePath();
      ctx.fillStyle = `rgba(0,230,70,${alpha.toFixed(4)})`;
      ctx.fill();
    }

    // ── sweep line (leading edge with gradient glow) ─────────────
    const ex = ox + R * 1.02 * Math.cos(angle);
    const ey = oy + R * 1.02 * Math.sin(angle);
    const grad = ctx.createLinearGradient(ox, oy, ex, ey);
    grad.addColorStop(0,    'rgba(184,255,71,0.0)');
    grad.addColorStop(0.25, 'rgba(184,255,71,0.3)');
    grad.addColorStop(1.0,  'rgba(184,255,71,1.0)');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 14;
    ctx.shadowColor = 'rgba(184,255,71,0.9)';
    ctx.stroke();
    ctx.restore();

    // ── origin dot ───────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.arc(ox, oy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#b8ff47';
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#b8ff47';
    ctx.fill();
    ctx.restore();

    // ── node hit detection + canvas blips ────────────────────────
    let anyChange = false;
    nodeInfos.forEach(({ node }, idx) => {
      const [px, py] = chart.convertToPixel('geo', [node.value[0], node.value[1]]);
      const nodeAngle = Math.atan2(py - oy, px - ox);
      let diff = ((nodeAngle - angle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      if (diff > Math.PI) diff -= 2 * Math.PI;

      const prevB = brightness[idx];
      if (Math.abs(diff) < HIT_THRESH) {
        brightness[idx] = 1.0;
        blipAge[idx] = 0;
      } else {
        brightness[idx] = Math.max(0.08, brightness[idx] * 0.986);
        if (blipAge[idx] < 9999) blipAge[idx]++;
      }
      if (Math.abs(brightness[idx] - prevB) > 0.004) anyChange = true;

      // draw radar blip on canvas (fades over ~240 frames ≈ 4 seconds)
      const age = blipAge[idx];
      if (age < 240) {
        const fade = Math.max(0, 1 - age / 240);
        const r = 2.5 + fade * 3.5;
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(184,255,71,${(fade * 0.85).toFixed(3)})`;
        ctx.shadowBlur = 10 * fade;
        ctx.shadowColor = '#b8ff47';
        ctx.fill();
        ctx.restore();
      }
    });

    // ── update ECharts nodes (only when brightness changed) ──────
    if (anyChange) {
      chart.setOption({ series: nodeInfos.map(({ node, finalSize }, idx) => {
        const b = brightness[idx];
        return {
          id: `target-${idx}`,
          symbolSize: finalSize * (0.55 + 0.45 * b),
          data: [{ name: node.name, value: node.value,
            itemStyle: { color: node.nodeColor,
              opacity: 0.15 + 0.85 * b,
              shadowBlur: b * 26, shadowColor: '#b8ff47' } }]
        };
      })});
    }

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    cvs.remove();
  };
}

/**
 * 在指定纬度高度触发横扫光柱
 */
function spawnScanBeam(lat) {
  // 粗略把纬度映射到屏幕 Y（仅视觉近似，不需精确）
  const yPct = 1 - (lat - 18) / (55 - 18);
  const y    = Math.max(0, Math.min(window.innerHeight, yPct * window.innerHeight));

  const beam = document.createElement('div');
  beam.className = 'scan-beam';
  beam.style.top = `${y}px`;
  document.body.appendChild(beam);
  setTimeout(() => beam.remove(), 700);
}

/**
 * canvas 噪点层 — OffscreenCanvas Worker（主线程零开销）
 * Fallback: 降帧主线程版（~21fps），兼容不支持 OffscreenCanvas 的浏览器
 */
export function startNoiseLayer() {
  const canvas = document.getElementById('noise-canvas');
  if (!canvas) return;

  // ── Worker path (Chrome / Firefox / Safari 16.4+) ─────────────
  if (typeof canvas.transferControlToOffscreen === 'function') {
    const w = window.innerWidth, h = window.innerHeight;
    const offscreen = canvas.transferControlToOffscreen();
    const worker = new Worker(new URL('./noise-worker.js', import.meta.url));
    worker.postMessage({ type: 'init', canvas: offscreen, w, h }, [offscreen]);
    const onResize = () =>
      worker.postMessage({ type: 'resize', w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
      window.removeEventListener('resize', onResize);
    };
  }

  // ── Fallback: throttled main-thread version ────────────────────
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  let frame, last = 0;
  function draw(ts) {
    if (ts - last > 48) {
      last = ts;
      const w = canvas.width, h = canvas.height;
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() > 0.5 ? 255 : 0;
        d[i] = d[i+1] = d[i+2] = v; d[i+3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    frame = requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}
