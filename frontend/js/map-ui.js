/**
 * 地图交互：三级下钻
 * 单点（非集群）→ 直接显示学生信息
 * 集群点 → 终端面板显示城市列表 → 选城市 → 显示大学列表 → 选大学 → 显示学生信息
 */

import { biosAppend, abortBios } from './boot.js';

let currentSession = 0;
let chartRef       = null;
let initZoomRef    = null;
let initCenterRef  = null;

// 导航栈：记录每层的回调，用于 BACK 按钮
let navStack = [];

// 节流：连续点击只响应最后一次
let clickThrottle = null;

function updateCloseBtn() {
  const btn = document.getElementById('close-btn');
  if (!btn) return;
  // 全屏时由 setFullscreen 控制文字，不干预
  const panel = document.getElementById('info-panel');
  if (panel?.classList.contains('fullscreen')) return;
  btn.textContent = navStack.length > 0 ? '[BACK]' : '[ABORT]';
}

export function handleCloseBtn() {
  const panel = document.getElementById('info-panel');
  if (panel?.classList.contains('fullscreen')) return false; // 让 index.html 处理全屏退出
  if (navStack.length > 0) {
    const prev = navStack.pop();
    updateCloseBtn();
    prev();
    return true;
  }
  navStack = [];
  closePanel();
  return true;
}

export function initMapUI(chart, initZoom, initCenter, originInfo) {
  chartRef      = chart;
  initZoomRef   = initZoom;
  initCenterRef = initCenter;

  chart.on('click', params => {
    // origin node click
    if (params.seriesId === 'origin') {
      if (clickThrottle) clearTimeout(clickThrottle);
      clickThrottle = setTimeout(() => {
        clickThrottle = null;
        chartRef.setOption({ geo: { roam: false } });
        navStack = [];
        showOriginInfo(originInfo || {});
      }, 100);
      return;
    }

    if (!params.seriesId?.startsWith('target-')) {
      navStack = [];
      closePanel();
      return;
    }

    // 节流：100ms 内连续点只取最后一次
    if (clickThrottle) clearTimeout(clickThrottle);
    clickThrottle = setTimeout(() => {
      clickThrottle = null;
      chartRef.setOption({ geo: { roam: false } });
      const cluster = params.data.value[2];
      navStack = [];
      if (cluster.universities?.length > 1) {
        showCityMenu(cluster);
      } else if (cluster.universities?.length === 1) {
        showStudentInfo([cluster.universities[0]]);
      } else {
        showStudentInfo([cluster]);
      }
    }, 100);
  });
}

// ── 原点面板：学校 + 教师 ────────────────────────────────────

async function showOriginInfo({ school, teachers, name }) {
  const session = ++currentSession;
  abortBios();

  const panel    = document.getElementById('info-panel');
  const terminal = document.getElementById('terminal-content');
  panel.classList.add('active');
  terminal.innerHTML = '';
  updateCloseBtn();

  const safe = async lines => {
    if (session !== currentSession) return;
    await biosAppend(terminal, lines);
  };

  await safe([
    { text: '> ORIGIN_NODE // SYSTEM_BASE', status: 'RDY' },
    { text: `> LOCATION : [${name || 'SHENZHEN'}]`, status: 'OK' },
    ...(school ? [{ text: `> SCHOOL   : [${school}]`, status: 'VRF' }] : []),
    { text: '> ─────────────────────────────' },
  ]);

  if (session !== currentSession) return;

  const list = Array.isArray(teachers) ? teachers : [];
  if (list.length === 0) {
    await safe([{ text: '> NO TEACHER DATA ON FILE', status: 'ERR' }]);
  } else {
    await safe([{ text: `> FACULTY_RECORDS : ${list.length}`, status: 'RDY' }]);
    for (let i = 0; i < list.length; i++) {
      if (session !== currentSession) return;
      const t = list[i];
      await safe([
        { text: `> [${String(i + 1).padStart(2, '0')}] ${t.name || '—'}`, status: 'OK' },
        ...(t.subject ? [{ text: `     SUBJECT : ${t.subject}` }] : []),
        ...(t.contact ? [{ text: `     CONTACT : ${t.contact}` }] : []),
        ...(t.note    ? [{ text: `     NOTE    : ${t.note}` }]    : []),
      ]);
    }
  }

  await safe([{ text: '> EOF', status: 'DONE' }]);
  if (chartRef) chartRef.setOption({ geo: { roam: true } });
}

// ── 第一级：城市菜单 ──────────────────────────────────────────

async function showCityMenu(cluster) {
  const session = ++currentSession;
  abortBios();

  const panel    = document.getElementById('info-panel');
  const terminal = document.getElementById('terminal-content');
  panel.classList.add('active');
  terminal.innerHTML = '';
  updateCloseBtn();

  const cityMap = {};
  for (const u of cluster.universities) {
    const city = u.city || '未知';
    if (!cityMap[city]) cityMap[city] = [];
    cityMap[city].push(u);
  }
  const cities = Object.keys(cityMap);

  const safe = async lines => {
    if (session !== currentSession) return;
    await biosAppend(terminal, lines);
  };

  await safe([
    { text: `> CLUSTER DETECTED : ${cluster.universities.length} INSTITUTES`, status: 'RDY' },
    { text: '> SELECT TARGET CITY:' },
    { text: '> ─────────────────────────────' }
  ]);

  if (session !== currentSession) return;

  for (let i = 0; i < cities.length; i++) {
    if (session !== currentSession) return;
    const city = cities[i];
    const count = cityMap[city].length;

    const div = document.createElement('div');
    div.style.cssText = 'cursor:pointer;padding:3px 0;color:var(--hud-primary);';
    div.innerHTML = `<span style="color:var(--hud-text-dim)">[${String(i+1).padStart(2,'0')}]</span> ${city} <span style="color:var(--hud-text-dim)">(${count} INST)</span>`;
    div.addEventListener('click', () => {
      if (session !== currentSession) return;
      navStack.push(() => showCityMenu(cluster));
      updateCloseBtn();
      showUniMenu(cityMap[city], city);
    });
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
    await new Promise(r => setTimeout(r, 80));
  }

  if (session !== currentSession) return;
  const cur = document.createElement('div');
  cur.className = 'terminal-cursor';
  terminal.appendChild(cur);
  if (chartRef) chartRef.setOption({ geo: { roam: true } });
}

// ── 第二级：大学菜单 ──────────────────────────────────────────

async function showUniMenu(unis, cityName) {
  const session = ++currentSession;
  abortBios();

  const terminal = document.getElementById('terminal-content');
  terminal.innerHTML = '';
  updateCloseBtn();

  const safe = async lines => {
    if (session !== currentSession) return;
    await biosAppend(terminal, lines);
  };

  await safe([
    { text: `> CITY : [${cityName}]`, status: 'OK' },
    { text: `> ${unis.length} INSTITUTE(S) FOUND` },
    { text: '> SELECT INSTITUTE:' },
    { text: '> ─────────────────────────────' }
  ]);

  if (session !== currentSession) return;

  for (let i = 0; i < unis.length; i++) {
    if (session !== currentSession) return;
    const u = unis[i];

    const div = document.createElement('div');
    div.style.cssText = 'cursor:pointer;padding:3px 0;color:var(--hud-primary);';
    div.innerHTML = `<span style="color:var(--hud-text-dim)">[${String(i+1).padStart(2,'0')}]</span> ${u.university}`;
    div.addEventListener('click', () => {
      if (session !== currentSession) return;
      navStack.push(() => showUniMenu(unis, cityName));
      updateCloseBtn();
      showStudentInfo([u]);
    });
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
    await new Promise(r => setTimeout(r, 80));
  }

  if (session !== currentSession) return;

  const cur = document.createElement('span');
  cur.className = 'terminal-cursor';
  terminal.appendChild(cur);
  if (chartRef) chartRef.setOption({ geo: { roam: true } });
}

// ── 第三级：学生信息 ──────────────────────────────────────────

async function showStudentInfo(unis) {
  const session = ++currentSession;
  abortBios();

  const panel    = document.getElementById('info-panel');
  const terminal = document.getElementById('terminal-content');
  panel.classList.add('active');
  terminal.innerHTML = '';
  updateCloseBtn();

  const safe = async lines => {
    if (session !== currentSession) return;
    await biosAppend(terminal, lines);
  };

  for (const group of unis) {
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
        ...(m.status ? [{ text: `  STATUS : ${m.status}` }] : []),
        { text: `  READY_FOR_FOOD : ${m.canCengfan ? '[READY]' : '[NOT_READY]'}`, status: m.canCengfan ? 'OK' : 'ERR' }
      ]);
    }
  }

  await safe([{ text: '> EOF', status: 'DONE' }]);
  if (chartRef) chartRef.setOption({ geo: { roam: true } });
}

// ── 供彩蛋命令终端复用 ────────────────────────────────────────

export function openPanel() {
  document.getElementById('info-panel').classList.add('active');
}

export function clearTerminal() {
  ++currentSession;
  abortBios();
  document.getElementById('terminal-content').innerHTML = '';
}

export function flyToCoord(lon, lat) {
  chartRef?.setOption({ geo: { zoom: 6, center: [lon, lat] } });
}

// ── 关闭面板 ──────────────────────────────────────────────────

export async function closePanel() {
  abortBios();
  navStack = [];
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

  if (chartRef) chartRef.setOption({ geo: { roam: true } });
  panel.classList.add('closing');
  setTimeout(() => {
    panel.classList.remove('active', 'closing');
  }, 320);
}

/*
// ── 已注释：全国视图自动放大到省级功能 ──────────────────────
// 逻辑：全国视图下点击拥挤节点 → 放大到 zoom=8，无操作 8 秒退回
// 如需恢复取消注释，并在 initMapUI 里调用 isCrowded / scheduleAutoReset

const ZOOM_PROVINCE  = 8;
const CLUSTER_THRESH = 3;
const AUTO_RESET_MS  = 8000;
let zoomedProvince   = null;
let zoomTimer        = null;

function isCrowded(lon, lat, allNodes, chart, threshDeg) {
  const zoom   = chart.getOption().geo?.[0]?.zoom ?? 1;
  const thresh = threshDeg / zoom;
  let count = 0;
  for (const [nlon, nlat] of allNodes) {
    const d = Math.hypot(nlon - lon, nlat - lat);
    if (d < thresh && d > 0.001) count++;
  }
  return count > 0;
}

function scheduleAutoReset() {
  clearAutoReset();
  zoomTimer = setTimeout(() => { if (zoomedProvince) resetToWorld(); }, AUTO_RESET_MS);
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
// ────────────────────────────────────────────────────────────
*/
