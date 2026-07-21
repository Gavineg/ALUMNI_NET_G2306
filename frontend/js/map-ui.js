/**
 * 地图交互：点击节点 → BIOS 终端面板
 */

import { biosAppend, abortBios } from './boot.js';

let currentSession = 0;

export function initMapUI(chart) {
  chart.on('click', async params => {
    if (!params.seriesId?.startsWith('target-')) {
      closePanel();
      return;
    }

    const session = ++currentSession;
    abortBios();

    const panel    = document.getElementById('info-panel');
    const terminal = document.getElementById('terminal-content');

    panel.classList.add('active');
    terminal.innerHTML = '';

    const group = params.data.value[2]; // uniGroup 对象

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
      const cengfanLabel = m.canCengfan ? '[READY]' : '[NOT_READY]';
      const cengfanColor = m.canCengfan ? 'var(--hud-primary)' : 'var(--hud-danger)';

      await safe([
        { text: `> SUBJECT [${String(i+1).padStart(2,'0')}] : ${m.name}`, status: 'OK' },
        { text: `  MAJOR  : ${m.major || 'N/A'}`, status: 'RDY' },
        { text: m.status ? `  STATUS : ${m.status}` : null },
        { text: `  READY_FOR_FOOD : ${m.canCengfan ? '[READY]' : '[NOT_READY]'}`, status: m.canCengfan ? 'OK' : 'ERR' }
      ].filter(l => l.text !== null));
    }

    await safe([{ text: '> EOF', status: 'DONE' }]);
  });
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
