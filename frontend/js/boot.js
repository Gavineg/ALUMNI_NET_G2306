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
export async function glitchResolve(el, target, glitchMs = 320, resolveMs = 38) {
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
export async function typeWrite(el, text, speed = 28) {
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

export async function biosAppend(terminal, lines) {
  if (typingCtrl) typingCtrl.abort();
  typingCtrl = new AbortController();
  const { signal } = typingCtrl;

  for (const item of lines) {
    if (signal.aborted) return;
    const div = document.createElement('div');
    terminal.appendChild(div);

    for (const char of item.text) {
      if (signal.aborted) return;
      div.textContent += char;
      await sleep(16 + Math.random() * 22);
    }

    if (item.status) {
      const span = document.createElement('span');
      span.style.color = item.status === 'ERR' ? 'var(--hud-danger)' : 'var(--hud-primary)';
      span.textContent = ` [${item.status}]`;
      div.appendChild(span);
    }

    terminal.scrollTop = terminal.scrollHeight;
    await sleep(160 + Math.random() * 200);
  }
}

export function abortBios() {
  if (typingCtrl) { typingCtrl.abort(); typingCtrl = null; }
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
