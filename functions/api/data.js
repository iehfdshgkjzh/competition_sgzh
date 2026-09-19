export async function onRequestGet(context) {
  const rawUsers = await context.env.MY_KV.get('users_data');
  const updatedAt = await context.env.MY_KV.get('updated_at');

  if (!rawUsers) {
    return Response.json(
      { error: '还没有数据，请先上传 Excel' },
      { status: 404 }
    );
  }

  const users = JSON.parse(rawUsers);

  // 生成精简的 summary 列表（含最高分任务）
  const summary = Object.entries(users).map(([id, u]) => {
    const data = u.data || [];
    const topTask = data.length > 0 ? data[0] : null;  // 已按 score 降序
    return {
      id,
      totalScore: u.totalScore || 0,
      count: data.length,
      topTask,     // { code, value, score } 或 null
    };
  });

  // 排序
  summary.sort((a, b) => b.totalScore - a.totalScore);
  summary.forEach((s, i) => { s.rank = i + 1; });

  return Response.json(summary, {
    headers: {
      'X-Updated-At': updatedAt || '',
    },
  });
}