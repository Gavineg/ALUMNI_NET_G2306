/**
 * 代理高德地图地点搜索，防止 API Key 暴露到前端。
 * 接受 { keyword } POST body，返回 { name, city, longitude, latitude }。
 */
export async function handleGeocode(request, env) {
  const { keyword } = await request.json().catch(() => ({}));
  if (!keyword || keyword.length > 100) {
    return json({ error: 'invalid keyword' }, 400);
  }

  const url = new URL('https://restapi.amap.com/v3/place/text');
  url.searchParams.set('key',      env.AMAP_KEY);
  url.searchParams.set('keywords', keyword);
  url.searchParams.set('types',    '141');  // 高等院校
  url.searchParams.set('output',   'json');
  url.searchParams.set('offset',   '1');

  const res  = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== '1' || !data.pois?.length) {
    // 降级：不限类型再找一次
    url.searchParams.delete('types');
    const res2  = await fetch(url.toString());
    const data2 = await res2.json();
    if (data2.status !== '1' || !data2.pois?.length) {
      return json({ error: 'not found' }, 404);
    }
    return extractPoi(data2.pois[0]);
  }
  return extractPoi(data.pois[0]);
}

function extractPoi(poi) {
  const [lon, lat] = poi.location.split(',').map(Number);
  return json({ name: poi.name, city: poi.cityname || poi.adname, longitude: lon, latitude: lat });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
