export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json({ error: '缺少 id 参数' }, { status: 400 });
  }

  const raw = await context.env.MY_KV.get('users_data');
  if (!raw) {
    return Response.json({ error: '还没有数据' }, { status: 404 });
  }

  const users = JSON.parse(raw);
  if (!(id in users)) {
    return Response.json({ error: `找不到玩家 ${id}` }, { status: 404 });
  }

  return Response.json(users[id]);
}