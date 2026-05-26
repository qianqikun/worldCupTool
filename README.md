# 🏆 FIFA World Cup 2026 赛程与赔率分析系统

<div align="center">

![FIFA World Cup 2026](https://img.shields.io/badge/FIFA-World%20Cup%202026-gold?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDEgMC04LTMuNTktOC04czMuNTktOCA4LTggOCAzLjU5IDggOC0zLjU5IDgtOCA4eiIgZmlsbD0iI2ZmZCIvPjwvc3ZnPg==)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![The Odds API](https://img.shields.io/badge/The%20Odds%20API-v4-blue?style=for-the-badge)

**专业级 2026 美加墨世界杯赛程 · 亚盘欧指 · 实时赔率分析工具**

[功能特性](#-功能特性) · [快速开始](#-快速开始) · [API 配置](#-api-配置) · [项目结构](#-项目结构) · [数据说明](#-数据说明)

</div>

---

## 📸 界面预览

> 深色玻璃态风格设计，支持实时赔率数据接入与 AI 智能分析。

---

## ✨ 功能特性

### 🗓 赛程展示
- **完整赛程**：覆盖 2026 年世界杯 A–L 组全部 48 支球队，包含小组赛至决赛
- **实时数据**：所有赛程和赔率数据 100% 来自 **The Odds API**，不编造任何数据
- **倒计时面板**：实时显示距揭幕战（2026-06-11）的剩余天时分秒

### 🎯 多维度筛选
- **赛事阶段**：小组赛 / 32强 / 16强 / 1/4决赛 / 半决赛 / 决赛
- **小组过滤**：A–L 组独立筛选
- **日期轴**：横向滚动日期选择器，快速定位到某一天的比赛
- **球队搜索**：支持中文名/国际代码搜索
- **赔率波动过滤**：一键筛选赔率异常波动的赛事（欧指变化 ≥8% 或亚盘水位变化 ≥0.15）
- **排序方式**：按开赛时间升序/降序、按两队实力差排序

### 📊 赔率数据（需配置 API Key）
| 数据类型 | 来源字段 | 展示内容 |
|---------|---------|---------|
| 欧洲指数（欧指） | `h2h` | 主胜 / 平局 / 客胜赔率，返还率，凯利指数 |
| 亚洲让球盘（亚盘） | `spreads` | 主客让球盘口，主客水位，返还率 |
| 进球大小球 | `totals` | 大/小球赔率，盘口线，返还率 |
| 赔率趋势图 | 多博彩公司 | Chart.js 折线图，展示各家赔率对比 |

### 🤖 AI 智能分析
- 基于真实赔率数据生成量化分析报告
- 覆盖：实力对比分析、市场盘面解读、独赢/让球/大小球推荐
- 预测信心值（0–95%），根据实力差距与赔率波动动态计算
- **无数据时不生成空洞分析**，如实说明数据缺失

---

## 🚀 快速开始

本项目为纯静态前端，无需任何构建工具或后端服务。

### 1. 克隆项目

```bash
git clone https://github.com/<你的用户名>/worldCupTool.git
cd worldCupTool
```

### 2. 用任意 HTTP 服务器启动

**方式 A：VS Code Live Server 插件**（推荐）
1. 安装 VS Code 插件 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. 右键 `index.html` → `Open with Live Server`

**方式 B：Python 内置服务器**
```bash
# Python 3
python3 -m http.server 8080
# 访问 http://localhost:8080
```

**方式 C：Node.js `serve`**
```bash
npx serve .
```

> ⚠️ **不要直接双击 `index.html` 打开**，浏览器安全策略会阻止 fetch 请求。必须通过 HTTP 服务器访问。

---

## 🔑 API 配置

本系统所有赛程和赔率数据均来自 **[The Odds API](https://the-odds-api.com/)**。

### 获取免费 API Key

1. 访问 [the-odds-api.com](https://the-odds-api.com/)
2. 点击 **"Get Free API Key"** 免费注册
3. 每月免费额度 **500 次请求**（足够个人使用）

> 本项目单次加载消耗约 **1 次请求额度**（同时请求 h2h + spreads + totals 3 个 market，计为 1 次 API 调用）。

### 在页面中配置

1. 打开页面后，会自动弹出 API 配置对话框
2. 或点击右上角 **🔑 API 配置** 按钮
3. 粘贴你的 API Key → 点击 **"测试并连接"** 验证 → 点击 **"保存配置"**
4. Key 保存在浏览器 `localStorage` 中，刷新后不需要重新输入

### 请求的 API 端点

```
GET https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/
    ?regions=eu
    &markets=h2h,spreads,totals
    &oddsFormat=decimal
    &apiKey=YOUR_KEY
```

---

## 📁 项目结构

```
worldCupTool/
├── index.html      # 页面结构与模态框（API配置框、比赛详情框）
├── style.css       # 深色玻璃态主题样式（Glassmorphism）
├── app.js          # 核心逻辑（API拉取、赔率解析、渲染、AI分析）
├── data.js         # 静态基础数据（48支球队信息、16个场馆）
└── README.md
```

### 关键模块说明

| 文件 | 关键内容 |
|------|---------|
| `data.js` | `TEAMS`（48队中文名/国旗/分组）、`STADIUMS`（16场馆官方容量） |
| `app.js` | `fetchRealOddsData()` API拉取、`resolveTeam()` 球队名英文→中文映射、`loadOddsComparisonTables()` 赔率表渲染、`generateAiAnalysis()` AI分析 |

---

## 📊 数据说明

### 赛程与赔率数据

| 字段 | 来源 | 说明 |
|------|------|------|
| 赛程（比赛时间、对阵） | The Odds API | 完全来自 API，不编造 |
| 欧指（胜平负赔率） | The Odds API `h2h` | 多家博彩公司即时盘 |
| 亚盘（让球盘口） | The Odds API `spreads` | 部分博彩公司提供 |
| 大小球 | The Odds API `totals` | 部分博彩公司提供 |
| 赔率历史趋势 | 暂不支持 | API 基础版不提供时间序列 |
| 比分 | 暂不支持 | API 基础版不含实时比分 |

> **注意**：当 The Odds API 未返回数据时（如赛前未开盘期），页面会显示空态，不会用假数据填充。

### 球队基础信息

| 字段 | 来源 |
|------|------|
| 48 支参赛球队名单及分组 | [FIFA 官方](https://www.fifa.com/) 2026 年世界杯抽签结果 |
| FIFA 排名 | FIFA 官方排名（参考值，非实时） |
| 16 个举办场馆及容量 | FIFA 官方公布数据 |

---

## 🛠 技术栈

| 技术 | 用途 |
|------|------|
| HTML5 + Vanilla CSS | 页面结构与样式，无框架依赖 |
| Vanilla JavaScript (ES6+) | 核心逻辑，无框架依赖 |
| [The Odds API v4](https://the-odds-api.com/) | 赔率数据源 |
| [Chart.js](https://www.chartjs.org/) | 赔率趋势折线图 |
| [Lucide Icons](https://lucide.dev/) | 矢量图标库 |
| [Google Fonts](https://fonts.google.com/) | Outfit + Noto Sans SC 字体 |

---

## ⚠️ 免责声明

本项目仅供技术学习与信息展示，赔率数据均来自公开 API 接口。

**赔率数据仅供参考，不构成任何投注建议。请理性对待体育赛事，远离非法赌博。**

---

## 📄 License

[MIT](LICENSE) © 2026
