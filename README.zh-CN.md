# Humanoid Atlas

面向人形机器人产业的交互式供应链情报平台。在浏览器中探索 OEM 生态、零部件供应商、地缘依赖，以及由 AI 驱动的战略分析。

**线上站点：[humanoids.fyi](https://www.humanoids.fyi)**

![Humanoid Atlas](public/atlas_v2.JPG)

> 英文说明见 [README.md](./README.md)

## 功能概览

- **3D 零部件查看器** — 使用 Three.js 将 Gaussian Splat 等 PLY 点云以 stipple 风格渲染电机、电池、执行器、轴承等硬件
- **供应链关系图** — 交互式网络图，展示多家人形公司与供应商之间的 OEM–供应商关系
- **地缘暴露** — 国家/地区层面的依赖分析，用于评估供应链风险
- **AI 分析** — 基于 Groq 的投资叙事、竞品对比、场景推演与语义检索（需配置 API Key）
- **零部件专题** — 电机、减速器、轴承、执行器、丝杠、电池、算力、传感器、PCB、末端执行器等深度拆解页
- **竞品对比** — OEM 规格与能力侧并排分析
- **时间线视图** — 产线建设、产能爬坡与行业里程碑追踪
- **数据市场（Atlas Data Brokerage）** — 训练数据买卖与采集计划（可选 Clerk / Stripe / 独立后端）
- **Atlas Arena** — 社区投票与 Elo 排行榜等人机对战式对比

## 快速开始

### 环境要求

- Node.js 18+
- pnpm（推荐）或 npm

### 安装

```bash
git clone https://github.com/kingjulio8238/humanoid-atlas.git
cd humanoid-atlas
pnpm install
```

复制环境变量模板并填写密钥：

```bash
cp .env.example .env.local
```

| 变量 | 是否必需 | 说明 |
|------|----------|------|
| `GROQ_API_KEY` | 使用 AI 功能时必需 | [console.groq.com](https://console.groq.com) |
| `UPSTASH_REDIS_REST_URL` | 否（仅浏览量统计） | [console.upstash.com](https://console.upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | 否（仅浏览量统计） | [console.upstash.com](https://console.upstash.com) |

数据市场、Clerk 登录、Stripe 支付等功能需在 `.env.local` 中自行配置对应的 `VITE_*` 等前端环境变量（以各服务控制台与部署平台说明为准）。

### 开发

```bash
pnpm dev
```

浏览器打开 [http://localhost:5173](http://localhost:5173)。

### 构建

```bash
pnpm build
pnpm preview
```

### 代码检查

```bash
pnpm lint
```

## 项目结构（节选）

```
├── api/                         # Vercel Serverless
│   ├── company-chat.ts          # 公司维度 AI 问答
│   ├── compare.ts               # 竞品分析
│   ├── graph-query.ts           # 供应链图自然语言查询
│   ├── investment-thesis.ts     # 投资叙事
│   ├── scenario-parse.ts        # 场景影响解析
│   ├── scenario-summary.ts      # 场景摘要
│   ├── smart-search.ts          # 语义搜索
│   ├── views.ts / likes.ts      # 浏览量、点赞等
│   └── arena/                   # Arena 对战、投票、排行榜
├── src/
│   ├── App.tsx                  # 主应用与路由/Tab
│   ├── components/              # 图表、PLY、供应链图、数据市场、Arena 等
│   ├── data/                    # 静态产业数据集（公司、关系、模型矩阵等）
│   └── lib/                     # Brokerage API 客户端等
├── public/models/               # PLY 与机器人图片等静态资源
└── index.html
```

## 数据模型

供应链与百科类数据主要位于 `src/data/`，构建时打包进前端，结构包括：

- **Companies** — OEM 与供应商：规格、融资、总部所在地等
- **Relationships** — 公司之间的有向边：零部件类型、置信度、`source` 引用
- **Components** — 硬件分类定义与说明

此外还有 VLA / Reward Model / World Model、仿真与可视化工具、工厂与产能、安全与 HRI 等扩展模块，详见 `src/data/index.ts` 导出列表。

### 贡献数据

最有价值的贡献之一是完善供应链数据集：

1. 编辑 `src/data/` 下对应文件
2. 遵循 `types.ts` 中的 TypeScript 类型
3. 新增关系务必填写带 URL 的 `source`
4. 设置合理的 `confidence`（`confirmed` / `likely` / `speculative`）

## 参与贡献

欢迎提交新数据、修 Bug、改进 UI 或增加功能。

1. Fork 本仓库
2. 新建功能分支（`git checkout -b feature/my-feature`）
3. 提交修改
4. 推送到你的 Fork 并发起 Pull Request

## 许可证

[MIT](LICENSE)
