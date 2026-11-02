// 骨架脚手架：批量生成全部主题目录与四件套页面（素材清单/学习笔记/实验任务/自检清单）
// 用法：node scaffold.mjs（重复执行安全，会覆盖模板文件——学习启动后请直接编辑 md，不要再跑本脚本）
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const DOCS = join(ROOT, 'docs')

// ---------------- 主题数据 ----------------
const dorisTopics = [
  {
    dir: '01-架构原理', name: '架构原理',
    intro: '一切运维的前提：FE/BE 分工、数据模型、读写路径。后续所有排障思路都从这里长出来。',
    entries: [
      ['Doris 官方中文文档（切换 4.0/最新版本）', 'https://doris.apache.org/zh-CN/docs/gettingStarted/what-is-apache-doris'],
      ['本主题章节：Doris 简介 / 架构 / 数据表设计（模型·分区·分桶）/ Compaction', ''],
      ['SelectDB 官网（博客/白皮书/课程）', 'https://www.selectdb.com/'],
    ],
    experiments: [
      '【本地】Docker 单机部署 Doris，跑通 show frontends / show backends，记录 FE/BE 进程与端口',
      '【本地】建表观察 分区→分桶→tablet 分布（show partitions / show tablets from 表名）',
      '【本地】小批量多次导入触发 Compaction，观察 rowset 数量变化',
    ],
    understanding: [
      '能画出 FE/BE/Broker 架构图并说明各组件职责',
      'FE Leader/Follower/Observer 三种角色的区别与选举机制',
      '三种数据模型（Duplicate/Aggregate/Unique）的原理与选型场景',
      '分区与分桶的设计原则，桶数如何估算',
      'Compaction 解决什么问题，rowset 是什么',
    ],
    handsOn: [
      '在本机 Docker 环境独立完成一次 Doris 单机部署并连上 mysql 客户端',
      '建一张分区表并用 show tablets 解释 tablet 分布',
      '用官方文档在 10 分钟内说清一次查询从 FE 到 BE 的执行路径',
    ],
  },
  {
    dir: '02-部署与变更', name: '部署与变更',
    intro: '部署规划、配置管理、扩缩容、升级回滚——生产变更的全部动作都在这里规范化。',
    entries: [
      ['Doris 官方中文文档（切换 4.0/最新版本）', 'https://doris.apache.org/zh-CN/docs/gettingStarted/what-is-apache-doris'],
      ['本主题章节：安装部署 / 集群管理（扩缩容·升级）/ 配置文件', ''],
      ['SelectDB 官网（博客/白皮书/课程）', 'https://www.selectdb.com/'],
    ],
    experiments: [
      '【测试机】按生产标准完整部署 1FE+1BE，沉淀部署 checklist',
      '【测试机】修改 FE/BE 关键配置（内存、并发、元数据目录）并验证生效',
      '【本地】模拟 BE 扩缩容，观察 tablet 自动均衡过程与进度',
    ],
    understanding: [
      '部署前的硬件选型与端口规划清单能默写',
      'FE 元数据目录对磁盘的要求及原因',
      '滚动升级的完整步骤与每一步的检查点',
      'BE 扩容后数据如何自动均衡、如何观察进度',
      '存算一体与存算分离（3.0+）架构差异',
    ],
    handsOn: [
      '在测试机从零完成一次标准部署并产出可复用的 checklist',
      '编写升级演练方案：升级前检查→滚动升级→验证→回滚预案',
      '排查一个故意制造的部署故障（如端口占用/JDK 版本不符）',
    ],
  },
  {
    dir: '03-监控与可观测', name: '监控与可观测',
    intro: '指标体系、监控对接、审计日志、日常巡检——让集群问题在用户感知前被发现。',
    entries: [
      ['Doris 官方中文文档（切换 4.0/最新版本）', 'https://doris.apache.org/zh-CN/docs/gettingStarted/what-is-apache-doris'],
      ['本主题章节：监控运维（指标/报警）/ 审计日志', ''],
      ['SelectDB 官网（博客/白皮书/课程）', 'https://www.selectdb.com/'],
    ],
    experiments: [
      '【测试机】Prometheus 抓取 FE/BE /metrics，导入官方 Grafana 看板并接入公司告警体系',
      '【测试机】开启审计日志，用它定位一条慢查询的全过程',
      '【测试机】编写每日巡检脚本（进程/端口/tablet 健康/磁盘水位）并挂 cron',
    ],
    understanding: [
      'FE/BE 各列举 5 个以上核心指标并解释含义',
      '磁盘水位、BE 宕机、tablet 不健康分别应配置什么告警',
      '慢查询定位的两条路径：audit log 与 query profile',
      'FE/BE 日志文件的分类与常见报错关键字',
      '公司现有监控体系接入 Doris 指标的方案',
    ],
    handsOn: [
      '完成 Prometheus+Grafana 对测试集群的完整接入并截图存档',
      '用审计日志完整还原一次慢查询的定位过程',
      '巡检脚本上线并连续跑 3 天无漏报',
    ],
  },
  {
    dir: '04-备份恢复与容灾', name: '备份恢复与容灾',
    intro: '数据安全的底线：Backup/Restore、回收站、CCR 主备容灾，以及必须实际演练过的恢复流程。',
    entries: [
      ['Doris 官方中文文档（切换 4.0/最新版本）', 'https://doris.apache.org/zh-CN/docs/gettingStarted/what-is-apache-doris'],
      ['本主题章节：数据备份恢复（Backup/Restore）/ CCR 跨集群同步 / 回收站', ''],
      ['SelectDB 官网（博客/白皮书/课程）', 'https://www.selectdb.com/'],
    ],
    experiments: [
      '【测试机】创建 repository（本地/NAS/对象存储），完成库级 backup 与 restore 全流程',
      '【测试机】drop 表后通过回收站（FLASHBACK）恢复，记录保留时间窗口',
      '【测试机】完整恢复演练：backup→新库 restore→行数与抽样校验，输出演练记录',
    ],
    understanding: [
      '备份仓库（Repository）支持哪些远端存储，天翼云场景如何选择',
      'backup/restore 基于快照的原理与执行期间的影响',
      '表级/分区级/库级恢复的操作差异',
      'CCR 主备容灾的适用场景与限制',
      '回收站（Trash）的保留机制与相关配置',
    ],
    handsOn: [
      '在测试机完成备份到恢复的完整闭环并写演练记录',
      '用 FLASHBACK 恢复一张误删的表并验证数据完整',
      '写出本集群的 RTO/RPO 目标与差距分析',
    ],
  },
  {
    dir: '05-账号与安全', name: '账号与安全',
    intro: 'RBAC 权限、行列级控制、审计合规、密码策略——给生产集群上一把靠谱的锁。',
    entries: [
      ['Doris 官方中文文档（切换 4.0/最新版本）', 'https://doris.apache.org/zh-CN/docs/gettingStarted/what-is-apache-doris'],
      ['本主题章节：账户与权限管理（RBAC/行列权限）/ 安全（TLS 等）', ''],
      ['SelectDB 官网（博客/白皮书/课程）', 'https://www.selectdb.com/'],
    ],
    experiments: [
      '【测试机】设计并落地 RBAC 角色体系，验证库/表粒度权限边界',
      '【测试机】行级、列级权限实验：同一张表不同账号看到不同数据',
      '【测试机】配置密码策略，输出默认账号（root/admin）整改基线',
    ],
    understanding: [
      'RBAC 中 user/role/db/table 的权限层级关系',
      '行级权限与列级权限的语法与适用场景',
      '默认账号的安全整改项清单',
      '密码复杂度/过期策略相关参数',
      '开启 TLS 的步骤与对客户端的影响面',
    ],
    handsOn: [
      '在测试机落地一套最小权限的角色模型并验证越权被拒',
      '用审计日志找到一条权限拒绝（ACCESS DENIED）记录',
      '产出可直接执行的安全基线文档（密码策略+默认账号整改）',
    ],
  },
  {
    dir: '06-数据集成', name: '数据集成',
    intro: '数据怎么进来、怎么出去：五种导入方式、CDC 实时同步、导出归档、Multi-Catalog 外表。',
    entries: [
      ['Doris 官方中文文档（切换 4.0/最新版本）', 'https://doris.apache.org/zh-CN/docs/gettingStarted/what-is-apache-doris'],
      ['本主题章节：数据导入（各方式）/ 数据导出 / Multi-Catalog 与湖仓一体', ''],
      ['SelectDB 官网（博客/白皮书/课程）', 'https://www.selectdb.com/'],
    ],
    experiments: [
      '【测试机】Stream Load 导入 CSV 与 JSON，观察返回值与 rowset 变化',
      '【测试机】Broker Load 跑一次大批量历史数据导入并记录速率',
      '【测试机】按公司技术栈验证一条 MySQL→Doris 实时同步链路（Flink CDC 或 DataX）',
    ],
    understanding: [
      '五种导入方式（Stream/Broker/Routine/Insert/Connector）的适用场景对比',
      'Stream Load 的 label 幂等机制与重试策略',
      'Routine Load 消费 Kafka 的断点与异常处理',
      '导入失败的标准排查路径（错误 URL 与 error log）',
      'Multi-Catalog 对接外部数据源的配置方法',
    ],
    handsOn: [
      '三种以上导入方式各完成一次成功导入并记录适用结论',
      '跑通 MySQL→Doris 同步并验证增量数据的时效性',
      '用 SELECT INTO OUTFILE 导出数据并归档验证',
    ],
  },
  {
    dir: '07-性能与容量', name: '性能与容量',
    intro: '执行计划分析、Join 优化、负载管理、冷热分层——生产稳定运行的深水区。',
    entries: [
      ['Doris 官方中文文档（切换 4.0/最新版本）', 'https://doris.apache.org/zh-CN/docs/gettingStarted/what-is-apache-doris'],
      ['本主题章节：查询加速（Join 优化/物化视图/统计信息）/ 内存与负载管理 / 存储冷热分层', ''],
      ['SelectDB 官网（博客/白皮书/课程）', 'https://www.selectdb.com/'],
    ],
    experiments: [
      '【测试机】对一条慢 SQL 用 explain / explain verbose 分析并优化，记录前后对比',
      '【测试机】同一张表对比不同分桶数的查询性能，理解桶数的影响',
      '【测试机】配置 Workload Group，验证大查询被隔离与限制的效果',
    ],
    understanding: [
      '执行计划里重点看什么（Join 方式/扫描行数/算子耗时）',
      'Colocate Join 与 Bucket Shuffle Join 的条件与收益',
      '统计信息对优化器的作用与收集方式',
      '磁盘空间不足的分级应急处理步骤',
      '大查询限制（超时/内存/扫描量）的参数族',
    ],
    handsOn: [
      '完成一次有前后数据对比的慢 SQL 优化实录',
      '落地一套 Workload Group 资源分组并验证隔离效果',
      '输出本集群的容量水位基线与告警阈值建议',
    ],
  },
  {
    dir: '08-日常运维与故障案例', name: '日常运维与故障案例',
    intro: '运维岗的看家本领：主从切换、副本修复、磁盘应急，沉淀成可复用的案例库与预案。',
    entries: [
      ['Doris 官方中文文档（切换 4.0/最新版本）', 'https://doris.apache.org/zh-CN/docs/gettingStarted/what-is-apache-doris'],
      ['本主题章节：集群管理 FAQ / 常见问题排查 / Admin 命令', ''],
      ['SelectDB 官网（博客/白皮书/课程）', 'https://www.selectdb.com/'],
    ],
    experiments: [
      '【测试机】FE 主从切换演练：kill Leader 观察选举与业务影响窗口',
      '【测试机】停掉 BE，观察 tablet 不健康状态与副本自动修复全过程',
      '【测试机】磁盘写满模拟与紧急处理（清理 trash / drop 分区）',
    ],
    understanding: [
      'FE Leader 宕机后的影响与自动恢复过程',
      'BE 宕机时副本机制的自我修复逻辑与风险窗口',
      'tablet 不健康的判断方法与修复命令',
      '磁盘满的分级处理预案（先做什么后做什么）',
      '元数据一致性的检查手段',
    ],
    handsOn: [
      '完成 FE 切换与 BE 故障两个演练并记录恢复时间',
      '沉淀 3 个以上真实/模拟故障案例进案例库（现象→定位→处理→预防）',
      '把巡检与应急动作整理成本集群的应急预案文档',
    ],
  },
]

const vectorTopics = [
  {
    dir: '01-基础原理', name: '基础原理（V1）',
    intro: 'Embedding、ANN 检索（HNSW/IVF）、距离度量。不懂原理，选型对比就是看热闹。',
    entries: [
      ['Milvus 官方文档（原理与架构章节）', 'https://milvus.io/docs'],
      ['Qdrant 官方文档（索引原理章节）', 'https://qdrant.tech/documentation/'],
      ['B 站/知乎优质中文综述（按质量筛选后登记）', ''],
    ],
    experiments: [
      '【本地】Python 生成 embedding 并计算余弦相似度，理解文本向量化',
      '【本地】10 万随机向量：暴力检索 vs 近似检索的延迟与召回对比',
    ],
    understanding: [
      'Embedding 是什么，文本/图片如何变成向量',
      '高维检索为什么不精确匹配（维度灾难）',
      'HNSW 与 IVF 的原理差异与取舍',
      '余弦相似度 / 内积 / L2 距离的适用场景',
      'TopK 检索中召回率与延迟的权衡',
    ],
    handsOn: [
      '用 Python 完成一次向量化与相似度计算小实验',
      '复现暴力 vs ANN 检索对比并记录数据',
    ],
  },
  {
    dir: '02-选型对比', name: '选型对比（V2+V3）',
    intro: '主流方案横向对比 + 运维视角评估：好不好部署、坏了好不好修、监控全不全、备份怎么做。',
    entries: [
      ['Milvus 安装文档（Docker Compose standalone）', 'https://milvus.io/docs'],
      ['Qdrant 安装文档（Docker）', 'https://qdrant.tech/documentation/'],
      ['PGVector / Weaviate / ES 向量检索官方文档', ''],
    ],
    experiments: [
      '【本地】Docker 分别跑 Milvus standalone 与 Qdrant，完成建表→插入→检索闭环',
      '【本地】记录两者空载与压测时的资源占用（内存/CPU/磁盘）与部署依赖',
      '【本地】可选：Postgres+PGVector 镜像体验，对比 SQL 式用法',
    ],
    understanding: [
      '各候选方案的部署形态与外部依赖对比',
      '数据量增长后各方案的内存/磁盘策略',
      '各方案的备份恢复与监控方案差异',
      '高可用形态（单机/集群/分布式）差异',
      '面向运维岗的选型评分表如何设计',
    ],
    handsOn: [
      '独立完成 Milvus 与 Qdrant 的 Docker 部署与检索闭环',
      '填写选型对比报告中的运维对比矩阵至少 5 行',
    ],
  },
  {
    dir: '03-Doris向量检索实践', name: 'Doris 向量检索实践（V4）',
    intro: 'Doris 4.0 原生向量能力：与主线共用一套技术栈，是运维成本最低的候选方案，优先深挖。',
    entries: [
      ['Doris 官方中文文档（4.0）· 向量检索章节', 'https://doris.apache.org/zh-CN/docs/gettingStarted/what-is-apache-doris'],
      ['Doris GitHub Releases（4.0 向量能力变更）', 'https://github.com/apache/doris/releases'],
      ['SelectDB 官网向量检索相关博客', 'https://www.selectdb.com/'],
    ],
    experiments: [
      '【测试机】Doris 4.0 建含向量列的表并创建向量索引',
      '【测试机】插入向量数据并执行 TopK 近似检索（距离函数）',
      '【测试机】与 Milvus 对比同规模数据的检索延迟，记录到选型报告',
    ],
    understanding: [
      'Doris 向量类型与向量索引的建表语法',
      '距离函数与 TopK 查询的写法',
      '向量索引的构建方式与内存开销',
      '标量过滤 + 向量混合查询在 Doris 中的优势',
      'Doris 向量检索的能力边界（对比专用向量库）',
    ],
    handsOn: [
      '在测试机完成向量表建索引与检索全流程',
      '完成 Doris vs Milvus 的延迟对比实验并更新报告',
    ],
  },
]

// ---------------- 模板 ----------------
const statusLegend = '> 状态图例：`未开始` / `学习中` / `已学完` / `过时风险`\n> 版本红线：所有素材标注适用版本；与官方 4.0 文档冲突时，以官方文档为准。'

function materialTpl(t) {
  const entryLines = t.entries
    .map(([label, url]) => (url ? `- [${label}](${url})` : `- ${label}`))
    .join('\n')
  return `# ${t.name} · 素材清单

> ${t.intro}

${statusLegend}

## 官方与优先入口

${entryLines}

## 素材台账

| # | 素材名称 | 类型 | 链接/位置 | 适用版本 | 推荐度 | 状态 | 备注 |
|---|----------|------|-----------|----------|--------|------|------|
| 1 | （示例行，可删除后追加真实素材） | 视频/文章/文档 | https:// | 4.0 | ⭐⭐⭐ | 未开始 |  |
| 2 |  |  |  |  |  |  |  |

## 收集规则提醒

- 每主题精选 3-5 个精品视频；评分维度：内容深度 > 生产相关性 > 讲解质量 > 播放量
- 英文视频分级：核心视频下载烧录中文字幕；一般视频转写成中文图文笔记
- 1.x/2.x 独有内容在备注列标记「过时风险」，进入 4.0.7 生产前必须核对官方文档
`
}

function notesTpl(t) {
  return `# ${t.name} · 学习笔记

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
}

function labTpl(t) {
  const sections = t.experiments
    .map((e, i) => `## 实验 ${i + 1}：${e}

- 目标：
- 步骤：
- 期望结果：
- 验证方式：
- 踩坑记录：
`)
    .join('\n')
  return `# ${t.name} · 实验任务

> 环境约定：【本地】= 本机 Docker；【测试机】= 公司测试环境（1FE+1BE）。
> 安全红线：生产集群只读观察，禁止在生产执行本页任何命令。

${sections}
## 新增实验模板（复制使用）

### 实验 N：名称

- 目标：
- 步骤：
- 期望结果：
- 验证方式：
- 踩坑记录：
`
}

function checkTpl(t) {
  const u = t.understanding.map((q, i) => `- [ ] ${i + 1}. ${q}`).join('\n')
  const h = t.handsOn
    .map((q, i) => `- [ ] ${t.understanding.length + i + 1}. ${q}`)
    .join('\n')
  return `# ${t.name} · 自检清单

> 学完本主题后逐条自问，能完整讲出来才打勾。答不上的，回到素材清单定位对应材料重学。
> 全部打勾 = 本主题合格（团队培训时即考核标准）。

## 基础理解

${u}

## 动手能力

${h}
`
}

// ---------------- 生成 ----------------
function generate(base, topics) {
  for (const t of topics) {
    const dir = join(DOCS, base, t.dir)
    mkdirSync(dir, { recursive: true })
    const files = {
      '00-素材清单.md': materialTpl(t),
      '01-学习笔记.md': notesTpl(t),
      '02-实验任务.md': labTpl(t),
      '03-自检清单.md': checkTpl(t),
    }
    for (const [file, content] of Object.entries(files)) {
      const p = join(dir, file)
      writeFileSync(p, content, 'utf8')
      console.log(`  ${existsSync(p) ? '更新' : '新建'} ${base}/${t.dir}/${file}`)
    }
  }
}

console.log('开始生成主题四件套…')
generate('doris', dorisTopics)
generate('vector', vectorTopics)
console.log('完成。提示：学习启动后请直接编辑 md 文件，勿再重复执行本脚本覆盖。')
