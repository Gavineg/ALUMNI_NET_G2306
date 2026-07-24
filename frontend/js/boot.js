/**
 * BIOS 风格启动序列：乱码雨 → 打字机 → 状态行
 */

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&!?><[]{}';

function randChar() {
  return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
}

/**
 * 乱码雨：先用随机字符填满 el，然后逐字母稳定成目标文字。
 * @param {HTMLElement} el
 * @param {string} target
 * @param {number} glitchMs   乱码阶段持续时间
 * @param {number} resolveMs  每字母稳定延迟
 */
export async function glitchResolve(el, target, glitchMs = 180, resolveMs = 20) {
  // 乱码阶段
  const arr   = target.split('').map(() => randChar());
  const ticks = Math.floor(glitchMs / 40);

  for (let t = 0; t < ticks; t++) {
    el.textContent = arr.map((c, i) => (target[i] === ' ' ? ' ' : randChar())).join('');
    await sleep(40);
  }

  // 逐字母稳定
  for (let i = 0; i < target.length; i++) {
    arr[i] = target[i];
    el.textContent = arr.join('');
    await sleep(resolveMs + Math.random() * 20);
  }
}

/**
 * 普通打字机（用于子标题等辅助文字）
 */
export async function typeWrite(el, text, speed = 55) {
  el.textContent = '';
  for (const char of text) {
    el.textContent += char;
    await sleep(speed + Math.random() * 18);
  }
  const cursor = document.createElement('span');
  cursor.className = 'terminal-cursor';
  el.appendChild(cursor);
}

/**
 * BIOS 多行输出系统（带打断控制）
 */
let typingCtrl = null;

function scrollToBottom(terminal) {
  // Use requestAnimationFrame to scroll after the DOM has painted
  requestAnimationFrame(() => { terminal.scrollTop = terminal.scrollHeight; });
}

function attachScrollTracker(terminal) {
  if (terminal._scrollTracked) return;
  terminal._scrollTracked = true;
  terminal._userScrolled = false;
  terminal.addEventListener('scroll', () => {
    const atBottom = terminal.scrollHeight - terminal.scrollTop - terminal.clientHeight < 10;
    terminal._userScrolled = !atBottom;
  });
}

export async function biosAppend(terminal, lines, speed = 45) {
  if (typingCtrl) typingCtrl.abort();
  typingCtrl = new AbortController();
  const { signal } = typingCtrl;

  // abort-aware sleep — 信号触发时立即返回
  function asleep(ms) {
    return new Promise(r => {
      const t = setTimeout(r, ms);
      signal.addEventListener('abort', () => { clearTimeout(t); r(); }, { once: true });
    });
  }

  // speed=1: normal (map UI)  speed=10: fast (commands)  speed=100: instant
  const charDelay = speed >= 100 ? 0 : speed >= 10 ? (1 + Math.random() * 3) : (16 + Math.random() * 22);
  const lineDelay = speed >= 100 ? 0 : speed >= 10 ? (8 + Math.random() * 12) : (160 + Math.random() * 200);

  attachScrollTracker(terminal);

  for (const item of lines) {
    if (signal.aborted) return;
    const div = document.createElement('div');
    terminal.appendChild(div);

    if (!terminal._userScrolled) scrollToBottom(terminal);
    if (charDelay > 0) await new Promise(r => {
      requestAnimationFrame(r);
      signal.addEventListener('abort', r, { once: true });
    });
    if (signal.aborted) return;

    for (const char of item.text) {
      if (signal.aborted) return;
      div.textContent += char;
      if (!terminal._userScrolled) scrollToBottom(terminal);
      await asleep(charDelay);
    }

    if (signal.aborted) return;

    if (item.status) {
      const span = document.createElement('span');
      span.style.color = item.status === 'ERR' ? 'var(--hud-danger)' : 'var(--hud-primary)';
      span.textContent = ` [${item.status}]`;
      div.appendChild(span);
    }

    if (!terminal._userScrolled) scrollToBottom(terminal);
    await asleep(lineDelay);
  }
}

export function abortBios() {
  if (typingCtrl) { typingCtrl.abort(); typingCtrl = null; }
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
