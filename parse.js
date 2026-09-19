const XLSX = window.XLSX;

// 全局缓存，第一次调用时 fetch，后续直接用
let NAME_MAP  = null;
let ALL_TASK  = null;
let TRANSLATE = null;

async function loadData() {
  if (NAME_MAP && ALL_TASK && TRANSLATE) return;   // 已加载
  const [nm, at, tr] = await Promise.all([
    fetch('./data/name_map.json').then(r => r.json()),
    fetch('./data/all_task.json').then(r => r.json()),
    fetch('./data/translate.json').then(r => r.json()),
  ]);
  NAME_MAP  = nm;
  ALL_TASK  = at;
  TRANSLATE = tr;
}

// ============================================================
// 工具函数
// ============================================================

function dealPifu(n) {
  if (n >= 5) return 5;
  if (n >= 3) return 3;
  if (n >= 1) return 1;
  return 0;
}

function dealLevel(n) {
  if (n >= 750) return 750;
  if (n >= 700) return 700;
  if (n >= 600) return 600;
  if (n >= 500) return 500;
  if (n >= 400) return 400;
  return 0;
}

// ============================================================
// Sheet 解析器
// ============================================================

/**
 * 解析「普通 sheet」：人才等级 / 人才觉醒 / 艺人 / 守护神
 * 结构：A=分类(忽略) B=人名 C~=各玩家数据
 * @param {Array<Array>} rows  - sheet_to_json 得到的二维数组
 * @param {string}       type  - rencai / rencalevel / yiren / shouhushen
 */
function parsePlainSheet(rows, type) {
  const dict = (type === 'rencalevel') ? NAME_MAP.rencai : NAME_MAP[type];

  // 找表头行：前 5 行里，第一个 C 列有值的行
  let headerIdx = -1;
  let numberList = null;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i];
    if (row && row[2] !== undefined && String(row[2]).trim() !== '') {
      headerIdx = i;
      numberList = row.slice(2)
        .map(s => String(s ?? '').trim())
        .filter(Boolean);
      break;
    }
  }
  if (!numberList) {
    console.warn(`[${type}] 找不到表头行`);
    return {};
  }

  const result = {};
  numberList.forEach(n => result[n] = []);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const name = String(row[1] ?? '').trim();
    if (!name || !(name in dict)) continue;
    const py = dict[name];

    for (let j = 2; j < row.length; j++) {
      const val = String(row[j] ?? '').trim();
      if (!val) continue;
      const num = numberList[j - 2];
      if (!num) continue;

      if (type === 'rencai') {
        // 人才觉醒：1/2/3
        if (val === '1' || val === '2' || val === '3') {
          result[num].push(`rencai_${py}_${val}`);
        }
      } else if (type === 'yiren' || type === 'shouhushen') {
        // 有填 1
        if (val === '1') {
          result[num].push(`${type}_${py}`);
        }
      } else if (type === 'rencalevel') {
        // 人才等级：400/500/600/700/750
        const lv = dealLevel(parseInt(val, 10) || 0);
        if (lv !== 0) {
          result[num].push(`rencai_${py}_${lv}`);
        }
      }
    }
  }
  return result;
}

/**
 * 解析「皮肤 sheet」：人才皮肤 / 艺人皮肤
 * 结构：A=分类(忽略) B=人名(忽略) C=皮肤名 D~=各玩家数据
 * @param {Array<Array>} rows  - 二维数组
 * @param {string}       type  - rencaipifu / yirenpifu
 */
function parseSkinSheet(rows, type) {
  const dict   = NAME_MAP[type];                      // 皮肤名 → 拼音
  const prefix = (type === 'rencaipifu') ? 'rencai' : 'yiren';

  // 找表头行：前 5 行里，第一个 D 列有值的行
  let headerIdx = -1;
  let numberList = null;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i];
    if (row && row[3] !== undefined && String(row[3]).trim() !== '') {
      headerIdx = i;
      numberList = row.slice(3)
        .map(s => String(s ?? '').trim())
        .filter(Boolean);
      break;
    }
  }
  if (!numberList) {
    console.warn(`[${type}] 找不到表头行`);
    return {};
  }

  const result = {};
  numberList.forEach(n => result[n] = []);

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;

    const skinName = String(row[2] ?? '').trim();
    if (!skinName || !(skinName in dict)) continue;
    const py = dict[skinName];

    for (let j = 3; j < row.length; j++) {
      const val = String(row[j] ?? '').trim();
      if (!val) continue;
      const num = numberList[j - 3];
      if (!num) continue;

      const lv = dealPifu(parseInt(val, 10) || 0);
      if (lv !== 0) {
        result[num].push(`${prefix}_${py}_${String(lv).padStart(2, '0')}`);
      }
    }
  }
  return result;
}

// ============================================================
// 主函数：解析整个 Excel
// ============================================================

export async function parseExcel(arrayBuffer) {
  await loadData();   // ← 先加载 JSON

  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  console.log('Sheet 列表：', wb.SheetNames);

  const sheetConfig = {
    '人才等级': ['rencalevel',  parsePlainSheet],
    '人才觉醒': ['rencai',      parsePlainSheet],
    '艺人':     ['yiren',       parsePlainSheet],
    '守护神':   ['shouhushen',  parsePlainSheet],
    '人才皮肤': ['rencaipifu',  parseSkinSheet],
    '艺人皮肤': ['yirenpifu',   parseSkinSheet],
  };

  // ---------- 1. 解析每个 sheet，合并到 numbers_data ----------
  const numbers_data = {};
  for (const [sheetName, [type, parser]] of Object.entries(sheetConfig)) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      console.warn(`找不到 sheet: ${sheetName}`);
      continue;
    }
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const partial = parser(rows, type);
    console.log(`[${sheetName}] 解析出 ${Object.keys(partial).length} 个玩家`);

    for (const [num, arr] of Object.entries(partial)) {
      if (!numbers_data[num]) numbers_data[num] = [];
      numbers_data[num].push(...arr);
    }
  }

  // ---------- 2. 去重（同一条代码可能在多个 sheet 里出现） ----------
  for (const num of Object.keys(numbers_data)) {
    numbers_data[num] = [...new Set(numbers_data[num])];
  }

  // ---------- 3. 生成 users_data 和 summary_data ----------
  const users_data   = {};
  const summary_data = [];

  for (const [num, codes] of Object.entries(numbers_data)) {
    const details = [];
    let totalScore = 0;

    for (const code of codes) {
      const value = TRANSLATE[code];
      const scoreStr = ALL_TASK[code];

      if (value !== undefined && scoreStr !== undefined && scoreStr !== '') {
        const score = parseInt(scoreStr, 10);
        if (!isNaN(score)) {
          details.push({ code, value, score });
          totalScore += score;
        }
      }
    }

    details.sort((a, b) => b.score - a.score);

    users_data[num] = {
      code: 0,
      message: 'success',
      data: details,
      totalScore,
    };

    summary_data.push({
      id: num,
      totalScore,
      count: details.length,
    });
  }

  // ---------- 4. 排名 ----------
  summary_data.sort((a, b) => b.totalScore - a.totalScore);
  summary_data.forEach((s, i) => { s.rank = i + 1; });

  return { numbers_data, users_data, summary_data };
}