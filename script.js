/* ============================================================
   简约 · 个人空间 — 交互脚本
   ============================================================ */

// ---------- 状态管理 ----------
const STORAGE_KEY = "simple_space_user";

/**
 * 获取已保存的用户数据
 * @returns {{ name: string, tasks: Array } | null}
 */
function getUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 保存用户数据
 */
function saveUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

/**
 * 清除用户数据
 */
function clearUser() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 加载用户任务数据（异步，返回 json）
 * @returns {Promise<Object|null>} 成功返回 json，失败返回 null
 */
async function loadData() {
  const user = getUser();

  // 0. 没有登录信息，直接提示
  if (!user || !user.name) {
    showErrorToast("请先输入名字");
    const root = document.getElementById("tableRoot");
    if (root) root.innerHTML = '<div class="state">请先输入名字</div>';
    const countEl = document.getElementById("rowCount");
    if (countEl) countEl.textContent = "—";
    return null;
  }

  // 1. 显示 loading
  showLoading("获取数据中…");

  try {
    // 关键：从后端 API 读，而不是本地 JSON 文件
    const res = await fetch("/api/user?id=" + encodeURIComponent(user.name));
    const json = await res.json();

    if (!res.ok) {
      // 后端返回的错误 JSON 里通常有 error 字段
      throw new Error(json.error || `HTTP ${res.status}`);
    }

    // 2. 渲染 + 保存
    renderTable(json);
    user.tasks = json.data || [];
    saveUser(user);
    updateAllProgress();

    return json;
  } catch (err) {
    console.error("加载失败：", err);
    // 3. 弹窗提示错误
    showErrorToast(err.message || "加载失败，请重试");
    // 表格区显示占位
    const root = document.getElementById("tableRoot");
    if (root) root.innerHTML = '<div class="state">加载失败，请重试</div>';
    const countEl = document.getElementById("rowCount");
    if (countEl) countEl.textContent = "—";

    return null;
  } finally {
    // 4. 无论成功失败，关闭 loading
    hideLoading();
  }
}

// ---------- Loading 控制 ----------
function showLoading(text = "获取数据中…") {
  const mask = document.getElementById("loadingMask");
  if (!mask) return;
  const p = document.getElementById("loadingText");
  if (p) p.textContent = text;
  mask.classList.add("show");
}

function hideLoading() {
  const mask = document.getElementById("loadingMask");
  if (!mask) return;
  mask.classList.remove("show");
}

// ---------- 错误提示 Toast ----------
function showErrorToast(message = "加载失败，请重试") {
  const toast = document.getElementById("errorToast");
  if (!toast) {
    alert(message);
    return;
  }
  const msgEl = toast.querySelector(".toast-message");
  if (msgEl) msgEl.textContent = message;

  toast.classList.add("show");

  // 3 秒后自动隐藏
  clearTimeout(showErrorToast._timer);
  showErrorToast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ---------- 页面切换 ----------
const pages = {
  home: document.getElementById("homePage"),
  login: document.getElementById("loginPage"),
  create: document.getElementById("createPage"),
  profile: document.getElementById("profilePage"),
};

/**
 * 切换到指定页面
 * @param {'home' | 'login' | 'create' | 'profile'} pageName
 */
function showPage(pageName) {
  Object.values(pages).forEach((page) => {
    if (page) page.classList.remove("active");
  });

  const target = pages[pageName];
  if (target) {
    target.classList.add("active");
  }
}

// ---------- 首页 ----------
document.getElementById("loginBtn")?.addEventListener("click", () => {
  // 如果已有用户，直接进入个人页；否则去登录页
  const user = getUser();
  if (user) {
    renderProfile(user);
    showPage("profile");
  } else {
    // 清空登录输入，方便重新输入
    const loginNameInput = document.getElementById("loginName");
    if (loginNameInput) loginNameInput.value = "";
    showPage("login");
  }
});

document.getElementById("createBtn")?.addEventListener("click", () => {
  // 清空创建表单
  const createName = document.getElementById("createName");
  if (createName) createName.value = "";
  showPage("create");
});

// ---------- 登录页 ----------
document.getElementById("enterBtn")?.addEventListener("click", () => {
  const nameInput = document.getElementById("loginName");
  const name = nameInput?.value.trim();

  if (!name) {
    if (nameInput) {
      nameInput.focus();
      nameInput.style.borderColor = "#e74c3c";
      nameInput.style.boxShadow = "0 0 0 4px rgba(231, 76, 60, 0.1)";
      setTimeout(() => {
        nameInput.style.borderColor = "";
        nameInput.style.boxShadow = "";
      }, 1500);
    }
    return;
  }

  // 尝试保留已存在的任务信息
  const existing = getUser() || {};
  const user = {
    name,
    tasks: existing.tasks || [],
  };

  saveUser(user);
  renderProfile(user);
  showPage("profile");

  loadData();
});

document.getElementById("backFromLogin")?.addEventListener("click", () => {
  showPage("home");
});

// 登录输入框支持回车
document.getElementById("loginName")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("enterBtn")?.click();
  }
});

// ---------- 上传数据页 ----------
document.getElementById("createBtn")?.addEventListener("click", () => {
  location.href = "/upload.html";
});

document.getElementById("backFromCreate")?.addEventListener("click", () => {
  showPage("home");
});

// ---------- 个人页 ----------
/**
 * 渲染个人页数据
 * @param {{ name: string, tasks: Array }} user
 */
function renderProfile(user) {
  const nameDisplay = document.getElementById("userNameDisplay");
  if (nameDisplay) {
    nameDisplay.textContent = user.name || "旅行者";
  }
}

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  clearUser();
  showPage("home");
  console.log(user);
});

// ---------- 1. 列配置 ----------
const columns = [
  { key: "value", label: "内容", width: "120px" },
  { key: "score", label: "分值", width: "80px" },
];

// ---------- 2. 自定义渲染：状态标签 ----------
function renderStatus(value) {
  const map = {
    active: { text: "正常", cls: "status-active" },
    inactive: { text: "停用", cls: "status-inactive" },
    pending: { text: "待审核", cls: "status-pending" },
  };
  const info = map[value] || { text: value, cls: "" };
  return `<span class="status ${info.cls}">${info.text}</span>`;
}

// ---------- 3. 安全转义 HTML ----------
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------- 4. 核心：生成表格 HTML ----------
function buildTable(rows, cols) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return `<div class="state">暂无数据</div>`;
  }

  const thead = `
    <thead>
      <tr>
        ${cols.map((c) => `<th style="min-width:${c.width || "auto"}">${escapeHtml(c.label)}</th>`).join("")}
      </tr>
    </thead>
  `;

  const tbody = `
    <tbody>
      ${rows
        .map((row) => {
          const tds = cols
            .map((c) => {
              const raw = row[c.key];
              const content =
                typeof c.render === "function"
                  ? c.render(raw, row)
                  : escapeHtml(raw);
              return `<td>${content}</td>`;
            })
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("")}
    </tbody>
  `;

  return `<table>${thead}${tbody}</table>`;
}

// ---------- 5. 渲染入口 ----------
function renderTable(data) {
  const root = document.getElementById("tableRoot");
  const countEl = document.getElementById("rowCount");
  const rows = data?.data || [];

  root.innerHTML = buildTable(rows, columns);
  countEl.textContent = `共 ${rows.length} 条`;
}

// ---------- 7. 启动 ----------
// document.addEventListener('DOMContentLoaded', loadData);

// ---------- 初始化 ----------
function init() {
  const user = getUser();

  // 如果已登录，进入个人页；否则停留在首页
  if (user) {
    renderProfile(user);
    showPage("profile");
    loadData();
  } else {
    showPage("home");
  }
}

// DOM 加载完成后初始化
document.addEventListener("DOMContentLoaded", init);

/**
 * 用法一：根据数据动态设置某个分类的进度
 * @param {string} fillSelector - 进度填充元素的类名，如 '.fill-senior'
 * @param {string} fractionSelector - 对应的分数元素
 * @param {number} done - 已完成数
 * @param {number} total - 总数
 */
function updateProgress(fillSelector, done, total) {
  const percent = total > 0 ? (done / total) * 100 : 0;

  const fill = document.querySelector(fillSelector);
  if (fill) fill.style.width = `${percent.toFixed(1)}%`;

  // 更新分数显示
  const item = fill?.closest(".progress-item");
  if (item) {
    const doneEl = item.querySelector(".progress-fraction .done");
    const totalEl = item.querySelector(".progress-fraction .total");
    if (doneEl) doneEl.textContent = done;
    if (totalEl) totalEl.textContent = total;
  }
}

/**
 * 按分数区间统计数量
 * @param {Array} data - 原始数据数组
 * @param {number} begin - 区间起始
 * @param {number} end - 区间终点
 * @returns {number} 数量
 */
function countByRange(data, begin, end) {
  return data.filter((item) => item.score >= begin && item.score <= end).length;
}

function updateAllProgress() {
  const user = getUser();
  updateProgress(".fill-senior", countByRange(user.tasks, 21, 100), 619);
  updateProgress(".fill-medium", countByRange(user.tasks, 14, 20), 60);
  updateProgress(".fill-low", countByRange(user.tasks, 1, 13), 43);
}

// ---------- 跳转到汇总页 ----------
document.getElementById("summaryBtn")?.addEventListener("click", () => {
  location.href = "/summary.html";
});
