import { API_BASE } from './config.js';

/**
 * 从 Worker 拉取地图数据，构建 ECharts 所需的 series 数据。
 * 距离小于 CLUSTER_DEG 的大学聚合成一个省级点。
 */
const CLUSTER_DEG = 1.0; // 经纬度距离阈值，约 300km

export async function fetchMapData() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  const res  = await fetch(`${API_BASE}/api/map/data`, { signal: controller.signal });
  clearTimeout(timer);
  const data = await res.json();

  const { origin, universities, colorMode, unifiedColor } = data;
  const originCoords = [origin.longitude, origin.latitude];

  // 聚合相邻大学为「省级集群」
  const clusters = clusterUniversities(universities, CLUSTER_DEG);

  const scatterData = clusters.map(c => {
    const canCengfan = c.universities.some(u => u.members.some(m => m.canCengfan));
    const color = colorMode === 'status'
      ? (canCengfan ? '#b8ff47' : '#ff4b1f')
      : (unifiedColor || '#b8ff47');

    return {
      name:        c.label,       // 省级集群用城市名/省名
      value:       [c.longitude, c.latitude, c],
      isCluster:   c.universities.length > 1,
      canCengfan,
      nodeColor:   color
    };
  });

  // 连线只连到集群中心点
  const linesData = clusters.map(c => ({
    coords:    [originCoords, [c.longitude, c.latitude]],
    nodeColor: scatterData.find(s => s.name === c.label)?.nodeColor || '#b8ff47'
  }));

  const [ox, oy] = originCoords;
  scatterData.sort((a, b) =>
    Math.hypot(a.value[0] - ox, a.value[1] - oy) -
    Math.hypot(b.value[0] - ox, b.value[1] - oy)
  );

  return { origin, originCoords, universities, colorMode, unifiedColor, scatterData, linesData };
}

/**
 * 把距离 < threshDeg 的大学合并成一个集群
 * 集群中心 = 成员平均坐标，label = 成员城市名拼接（去重）
 */
function clusterUniversities(universities, threshDeg) {
  const visited = new Array(universities.length).fill(false);
  const clusters = [];

  for (let i = 0; i < universities.length; i++) {
    if (visited[i]) continue;
    const group = [universities[i]];
    visited[i] = true;

    for (let j = i + 1; j < universities.length; j++) {
      if (visited[j]) continue;
      const d = Math.hypot(
        universities[i].longitude - universities[j].longitude,
        universities[i].latitude  - universities[j].latitude
      );
      if (d < threshDeg) {
        group.push(universities[j]);
        visited[j] = true;
      }
    }

    const lon = group.reduce((s, u) => s + u.longitude, 0) / group.length;
    const lat = group.reduce((s, u) => s + u.latitude,  0) / group.length;

    // label：去重城市名，多城市用 / 分隔
    const cities = [...new Set(group.map(u => u.city))].filter(Boolean);
    const label  = cities.length ? cities.join('/') : group[0].university;

    clusters.push({ label, longitude: lon, latitude: lat, universities: group });
  }

  return clusters;
}
