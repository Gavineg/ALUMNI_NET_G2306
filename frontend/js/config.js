// 本地开发时 wrangler dev 默认监听 8787
// 部署后替换为 Worker 的实际 URL
export const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8787'
  : '';
export const FLIGHT_TIME = 1200; // 彗星粒子飞行时长（ms）
export const NODE_DELAY  = 100;  // 目标节点逐个出现间隔（ms）
