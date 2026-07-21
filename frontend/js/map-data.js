import { API_BASE } from './config.js';

/**
 * 从 Worker 拉取地图数据，构建 ECharts 所需的 series 数据。
 * 3 秒超时后抛出，由调用方降级到 demo 数据。
 */
export async function fetchMapData() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  const res  = await fetch(`${API_BASE}/api/map/data`, { signal: controller.signal });
  clearTimeout(timer);
  const data = await res.json();

  const { origin, universities, colorMode, unifiedColor } = data;
  const originCoords = [origin.longitude, origin.latitude];

  const scatterData = universities.map(u => {
    const canCengfan = u.members.some(m => m.canCengfan);
    const color = colorMode === 'status'
      ? (canCengfan ? '#b8ff47' : '#ff4b1f')
      : (unifiedColor || '#b8ff47');

    return {
      name:      u.university,
      value:     [u.longitude, u.latitude, u],
      canCengfan,
      nodeColor: color
    };
  });

  const linesData = universities.map(u => ({
    coords:    [originCoords, [u.longitude, u.latitude]],
    nodeColor: scatterData.find(s => s.name === u.university)?.nodeColor || '#b8ff47'
  }));

  // 按距出发点由近到远排序（辐射动效用）
  const [ox, oy] = originCoords;
  scatterData.sort((a, b) =>
    Math.hypot(a.value[0] - ox, a.value[1] - oy) -
    Math.hypot(b.value[0] - ox, b.value[1] - oy)
  );

  return { origin, originCoords, universities, colorMode, unifiedColor, scatterData, linesData };
}
