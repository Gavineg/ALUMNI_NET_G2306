// Cloudflare Pages Functions — 把 /api/* 代理到 Worker
export async function onRequest({ request, params }) {
  const url = new URL(request.url);
  const workerUrl = 'https://g2306-cengfan-api.gavineg2021-643.workers.dev'
    + '/api/' + (params.path?.join('/') || '')
    + url.search;

  return fetch(workerUrl, {
    method:  request.method,
    headers: request.headers,
    body:    ['GET', 'HEAD'].includes(request.method) ? undefined : request.body
  });
}
