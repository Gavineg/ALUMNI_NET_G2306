/**
 * 从 Firestore 加载违禁词表，过滤文本中的违禁词（替换为 ***）。
 */
export async function filterText(text, db) {
  if (!text) return text;
  const words = await db.list('banned_words');
  let filtered = text;
  for (const doc of words) {
    if (!doc.word) continue;
    const re = new RegExp(doc.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    filtered = filtered.replace(re, '***');
  }
  return filtered;
}

export async function listBannedWords(db) {
  return db.list('banned_words');
}

export async function addBannedWord(word, db) {
  await db.add('banned_words', { word: word.trim() });
}

export async function deleteBannedWord(id, db) {
  await db.delete('banned_words', id);
}
