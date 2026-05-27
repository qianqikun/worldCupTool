/**
 * 2026世界杯赛程表与赔率指数系统 - 核心逻辑控制
 * 所有赛程数据均来自 The Odds API，不编造任何赛程或赔率。
 */

// ==========================================================================
// 1. 全局状态变量
// ==========================================================================
let matches = [];           // 当前的比赛列表（仅来自 API）
let activeFilters = {
  stage: 'all',
  group: 'all',
  date: 'all',
  search: '',
  fluctuationOnly: false
};
let sortBy = 'time-asc';
let selectedMatch = null;
let chartInstance = null;
let currentChartType = 'euro';
let apiKey = '';
let isApiMode = false;

// ==========================================================================
// 2. 球队名映射表（The Odds API 返回英文名 → 本地 TEAMS.id）
// ==========================================================================
const TEAM_NAME_MAPPING = {
  // 2026 年世界杯 48 支球队官方英文名
  'Mexico': 'MEX', 'South Africa': 'RSA', 'South Korea': 'KOR', 'Korea Republic': 'KOR', 'Czechia': 'CZE', 'Czech Republic': 'CZE',
  'Canada': 'CAN', 'Bosnia and Herzegovina': 'BIH', 'Bosnia & Herzegovina': 'BIH', 'Bosnia-Herzegovina': 'BIH', 'Bosnia': 'BIH', 'Qatar': 'QAT', 'Switzerland': 'SUI',
  'Brazil': 'BRA', 'Morocco': 'MAR', 'Haiti': 'HAI', 'Scotland': 'SCO',
  'USA': 'USA', 'United States': 'USA', 'Paraguay': 'PAR', 'Australia': 'AUS', 'Turkey': 'TUR', 'Türkiye': 'TUR',
  'Germany': 'GER', 'Curaçao': 'CUR', 'Curacao': 'CUR', "Côte d'Ivoire": 'CIV', 'Ivory Coast': 'CIV', 'Ecuador': 'ECU',
  'Netherlands': 'NED', 'Japan': 'JPN', 'Sweden': 'SWE', 'Tunisia': 'TUN',
  'Belgium': 'BEL', 'Egypt': 'EGY', 'Iran': 'IRN', 'IR Iran': 'IRN', 'New Zealand': 'NZL',
  'Spain': 'ESP', 'Cabo Verde': 'CPV', 'Cape Verde': 'CPV', 'Saudi Arabia': 'KSA', 'Uruguay': 'URU',
  'France': 'FRA', 'Senegal': 'SEN', 'Iraq': 'IRQ', 'Norway': 'NOR',
  'Argentina': 'ARG', 'Algeria': 'ALG', 'Austria': 'AUT', 'Jordan': 'JOR',
  'Portugal': 'POR', 'Congo DR': 'COD', 'DR Congo': 'COD', 'Uzbekistan': 'UZB', 'Colombia': 'COL',
  'England': 'ENG', 'Croatia': 'CRO', 'Ghana': 'GHA', 'Panama': 'PAN',
  // 常见别名
  'Korea': 'KOR', 'Neth': 'NED', 'Switz': 'SUI',
};

// ==========================================================================
// 3. 辅助工具函数
// ==========================================================================

/** 根据国家代码近似生成旗帜 Emoji（ISO 3166-1 alpha-2 前两位） */
function generateFlagFromId(teamId) {
  if (!teamId) return '🏳️';
  const code = teamId.slice(0, 2).toUpperCase();
  const OFFSET = 0x1F1E6 - 65;
  const first = code.charCodeAt(0) + OFFSET;
  const second = code.charCodeAt(1) + OFFSET;
  if (first < 0x1F1E6 || second < 0x1F1E6) return '🏳️';
  return String.fromCodePoint(first) + String.fromCodePoint(second);
}

/**
 * 将 UTC ISO 时间字符串转换为北京时间（UTC+8）的 Date 对象
 * 无论用户系统时区是什么，始终显示北京时间
 */
function toCSTDate(isoString) {
  const utcMs = new Date(isoString).getTime();
  const cstMs = utcMs + 8 * 60 * 60 * 1000; // +8h
  return new Date(cstMs);
}

/** 获取北京时间的日期字符串 YYYY-MM-DD（用于日期轴和日期筛选对比） */
function getCSTDateStr(isoString) {
  const d = toCSTDate(isoString);
  // 使用 UTC 方法读取（因为已经手动偏移过了）
  const y   = d.getUTCFullYear();
  const mon = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mon}-${day}`;
}

/** 根据英文球队名查找或构建球队对象 */
function resolveTeam(engName) {
  const id = TEAM_NAME_MAPPING[engName];
  // 从 TEAMS 数组精确匹配
  if (id) {
    const found = TEAMS.find(t => t.id === id);
    if (found) return found;
  }
  // 兜底：用英文名 + 尝试生成旗帜
  const fallbackId = id || engName.substring(0, 3).toUpperCase();
  return {
    id: fallbackId,
    name: engName,
    flag: generateFlagFromId(fallbackId),
    group: null,
    rank: null,
    continent: '未知'
  };
}

/** 格式化让球盘口数字 */
function formatHandicapLine(line) {
  if (line === 0) return '平手';
  if (line > 0) return `客让 ${Math.abs(line).toFixed(2).replace('.00', '')}`;
  return `主让 ${Math.abs(line).toFixed(2).replace('.00', '')}`;
}

/** 赔率升降趋势图标 */
function getTrendArrow(initVal, instantVal) {
  if (instantVal > initVal) return ' <span class="arrow-up">↑</span>';
  if (instantVal < initVal) return ' <span class="arrow-down">↓</span>';
  return '';
}

/** 根据比赛时间推断淘汰赛阶段 */
function getStageByTime(dateObj) {
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  if (month === 6) {
    if (day <= 27) return '小组赛';
    return '32强赛';
  } else if (month === 7) {
    if (day <= 3)  return '32强赛';
    if (day <= 7)  return '16强赛';
    if (day <= 11) return '1/4决赛';
    if (day <= 15) return '半决赛';
    if (day <= 18) return '三四名决赛';
    return '决赛';
  }
  return '小组赛';
}

/** 判断是否有赔率异常波动 */
function checkFluctuation(match) {
  if (!match || !match.odds) return false;
  let euroDiff = 0;
  if (match.odds.euro && match.odds.euro.initial && match.odds.euro.instant) {
    const initHome = match.odds.euro.initial.home;
    const instHome = match.odds.euro.instant.home;
    if (initHome) euroDiff = Math.abs(instHome - initHome) / initHome;
  }
  let asianDiff = 0;
  if (match.odds.asian && match.odds.asian.initial && match.odds.asian.instant) {
    const initWater = match.odds.asian.initial.home;
    const instWater = match.odds.asian.instant.home;
    if (initWater !== undefined && instWater !== undefined) {
      asianDiff = Math.abs(instWater - initWater);
    }
  }
  return euroDiff >= 0.08 || asianDiff >= 0.15;
}

// ==========================================================================
// 4. 初始化与主入口
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  startCountdown();
  bindEvents();
  loadApiKey();   // 有 Key → 自动拉取；无 Key → 显示提示

  // 监听模态框显示状态，锁定/解锁 body 滚动
  const modalObserver = new MutationObserver(() => {
    const apiModal = document.getElementById('apiModal');
    const detailModal = document.getElementById('detailModal');
    const apiVisible = apiModal && apiModal.style.display === 'flex';
    const detailVisible = detailModal && detailModal.style.display === 'flex';
    if (apiVisible || detailVisible) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  });

  const apiModal = document.getElementById('apiModal');
  const detailModal = document.getElementById('detailModal');
  if (apiModal) modalObserver.observe(apiModal, { attributes: true, attributeFilter: ['style'] });
  if (detailModal) modalObserver.observe(detailModal, { attributes: true, attributeFilter: ['style'] });
});

// ==========================================================================
// 5. 倒计时器
// ==========================================================================
function startCountdown() {
  const kickOffTime = new Date('2026-06-11T13:00:00+08:00').getTime();
  function update() {
    const now = new Date().getTime();
    const distance = kickOffTime - now;
    const panelEl = document.getElementById('countdownPanel');
    if (distance < 0) {
      if (panelEl) panelEl.innerHTML = '<span class="countdown-label">STATUS</span><div class="countdown-timer"><div class="time-block" style="color: var(--color-gold); font-weight: bold; font-size: 16px;">⚽ 2026世界杯已盛大开幕！</div></div>';
      return;
    }
    const days    = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    const el = (id) => document.getElementById(id);
    if (el('days'))    el('days').innerText    = String(days).padStart(2, '0');
    if (el('hours'))   el('hours').innerText   = String(hours).padStart(2, '0');
    if (el('minutes')) el('minutes').innerText = String(minutes).padStart(2, '0');
    if (el('seconds')) el('seconds').innerText = String(seconds).padStart(2, '0');
  }
  update();
  setInterval(update, 1000);
}

// ==========================================================================
// 6. 日期轴（根据 API 数据动态生成）
// ==========================================================================
function renderDateSlider() {
  const dateSlider = document.getElementById('dateSlider');
  if (!dateSlider) return;

  // 仅保留"全部"按钮，清除其他
  const allBtn = dateSlider.querySelector('.btn-date[data-date="all"]');
  dateSlider.innerHTML = '';
  if (allBtn) {
    dateSlider.appendChild(allBtn);
  } else {
    dateSlider.innerHTML = '<button class="btn btn-date active" data-date="all"><span>全部</span><label>ALL</label></button>';
  }

  // 用北京时间日期字符串去重，避免 UTC 与北京时间跨日问题
  const dates = [...new Set(matches.map(m => getCSTDateStr(m.time)))].sort();
  dates.forEach(dStr => {
    // dStr 格式为 YYYY-MM-DD，直接解析为北京时间
    const [, monStr, dayStr] = dStr.split('-');
    const month = parseInt(monStr, 10);
    const date  = parseInt(dayStr, 10);
    // 计算星期：以北京时间 00:00 构建对应 UTC 偏移后的 Date
    const dateForWeek = new Date(`${dStr}T00:00:00+08:00`);
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayOfWeek = dayNames[dateForWeek.getDay()];

    let specialLabel = `${month}.${date}`;
    if (month === 6 && date === 11) specialLabel = '6.11 揭幕';
    if (month === 7 && date === 19) specialLabel = '7.19 决赛';

    const btn = document.createElement('button');
    btn.className = 'btn btn-date';
    btn.dataset.date = dStr;  // 存储北京时间日期字符串
    btn.innerHTML = `<span>${specialLabel}</span><label>${dayOfWeek}</label>`;
    dateSlider.appendChild(btn);
  });
}

// ==========================================================================
// 7. 事件绑定
// ==========================================================================
function bindEvents() {
  // 赛事阶段筛选
  const stageFilters = document.getElementById('stageFilters');
  if (stageFilters) {
    stageFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-filter');
      if (!btn) return;
      document.querySelectorAll('.btn-filter').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      activeFilters.stage = btn.dataset.stage;
      const groupWrapper = document.getElementById('groupFilterWrapper');
      if (groupWrapper) groupWrapper.style.display = activeFilters.stage === '小组赛' ? 'flex' : 'none';
      if (activeFilters.stage !== '小组赛') {
        activeFilters.group = 'all';
        document.querySelectorAll('.group-buttons .btn-circle').forEach(el => el.classList.remove('active'));
        const allCircle = document.querySelector('.group-buttons .btn-circle[data-group="all"]');
        if (allCircle) allCircle.classList.add('active');
      }
      filterAndRenderMatches();
    });
  }

  // 小组筛选
  const groupFilters = document.getElementById('groupFilters');
  if (groupFilters) {
    groupFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-circle');
      if (!btn) return;
      document.querySelectorAll('.group-buttons .btn-circle').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      activeFilters.group = btn.dataset.group;
      filterAndRenderMatches();
    });
  }

  // 搜索框
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      activeFilters.search = e.target.value.trim().toLowerCase();
      filterAndRenderMatches();
    });
  }

  // 排序
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      filterAndRenderMatches();
    });
  }

  // 异常波动 Toggle
  const fluctuationToggle = document.getElementById('fluctuationToggle');
  if (fluctuationToggle) {
    fluctuationToggle.addEventListener('change', (e) => {
      activeFilters.fluctuationOnly = e.target.checked;
      filterAndRenderMatches();
    });
  }

  // 日期轴
  const dateSlider = document.getElementById('dateSlider');
  const btnScrollLeft  = document.getElementById('dateScrollLeft');
  const btnScrollRight = document.getElementById('dateScrollRight');
  if (dateSlider && btnScrollLeft && btnScrollRight) {
    btnScrollLeft.addEventListener('click',  () => dateSlider.scrollBy({ left: -200, behavior: 'smooth' }));
    btnScrollRight.addEventListener('click', () => dateSlider.scrollBy({ left:  200, behavior: 'smooth' }));
    dateSlider.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-date');
      if (!btn) return;
      document.querySelectorAll('.btn-date').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      activeFilters.date = btn.dataset.date;
      filterAndRenderMatches();
    });
  }

  // 重置筛选
  const btnReset = document.getElementById('btnResetFilters');
  if (btnReset) btnReset.addEventListener('click', resetAllFilters);

  // API 配置模态框
  const btnOpenApi  = document.getElementById('btnOpenApiConfig');
  const apiModal    = document.getElementById('apiModal');
  const btnCloseApi = document.getElementById('btnCloseApiModal');
  if (btnOpenApi && apiModal && btnCloseApi) {
    btnOpenApi.addEventListener('click', () => {
      const keyInput = document.getElementById('apiKeyInput');
      if (keyInput) keyInput.value = apiKey;
      const testResult = document.getElementById('apiTestResult');
      if (testResult) testResult.style.display = 'none';
      apiModal.style.display = 'flex';
    });
    btnCloseApi.addEventListener('click', () => {
      apiModal.style.display = 'none';
    });
    // 点击遮罩关闭
    apiModal.addEventListener('click', (e) => {
      if (e.target === apiModal) apiModal.style.display = 'none';
    });
  }

  // 保存 API Key
  const btnSaveApi = document.getElementById('btnSaveApiKey');
  if (btnSaveApi) {
    btnSaveApi.addEventListener('click', () => {
      const keyInput = document.getElementById('apiKeyInput');
      if (!keyInput) return;
      const key = keyInput.value.trim();
      saveApiKey(key);
      if (apiModal) apiModal.style.display = 'none';
      if (key) {
        fetchRealOddsData();
      } else {
        matches = [];
        isApiMode = false;
        updateApiStatusUI();
        renderDateSlider();
        filterAndRenderMatches();
      }
    });
  }

  // 清除 API Key
  const btnClearApi = document.getElementById('btnClearApiKey');
  if (btnClearApi) {
    btnClearApi.addEventListener('click', () => {
      saveApiKey('');
      const keyInput = document.getElementById('apiKeyInput');
      if (keyInput) keyInput.value = '';
      matches = [];
      isApiMode = false;
      updateApiStatusUI();
      renderDateSlider();
      filterAndRenderMatches();
      if (apiModal) apiModal.style.display = 'none';
    });
  }

  // 测试 API Key
  const btnTestApi = document.getElementById('btnTestApiKey');
  if (btnTestApi) btnTestApi.addEventListener('click', testApiKey);

  // 赛事详情模态框
  const detailModal    = document.getElementById('detailModal');
  const btnCloseDetail = document.getElementById('btnCloseDetailModal');
  if (btnCloseDetail && detailModal) {
    btnCloseDetail.addEventListener('click', () => { detailModal.style.display = 'none'; });
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) detailModal.style.display = 'none';
    });
  }

  // 详情 Tab 切换
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      const targetTabId = btn.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      const targetContent = document.getElementById(targetTabId);
      if (targetContent) targetContent.classList.add('active');
      if (targetTabId === 'tab-trend-chart') renderTrendChart();
    });
  });

  // 图表类型切换
  const btnShowEuroChart  = document.getElementById('btnShowEuroChart');
  const btnShowAsianChart = document.getElementById('btnShowAsianChart');
  if (btnShowEuroChart && btnShowAsianChart) {
    btnShowEuroChart.addEventListener('click', () => {
      btnShowEuroChart.classList.add('active');
      btnShowAsianChart.classList.remove('active');
      currentChartType = 'euro';
      renderTrendChart();
    });
    btnShowAsianChart.addEventListener('click', () => {
      btnShowAsianChart.classList.add('active');
      btnShowEuroChart.classList.remove('active');
      currentChartType = 'asian';
      renderTrendChart();
    });
  }
}

// ==========================================================================
// 8. 筛选与渲染核心逻辑
// ==========================================================================
function filterAndRenderMatches() {
  let filtered = matches.filter(m => {
    if (activeFilters.stage !== 'all') {
      if (activeFilters.stage === '决赛') {
        if (m.stage !== '决赛' && m.stage !== '三四名决赛') return false;
      } else {
        if (m.stage !== activeFilters.stage) return false;
      }
    }
    if (activeFilters.group !== 'all' && m.group !== activeFilters.group) return false;
    if (activeFilters.date !== 'all') {
      // 用北京时间日期对比，与日期轴保持一致
      if (getCSTDateStr(m.time) !== activeFilters.date) return false;
    }
    if (activeFilters.search) {
      const q = activeFilters.search;
      const homeName = (m.home.name || '').toLowerCase();
      const awayName = (m.away.name || '').toLowerCase();
      const homeId   = (m.home.id   || '').toLowerCase();
      const awayId   = (m.away.id   || '').toLowerCase();
      if (!homeName.includes(q) && !awayName.includes(q) && !homeId.includes(q) && !awayId.includes(q)) return false;
    }
    if (activeFilters.fluctuationOnly && !checkFluctuation(m)) return false;
    return true;
  });

  if (sortBy === 'time-asc')  filtered.sort((a, b) => new Date(a.time) - new Date(b.time));
  if (sortBy === 'time-desc') filtered.sort((a, b) => new Date(b.time) - new Date(a.time));
  if (sortBy === 'rank-diff') {
    filtered.sort((a, b) => {
      const diffA = Math.abs((a.home.rank || 0) - (a.away.rank || 0));
      const diffB = Math.abs((b.home.rank || 0) - (b.away.rank || 0));
      return diffB - diffA;
    });
  }

  const countEl = document.getElementById('resultsCount');
  if (countEl) countEl.innerText = `找到符合条件的比赛 ${filtered.length} 场`;

  renderMatchGrid(filtered);
}

function resetAllFilters() {
  activeFilters = { stage: 'all', group: 'all', date: 'all', search: '', fluctuationOnly: false };
  sortBy = 'time-asc';
  document.querySelectorAll('.btn-filter').forEach(el => el.classList.remove('active'));
  const allFilter = document.querySelector('.btn-filter[data-stage="all"]');
  if (allFilter) allFilter.classList.add('active');
  document.querySelectorAll('.group-buttons .btn-circle').forEach(el => el.classList.remove('active'));
  const allCircle = document.querySelector('.group-buttons .btn-circle[data-group="all"]');
  if (allCircle) allCircle.classList.add('active');
  const groupWrapper = document.getElementById('groupFilterWrapper');
  if (groupWrapper) groupWrapper.style.display = 'none';
  document.querySelectorAll('.btn-date').forEach(el => el.classList.remove('active'));
  const allDate = document.querySelector('.btn-date[data-date="all"]');
  if (allDate) allDate.classList.add('active');
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  const flucToggle = document.getElementById('fluctuationToggle');
  if (flucToggle) flucToggle.checked = false;
  const sortSel = document.getElementById('sortSelect');
  if (sortSel) sortSel.value = 'time-asc';
  filterAndRenderMatches();
}

// ==========================================================================
// 9. 渲染比赛卡片网格
// ==========================================================================
function renderMatchGrid(filteredMatches) {
  const matchGrid  = document.getElementById('matchGrid');
  const emptyState = document.getElementById('emptyState');
  if (!matchGrid || !emptyState) return;

  matchGrid.innerHTML = '';

  // 无 API Key 状态
  if (!apiKey) {
    matchGrid.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.innerHTML = `
      <i data-lucide="key-round" class="empty-icon"></i>
      <h3>请先配置 The Odds API Key</h3>
      <p>本系统所有赛程与赔率数据均来自 The Odds API 实时接口。<br>请点击右上角"API 配置"按钮输入您的 API Key。</p>
      <button class="btn btn-primary" id="btnEmptyOpenApi" style="margin-top:16px;">
        <i data-lucide="key-round"></i>&nbsp; 立即配置 API Key
      </button>
    `;
    lucide.createIcons();
    const btn = document.getElementById('btnEmptyOpenApi');
    if (btn) btn.addEventListener('click', () => {
      const apiModal = document.getElementById('apiModal');
      if (apiModal) apiModal.style.display = 'flex';
    });
    return;
  }

  // API 数据为空
  if (filteredMatches.length === 0) {
    matchGrid.style.display = 'none';
    emptyState.style.display = 'block';
    // 恢复默认 emptyState 内容（如果被上面替换过）
    emptyState.innerHTML = `
      <i data-lucide="frown" class="empty-icon"></i>
      <h3>${matches.length === 0 ? 'The Odds API 当前暂无世界杯赛事数据' : '未找到符合筛选条件的比赛'}</h3>
      <p>${matches.length === 0 ? '可能尚未到赛事开盘期，或 API Key 无效。请稍后重试或检查 API 配置。' : '请尝试重置过滤器或输入其他搜索词'}</p>
      <button class="btn btn-glass" id="btnResetFilters">重置过滤器</button>
    `;
    lucide.createIcons();
    const btnReset = document.getElementById('btnResetFilters');
    if (btnReset) btnReset.addEventListener('click', resetAllFilters);
    return;
  }

  matchGrid.style.display = 'grid';
  emptyState.style.display = 'none';

  filteredMatches.forEach(m => {
    const card = document.createElement('div');
    const isAlert = checkFluctuation(m);
    card.className = `match-card ${isAlert ? 'wave-alert' : ''}`;

    // 统一转换为北京时间（UTC+8）显示
    const cstDate = toCSTDate(m.time);
    const mStr    = cstDate.getUTCMonth() + 1;
    const dStr    = cstDate.getUTCDate();
    const hStr    = String(cstDate.getUTCHours()).padStart(2, '0');
    const minStr  = String(cstDate.getUTCMinutes()).padStart(2, '0');
    const formattedTime = `${mStr}月${dStr}日 ${hStr}:${minStr} (北京时间)`;

    // 欧指摘要
    let euroHtml = '';
    if (m.odds && m.odds.euro && m.odds.euro.instant) {
      const eo = m.odds.euro;
      const arrH = getTrendArrow(eo.initial ? eo.initial.home : eo.instant.home, eo.instant.home);
      const arrD = getTrendArrow(eo.initial ? eo.initial.draw : eo.instant.draw, eo.instant.draw);
      const arrA = getTrendArrow(eo.initial ? eo.initial.away : eo.instant.away, eo.instant.away);
      euroHtml = `
        <span class="odds-pill">${eo.instant.home.toFixed(2)}${arrH}</span>
        <span class="odds-pill">${eo.instant.draw.toFixed(2)}${arrD}</span>
        <span class="odds-pill">${eo.instant.away.toFixed(2)}${arrA}</span>`;
    } else {
      euroHtml = '<span class="odds-pill">--</span><span class="odds-pill">--</span><span class="odds-pill">--</span>';
    }

    // 亚盘摘要
    let asianHtml = '';
    if (m.odds && m.odds.asian && m.odds.asian.instant) {
      const ao = m.odds.asian;
      const lineText = formatHandicapLine(ao.instant.line);
      asianHtml = `
        <span class="odds-pill" style="color: var(--color-gold); font-weight: bold;">${lineText}</span>
        <span class="odds-pill">主水: ${ao.instant.home.toFixed(2)}</span>
        <span class="odds-pill">客水: ${ao.instant.away.toFixed(2)}</span>`;
    } else {
      asianHtml = '<span class="odds-pill" style="color: var(--text-muted);">暂无让球数据</span>';
    }

    const rankHome = m.home.rank ? `FIFA ${m.home.rank}` : '--';
    const rankAway = m.away.rank ? `FIFA ${m.away.rank}` : '--';
    const groupLabel = m.group && m.group !== '淘汰赛' ? `· ${m.group}` : '';

    card.innerHTML = `
      <div class="card-header">
        <span class="stage-badge">${m.stage} ${groupLabel}</span>
        <span class="venue-badge" title="${m.stadium}"><i data-lucide="map-pin"></i> ${m.city}</span>
      </div>
      <div class="card-matchup">
        <div class="card-team">
          <span class="flag">${m.home.flag || '🏳️'}</span>
          <span class="team-name" title="${m.home.name}">${m.home.name}</span>
          <span class="team-rank">${rankHome}</span>
        </div>
        <div class="match-center">
          <span class="match-vs">VS</span>
          <span class="match-time">${formattedTime}</span>
        </div>
        <div class="card-team">
          <span class="flag">${m.away.flag || '🏳️'}</span>
          <span class="team-name" title="${m.away.name}">${m.away.name}</span>
          <span class="team-rank">${rankAway}</span>
        </div>
      </div>
      <div class="card-odds-summary">
        <div class="odds-row">
          <span class="odds-label"><i data-lucide="bar-chart-3"></i> 即时欧指</span>
          <div class="odds-values">${euroHtml}</div>
        </div>
        <div class="odds-row">
          <span class="odds-label"><i data-lucide="scale"></i> 即时让球</span>
          <div class="odds-values">${asianHtml}</div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openDetailModal(m));
    matchGrid.appendChild(card);
  });

  lucide.createIcons();
}

// ==========================================================================
// 10. 详情模态框
// ==========================================================================
function openDetailModal(match) {
  selectedMatch = match;
  const modal = document.getElementById('detailModal');
  if (!modal) return;

  document.getElementById('modalStageTag').innerText =
    `${match.stage}${match.group && match.group !== '淘汰赛' ? ' · ' + match.group : ''}`;
  document.getElementById('modalStadiumInfo').innerHTML =
    `<i data-lucide="map-pin"></i> ${match.city} - ${match.stadium}`;

  document.getElementById('modalHomeFlag').innerText = match.home.flag || '🏳️';
  document.getElementById('modalHomeName').innerText = match.home.name;
  document.getElementById('modalHomeRank').innerText = match.home.rank ? `FIFA ${match.home.rank}` : '--';
  document.getElementById('modalAwayFlag').innerText = match.away.flag || '🏳️';
  document.getElementById('modalAwayName').innerText = match.away.name;
  document.getElementById('modalAwayRank').innerText = match.away.rank ? `FIFA ${match.away.rank}` : '--';

  // 统一转换为北京时间显示
  const cstDate = toCSTDate(match.time);
  document.getElementById('modalMatchTime').innerText =
    `${cstDate.getUTCMonth() + 1}月${cstDate.getUTCDate()}日 ${String(cstDate.getUTCHours()).padStart(2,'0')}:${String(cstDate.getUTCMinutes()).padStart(2,'0')} (北京时间)`;

  const statusMap = { scheduled: '未开始', live: '进行中', finished: '已结束' };
  document.getElementById('modalMatchStatus').innerText = statusMap[match.status] || '未开始';

  // 重置 Tab
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const firstTab = document.querySelector('.tab-btn[data-tab="odds-data"]');
  if (firstTab) firstTab.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  const firstContent = document.getElementById('tab-odds-data');
  if (firstContent) firstContent.classList.add('active');

  loadOddsComparisonTables(match);

  modal.style.display = 'flex';
  const modalBody = modal.querySelector('.modal-body');
  if (modalBody) modalBody.scrollTop = 0;
  lucide.createIcons();
}

function loadOddsComparisonTables(match) {
  const euroBody  = document.getElementById('euroOddsTableBody');
  const asianBody = document.getElementById('asianOddsTableBody');
  const ouBody    = document.getElementById('ouOddsTableBody');

  const noDataRow = (msg) =>
    `<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:30px;">
      <i data-lucide="info" class="inline-icon" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;color:var(--color-gold);"></i>
      ${msg}</td></tr>`;

  if (!match.odds) {
    const tip = noDataRow('暂无实时赔率数据。请在右上角配置 The Odds API Key 并联网同步。');
    if (euroBody)  euroBody.innerHTML  = tip;
    if (asianBody) asianBody.innerHTML = tip;
    if (ouBody)    ouBody.innerHTML    = tip;
    return;
  }

  // --- 欧指 ---
  if (euroBody) {
    euroBody.innerHTML = '';
    const euro = match.odds.euro;
    if (euro && euro.bookmakers && euro.bookmakers.length > 0) {
      euro.bookmakers.forEach(b => {
        const inst = b.instant;
        const init = b.initial || inst; // 如果没有 initial，就用 instant（同一时刻，无箭头）
        const iReturn    = parseFloat((100 / ((1/init.home) + (1/init.draw) + (1/init.away))).toFixed(1));
        const instReturn = parseFloat((100 / ((1/inst.home) + (1/inst.draw) + (1/inst.away))).toFixed(1));

        // 凯利指数（基于所有博彩公司平均市场概率）
        const avgH = euro.instant.home, avgD = euro.instant.draw, avgA = euro.instant.away;
        const mSum = (1/avgH) + (1/avgD) + (1/avgA);
        const pH = (1/avgH)/mSum, pD = (1/avgD)/mSum, pA = (1/avgA)/mSum;
        const kH = (inst.home * pH).toFixed(2);
        const kD = (inst.draw * pD).toFixed(2);
        const kA = (inst.away * pA).toFixed(2);

        const arrH = getTrendArrow(init.home, inst.home);
        const arrD = getTrendArrow(init.draw, inst.draw);
        const arrA = getTrendArrow(init.away, inst.away);

        euroBody.innerHTML += `
          <tr>
            <td rowspan="2" style="font-weight:600;border-bottom:1px solid rgba(255,255,255,0.05);">${b.name}</td>
            <td><span class="status-label status-init">初盘</span></td>
            <td>${init.home.toFixed(2)}</td><td>${init.draw.toFixed(2)}</td><td>${init.away.toFixed(2)}</td>
            <td>${iReturn}%</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td><span class="status-label status-inst">即时</span></td>
            <td><span class="odds-value-cell">${inst.home.toFixed(2)}${arrH}</span> <span class="text-muted" style="font-size:10px;">(K:${kH})</span></td>
            <td><span class="odds-value-cell">${inst.draw.toFixed(2)}${arrD}</span> <span class="text-muted" style="font-size:10px;">(K:${kD})</span></td>
            <td><span class="odds-value-cell">${inst.away.toFixed(2)}${arrA}</span> <span class="text-muted" style="font-size:10px;">(K:${kA})</span></td>
            <td style="font-weight:600;">${instReturn}%</td>
          </tr>`;
      });
    } else {
      euroBody.innerHTML = noDataRow('暂无欧洲独赢赔率数据。');
    }
  }

  // --- 亚盘 ---
  if (asianBody) {
    asianBody.innerHTML = '';
    const asian = match.odds.asian;
    if (asian && asian.bookmakers && asian.bookmakers.length > 0) {
      asian.bookmakers.forEach(b => {
        const inst = b.instant;
        const init = b.initial || inst;
        const initLine = formatHandicapLine(init.line);
        const instLine = formatHandicapLine(inst.line);
        const arrH = getTrendArrow(init.home, inst.home);
        const arrA = getTrendArrow(init.away, inst.away);
        const iReturn    = parseFloat((100 / ((1/(1+init.home)) + (1/(1+init.away)))).toFixed(1));
        const instReturn = parseFloat((100 / ((1/(1+inst.home)) + (1/(1+inst.away)))).toFixed(1));
        asianBody.innerHTML += `
          <tr>
            <td rowspan="2" style="font-weight:600;border-bottom:1px solid rgba(255,255,255,0.05);">${b.name}</td>
            <td><span class="status-label status-init">初盘</span></td>
            <td>${init.home.toFixed(2)}</td>
            <td style="font-weight:bold;color:var(--color-gold);">${initLine}</td>
            <td>${init.away.toFixed(2)}</td><td>${iReturn}%</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td><span class="status-label status-inst">即时</span></td>
            <td><span class="odds-value-cell">${inst.home.toFixed(2)}${arrH}</span></td>
            <td style="font-weight:bold;color:var(--color-gold);">${instLine}</td>
            <td><span class="odds-value-cell">${inst.away.toFixed(2)}${arrA}</span></td>
            <td style="font-weight:600;">${instReturn}%</td>
          </tr>`;
      });
    } else {
      asianBody.innerHTML = noDataRow('该赛事暂无让球盘口数据。（免费版 API 需请求 spreads market）');
    }
  }

  // --- 大小球 ---
  if (ouBody) {
    ouBody.innerHTML = '';
    const ou = match.odds.overUnder;
    if (ou && ou.bookmakers && ou.bookmakers.length > 0) {
      ou.bookmakers.forEach(b => {
        const inst = b.instant;
        const init = b.initial || inst;
        const arrO = getTrendArrow(init.over, inst.over);
        const arrU = getTrendArrow(init.under, inst.under);
        const iReturn    = parseFloat((100 / ((1/(1+init.over))  + (1/(1+init.under)))).toFixed(1));
        const instReturn = parseFloat((100 / ((1/(1+inst.over)) + (1/(1+inst.under)))).toFixed(1));
        ouBody.innerHTML += `
          <tr>
            <td rowspan="2" style="font-weight:600;border-bottom:1px solid rgba(255,255,255,0.05);">${b.name}</td>
            <td><span class="status-label status-init">初盘</span></td>
            <td>${init.over.toFixed(2)}</td>
            <td style="font-weight:bold;color:var(--color-blue);">${init.line.toFixed(2)}球</td>
            <td>${init.under.toFixed(2)}</td><td>${iReturn}%</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td><span class="status-label status-inst">即时</span></td>
            <td><span class="odds-value-cell">${inst.over.toFixed(2)}${arrO}</span></td>
            <td style="font-weight:bold;color:var(--color-blue);">${inst.line.toFixed(2)}球</td>
            <td><span class="odds-value-cell">${inst.under.toFixed(2)}${arrU}</span></td>
            <td style="font-weight:600;">${instReturn}%</td>
          </tr>`;
      });
    } else {
      ouBody.innerHTML = noDataRow('该赛事暂无进球数大小球盘口数据。（免费版 API 需请求 totals market）');
    }
  }
}

// ==========================================================================
// 11. 趋势图（仅使用 API 实际数据，无随机数）
// ==========================================================================
function renderTrendChart() {
  const ctx = document.getElementById('oddsTrendChart');
  if (!ctx) return;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  const chartContainer = ctx.parentNode;
  let tipDiv = chartContainer.querySelector('.chart-empty-tip');

  const showTip = (msg) => {
    if (!tipDiv) {
      tipDiv = document.createElement('div');
      tipDiv.className = 'chart-empty-tip';
      tipDiv.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--text-muted);font-size:13px;display:flex;align-items:center;gap:6px;';
      chartContainer.appendChild(tipDiv);
    }
    tipDiv.style.display = 'flex';
    tipDiv.innerHTML = `<i data-lucide="info"></i> ${msg}`;
    ctx.style.display = 'none';
    lucide.createIcons();
  };

  if (!selectedMatch || !selectedMatch.odds) {
    return showTip('暂无赔率趋势图表，请联网同步真实赔率');
  }

  const euroHistory  = selectedMatch.odds.euro  && selectedMatch.odds.euro.history  ? selectedMatch.odds.euro.history  : [];
  const asianHistory = selectedMatch.odds.asian && selectedMatch.odds.asian.history ? selectedMatch.odds.asian.history : [];

  if (currentChartType === 'euro' && euroHistory.length < 2) {
    return showTip('欧指历史数据点不足，无法绘制趋势图（需至少 2 个时间点）');
  }
  if (currentChartType === 'asian' && asianHistory.length < 2) {
    return showTip('亚盘历史数据点不足，无法绘制趋势图');
  }

  if (tipDiv) tipDiv.style.display = 'none';
  ctx.style.display = 'block';

  const style = getComputedStyle(document.documentElement);
  const goldColor  = style.getPropertyValue('--color-gold').trim()  || '#f59e0b';
  const blueColor  = style.getPropertyValue('--color-blue').trim()  || '#3b82f6';
  const greenColor = style.getPropertyValue('--color-green').trim() || '#10b981';
  const redColor   = style.getPropertyValue('--color-red').trim()   || '#ef4444';

  let labels, datasets;

  if (currentChartType === 'euro') {
    labels = euroHistory.map(h => h.time);
    datasets = [
      { label: `主胜 (${selectedMatch.home.name})`, data: euroHistory.map(h => h.home), borderColor: goldColor, backgroundColor: 'rgba(245,158,11,0.05)', tension: 0.35, borderWidth: 3, pointBackgroundColor: goldColor },
      { label: '平局', data: euroHistory.map(h => h.draw), borderColor: '#a1a1aa', backgroundColor: 'rgba(161,161,170,0.05)', tension: 0.35, borderWidth: 2, pointBackgroundColor: '#a1a1aa' },
      { label: `客胜 (${selectedMatch.away.name})`, data: euroHistory.map(h => h.away), borderColor: blueColor, backgroundColor: 'rgba(59,130,246,0.05)', tension: 0.35, borderWidth: 3, pointBackgroundColor: blueColor },
    ];
  } else {
    labels = asianHistory.map(h => h.time);
    datasets = [
      { label: `主队水位`, data: asianHistory.map(h => h.home), borderColor: greenColor, backgroundColor: 'rgba(16,185,129,0.05)', tension: 0.35, borderWidth: 3, pointBackgroundColor: greenColor },
      { label: '客队水位', data: asianHistory.map(h => h.away), borderColor: redColor, backgroundColor: 'rgba(239,68,68,0.05)', tension: 0.35, borderWidth: 3, pointBackgroundColor: redColor },
    ];
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#e2e8f0', font: { family: 'Outfit, Noto Sans SC', size: 11 } } },
        tooltip: { backgroundColor: 'rgba(11,17,32,0.9)', titleColor: '#fff', bodyColor: '#e2e8f0', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 10 }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af', font: { size: 10 } } }
      }
    }
  });
}



// ==========================================================================
// 13. API Key 管理
// ==========================================================================
function loadApiKey() {
  const savedKey = localStorage.getItem('world_cup_odds_api_key');
  if (savedKey) {
    apiKey = savedKey;
    updateApiStatusUI();
    fetchRealOddsData();
  } else {
    // 没有 Key，主动弹出配置框提醒用户
    isApiMode = false;
    updateApiStatusUI();
    renderDateSlider();
    filterAndRenderMatches();
    // 延迟 500ms 弹窗，避免页面还没渲染完
    setTimeout(() => {
      const apiModal = document.getElementById('apiModal');
      if (apiModal) apiModal.style.display = 'flex';
    }, 500);
  }
}

function saveApiKey(key) {
  apiKey = key;
  if (key) {
    localStorage.setItem('world_cup_odds_api_key', key);
  } else {
    localStorage.removeItem('world_cup_odds_api_key');
    isApiMode = false;
  }
  updateApiStatusUI();
}

function updateApiStatusUI() {
  const badge = document.getElementById('apiStatusBadge');
  if (!badge) return;
  const dot  = badge.querySelector('.dot');
  const text = badge.querySelector('.status-text');
  if (isApiMode) {
    dot.style.background  = 'var(--color-green)';
    dot.style.boxShadow   = 'var(--glow-green)';
    text.innerText = '实时 API 数据激活';
  } else {
    dot.style.background  = 'var(--color-red)';
    dot.style.boxShadow   = 'var(--glow-red)';
    text.innerText = apiKey ? '正在同步...' : '暂无赔率数据 (请配置 API)';
  }
}

function testApiKey() {
  const keyInput  = document.getElementById('apiKeyInput');
  const testResult = document.getElementById('apiTestResult');
  if (!keyInput || !testResult) return;
  const key = keyInput.value.trim();
  if (!key) {
    testResult.style.display = 'block';
    testResult.className = 'api-test-result api-test-error';
    testResult.innerHTML = '<i data-lucide="x-circle"></i> 测试失败：请输入有效的 API Key';
    lucide.createIcons();
    return;
  }
  testResult.style.display = 'block';
  testResult.className = 'api-test-result';
  testResult.innerText = '正在测试连接中...';
  fetch(`https://api.the-odds-api.com/v4/sports/?apiKey=${key}`)
    .then(res => {
      if (res.status === 200) {
        testResult.className = 'api-test-result api-test-success';
        testResult.innerHTML = '<i data-lucide="check-circle-2"></i> 测试成功！API Key 有效，连接正常。';
      } else {
        testResult.className = 'api-test-result api-test-error';
        testResult.innerHTML = `<i data-lucide="x-circle"></i> 测试失败：API 校验未通过，状态码 ${res.status}。`;
      }
      lucide.createIcons();
    })
    .catch(err => {
      testResult.className = 'api-test-result api-test-error';
      testResult.innerHTML = `<i data-lucide="x-circle"></i> 连接网络异常：${err.message}`;
      lucide.createIcons();
    });
}

// ==========================================================================
// 14. 核心 API 拉取逻辑（严格不编造数据）
// ==========================================================================
function fetchRealOddsData() {
  if (!apiKey) return;

  const badge = document.getElementById('apiStatusBadge');
  if (badge) badge.querySelector('.status-text').innerText = '正在同步实时 API 赛程赔率...';

  // 请求 h2h + spreads(让球) + totals(大小球)，eu 区域
  const url = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?regions=eu&markets=h2h,spreads,totals&oddsFormat=decimal&apiKey=${apiKey}`;

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP 异常，状态码: ${res.status}`);
      return res.json();
    })
    .then(apiOddsList => {
      if (!Array.isArray(apiOddsList) || apiOddsList.length === 0) {
        console.warn('The Odds API 未返回任何世界杯赛事数据（可能还未到开盘期）。');
        isApiMode = true;   // Key 有效，但暂无数据
        matches = [];
        updateApiStatusUI();
        renderDateSlider();
        filterAndRenderMatches();
        return;
      }

      const dynamicMatches = [];
      let seqId = 1;

      apiOddsList.forEach(apiMatch => {
        const homeEng = apiMatch.home_team;
        const awayEng = apiMatch.away_team;

        const homeTeam = resolveTeam(homeEng);
        const awayTeam = resolveTeam(awayEng);

        // 推断赛程阶段与分组
        let stage = '小组赛', group = null;
        if (homeTeam.group && awayTeam.group && homeTeam.group === awayTeam.group) {
          stage = '小组赛';
          group = `${homeTeam.group}组`;
        } else {
          stage = getStageByTime(new Date(apiMatch.commence_time));
          group = null;
        }

        // 分配场馆（按顺序循环）
        const stadium = STADIUMS[seqId % STADIUMS.length];

        // ---- 解析赔率（严格使用 API 真实数据）----
        let odds = null;

        if (apiMatch.bookmakers && apiMatch.bookmakers.length > 0) {
          // 收集所有博彩公司的各 market 数据
          const euroBookmakers  = [];
          const asianBookmakers = [];
          const ouBookmakers    = [];

          // 尝试优先使用 Bet365，否则使用所有可用的
          const preferredKeys = ['bet365', 'pinnacle', 'williamhill', 'unibet'];

          apiMatch.bookmakers.forEach(bk => {
            const bkName = bk.title || bk.key;

            // 欧指（h2h）
            const h2hMkt = bk.markets ? bk.markets.find(m => m.key === 'h2h') : null;
            if (h2hMkt && h2hMkt.outcomes) {
              const homeOut = h2hMkt.outcomes.find(o => o.name === homeEng);
              const awayOut = h2hMkt.outcomes.find(o => o.name === awayEng);
              const drawOut = h2hMkt.outcomes.find(o => o.name === 'Draw' || o.name === 'Draws');
              if (homeOut && awayOut && drawOut) {
                euroBookmakers.push({
                  name: bkName,
                  instant: { home: homeOut.price, draw: drawOut.price, away: awayOut.price },
                  initial: null  // The Odds API 基础版不提供初盘，initial = instant
                });
              }
            }

            // 亚盘（spreads = Asian Handicap）
            const spreadsMkt = bk.markets ? bk.markets.find(m => m.key === 'spreads') : null;
            if (spreadsMkt && spreadsMkt.outcomes && spreadsMkt.outcomes.length >= 2) {
              const homeOut = spreadsMkt.outcomes.find(o => o.name === homeEng);
              const awayOut = spreadsMkt.outcomes.find(o => o.name === awayEng);
              if (homeOut && awayOut && homeOut.point !== undefined) {
                asianBookmakers.push({
                  name: bkName,
                  instant: { home: homeOut.price, away: awayOut.price, line: homeOut.point },
                  initial: null
                });
              }
            }

            // 大小球（totals）
            const totalsMkt = bk.markets ? bk.markets.find(m => m.key === 'totals') : null;
            if (totalsMkt && totalsMkt.outcomes && totalsMkt.outcomes.length >= 2) {
              const overOut  = totalsMkt.outcomes.find(o => o.name === 'Over');
              const underOut = totalsMkt.outcomes.find(o => o.name === 'Under');
              if (overOut && underOut && overOut.point !== undefined) {
                ouBookmakers.push({
                  name: bkName,
                  instant: { over: overOut.price, under: underOut.price, line: overOut.point },
                  initial: null
                });
              }
            }
          });

          if (euroBookmakers.length > 0 || asianBookmakers.length > 0 || ouBookmakers.length > 0) {
            // 计算跨博彩公司平均即时赔率（用于卡片展示）
            const calcAvgEuro = () => {
              if (euroBookmakers.length === 0) return null;
              const sum = euroBookmakers.reduce((acc, b) => ({
                home: acc.home + b.instant.home,
                draw: acc.draw + b.instant.draw,
                away: acc.away + b.instant.away
              }), { home: 0, draw: 0, away: 0 });
              const n = euroBookmakers.length;
              return { home: sum.home/n, draw: sum.draw/n, away: sum.away/n };
            };

            const avgEuro = calcAvgEuro();
            // 用 initial = instant（API 基础版只有一个时间点）
            euroBookmakers.forEach(b => { if (!b.initial) b.initial = { ...b.instant }; });
            asianBookmakers.forEach(b => { if (!b.initial) b.initial = { ...b.instant }; });
            ouBookmakers.forEach(b => { if (!b.initial) b.initial = { ...b.instant }; });

            odds = {
              euro: euroBookmakers.length > 0 ? {
                instant: avgEuro,
                initial: avgEuro,      // 只有当前时刻，初盘 = 即时
                bookmakers: euroBookmakers,
                history: []            // 无历史时间序列（基础 API 不提供）
              } : null,
              asian: asianBookmakers.length > 0 ? {
                instant: asianBookmakers[0].instant,
                initial: asianBookmakers[0].instant,
                bookmakers: asianBookmakers,
                history: []
              } : null,
              overUnder: ouBookmakers.length > 0 ? {
                instant: ouBookmakers[0].instant,
                initial: ouBookmakers[0].instant,
                bookmakers: ouBookmakers,
                history: []
              } : null,
            };
          }
        }

        // 比赛状态（真实状态，不编造比分）
        const nowMs       = Date.now();
        const commenceMs  = new Date(apiMatch.commence_time).getTime();
        let status = 'scheduled';
        if (nowMs > commenceMs + 2 * 60 * 60 * 1000) status = 'finished';
        else if (nowMs > commenceMs) status = 'live';

        dynamicMatches.push({
          id:         `api_${apiMatch.id || seqId++}`,
          apiId:      apiMatch.id,
          stage,
          group,
          home:       homeTeam,
          away:       awayTeam,
          time:       apiMatch.commence_time,
          stadium:    stadium.name,
          city:       stadium.city,
          status,
          homeScore:  null,   // API 基础版不含比分，留空
          awayScore:  null,
          odds,
        });
      });

      matches  = dynamicMatches;
      isApiMode = true;
      console.log(`The Odds API 加载成功，共 ${matches.length} 场赛事。`);
      updateApiStatusUI();
      renderDateSlider();
      filterAndRenderMatches();
    })
    .catch(err => {
      console.error('The Odds API 请求失败：', err);
      isApiMode = false;
      matches = [];
      updateApiStatusUI();
      renderDateSlider();
      filterAndRenderMatches();

      const badge = document.getElementById('apiStatusBadge');
      if (badge) badge.querySelector('.status-text').innerText = `API 请求失败: ${err.message}`;
    });
}
