/**
 * YEARBOOK.EXE — 沉浸式班级档案播放器
 * 全屏黑客风：终端噪声背景 + 扫描线 + 幻灯片浮层
 */

import { API_BASE } from './config.js';

let yearbookActive = false;
let audioEl = null;

export async function launchYearbook() {
  if (yearbookActive) return;
  yearbookActive = true;

  // 拉取配置
  let cfg = { title: 'G2306 YEARBOOK', slides: [], boot_lines: [], bgm_url: '', bgm_volume: 0.4 };
  try {
    const res = await fetch(`${API_BASE}/api/admin/memorial`);
    if (res.ok) cfg = { ...cfg, ...await res.json() };
  } catch {}

  buildUI(cfg);
}

function buildUI(cfg) {
  // 注入样式
  if (!document.getElementById('ybk-style')) {
    const s = document.createElement('style');
    s.id = 'ybk-style';
    s.textContent = YBK_CSS;
    document.head.appendChild(s);
  }

  const overlay = document.createElement('div');
  overlay.id = 'ybk-overlay';
  overlay.innerHTML = `
    <canvas id="ybk-bg-canvas"></canvas>
    <div class="ybk-scanlines"></div>
    <div class="ybk-vignette"></div>

    <!-- terminal background text stream -->
    <div id="ybk-term-bg"></div>

    <!-- HUD frame corners -->
    <div class="ybk-corner ybk-tl"></div>
    <div class="ybk-corner ybk-tr"></div>
    <div class="ybk-corner ybk-bl"></div>
    <div class="ybk-corner ybk-br"></div>

    <!-- top bar -->
    <div id="ybk-topbar">
      <span id="ybk-title">${cfg.title || 'G2306 YEARBOOK'}</span>
      <span id="ybk-clock"></span>
      <button id="ybk-close">[ESC / EXIT]</button>
    </div>

    <!-- boot terminal -->
    <div id="ybk-boot">
      <div id="ybk-boot-lines"></div>
      <div class="ybk-cursor"></div>
    </div>

    <!-- slide stage -->
    <div id="ybk-stage" style="display:none">
      <div id="ybk-slide-img-wrap">
        <img id="ybk-slide-img" src="" alt="">
        <div id="ybk-img-scan"></div>
      </div>
      <div id="ybk-slide-text"></div>
      <div id="ybk-slide-caption"></div>
      <div id="ybk-progress-bar"><div id="ybk-progress-fill"></div></div>
      <div id="ybk-slide-counter"></div>
    </div>

    <!-- audio control -->
    <div id="ybk-audio-ctrl" style="display:none">
      <button id="ybk-mute-btn">[♪ BGM ON]</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // animate in
  requestAnimationFrame(() => overlay.classList.add('ybk-visible'));

  // clock
  const clockEl = document.getElementById('ybk-clock');
  const clockTimer = setInterval(() => {
    clockEl.textContent = new Date().toTimeString().slice(0,8);
  }, 1000);
  clockEl.textContent = new Date().toTimeString().slice(0,8);

  // close
  function exitYearbook() {
    yearbookActive = false;
    clearInterval(clockTimer);
    stopBgCanvas();
    if (audioEl) { audioEl.pause(); audioEl = null; }
    overlay.classList.remove('ybk-visible');
    setTimeout(() => overlay.remove(), 600);
  }
  document.getElementById('ybk-close').addEventListener('click', exitYearbook);
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { exitYearbook(); document.removeEventListener('keydown', onEsc); }
  });

  // background terminal stream
  startTermBg();

  // BGM
  if (cfg.bgm_url) {
    audioEl = new Audio(cfg.bgm_url);
    audioEl.loop = true;
    audioEl.volume = parseFloat(cfg.bgm_volume) || 0.4;
    audioEl.play().catch(() => {});
    const ctrl = document.getElementById('ybk-audio-ctrl');
    const muteBtn = document.getElementById('ybk-mute-btn');
    ctrl.style.display = 'block';
    muteBtn.addEventListener('click', () => {
      if (audioEl.paused) { audioEl.play(); muteBtn.textContent = '[♪ BGM ON]'; }
      else { audioEl.pause(); muteBtn.textContent = '[♪ BGM OFF]'; }
    });
  }

  // sequence: boot → slides
  runBoot(cfg).then(() => runSlides(cfg));
}

async function runBoot(cfg) {
  const container = document.getElementById('ybk-boot-lines');
  const lines = (cfg.boot_lines && cfg.boot_lines.length) ? cfg.boot_lines : [
    '[SYS]  MEMORY CORE v1.0 — INITIALIZING',
    '[AUTH] IDENTITY VERIFIED: G2306 COHORT',
    '[LOAD] DECRYPTING ARCHIVE... 0%',
    '[LOAD] DECRYPTING ARCHIVE... 38%',
    '[LOAD] DECRYPTING ARCHIVE... 71%',
    '[LOAD] DECRYPTING ARCHIVE... 100% — OK',
    '[MEM]  ' + (cfg.slides ? cfg.slides.length : 0) + ' MEMORY FRAGMENT(S) FOUND',
    '[PLAY] STARTING PLAYBACK...',
  ];

  for (const line of lines) {
    if (!yearbookActive) return;
    const div = document.createElement('div');
    div.className = 'ybk-boot-line';
    container.appendChild(div);
    // typewrite each boot line
    for (const ch of line) {
      if (!yearbookActive) return;
      div.textContent += ch;
      await sleep(18 + Math.random() * 12);
    }
    container.scrollTop = container.scrollHeight;
    await sleep(80 + Math.random() * 60);
  }
  await sleep(600);

  // fade out boot
  const boot = document.getElementById('ybk-boot');
  boot.style.opacity = '0';
  await sleep(400);
  boot.style.display = 'none';
}

async function runSlides(cfg) {
  if (!yearbookActive) return;
  const slides = cfg.slides || [];
  if (!slides.length) {
    // no slides: show placeholder
    const stage = document.getElementById('ybk-stage');
    stage.style.display = 'flex';
    document.getElementById('ybk-slide-text').textContent = '> NO MEMORY FRAGMENTS LOADED';
    document.getElementById('ybk-slide-caption').textContent = '> ADMIN: ADD SLIDES VIA YEARBOOK TAB';
    return;
  }

  const stage     = document.getElementById('ybk-stage');
  const imgWrap   = document.getElementById('ybk-slide-img-wrap');
  const imgEl     = document.getElementById('ybk-slide-img');
  const textEl    = document.getElementById('ybk-slide-text');
  const capEl     = document.getElementById('ybk-slide-caption');
  const fillEl    = document.getElementById('ybk-progress-fill');
  const counterEl = document.getElementById('ybk-slide-counter');
  stage.style.display = 'flex';

  for (let i = 0; i < slides.length; i++) {
    if (!yearbookActive) return;
    const slide = slides[i];
    const duration = parseInt(slide.duration) || 5000;

    counterEl.textContent = `[ ${String(i+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')} ]`;

    // reset
    stage.classList.remove('ybk-slide-in');
    imgWrap.style.display = 'none';
    imgEl.src = '';
    textEl.textContent = '';
    capEl.textContent = '';
    fillEl.style.transition = 'none';
    fillEl.style.width = '0%';

    await sleep(50);
    stage.classList.add('ybk-slide-in');

    // image
    if (slide.url) {
      imgWrap.style.display = 'block';
      imgEl.src = slide.url;
      imgEl.style.opacity = '0';
      await new Promise(resolve => {
        imgEl.onload = imgEl.onerror = resolve;
        setTimeout(resolve, 3000);
      });
      imgEl.style.transition = 'opacity 0.8s ease';
      imgEl.style.opacity = '1';
    }

    // typewrite text
    if (slide.content) {
      for (const ch of slide.content) {
        if (!yearbookActive) return;
        textEl.textContent += ch;
        await sleep(22 + Math.random() * 16);
      }
    }

    // caption
    if (slide.caption) {
      capEl.textContent = '> ' + slide.caption;
    }

    // progress bar
    fillEl.style.transition = `width ${duration}ms linear`;
    await sleep(30);
    fillEl.style.width = '100%';

    await sleep(duration);
  }

  // end card
  if (!yearbookActive) return;
  stage.classList.remove('ybk-slide-in');
  await sleep(200);
  stage.classList.add('ybk-slide-in');
  imgWrap.style.display = 'none';
  fillEl.style.transition = 'none'; fillEl.style.width = '0%';
  counterEl.textContent = '';
  textEl.textContent = '';
  capEl.textContent = '';
  await sleep(50);
  for (const ch of '> END OF ARCHIVE — G2306 COHORT') {
    if (!yearbookActive) return;
    textEl.textContent += ch;
    await sleep(35);
  }
  capEl.textContent = '> [ESC] TO EXIT';
}

// ── terminal background stream ────────────────────────────────

const TERM_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&!?><[]{}|/\\;:.,_-+=~^*';
const TERM_WORDS = ['ACCESS','DECRYPT','G2306','NETWORK','NODE','SYNC','AUTH','PACKET','OVERFLOW',
  'MEMORY','STACK','KERNEL','SHELL','ROOT','BYPASS','INJECT','PAYLOAD','TRACE','SIGNAL'];

function startTermBg() {
  const bg = document.getElementById('ybk-term-bg');
  let running = true;

  async function streamLine() {
    while (running && yearbookActive) {
      await sleep(60 + Math.random() * 80);
      const div = document.createElement('div');
      div.className = 'ybk-bg-line';
      // random line: hex dump, command output, or random word stream
      const r = Math.random();
      if (r < 0.3) {
        // hex dump row
        const addr = Math.floor(Math.random() * 0xffff).toString(16).padStart(4,'0').toUpperCase();
        const bytes = Array.from({length:16}, () => Math.floor(Math.random()*256).toString(16).padStart(2,'0').toUpperCase()).join(' ');
        div.textContent = `0x${addr}  ${bytes}`;
      } else if (r < 0.55) {
        // word stream
        const word = TERM_WORDS[Math.floor(Math.random()*TERM_WORDS.length)];
        const noise = Array.from({length: 6+Math.floor(Math.random()*12)}, () =>
          TERM_CHARS[Math.floor(Math.random()*TERM_CHARS.length)]).join('');
        div.textContent = `[${word}] ${noise}`;
      } else {
        // random chars
        div.textContent = Array.from({length: 40+Math.floor(Math.random()*30)}, () =>
          TERM_CHARS[Math.floor(Math.random()*TERM_CHARS.length)]).join('');
      }
      bg.appendChild(div);
      // keep max 60 lines
      while (bg.children.length > 60) bg.removeChild(bg.firstChild);
    }
  }

  streamLine();
  return () => { running = false; };
}

let stopBgCanvas = () => {};

// ── CSS ───────────────────────────────────────────────────────

const YBK_CSS = `
#ybk-overlay {
  position: fixed; inset: 0; z-index: 9000;
  background: #000;
  opacity: 0; transition: opacity 0.5s ease;
  display: flex; flex-direction: column;
  font-family: 'Courier New', Courier, monospace;
  overflow: hidden;
}
#ybk-overlay.ybk-visible { opacity: 1; }

#ybk-bg-canvas { position:absolute; inset:0; z-index:0; opacity:0.06; pointer-events:none; }

.ybk-scanlines {
  position:absolute; inset:0; z-index:1; pointer-events:none;
  background: repeating-linear-gradient(
    0deg, transparent 0px, transparent 2px,
    rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px
  );
}
.ybk-vignette {
  position:absolute; inset:0; z-index:2; pointer-events:none;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%);
}

#ybk-term-bg {
  position:absolute; inset:0; z-index:0;
  padding: 8px 14px;
  font-size: 11px; line-height: 1.55;
  color: rgba(184,255,71,0.07);
  overflow: hidden;
  pointer-events: none;
  white-space: pre;
  text-transform: none !important;
}
.ybk-bg-line { text-transform: none !important; }

/* HUD corners */
.ybk-corner {
  position:absolute; z-index:10; width:28px; height:28px; pointer-events:none;
  border-color: rgba(184,255,71,0.6); border-style:solid; border-width:0;
}
.ybk-tl { top:10px; left:10px;  border-top-width:2px;    border-left-width:2px; }
.ybk-tr { top:10px; right:10px; border-top-width:2px;    border-right-width:2px; }
.ybk-bl { bottom:10px; left:10px;  border-bottom-width:2px; border-left-width:2px; }
.ybk-br { bottom:10px; right:10px; border-bottom-width:2px; border-right-width:2px; }

/* top bar */
#ybk-topbar {
  position:relative; z-index:20;
  display:flex; align-items:center; justify-content:space-between;
  padding: 12px 24px 8px;
  border-bottom: 1px dashed rgba(184,255,71,0.2);
  flex-shrink: 0;
}
#ybk-title {
  font-size:13px; letter-spacing:4px;
  color:#b8ff47; text-shadow: 0 0 14px rgba(184,255,71,0.8);
  text-transform: none !important;
}
#ybk-clock { font-size:11px; color:rgba(184,255,71,0.45); letter-spacing:2px; }
#ybk-close {
  font-size:11px; letter-spacing:2px; color:rgba(184,255,71,0.5);
  background:transparent; border:1px solid rgba(184,255,71,0.2);
  padding:4px 10px; cursor:pointer; font-family:inherit;
  transition: all 0.2s; text-transform:none !important;
}
#ybk-close:hover { color:#b8ff47; border-color:rgba(184,255,71,0.6); }

/* boot terminal */
#ybk-boot {
  position:relative; z-index:20;
  flex:1; padding:32px 48px;
  overflow:hidden;
  display:flex; flex-direction:column; justify-content:center;
  transition: opacity 0.4s ease;
}
.ybk-boot-line {
  font-size:13px; line-height:1.8;
  color: #b8ff47; text-shadow: 0 0 8px rgba(184,255,71,0.5);
  text-transform: none !important;
}
.ybk-cursor {
  display:inline-block; width:10px; height:16px;
  background:#b8ff47; margin-left:2px; margin-top:4px;
  animation: ybk-blink 0.8s step-end infinite;
}
@keyframes ybk-blink { 0%,100%{opacity:1} 50%{opacity:0} }

/* slide stage */
#ybk-stage {
  position:relative; z-index:20;
  flex:1; padding:28px 60px 20px;
  display:none; flex-direction:column;
  align-items:center; justify-content:center;
  gap:18px;
  opacity: 0; transition: opacity 0.5s ease;
}
#ybk-stage.ybk-slide-in { opacity:1; }

#ybk-slide-img-wrap {
  position:relative;
  max-width:min(640px, 70vw); width:100%;
  border:1px solid rgba(184,255,71,0.3);
  box-shadow: 0 0 40px rgba(184,255,71,0.15), inset 0 0 20px rgba(0,0,0,0.5);
  overflow:hidden;
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
}
#ybk-slide-img {
  width:100%; display:block;
  filter: saturate(0.85) contrast(1.05);
}
#ybk-img-scan {
  position:absolute; left:0; right:0; height:3px;
  background: linear-gradient(90deg, transparent, rgba(184,255,71,0.7), transparent);
  animation: ybk-img-scan 2.5s linear infinite;
  pointer-events:none;
}
@keyframes ybk-img-scan {
  0%   { top:-3px; opacity:0; }
  5%   { opacity:1; }
  95%  { opacity:0.6; }
  100% { top:100%; opacity:0; }
}

#ybk-slide-text {
  max-width: 640px; width:100%;
  font-size:15px; line-height:1.9;
  color:#e8ffc0; text-shadow: 0 0 10px rgba(184,255,71,0.4);
  text-align:center; text-transform:none !important;
  min-height:2em;
}
#ybk-slide-caption {
  font-size:11px; letter-spacing:2px;
  color:rgba(184,255,71,0.45);
  text-transform:none !important;
}

#ybk-progress-bar {
  width:min(480px,60vw); height:2px;
  background:rgba(184,255,71,0.15);
  position:relative; overflow:hidden;
}
#ybk-progress-fill {
  height:100%; width:0%;
  background:#b8ff47;
  box-shadow: 0 0 8px #b8ff47;
}
#ybk-slide-counter {
  font-size:11px; letter-spacing:3px;
  color:rgba(184,255,71,0.35);
}

/* audio control */
#ybk-audio-ctrl {
  position:absolute; bottom:22px; right:24px; z-index:30;
}
#ybk-mute-btn {
  font-size:11px; letter-spacing:1px;
  background:transparent; border:1px solid rgba(184,255,71,0.25);
  color:rgba(184,255,71,0.5); padding:4px 10px;
  cursor:pointer; font-family:inherit;
  transition:all 0.2s; text-transform:none !important;
}
#ybk-mute-btn:hover { color:#b8ff47; border-color:rgba(184,255,71,0.6); }

@media (max-width:600px) {
  #ybk-boot { padding:20px 20px; }
  #ybk-stage { padding:16px 16px 16px; gap:12px; }
  #ybk-slide-text { font-size:13px; }
  .ybk-boot-line { font-size:12px; }
}
`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
