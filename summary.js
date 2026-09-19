// ============================================================
// DOM
// ============================================================
const rootEl    = document.getElementById('summaryRoot');
const updatedEl = document.getElementById('updatedAt');
const backBtn   = document.getElementById('backFromSummary');

// ============================================================
// 主流程：加载 + 渲染
// ============================================================
async function loadSummary() {
  try {
    const res = await fetch('/api/data');
    const list = await res.json();

    if (!res.ok) {
      throw new Error(list.error || `HTTP ${res.status}`);
    }

    // 更新时间
    const updatedAt = res.headers.get('X-Updated-At');
    if (updatedAt && updatedEl) {
      updatedEl.textContent =
        '最后更新：' + new Date(updatedAt).toLocaleString('zh-CN');
    }

    renderList(list);
  } catch (e) {
    console.error(e);
    rootEl.innerHTML = `<div class="state">加载失败：${e.message}</div>`;
  }
}

// ============================================================
// 渲染玩家卡片列表
// ============================================================
function renderList(list) {
  if (!Array.isArray(list) || list.length === 0) {
    rootEl.innerHTML = '<div class="state">暂无数据</div>';
    return;
  }

  rootEl.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.onclick = () => {
    //   location.href = `/index.html?name=${encodeURIComponent(p.id)}`;
      // 或者跳个人页（看你怎么设计）
      // location.href = `/user.html?id=${encodeURIComponent(p.id)}`;
    };

    // 头像/名次徽章
    const rankCls =
      p.rank === 1 ? 'rank-1' :
      p.rank === 2 ? 'rank-2' :
      p.rank === 3 ? 'rank-3' : '';

    // 最高分任务
    const top = p.topTask;
    const topHtml = top
      ? `
        <div class="top-task">
          <div class="top-task-value">${escapeHtml(top.value)}</div>
          <div class="top-task-score">+${top.score}</div>
        </div>
      `
      : `<div class="top-task-empty">暂无任务</div>`;

    card.innerHTML = `
      <div class="player-rank ${rankCls}">#${p.rank}</div>
      <div class="player-name">${escapeHtml(p.id)}</div>
      ${topHtml}
      <div class="player-meta">
        ${p.count} 条任务
      </div>
    `;
    rootEl.appendChild(card);
  });
}

// ============================================================
// 转义 HTML
// ============================================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// 返回按钮
// ============================================================
backBtn?.addEventListener('click', () => {
  location.href = '/';
});

// ============================================================
// 启动
// ============================================================
loadSummary();