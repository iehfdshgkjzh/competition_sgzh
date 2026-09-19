import { parseExcel } from './parse.js';

// ============================================================
// DOM 引用
// ============================================================
const fileInput  = document.getElementById('upload-file');
const fileNameEl = document.getElementById('upload-file-name');
const fileBoxEl  = document.querySelector('.file-input-box');
const uploadBtn  = document.getElementById('uploadSubmitBtn');
const backBtn    = document.getElementById('backFromCreate');

// ============================================================
// 文件选择变化时，更新显示的文件名
// ============================================================
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) {
    fileNameEl.textContent = file.name;
    fileBoxEl.classList.add('has-file');
  } else {
    fileNameEl.textContent = '点击选择 .xlsx 文件';
    fileBoxEl.classList.remove('has-file');
  }
});

// ============================================================
// 工具：简化的提示（你页面里没有 log 元素，先用 alert）
// ============================================================
function showMsg(text) {
  alert(text);
}

// ============================================================
// 主流程：解析 + 上传
// ============================================================
async function doUpload() {
  const file = fileInput.files[0];
  if (!file) {
    showMsg('请先选择一个 Excel 文件');
    return;
  }

  uploadBtn.disabled = true;
  const originalText = uploadBtn.innerHTML;

  try {
    // 1/3 读取
    uploadBtn.innerHTML = '<span>读取中...</span>';
    const buf = await file.arrayBuffer();

    // 2/3 解析
    uploadBtn.innerHTML = '<span>解析中...</span>';
    const result = await parseExcel(buf);
    console.log('解析结果:', result);

    // 3/3 上传
    uploadBtn.innerHTML = '<span>上传中...</span>';
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || '上传失败');

    showMsg(
      `✅ 上传成功\n玩家数：${json.playerCount}\n更新时间：${new Date(json.updatedAt).toLocaleString('zh-CN')}`
    );

    // 可选：上传成功后清空文件选择
    // fileInput.value = '';
    // fileNameEl.textContent = '点击选择 .xlsx 文件';
    // fileBoxEl.classList.remove('has-file');
  } catch (e) {
    showMsg('❌ 出错：' + e.message);
    console.error(e);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = originalText;
  }
}

// ============================================================
// 绑定按钮事件
// ============================================================
uploadBtn.addEventListener('click', doUpload);

// 「返回」按钮
backBtn.addEventListener('click', () => {
  // TODO: 改成你的目标路径
  location.href = '/index.html';
});

// 方便调试
window.doUpload = doUpload;