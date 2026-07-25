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
export function launchParticles(chart, originCoords, linesData, flightTime) {
  // 出发点（菱形+脉冲红橙）
  chart.setOption({
    series: [{
      id: 'origin',
      name: 'Origin',
      type: 'effectScatter',
      coordinateSystem: 'geo',
      zlevel: 4,
      symbol: DIAMOND_PATH,
      symbolSize: 12,
      data: [{ name: 'ORIGIN', value: originCoords }],
      showEffectOn: 'render',
      rippleEffect: { brushType: 'stroke', scale: 2, period: 2.5 },
      itemStyle: { color: '#ff4b1f', shadowBlur: 15, shadowColor: '#ff4b1f' },
      label: { show: false }
    }]
  });

  // 一层彗星（原三层合并，减少 ECharts 动画 series 数量）
  const layers = [
    { id: 'comet1', period: 3.5 / (flightTime / 1000), size: 4, trail: 0.35, color: '#b8ff47', opacity: 0.85 },
  ];

  // 移除多余的 comet series（如果之前存在）
  chart.setOption({ series: [
    { id: 'comet2', type: 'lines', data: [], effect: { show: false } },
    { id: 'comet3', type: 'lines', data: [], effect: { show: false } },
  ]});

  chart.setOption({
    series: layers.map(l => ({
      id: l.id,
      type: 'lines',
      coordinateSystem: 'geo',
      zlevel: 1,
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
 * 粒子落地后：静态底线 + 逐个亮起目标节点（辐射顺序）
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
          type: [5, 9]   // 不均匀虚线，电路板感
        },
        data: linesData
      },
      // 电流脉冲粒子（沿连线循环跑）
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

  // 逐个渐显（近→远）— 每4个节点批量 setOption，减少重绘次数
  const BATCH = 4;
  for (let i = 0; i < scatterData.length; i += BATCH) {
    const batch = scatterData.slice(i, i + BATCH);
    chart.setOption({
      series: batch.map((node, j) => {
        const idx = i + j;
        const cluster = node.value[2];
        const memberCount = cluster.universities
          ? cluster.universities.reduce((s, u) => s + (u.members?.length || 0), 0)
          : (cluster.members?.length || 1);
        const size = Math.min(7 + memberCount * 2, 12);
        return {
          id: `target-${idx}`,
          type: 'effectScatter',
          coordinateSystem: 'geo',
          zlevel: 3,
          symbol: 'circle',
          symbolSize: size,
          data: [{
            name:  node.name,
            value: node.value,
            itemStyle: { color: node.nodeColor, shadowBlur: 12, shadowColor: node.nodeColor }
          }],
          showEffectOn: 'render',
          rippleEffect: { show: false },
          label: { show: false }
        };
      })
    });
    await _sleep(NODE_DELAY * BATCH);
  }
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
 * canvas 噪点层（每帧随机像素，模拟老化CRT颗粒）
 */
export function startNoiseLayer() {
  const canvas = document.getElementById('noise-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let frame;
  function draw() {
    const w = canvas.width, h = canvas.height;
    const img = ctx.createImageData(w, h);
    const d   = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 0;
      d[i] = d[i+1] = d[i+2] = v;
      d[i+3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    frame = requestAnimationFrame(draw);
  }
  draw();
  return () => cancelAnimationFrame(frame);
}
