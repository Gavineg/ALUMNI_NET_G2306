/**
 * 粒子与动效逻辑
 * - 三层彗星粒子（辐射感）
 * - 目标节点按距离逐个渐显 + 扫描光柱
 * - 静态底线（电流虚线 + 循环脉冲粒子）
 * - 准星图标（自定义 SVG path）
 */

import { NODE_DELAY } from './config.js';
const _sleep = ms => new Promise(r => setTimeout(r, ms));

const CROSSHAIR_PATH = 'circle';
const DIAMOND_PATH   = 'path://M0,-14 L10,0 L0,14 L-10,0 Z';

/**
 * 设置出发点 + 发射三层彗星粒子
 */
/**
 * 设置出发点 + 发射三层彗星粒子（赛博朋克黑客风）
 */
export function launchParticles(chart, originCoords, linesData, flightTime) {
  // 出发点：菱形 + 红橙脉冲光晕
  chart.setOption({
    series: [{
      id: 'origin',
      name: 'Origin',
      type: 'effectScatter',
      coordinateSystem: 'geo',
      zlevel: 4,
      symbol: DIAMOND_PATH,
      symbolSize: 14,
      data: [{ name: 'ORIGIN', value: originCoords }],
      showEffectOn: 'render',
      rippleEffect: { brushType: 'stroke', scale: 3, period: 2 },
      itemStyle: { color: '#ff4b1f', shadowBlur: 24, shadowColor: 'rgba(255,75,31,0.8)' },
      label: { show: false }
    }]
  });

  // 三层彗星：主光束 + 余晖 + 电离尾迹，营造数据包穿越网络的视觉
  const layers = [
    // 主光束：亮绿，粗，短尾
    { id: 'comet1', period: 3.2 / (flightTime / 1000), size: 6,   trail: 0.15, color: '#b8ff47', opacity: 1.0  },
    // 余晖：淡黄，中，中尾
    { id: 'comet2', period: 2.4 / (flightTime / 1000), size: 3,   trail: 0.45, color: '#d4ff80', opacity: 0.7  },
    // 电离尾迹：白蓝，细，长尾
    { id: 'comet3', period: 1.6 / (flightTime / 1000), size: 1.5, trail: 0.78, color: '#aaffee', opacity: 0.4  },
  ];

  chart.setOption({
    series: layers.map(l => ({
      id: l.id,
      type: 'lines',
      coordinateSystem: 'geo',
      zlevel: 2,
      effect: {
        show: true,
        period: l.period,
        trailLength: l.trail,
        color: l.color,
        symbolSize: l.size
      },
      lineStyle: { color: 'rgba(0,0,0,0)', width: 0, curveness: 0.22, opacity: l.opacity },
      data: linesData
    }))
  });
}

/**
 * 粒子落地后：静态底线 + 逐个亮起目标节点
 * arrivalDelay: 粒子飞行结束到第一个节点显示的额外等待（ms），默认0
 */
export async function revealTargets(chart, scatterData, linesData, colorMode) {
  // 静态虚线底层
  chart.setOption({
    series: [
      {
        id: 'static-lines',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 0,
        lineStyle: {
          color: 'rgba(184,255,71,0.18)',
          width: 1,
          curveness: 0.22,
          type: [5, 9]
        },
        data: linesData
      },
      {
        id: 'pulse-lines',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 1,
        effect: {
          show: true, period: 1.4,
          trailLength: 0.2,
          color: '#b8ff47',
          symbolSize: 2
        },
        lineStyle: { color: 'rgba(0,0,0,0)', width: 0, curveness: 0.22 },
        data: linesData
      }
    ]
  });

  // 粒子刚落地，稍等一拍再开始显示节点（让线条先稳定）
  await _sleep(120);

  // 计算每个节点的目标大小，复用避免重复算
  const nodeInfos = scatterData.map(node => {
    const cluster = node.value[2];
    const memberCount = cluster.universities
      ? cluster.universities.reduce((s, u) => s + (u.members?.length || 0), 0)
      : (cluster.members?.length || 1);
    return { node, finalSize: Math.min(7 + memberCount * 2, 12) };
  });

  // 注册所有节点：effectScatter size=0 opacity=0，涟漪与节点同时从零开始
  chart.setOption({
    series: nodeInfos.map(({ node, finalSize }, idx) => ({
      id: `target-${idx}`,
      type: 'effectScatter',
      coordinateSystem: 'geo',
      zlevel: 3,
      symbol: 'circle',
      symbolSize: 0,
      animation: false,
      data: [{ name: node.name, value: node.value,
        itemStyle: { color: node.nodeColor, opacity: 0, shadowBlur: 0 } }],
      showEffectOn: 'render',
      rippleEffect: { brushType: 'stroke', scale: 2.5, period: 1.8 },
      label: { show: false },
    }))
  });

  // easeOutBack: 贝塞尔曲线近似，轻微过冲后回弹，弹出感
  const DURATION = 600, STAGGER = NODE_DELAY;
  function easeOutBack(t) {
    if (t >= 1) return 1;
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // 每帧一次 setOption 批量更新所有节点，不依赖 ECharts 内置动画
  await new Promise(resolve => {
    const t0 = performance.now();
    function frame(now) {
      const elapsed = now - t0;
      const updates = [];
      let allDone = true;
      nodeInfos.forEach(({ node, finalSize }, idx) => {
        const nodeElapsed = elapsed - idx * STAGGER;
        if (nodeElapsed < 0) { allDone = false; return; }
        const t = Math.min(nodeElapsed / DURATION, 1);
        if (t < 1) allDone = false;
        const eased = easeOutBack(t);
        const sz = Math.max(0.01, eased * finalSize);
        const op = Math.min(t * 2.5, 1);
        updates.push({
          id: `target-${idx}`,
          symbolSize: sz,
          data: [{ name: node.name, value: node.value,
            itemStyle: { color: node.nodeColor, opacity: op,
              shadowBlur: op * 14, shadowColor: node.nodeColor } }],
        });
      });
      if (updates.length) chart.setOption({ series: updates });
      if (!allDone) requestAnimationFrame(frame); else resolve();
    }
    requestAnimationFrame(frame);
  });
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
