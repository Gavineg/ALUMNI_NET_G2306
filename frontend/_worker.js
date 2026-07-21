// Cloudflare Pages Worker — 把 /api/* 反向代理到 Worker
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const workerUrl = 'https://g2306-cengfan-api.gavineg2021-643.workers.dev' + url.pathname + url.search;
      return fetch(workerUrl, {
        method:  request.method,
        headers: request.headers,
        body:    ['GET','HEAD'].includes(request.method) ? undefined : request.body
      });
    }

    // 其他请求交给 Pages 静态文件处理
    return env.ASSETS.fetch(request);
  }
};
