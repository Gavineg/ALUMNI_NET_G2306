/**
 * 从 D1 加载违禁词表，过滤文本中的违禁词（替换为 ***）。
 * 每个请求实时查库（词表小，D1 延迟可接受；如需缓存可加 Cache API）。
 */
export async function filterText(text, db) {
  if (!text) return text;
  const { results } = await db.prepare('SELECT word FROM banned_words').all();
  let filtered = text;
  for (const { word } of results) {
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    filtered = filtered.replace(re, '***');
  }
  return filtered;
}

export async function listBannedWords(db) {
  const { results } = await db.prepare('SELECT id, word FROM banned_words ORDER BY id').all();
  return results;
}

export async function addBannedWord(word, db) {
  await db.prepare('INSERT OR IGNORE INTO banned_words (word) VALUES (?)').bind(word.trim()).run();
}

export async function deleteBannedWord(id, db) {
  await db.prepare('DELETE FROM banned_words WHERE id = ?').bind(id).run();
}
