// 一次性生成 PostgreSQL / ClickHouse 两条学习线的骨架与素材清单。
// ⚠️ 仅生成尚不存在的文件（已存在的文件会跳过），不会覆盖手写笔记。
// 用法：node gen-lines.mjs
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), 'docs')

const TOPIC_DEFS = [
  ['01-架构原理', '01 · 架构原理'],
  ['02-部署与变更', '02 · 部署与变更'],
  ['03-监控与可观测', '03 · 监控与可观测'],
  ['04-备份恢复与容灾', '04 · 备份恢复与容灾'],
  ['05-账号与安全', '05 · 账号与安全'],
  ['06-数据集成', '06 · 数据集成'],
  ['07-性能与容量', '07 · 性能与容量'],
  ['08-日常运维与故障案例', '08 · 日常运维与故障案例'],
]

const notesTpl = (label) => `# ${label} · 学习笔记

> 规范：一篇笔记对应一个素材，二级标题格式「YYYY-MM-DD · 素材名（来源/时长）」。
> 翻译类笔记在开头注明原文链接；命令与关键操作用代码块实录。

## YYYY-MM-DD · 素材名（来源/时长）

### 核心要点

-

### 命令与操作实录

\`\`\`sql
-- 在此粘贴本素材涉及的关键命令
\`\`\`

### 疑问与待验证

- [ ]
`

const labTpl = (label, labs) => `# ${label} · 实验任务

> 实验环境：本地 Docker 或测试机。**生产环境只读观察。**
> 每个实验记录：目标 / 步骤实录 / 结果 / 踩坑与结论。

${labs.map(([name, goal], i) => `## 实验 ${i + 1}（${i === 0 ? '必做' : '选做'}）：${name}

- **目标**：${goal}
- **环境**：
- **步骤实录**：
- **结果与结论**：
- **踩坑**：
`).join('\n')}
`

const checkTpl = (label, checks) => `# ${label} · 自检清单

> 学完本主题后逐条自问，能完整讲出来才打勾。答不上的，回到素材清单定位对应材料重学。

## 基础理解

${checks.map((c, i) => `- [ ] ${i + 1}. ${c}`).join('\n')}

## 动手能力

- [ ] ${checks.length + 1}. 完成实验任务页的必做实验，并能脱离笔记复述关键步骤
- [ ] ${checks.length + 2}. 能说出本主题与 Doris 同类机制的差异（对照学习）
`

const materialTpl = (label, d) => `# ${label} · 素材清单

> ${d.intro}

> 状态图例：\`未开始\` / \`学习中\` / \`已学完\` / \`过时风险\`

## 素材台账（第一轮已收集 · 2026-10-23）

| # | 素材名称 | 类型 | 链接 | 推荐度 | 状态 | 备注 |
|---|----------|------|------|--------|------|------|
${d.rows.join('\n')}

## 推荐学习顺序

${d.order.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## 收集规则提醒

- 官方文档为第一信息源；若链接因官网改版失效，从官方文档根入口进入站内搜索同名章节
- B 站视频链接来自搜索索引，未逐集点开核验，质量与版本以实际观看为准
- 英文视频分级：核心视频下载烧录中文字幕；一般视频转写成中文图文笔记
`

const mapTpl = (line, d) => `# ${d.label} · 知识地图

> ${d.positioning}
> 学习原则：素材标注版本；每个主题走完「素材 → 笔记 → 实验 → 自检」闭环；实验只在本地 Docker / 测试机。

## 主题全景

| # | 主题 | 学什么（一句话） | 状态 |
|---|------|------------------|------|
${TOPIC_DEFS.map(([dir, label], i) => `| ${String(i + 1).padStart(2, '0')} | [${label.slice(5)}](/${line}/${dir}/00-素材清单) | ${d.topics[dir].oneline} | 未开始 |`).join('\n')}

## 与本站其他线的关系

${d.relations}

## 三条红线

1. **版本红线**：以官方文档为准（PG 文档按大版本归档，注意切换到所用版本；CK 文档随版本滚动更新）；
2. **环境红线**：实验只在本地 Docker / 测试机，任何生产集群只读观察；
3. **闭环红线**：不跳过实验和自检——看懂 ≠ 会做，会做 ≠ 能讲清楚。
`

const PG = 'https://www.postgresql.org/docs/current'
const CK = 'https://clickhouse.com/docs'

const LINES = {
  pgsql: {
    label: 'PostgreSQL 学习线',
    positioning: '定位：**关系型数据库通用基本功 + pgvector 宿主**。PG 的 SQL/事务/索引/WAL 概念可迁移到几乎所有数据库，是 Doris 之外的“第二语言能力”；同时它是向量选型候选 pgvector 的底座。',
    relations: '- 与 Doris 主线：对照学习（如 PG 的 WAL 流复制 vs Doris 的多副本多数派），差异点写进笔记；\n- 与向量库副线：本线是 pgvector 实验的载体，V2/V4 阶段的 PG 向量实验在这里搭环境；\n- 节奏：不占用 Doris 主线排期，利用间隙推进，按需查阅优先。',
    topics: {
      '01-架构原理': {
        oneline: '进程模型、MVCC、WAL——PG 的三大基石', intro: '理解 PG 怎么组织进程、怎么用 MVCC 做并发、WAL 为什么是一切的底座。',
        rows: [
          `| 1 | 官方教程：Getting Started | 文档 | [官方教程](${PG}/tutorial-start.html) | ⭐⭐⭐⭐⭐ | 未开始 | 建库建表到查询的官方最短路径 |`,
          `| 2 | 官方文档：并发控制（MVCC） | 文档 | [MVCC](${PG}/mvcc.html) | ⭐⭐⭐⭐⭐ | 未开始 | PG 并发设计的核心，理解“读写不互斥” |`,
          `| 3 | 官方文档：内部架构概览 | 文档 | [Internals Overview](${PG}/overview.html) | ⭐⭐⭐⭐ | 未开始 | 进程模型与存储布局 |`,
          `| 4 | B站：PostgreSQL 零基础入门（24 集） | 视频 | [B 站观看](https://www.bilibili.com/video/BV1AtQJB4E9o/) | ⭐⭐⭐⭐ | 未开始 | 中文入门课，含图形化/Docker 安装 |`,
          `| 5 | PG 中文社区翻译文档 | 文档 | [postgres.cn](https://www.postgres.cn/docs/) | ⭐⭐⭐ | 未开始 | 中文版阅读顺畅，版本可能滞后，以英文 current 为准 |`,
        ],
        order: ['先看 B 站入门课前几集建立直观', '跟官方教程把建库/建表/查询走一遍', '精读 MVCC 章节——这是 PG 区别于许多数据库的关键', 'Internals 概览当字典查'],
        labs: [['Docker 起一个 PG 并连上', '本地 Docker 跑 postgres:16 容器，用 psql 连入，执行第一条 SQL'], ['观察进程与数据目录', '进入容器查看 PG 进程列表与数据目录结构，对应架构图找位置']],
        checks: ['能讲清 PG 每连接一个进程（进程模型）与 Doris BE 线程模型的差异', '能用自己的话解释 MVCC 为什么“读写不互斥”', '知道 WAL 先写日志再改数据的目的'],
      },
      '02-部署与变更': {
        oneline: '安装、配置文件、参数体系', intro: '目标：本地 Docker 独立完成 PG 部署，理解 postgresql.conf 与 pg_hba.conf 的分工。',
        rows: [
          `| 1 | 官方文档：二进制安装 | 文档 | [Installation](${PG}/install-binaries.html) | ⭐⭐⭐⭐⭐ | 未开始 | 各平台安装方式 |`,
          `| 2 | 官方文档：服务器设置与运行 | 文档 | [Server Setup](${PG}/runtime.html) | ⭐⭐⭐⭐ | 未开始 | 数据目录初始化、启停 |`,
          `| 3 | 官方文档：服务器配置 | 文档 | [Configuration](${PG}/runtime-config.html) | ⭐⭐⭐⭐⭐ | 未开始 | postgresql.conf 全部参数的权威参考 |`,
          `| 4 | B站入门课 · 安装分集 | 视频 | [B 站观看](https://www.bilibili.com/video/BV1AtQJB4E9o/) | ⭐⭐⭐ | 未开始 | 图形化安装与 Docker 安装两集 |`,
        ],
        order: ['Docker 快速起一个实例（实验 1）', '读 Server Setup 理解数据目录与启停', '把 postgresql.conf 常用参数（内存/连接/WAL）过一遍', '改一次参数并重启验证生效'],
        labs: [['Docker 部署 PG 并挂载数据目录', '容器删除后数据仍在，理解数据目录挂载的意义'], ['修改配置并验证', '改 shared_buffers / max_connections，重启后 SHOW 验证']],
        checks: ['说清 postgresql.conf 与 pg_hba.conf 各管什么', '能独立用 Docker 部署一个数据可持久化的 PG', '知道改哪些参数需要重启、哪些 reload 即可'],
      },
      '03-监控与可观测': {
        oneline: 'pg_stat_* 统计视图、对接 Prometheus', intro: 'PG 的可观测性围绕系统目录与统计视图展开；对接现有 Prometheus 用 postgres_exporter。',
        rows: [
          `| 1 | 官方文档：监控数据库活动 | 文档 | [Monitoring](${PG}/monitoring.html) | ⭐⭐⭐⭐⭐ | 未开始 | pg_stat_activity / pg_stat_replication 等统计视图 |`,
          `| 2 | 官方文档：系统目录 | 文档 | [Catalogs](${PG}/catalogs.html) | ⭐⭐⭐⭐ | 未开始 | 元数据都在 pg_catalog 里 |`,
          `| 3 | postgres_exporter（Prometheus 社区） | 仓库 | [GitHub](https://github.com/prometheus-community/postgres_exporter) | ⭐⭐⭐⭐ | 未开始 | 对接你们现有监控体系的标准件 |`,
        ],
        order: ['精读 Monitoring 章节，挑 5 个最常用视图练手', 'Docker 起 postgres_exporter，接入 Prometheus 看板', '把常用巡检 SQL 沉淀到学习笔记'],
        labs: [['查询当前活动会话', '用 pg_stat_activity 找出空闲/长事务会话'], ['跑通 postgres_exporter', 'metrics 端点能看到 PG 指标']],
        checks: ['知道慢查询/锁等待/复制延迟分别查哪个视图', '能把 PG 指标接入 Prometheus 并解释 3 个核心指标', '理解 PG 日志与统计视图的分工'],
      },
      '04-备份恢复与容灾': {
        oneline: 'pg_dump、连续归档 PITR、流复制', intro: 'PG 备份分逻辑（pg_dump）与物理（连续归档+基础备份）两条路线；对照 Doris 的快照式备份理解差异。',
        rows: [
          `| 1 | 官方文档：备份与恢复 | 文档 | [Backup and Restore](${PG}/backup.html) | ⭐⭐⭐⭐⭐ | 未开始 | pg_dump / 文件系统级 / 连续归档三种方式 |`,
          `| 2 | 官方文档：WAL 可靠性与配置 | 文档 | [WAL](${PG}/wal.html) | ⭐⭐⭐⭐ | 未开始 | 理解连续归档的前提 |`,
          `| 3 | 官方文档：高可用与复制 | 文档 | [HA & Replication](${PG}/high-availability.html) | ⭐⭐⭐⭐ | 未开始 | 流复制主备搭建 |`,
          `| 4 | 对照阅读：Doris 备份问答（本站课件） | 图文 | [第 2 课追问](/learn/02-doris) | ⭐⭐⭐ | 未开始 | Doris 按数据快照 vs PG 逻辑/物理双路线 |`,
        ],
        order: ['先用 pg_dump 做一次逻辑备份与恢复（实验 1）', '读 backup.html 理解三种方式的适用场景', '有余力再搭流复制主备', '对照 Doris 备份机制写一段对比笔记'],
        labs: [['pg_dump 备份并恢复到新库', '删表后用备份找回，跑通完整闭环'], ['（选做）流复制主备', 'Docker 起两个 PG 实例配置流复制，验证数据同步']],
        checks: ['说清逻辑备份与物理备份的取舍', '知道 PITR（时间点恢复）依赖什么', '能对比 PG 流复制与 Doris 多副本的机制差异'],
      },
      '05-账号与安全': {
        oneline: 'pg_hba.conf、角色体系、行级安全', intro: 'PG 权限模型：认证在 pg_hba.conf，授权靠角色与 GRANT；行级安全（RLS）是精细管控的杀手锏。',
        rows: [
          `| 1 | 官方文档：客户端认证 | 文档 | [Client Authentication](${PG}/client-authentication.html) | ⭐⭐⭐⭐⭐ | 未开始 | pg_hba.conf 逐行规则匹配机制 |`,
          `| 2 | 官方文档：数据库角色 | 文档 | [Roles](${PG}/user-manag.html) | ⭐⭐⭐⭐⭐ | 未开始 | 角色即用户即组的统一模型 |`,
          `| 3 | 官方文档：加密选项 | 文档 | [Encryption Options](${PG}/encryption-options.html) | ⭐⭐⭐ | 未开始 | 传输/存储加密概览 |`,
          `| 4 | pgaudit 审计扩展 | 仓库 | [GitHub](https://github.com/pgaudit/pgaudit) | ⭐⭐⭐ | 未开始 | 操作审计的标准扩展 |`,
        ],
        order: ['读 Roles 建立角色模型', '精读 pg_hba.conf 规则匹配（踩坑高发区）', '实验：建只读/读写两级角色并验证', '需要审计时再看 pgaudit'],
        labs: [['配一条 pg_hba 规则', '只允许指定网段用指定用户连接，改完 reload 验证'], ['建只读角色并授权', '新角色只能 SELECT 指定库表，越权写报错']],
        checks: ['能逐列解释一条 pg_hba.conf 记录', '说清角色继承与 nologin 登录角色的用法', '知道默认 public schema 权限风险（PG 15+ 已收紧）'],
      },
      '06-数据集成': {
        oneline: 'COPY 批量、逻辑复制 CDC、postgres_fdw 联邦', intro: '数据进出 PG 的三条主干道：COPY 走批量文件、逻辑复制走实时 CDC、FDW 走跨库联邦查询。',
        rows: [
          `| 1 | 官方文档：逻辑复制 | 文档 | [Logical Replication](${PG}/logical-replication.html) | ⭐⭐⭐⭐⭐ | 未开始 | 发布/订阅模型，CDC 与异构同步的基础 |`,
          `| 2 | 官方文档：COPY 命令 | 文档 | [COPY](${PG}/sql-copy.html) | ⭐⭐⭐⭐ | 未开始 | CSV 批量导入导出的最快方式 |`,
          `| 3 | 官方文档：postgres_fdw | 文档 | [postgres_fdw](${PG}/postgres-fdw.html) | ⭐⭐⭐⭐ | 未开始 | 跨 PG 实例联邦查询；其他数据源有对应 FDW |`,
        ],
        order: ['COPY 先练熟（实验 1）', '读逻辑复制章节，理解发布/订阅与复制槽', '用 FDW 跨两个 Docker 实例查一次', '联想：MySQL→Doris 的 CDC 链路与 PG 逻辑复制异曲同工'],
        labs: [['COPY 导入 CSV', '准备 10 万行 CSV 导入并计时，对比 INSERT 差距'], ['逻辑复制最小实验', '两个 Docker 实例间发布/订阅一张表，验证实时同步']],
        checks: ['知道 COPY 与 INSERT 批量场景的性能差异原因', '能讲清复制槽（replication slot）的作用与堆积风险', '知道 FDW 与逻辑复制分别解决什么问题'],
      },
      '07-性能与容量': {
        oneline: 'EXPLAIN、索引、VACUUM 与膨胀', intro: 'PG 性能三板斧：看懂 EXPLAIN、选对索引、管住膨胀（VACUUM）。',
        rows: [
          `| 1 | 官方文档：性能提示 | 文档 | [Performance Tips](${PG}/performance-tips.html) | ⭐⭐⭐⭐⭐ | 未开始 | 官方调优方法论入口 |`,
          `| 2 | 官方文档：Using EXPLAIN | 文档 | [EXPLAIN](${PG}/using-explain.html) | ⭐⭐⭐⭐⭐ | 未开始 | 逐节点读懂执行计划 |`,
          `| 3 | 官方文档：索引类型 | 文档 | [Indexes](${PG}/indexes.html) | ⭐⭐⭐⭐ | 未开始 | B-tree/GIN/GiST/BRIN 的适用场景 |`,
          `| 4 | 官方文档：日常维护（VACUUM） | 文档 | [Routine Maintenance](${PG}/maintenance.html) | ⭐⭐⭐⭐⭐ | 未开始 | MVCC 的代价：膨胀与 autovacuum 调优 |`,
        ],
        order: ['读 EXPLAIN 章节并对一条查询做逐节点分析（实验 1）', '读 Indexes，给测试表建不同类型索引对比', '精读 VACUUM——这是 PG 运维与普通开发拉开差距的地方', '膨胀排查案例沉淀到笔记'],
        labs: [['逐节点分析一条 EXPLAIN', '跑 EXPLAIN (ANALYZE, BUFFERS)，说清每个节点的成本来源'], ['观察膨胀与 VACUUM', '批量 UPDATE 制造膨胀，pg_stat_user_tables 看 dead tuples 变化']],
        checks: ['能看懂 Seq Scan / Index Scan / Nested Loop 的含义与成本', '知道 MVCC 为什么会膨胀、autovacuum 触发条件', '能为慢查询提出至少两种优化路径'],
      },
      '08-日常运维与故障案例': {
        oneline: '日志、错误码、案例沉淀', intro: '把 PG 日常问题（连接打满、锁等待、复制中断、膨胀）的处理过程沉淀为案例库。',
        rows: [
          `| 1 | 官方文档：错误码表 | 文档 | [Error Codes](${PG}/errcodes-appendix.html) | ⭐⭐⭐ | 未开始 | 按 SQLSTATE 查错误含义 |`,
          `| 2 | 官方文档：系统视图 | 文档 | [System Views](${PG}/views.html) | ⭐⭐⭐⭐ | 未开始 | 排障速查：锁、复制、膨胀都在这 |`,
          `| 3 | B站搜索：PostgreSQL 运维实战 | 视频 | [B 站搜索](https://search.bilibili.com/all?keyword=PostgreSQL%20运维实战) | ⭐⭐⭐ | 未开始 | 按质量筛选后登记具体 BV |`,
          `| 4 | 站内沉淀：PG 故障案例库 | 站内 | [学习笔记](/pgsql/08-日常运维与故障案例/01-学习笔记) | ⭐⭐⭐⭐⭐ | 持续 | 每处理一次 PG 问题记录一篇 |`,
        ],
        order: ['收藏系统视图页当排障速查表', '模拟一次锁等待并排查（实验 1）', '今后每个真实故障 10 分钟记录成案例'],
        labs: [['制造并排查一次锁等待', '两个会话互锁，用 pg_locks + pg_stat_activity 定位并 kill'], ['连接数打满演练', '小 max_connections 下打满连接，观察报错并解决']],
        checks: ['锁等待/死锁知道查哪些视图', '连接数耗尽的两个应急手段', '能讲清复制槽不消费导致 WAL 堆积的链路'],
      },
    },
  },
  clickhouse: {
    label: 'ClickHouse 学习线',
    positioning: '定位：**与 Doris 同赛道的列式分析库，对照学习**。学 CK 不是为了替换 Doris，而是通过对比（MergeTree vs Doris 存储模型、Keeper vs BDB JE）更深地理解两者；CK 的向量检索知识已在向量库副线覆盖，本线聚焦 CK 本体。',
    relations: '- 与 Doris 主线：每个主题都做一次“CK vs Doris”对照笔记，这是本线最大价值；\n- 与向量库副线：CK 向量检索（annindexes）素材在 V2 主题，这里不重复；\n- CK 官方文档含**完整中文版**（文档站语言切换 zh）；\n- 节奏：不占用 Doris 主线排期，利用间隙推进。',
    topics: {
      '01-架构原理': {
        oneline: 'MergeTree 引擎、稀疏索引、列存', intro: 'CK 的一切围绕 MergeTree 引擎家族：主键稀疏索引、分区、列式存取——和 Doris 的分区分桶对照着看。',
        rows: [
          `| 1 | 官方文档：What is ClickHouse | 文档 | [Intro](${CK}/intro) | ⭐⭐⭐⭐⭐ | 未开始 | 列存与 OLAP 定位，官方有中文版 |`,
          `| 2 | 官方文档：MergeTree 引擎 | 文档 | [MergeTree](${CK}/engines/table-engines/mergetree-family/mergetree) | ⭐⭐⭐⭐⭐ | 未开始 | 主键稀疏索引/分区/数据部分——CK 的核心引擎 |`,
          `| 3 | B站：ClickHouse 解析教程（14 集） | 视频 | [B 站观看](https://www.bilibili.com/video/BV1xg411w7AP/) | ⭐⭐⭐⭐ | 未开始 | 中文讲解较系统的一版 |`,
        ],
        order: ['读 Intro 建立列存与 OLAP 直觉', '跟 B 站教程过一遍核心概念', '精读 MergeTree 页：主键=排序键≠唯一键、稀疏索引——对照 Doris 的前缀索引写笔记'],
        labs: [['Docker 起 CK 并建第一张 MergeTree 表', 'clickhouse-client 连入，建表插入查询走通'], ['观察数据目录', '看 part 目录结构，理解“数据部分/part”的物理形态']],
        checks: ['能讲清 CK 主键是“排序键+稀疏索引”而非唯一约束（与 Doris 主键模型对比）', '知道 part 与分区的关系', '说清 CK 与 Doris 在定位上的同与不同'],
      },
      '02-部署与变更': {
        oneline: '单机安装、集群拓扑、Keeper', intro: '目标：Docker 完成 CK 单机部署；理解集群模式下 ClickHouse Keeper 的角色（对照 Doris 的 BDB JE）。',
        rows: [
          `| 1 | 官方文档：安装 | 文档 | [Install](${CK}/install) | ⭐⭐⭐⭐⭐ | 未开始 | 各平台安装与快速开始 |`,
          `| 2 | B站：黑马 ClickHouse 教程（14 集） | 视频 | [B 站观看](https://www.bilibili.com/video/BV1mm4y1Q7Gu/) | ⭐⭐⭐ | 未开始 | 含安装分集，入门节奏友好 |`,
          `| 3 | B站：ClickHouse 高级教程 12 讲 | 视频 | [B 站观看](https://www.bilibili.com/video/BV1rQ4y1R7Tb/) | ⭐⭐⭐ | 未开始 | 概述/安装准备/单机安装，偏进阶 |`,
        ],
        order: ['Docker 单机跑起来（实验 1）', '读 Install 页了解生产部署要求', '有余力研究 Keeper 与集群拓扑——它承担和 Doris BDB JE 类似的协调角色'],
        labs: [['Docker 单机部署 CK', '跑通 clickhouse-client 与 HTTP 两种访问方式'], ['配置文件初探', '找到 config.xml / users.xml，改一个端口并重启验证']],
        checks: ['能独立完成单机部署', '说清 config.xml 与 users.xml 的分工', '知道集群模式下 Keeper 替代 ZooKeeper 的作用'],
      },
      '03-监控与可观测': {
        oneline: 'system 库、内置 /metrics 端点', intro: 'CK 排障与监控的宝库是 system 库（几十张系统表），且内置 Prometheus /metrics 端点可直接对接。',
        rows: [
          `| 1 | 官方文档：监控 | 文档 | [Monitoring](${CK}/operations/monitoring) | ⭐⭐⭐⭐⭐ | 未开始 | 内置 /metrics 端点与监控思路 |`,
          `| 2 | 官方文档：系统表 | 文档 | [System Tables](${CK}/operations/system-tables) | ⭐⭐⭐⭐⭐ | 未开始 | system.metrics / events / query_log——排障核心 |`,
        ],
        order: ['读 Monitoring 并把 /metrics 接入 Prometheus（实验 1）', '把常用 system 表查询（慢查询、当前会话、part 统计）沉淀到笔记', '对照 Doris 的监控指标页，写一份两者指标对照表'],
        labs: [['接入 Prometheus', '访问 /metrics 端点并在 Prometheus 中看到 CK 指标'], ['玩转 query_log', '从 system.query_log 找出最耗时的 5 条查询']],
        checks: ['知道慢查询/当前负载/存储分布分别查哪张 system 表', '能把 CK 指标接入现有监控体系', '理解 query_log 与 Doris 审计日志的对应关系'],
      },
      '04-备份恢复与容灾': {
        oneline: 'BACKUP/RESTORE、ReplicatedMergeTree', intro: 'CK 有原生 BACKUP/RESTORE SQL（可到 S3/磁盘）；高可靠靠 ReplicatedMergeTree + Keeper，与 Doris 多副本机制对照学。',
        rows: [
          `| 1 | 官方文档：备份 | 文档 | [Backup](${CK}/operations/backup) | ⭐⭐⭐⭐⭐ | 未开始 | BACKUP TO S3 / Disk，原生 SQL 操作 |`,
          `| 2 | 官方文档：ReplicatedMergeTree | 文档 | [Replication](${CK}/engines/table-engines/mergetree-family/replication) | ⭐⭐⭐⭐⭐ | 未开始 | 副本同步机制，依赖 Keeper 协调 |`,
          `| 3 | 对照阅读：Doris 备份问答（本站课件） | 图文 | [第 2 课追问](/learn/02-doris) | ⭐⭐⭐ | 未开始 | Doris 快照导出 vs CK BACKUP TO S3 的对照 |`,
        ],
        order: ['实验 1：BACKUP 到本地磁盘再 RESTORE', '读 Replication 页理解副本同步与 Keeper 角色', '写对照笔记：CK 副本（Keeper 协调）vs Doris 副本（FE 调度）'],
        labs: [['BACKUP/RESTORE 闭环', '备份一张表到磁盘目录，删表后恢复'], ['（选做）双副本实验', 'Docker 起 Keeper + 两个 CK 副本，验证写一份读两份']],
        checks: ['能独立完成 BACKUP/RESTORE', '说清 ReplicatedMergeTree 中 Keeper 承担什么', '对比 CK 与 Doris 的副本协调机制差异'],
      },
      '05-账号与安全': {
        oneline: 'RBAC 访问控制、users.xml 与 SQL 双轨', intro: 'CK 权限既可用 users.xml 配置，也支持 SQL 驱动的 RBAC（推荐）；对照 Doris 的 MySQL 式权限模型。',
        rows: [
          `| 1 | 官方文档：访问控制与权限 | 文档 | [Access Rights](${CK}/operations/access-rights) | ⭐⭐⭐⭐⭐ | 未开始 | SQL 驱动的 RBAC：用户/角色/行策略 |`,
          `| 2 | B站搜索：ClickHouse 权限管理 | 视频 | [B 站搜索](https://search.bilibili.com/all?keyword=ClickHouse%20权限) | ⭐⭐ | 未开始 | 按质量筛选后登记 |`,
        ],
        order: ['精读 Access Rights（用户/角色/配额/行策略）', '实验：SQL 创建只读用户并验证', '对照 Doris 的 GRANT 模型写差异笔记'],
        labs: [['SQL 建只读用户', 'CREATE USER + GRANT SELECT，验证越权写被拒'], ['行策略初体验', '给某表加 ROW POLICY，不同用户看到不同行']],
        checks: ['说清 users.xml 与 SQL RBAC 的关系与推荐用法', '会建行级访问策略', '知道配额（quota）能防什么'],
      },
      '06-数据集成': {
        oneline: 'Kafka 引擎、文件导入、丰富集成生态', intro: 'CK 集成生态极广：Kafka 表引擎做流式摄入，INSERT FROM File 做批量，官方集成页是总目录。',
        rows: [
          `| 1 | 官方文档：集成总目录 | 文档 | [Integrations](${CK}/integrations) | ⭐⭐⭐⭐⭐ | 未开始 | Kafka/S3/MySQL/PG 等全部集成的入口 |`,
          `| 2 | 官方文档：Kafka 表引擎 | 文档 | [Kafka Engine](${CK}/engines/table-engines/integrations/kafka) | ⭐⭐⭐⭐ | 未开始 | 流式摄入的经典组合：Kafka 引擎 + 物化视图 |`,
        ],
        order: ['浏览集成总目录，标记与你们技术栈相关的条目', '实验 1：INSERT FROM File 批量导入 CSV', '有余力做 Kafka 引擎+物化视图链路', '对照 Doris 的 Stream Load/CDC 写对比笔记'],
        labs: [['CSV 批量导入', 'INSERT INTO ... FROM INFILE 导入 10 万行并计时'], ['（选做）Kafka 摄入链路', 'Docker 起 Kafka，建 Kafka 引擎表+物化视图落 MergeTree']],
        checks: ['知道 Kafka 引擎表本身不存数据、需物化视图落盘', '能对照 Doris Stream Load 说清两者摄入模型差异', '会查集成目录找官方连接器'],
      },
      '07-性能与容量': {
        oneline: '排序键设计、物化视图、Projection', intro: 'CK 性能的核心在表设计：排序键决定稀疏索引有效性；物化视图与 Projection 做预聚合加速。',
        rows: [
          `| 1 | 官方文档：MergeTree（排序键与稀疏索引） | 文档 | [MergeTree](${CK}/engines/table-engines/mergetree-family/mergetree) | ⭐⭐⭐⭐⭐ | 未开始 | 性能的地基：ORDER BY 键设计 |`,
          `| 2 | 官方文档：优化与指南（站内导航） | 文档 | [Docs 首页](${CK}/intro) | ⭐⭐⭐ | 未开始 | 从站内 Guides 进入性能优化专题 |`,
          `| 3 | B站搜索：ClickHouse 性能优化 | 视频 | [B 站搜索](https://search.bilibili.com/all?keyword=ClickHouse%20性能优化) | ⭐⭐ | 未开始 | 按质量筛选后登记 |`,
        ],
        order: ['重读 MergeTree 页，吃透排序键与稀疏索引', '实验：同一份数据两种排序键，对比查询耗时', '了解物化视图/Projection 的预聚合思路', '对照 Doris 的前缀索引与物化视图写对比笔记'],
        labs: [['排序键对比实验', '同数据两种 ORDER BY 键，按过滤条件查耗时差异'], ['物化视图加速', '为高频聚合查询建物化视图，对比前后耗时']],
        checks: ['能解释稀疏索引为什么要求“过滤条件命中排序键前缀”', '知道物化视图与 Projection 各自适用场景', '能对照 Doris 前缀索引讲清两者异曲同工之处'],
      },
      '08-日常运维与故障案例': {
        oneline: 'system 表排障、案例沉淀', intro: 'CK 排障第一工具是 system 库；把每一次 CK 相关问题的处理沉淀为案例。',
        rows: [
          `| 1 | 官方文档：系统表（排障速查） | 文档 | [System Tables](${CK}/operations/system-tables) | ⭐⭐⭐⭐⭐ | 未开始 | system.parts / mutations / replication_queue 等 |`,
          `| 2 | 官方文档：故障排查 | 文档 | [Troubleshooting](${CK}/operations/troubleshooting) | ⭐⭐⭐⭐ | 未开始 | 官方排障入口 |`,
          `| 3 | 站内沉淀：CK 故障案例库 | 站内 | [学习笔记](/clickhouse/08-日常运维与故障案例/01-学习笔记) | ⭐⭐⭐⭐⭐ | 持续 | 每处理一次 CK 问题记录一篇 |`,
        ],
        order: ['收藏系统表页当排障速查', '实验 1：从 system.parts 发现小文件过多问题', '真实问题随时沉淀案例'],
        labs: [['排查 part 过多（Too many parts）', '高频小批量写入制造 part 膨胀，从 system.parts 观察到处理'], ['只读查询一次复制队列', '（有副本环境时）查 system.replication_queue 找积压原因']],
        checks: ['知道 Too many parts 的成因与预防', '会用 system 表定位慢查询/失败变更/复制积压', '每个真实案例都能按模板讲清来龙去脉'],
      },
    },
  },
}

let created = 0, skipped = 0
function put(rel, content) {
  const abs = join(root, rel)
  if (existsSync(abs)) { skipped++; console.log('SKIP(已存在):', rel); return }
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content, 'utf8')
  created++; console.log('OK:', rel)
}

for (const [line, d] of Object.entries(LINES)) {
  put(join(line, '00-知识地图.md'), mapTpl(line, d))
  for (const [dir, label] of TOPIC_DEFS) {
    const t = d.topics[dir]
    put(join(line, dir, '00-素材清单.md'), materialTpl(label, t))
    put(join(line, dir, '01-学习笔记.md'), notesTpl(label))
    put(join(line, dir, '02-实验任务.md'), labTpl(label, t.labs))
    put(join(line, dir, '03-自检清单.md'), checkTpl(label, t.checks))
  }
}
console.log(`\n完成：新建 ${created} 个文件，跳过 ${skipped} 个已存在文件。`)
