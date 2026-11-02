import { defineConfig } from 'vitepress'
import { notesApi } from './notesApi.mts'

// Doris 主线 8 大主题（目录名与侧边栏展示名）
const dorisTopics = [
  ['01-架构原理', '01 · 架构原理'],
  ['02-部署与变更', '02 · 部署与变更'],
  ['03-监控与可观测', '03 · 监控与可观测'],
  ['04-备份恢复与容灾', '04 · 备份恢复与容灾'],
  ['05-账号与安全', '05 · 账号与安全'],
  ['06-数据集成', '06 · 数据集成'],
  ['07-性能与容量', '07 · 性能与容量'],
  ['08-日常运维与故障案例', '08 · 日常运维与故障案例'],
]

// 向量库副线（与知识地图 V1-V5 对应）
const vectorTopics = [
  ['01-基础原理', '01 · 基础原理（V1）'],
  ['02-选型对比', '02 · 选型对比（V2+V3）'],
  ['03-Doris向量检索实践', '03 · Doris 向量检索实践（V4）'],
]

// PostgreSQL / ClickHouse 学习线（主题结构与 Doris 主线一致）
const pgTopics = [...dorisTopics]
const ckTopics = [...dorisTopics]

// 每个主题固定的四件套页面
const topicDocs = [
  ['00-素材清单', '素材清单'],
  ['01-学习笔记', '学习笔记'],
  ['02-实验任务', '实验任务'],
  ['03-自检清单', '自检清单'],
]

// 生成主题侧边栏分组
function topicSections(base: string, topics: string[][]) {
  return topics.map(([dir, label]) => ({
    text: label,
    collapsed: true,
    items: topicDocs.map(([file, docLabel]) => ({
      text: docLabel,
      link: `/${base}/${dir}/${file}`,
    })),
  }))
}

// 部署到 GitHub Pages 时自动适配路径：
// - 仓库名是 <用户名>.github.io → 站点在根路径 /
// - 其他仓库名 → 站点在 /<仓库名>/ 下
// 本地 dev / 本地构建（无 GITHUB_REPOSITORY 环境变量）仍然是 /
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const siteBase = repoName ? (repoName.endsWith('.github.io') ? '/' : `/${repoName}/`) : '/'

export default defineConfig({
  base: siteBase,
  lang: 'zh-CN',
  title: '知序 · 数据库学习',
  description: '从一个原理开始，连接数据库知识与运维现场。Doris 中文入门学习空间。',
  ignoreDeadLinks: false,
  // 本地笔记编辑器 API（仅 docs:dev 生效）
  vite: { plugins: [notesApi()] },
  themeConfig: {
    nav: [
      { text: 'Doris 主线', link: '/doris/01-架构原理/00-素材清单' },
      { text: 'PostgreSQL', link: '/pgsql/00-知识地图' },
      { text: 'ClickHouse', link: '/clickhouse/00-知识地图' },
      { text: '向量库副线', link: '/vector/00-知识地图' },
      { text: '零基础原理课', link: '/learn/01-database' },
      { text: '知识地图', items: [
        { text: '今日学习流程 SOP', link: '/guide/学习流程' },
        { text: 'Doris 知识地图', link: '/doris/00-知识地图' },
        { text: 'PostgreSQL 知识地图', link: '/pgsql/00-知识地图' },
        { text: 'ClickHouse 知识地图', link: '/clickhouse/00-知识地图' },
        { text: '向量库知识地图', link: '/vector/00-知识地图' },
        { text: '学习计划与里程碑', link: '/guide/学习计划' },
      ] },
      { text: '更多', items: [
        { text: '更新学习进度', link: '/guide/学习进度' },
        { text: '写笔记（网页版）', link: '/guide/写笔记' },
        { text: '学习资料', link: '/resources/素材总索引' },
        { text: '怎么使用本站', link: '/guide/使用说明' },
        { text: '回到首页', link: '/' },
      ] },
    ],
    sidebar: {
      '/learn/': [
        { text: '起步 · 先建立直觉', items: [
          { text: '01 数据库在做什么', link: '/learn/01-database' },
          { text: '02 FE 与 BE 的分工', link: '/learn/02-doris' },
          { text: '03 数据是怎么放的', link: '/learn/03-storage' },
        ] },
        { text: '接下来，不着急', items: [
          { text: '架构原理 · 学习入口', link: '/doris/01-架构原理/01-学习笔记' },
          { text: '可选 · 测试机只读观察', link: '/doris/01-架构原理/02-实验任务' },
          { text: '原理配套资料', link: '/doris/01-架构原理/00-素材清单' },
          { text: '完整知识地图', link: '/doris/00-知识地图' },
        ] },
      ],
      '/guide/': [
        { text: '使用说明', link: '/guide/使用说明' },
        { text: '每日学习流程 SOP', link: '/guide/学习流程' },
        { text: '学习计划与复习机制', link: '/guide/学习计划' },
        { text: '更新学习进度', link: '/guide/学习进度' },
        { text: '写笔记（网页版）', link: '/guide/写笔记' },
      ],
      '/doris/': [
        { text: '零基础原理课 · 从这里开始', link: '/learn/01-database' },
        { text: '完整知识地图', link: '/doris/00-知识地图' },
        ...topicSections('doris', dorisTopics),
      ],
      '/vector/': [
        { text: '知识地图（从这里开始）', link: '/vector/00-知识地图' },
        ...topicSections('vector', vectorTopics),
        { text: '选型对比报告（最终产出）', link: '/vector/04-选型对比报告' },
      ],
      '/pgsql/': [
        { text: '知识地图（从这里开始）', link: '/pgsql/00-知识地图' },
        ...topicSections('pgsql', pgTopics),
      ],
      '/clickhouse/': [
        { text: '知识地图（从这里开始）', link: '/clickhouse/00-知识地图' },
        ...topicSections('clickhouse', ckTopics),
      ],
      '/resources/': [
        { text: '素材总索引', link: '/resources/素材总索引' },
      ],
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除查询',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },
    footer: {
      message: '先学懂，再动手。个人与团队的数据库学习空间。',
      copyright: '资料保留来源与版本 · 内部使用仍需遵守原作者许可',
    },
    outline: { level: [2, 3], label: '这一课' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  },
})
