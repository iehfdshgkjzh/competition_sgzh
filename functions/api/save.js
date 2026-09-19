export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. 读前端传来的 JSON
    const body = await request.json();

    // 2. 校验
    if (!body.numbers_data || !body.users_data || !body.summary_data) {
      return Response.json(
        { error: '数据缺少字段：numbers_data / users_data / summary_data' },
        { status: 400 }
      );
    }

    // 3. 存入 KV
    await env.MY_KV.put('numbers_data', JSON.stringify(body.numbers_data));
    await env.MY_KV.put('users_data',   JSON.stringify(body.users_data));
    await env.MY_KV.put('summary_data', JSON.stringify(body.summary_data));
    await env.MY_KV.put('updated_at',   new Date().toISOString());

    return Response.json({
      ok: true,
      playerCount: body.summary_data.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return Response.json(
      { error: e.message, stack: e.stack },
      { status: 500 }
    );
  }
}