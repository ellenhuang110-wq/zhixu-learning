<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { lessons, useLearning } from '../learning'

const { completed, count, nextLesson } = useLearning()
const isDone = (id: string) => completed.value.includes(id)
const ctaText = computed(() =>
  count.value > 0 ? `继续 · ${nextLesson.value.number} ${nextLesson.value.title}` : '开始第 1 课 · 约 10 分钟',
)

// 四条学习线
const lines = [
  {
    tag: '主线 · 进行中', main: true, name: 'Doris 生产运维',
    desc: '生产主力。8 大主题走完「会用、会管、会防、会修」的完整闭环。',
    meta: '8 个主题 · 46 条素材', path: '/doris/00-知识地图',
  },
  {
    tag: '对照线', main: false, name: 'PostgreSQL',
    desc: '关系库通用基本功，也是 pgvector 的宿主。不占主线排期，间隙推进。',
    meta: '8 个主题 · 31 条素材', path: '/pgsql/00-知识地图',
  },
  {
    tag: '对照线', main: false, name: 'ClickHouse',
    desc: '与 Doris 同赛道的列存库，对照着学两边都更深。官方文档有中文版。',
    meta: '8 个主题 · 21 条素材', path: '/clickhouse/00-知识地图',
  },
  {
    tag: '副线 · 第 3 周起', main: false, name: '向量检索',
    desc: '从向量原理到 Doris 4.0 落地实践，穿插在主线间隙进行。',
    meta: '3 个主题 · 17 条素材', path: '/vector/00-知识地图',
  },
]

// 每个主题的四件套怎么用
const loop = [
  { step: '①', name: '素材清单', desc: '每个主题的第一页。先看视频再读文档；版本冲突以官方文档为准。', path: '/doris/01-架构原理/00-素材清单' },
  { step: '②', name: '学习笔记', desc: '网页是橱窗，笔记写在 Markdown 源文件里——一篇笔记对应一个素材。', path: '/guide/使用说明' },
  { step: '③', name: '实验任务', desc: '只在本地 Docker 与测试机动手，生产集群只读观察。', path: '/doris/01-架构原理/02-实验任务' },
  { step: '④', name: '自检清单', desc: '能讲出来才算学会。答不上的条目，回素材清单定位重学。', path: '/doris/01-架构原理/03-自检清单' },
]
</script>

<template>
  <div class="learning-home">
    <section class="home-hero">
      <div class="hero-text">
        <p class="eyebrow">运维视角 · 生产导向</p>
        <h1>把数据库原理，<br /><span class="accent">一点点讲明白</span>。</h1>
        <p class="hero-lead">
          以 Doris 生产运维为主线，PostgreSQL、ClickHouse 对照学习，向量检索作副线。
          每个主题都按「素材 → 笔记 → 实验 → 自检」走完闭环，看懂不算数，会做才算。
        </p>
        <div class="hero-actions">
          <a class="study-button primary" :href="withBase(nextLesson.path)">{{ ctaText }} →</a>
          <a class="study-button ghost" :href="withBase('/guide/学习计划')">看 16 周学习计划</a>
        </div>
        <ul class="hero-stats">
          <li><b>4</b><span>条学习线</span></li>
          <li><b>27</b><span>个主题</span></li>
          <li><b>115</b><span>条已核实素材</span></li>
          <li><b>{{ count }}/3</b><span>原理课已读</span></li>
        </ul>
      </div>

      <div class="hero-visual" aria-hidden="true">
        <svg class="arch-svg" viewBox="0 0 480 340" role="img" aria-label="Doris 查询流向示意图">
          <defs>
            <linearGradient id="feGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#14b8a6" stop-opacity="0.24" />
              <stop offset="1" stop-color="#f59e0b" stop-opacity="0.10" />
            </linearGradient>
          </defs>
          <g class="svg-node svg-client">
            <rect x="170" y="16" width="140" height="44" rx="10" />
            <text x="240" y="43" text-anchor="middle">客户端</text>
          </g>
          <path class="wire" d="M240 60 V 96" />
          <g class="svg-node svg-fe">
            <rect x="140" y="96" width="200" height="66" rx="12" />
            <text x="240" y="122" text-anchor="middle" class="svg-title">FE</text>
            <text x="240" y="145" text-anchor="middle" class="svg-sub">接请求 · 元数据 · 查询计划</text>
          </g>
          <path class="wire w1" d="M176 162 C 132 186 108 200 92 226" />
          <path class="wire w2" d="M240 162 V 226" />
          <path class="wire w3" d="M304 162 C 348 186 372 200 388 226" />
          <g class="svg-node svg-be">
            <rect x="28" y="226" width="128" height="60" rx="10" />
            <text x="92" y="250" text-anchor="middle" class="svg-title">BE 01</text>
            <text x="92" y="271" text-anchor="middle" class="svg-sub">存储 + 计算</text>
          </g>
          <g class="svg-node svg-be">
            <rect x="176" y="226" width="128" height="60" rx="10" />
            <text x="240" y="250" text-anchor="middle" class="svg-title">BE 02</text>
            <text x="240" y="271" text-anchor="middle" class="svg-sub">存储 + 计算</text>
          </g>
          <g class="svg-node svg-be">
            <rect x="324" y="226" width="128" height="60" rx="10" />
            <text x="388" y="250" text-anchor="middle" class="svg-title">BE 03</text>
            <text x="388" y="271" text-anchor="middle" class="svg-sub">存储 + 计算</text>
          </g>
          <text x="240" y="322" text-anchor="middle" class="svg-note">一条查询：客户端 → FE 做计划 → BE 并行干活 → 结果回到客户端</text>
        </svg>
      </div>
    </section>

    <section class="home-section">
      <div class="now-panel">
        <p class="eyebrow">当前位置</p>
        <h2>M1 · 第 1-2 周：先把原理地基打牢</h2>
        <p class="section-lead">主线开工第一周，只有三件事。做完，就算完成第一个学习闭环。</p>
        <ol class="now-list">
          <li>
            <b>读完三节原理课</b>
            <span>下方卡片点开就能读，进度自动记录（当前 {{ count }}/3）</span>
          </li>
          <li>
            <b>看 SelectDB 视频课第 1 章</b>
            <span>约 1 小时，和本站第 2 课的 FE/BE 讲解互为印证</span>
          </li>
          <li>
            <b>写下第一篇学习笔记</b>
            <span>记在「01-架构原理 · 学习笔记」里，页面里已备好示范和空白模板</span>
          </li>
          <li>
            <b>每看完一课，做 5 道题</b>
            <span><a :href="withBase('/guide/自检测验')">自检测验</a>随机抽题考你，答不上的自动进复习池——这就是「学到位了没」的答案</span>
          </li>
          <li>
            <b>每天开场 15 分钟复习池</b>
            <span>前一天答不上来的问题，第二天先回忆一遍再学新的——对抗遗忘的关键动作</span>
          </li>
        </ol>
        <div class="finish-actions">
          <a class="study-button primary" :href="withBase('/doris/01-架构原理/00-素材清单')">进入 01 架构原理主题 →</a>
          <a class="study-button ghost" :href="withBase('/guide/自检测验')">考一考（5 题）</a>
          <a class="study-button ghost" :href="withBase('/guide/学习流程')">今日学习流程 SOP</a>
        </div>
      </div>
    </section>

    <section class="home-section">
      <div class="section-head">
        <p class="eyebrow">M1 的第一件事</p>
        <h2>三节短课，每节只回答一个问题</h2>
        <p class="section-lead">点开就能读。读不懂的地方先跳过，不扣分。</p>
      </div>
      <div class="lesson-grid">
        <a v-for="lesson in lessons" :key="lesson.id" class="lesson-card" :href="withBase(lesson.path)">
          <div class="lesson-card-top">
            <span class="lesson-number">{{ lesson.number }}</span>
            <span class="lesson-status" :class="{ done: isDone(lesson.id) }">
              {{ isDone(lesson.id) ? '已读过 ✓' : lesson.tag }}
            </span>
          </div>
          <h3>{{ lesson.title }}</h3>
          <p>{{ lesson.description }}</p>
          <span class="lesson-meta">{{ lesson.time }} · 无需环境</span>
        </a>
      </div>
    </section>

    <section class="home-section">
      <div class="section-head">
        <p class="eyebrow">全站版图</p>
        <h2>四条学习线，怎么配合</h2>
        <p class="section-lead">主线只有 Doris 一条，其余三条都是为了让主线学得更深。别贪多，顺序按学习计划来。</p>
      </div>
      <div class="lesson-grid grid-4">
        <a v-for="line in lines" :key="line.name" class="lesson-card" :href="withBase(line.path)">
          <div class="lesson-card-top">
            <span class="line-tag" :class="{ main: line.main }">{{ line.tag }}</span>
          </div>
          <h3>{{ line.name }}</h3>
          <p>{{ line.desc }}</p>
          <span class="lesson-meta">{{ line.meta }}</span>
        </a>
      </div>
    </section>

    <section class="home-section">
      <div class="section-head">
        <p class="eyebrow">怎么学</p>
        <h2>每个主题，都是同样的四步走</h2>
        <p class="section-lead">27 个主题结构完全一样，学会一次，处处适用。</p>
      </div>
      <div class="lesson-grid grid-4">
        <a v-for="item in loop" :key="item.name" class="lesson-card" :href="withBase(item.path)">
          <div class="lesson-card-top">
            <span class="lesson-number">{{ item.step }}</span>
          </div>
          <h3>{{ item.name }}</h3>
          <p>{{ item.desc }}</p>
          <span class="lesson-meta">点开看示例 →</span>
        </a>
      </div>
    </section>

    <section class="home-rules">
      <div class="rule"><b>版本红线</b><span>所有素材标注版本，与官方文档冲突时以官方为准</span></div>
      <div class="rule"><b>环境红线</b><span>实验只在测试机与本地 Docker，生产集群只读观察</span></div>
      <div class="rule"><b>节奏红线</b><span>可以慢，不要停；笔记比素材重要，问题即素材</span></div>
    </section>
  </div>
</template>
