/**
 * 地图交互：点击节点 → BIOS 终端面板
 * 若附近节点拥挤，先放大到省级视图，再点才展示数据
 */

import { biosAppend, abortBios } from './boot.js';

let currentSession = 0;

// 当前是否处于"省级放大"状态
let zoomedProvince = null;  // { lon, lat } 放大中心
let zoomTimer      = null;  // 无操作自动退回计时器
let chartRef       = null;
let initZoomRef    = null;
let initCenterRef  = null;

const ZOOM_PROVINCE  = 8;    // 省级缩放值
const CLUSTER_THRESH = 3;    // 屏幕像素距离阈值（度）
const AUTO_RESET_MS  = 8000; // 无操作 8 秒退回全国

export function initMapUI(chart, initZoom, initCenter) {
  chartRef      = chart;
  initZoomRef   = initZoom;
  initCenterRef = initCenter;

  chart.on('click', async params => {
    if (!params.seriesId?.startsWith('target-')) {
      // 点击空白：如果在省级状态则退回全国
      if (zoomedProvince) resetToWorld();
      else closePanel();
      return;
    }

    const group    = params.data.value[2];
    const clickLon = params.data.value[0];
    const clickLat = params.data.value[1];

    // 判断当前缩放
    const currentZoom = chart.getOption().geo?.[0]?.zoom ?? initZoom;

    if (currentZoom < ZOOM_PROVINCE - 0.5) {
      // 全国视图 → 检查是否拥挤
      const allNodes = getAllNodeCoords(chart);
      const crowded  = isCrowded(clickLon, clickLat, allNodes, chart, CLUSTER_THRESH);

      if (crowded) {
        // 先放大到省级，不显示面板
        zoomedProvince = { lon: clickLon, lat: clickLat };
        chart.setOption({ geo: { zoom: ZOOM_PROVINCE, center: [clickLon, clickLat] } });
        scheduleAutoReset();
        return;
      }
    }

    // 已放大 或 没有拥挤 → 正常显示面板
    clearAutoReset();
    zoomedProvince = null;
    await showPanel(group);
  });
}

function isCrowded(lon, lat, allNodes, chart, threshDeg) {
  // 在当前缩放比例下，计算度数阈值对应多少屏幕像素
  // 简化：直接用经纬度距离判断，阈值随缩放调整
  const zoom   = chart.getOption().geo?.[0]?.zoom ?? 1;
  const thresh = threshDeg / zoom;

  let count = 0;
  for (const [nlon, nlat] of allNodes) {
    const d = Math.hypot(nlon - lon, nlat - lat);
    if (d < thresh && d > 0.001) count++;
  }
  return count > 0;
}

function getAllNodeCoords(chart) {
  const series = chart.getOption().series || [];
  const coords = [];
  for (const s of series) {
    if (!s.id?.startsWith('target-')) continue;
    for (const d of (s.data || [])) {
      if (d.value) coords.push([d.value[0], d.value[1]]);
    }
  }
  return coords;
}

function scheduleAutoReset() {
  clearAutoReset();
  zoomTimer = setTimeout(() => {
    if (zoomedProvince) resetToWorld();
  }, AUTO_RESET_MS);
}

function clearAutoReset() {
  if (zoomTimer) { clearTimeout(zoomTimer); zoomTimer = null; }
}

function resetToWorld() {
  zoomedProvince = null;
  clearAutoReset();
  chartRef?.setOption({ geo: { zoom: initZoomRef, center: initCenterRef } });
  closePanel();
}

async function showPanel(group) {
  const session = ++currentSession;
  abortBios();

  const panel    = document.getElementById('info-panel');
  const terminal = document.getElementById('terminal-content');

  panel.classList.add('active');
  terminal.innerHTML = '';

  const safe = async lines => {
    if (session !== currentSession) return;
    await biosAppend(terminal, lines);
  };

  await safe([
    { text: '> TARGET_DECRYPT', status: 'RUN' },
    { text: `> LOCATION  : [${group.city}]`,      status: 'OK' },
    { text: `> INSTITUTE : [${group.university}]`, status: 'VRF' },
    { text: '> ─────────────────────────────' },
    { text: `> MATCHES   : ${group.members.length}`, status: 'RDY' }
  ]);

  for (let i = 0; i < group.members.length; i++) {
    if (session !== currentSession) return;
    const m = group.members[i];
    await safe([
      { text: `> SUBJECT [${String(i+1).padStart(2,'0')}] : ${m.name}`, status: 'OK' },
      { text: `  MAJOR  : ${m.major || 'N/A'}`, status: 'RDY' },
      { text: m.status ? `  STATUS : ${m.status}` : null },
      { text: `  READY_FOR_FOOD : ${m.canCengfan ? '[READY]' : '[NOT_READY]'}`, status: m.canCengfan ? 'OK' : 'ERR' }
    ].filter(l => l.text !== null));
  }

  await safe([{ text: '> EOF', status: 'DONE' }]);
}

export async function closePanel() {
  abortBios();
  const panel = document.getElementById('info-panel');
  if (!panel.classList.contains('active')) return;

  const terminal = document.getElementById('terminal-content');
  terminal.innerHTML = '';

  const killLog = [
    '[SYS] ABORT_SIGNAL → SENT',
    '[SYS] PROCESS TERMINATED',
    '[SYS] BUFFER PURGED'
  ];
  for (const line of killLog) {
    terminal.innerHTML += line + '<br>';
    await new Promise(r => setTimeout(r, 140));
  }

  panel.classList.add('closing');
  setTimeout(() => {
    panel.classList.remove('active', 'closing');
  }, 320);
}
