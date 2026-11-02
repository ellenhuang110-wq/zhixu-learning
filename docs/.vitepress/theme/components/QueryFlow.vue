<script setup lang="ts">
import { ref } from 'vue'
const current = ref(0)
const steps = [
  { label: '发出查询', title: '你想问什么？', detail: '客户端将 SQL 发给 FE。例如：统计昨天每套业务系统的告警数量。此时还没有开始扫描业务数据。' },
  { label: 'FE 做计划', title: '先想清楚怎么做', detail: 'FE 检查语句和权限，结合元数据找到相关表与分片，生成执行计划。它知道数据在哪里，但不负责保存业务明细。' },
  { label: 'BE 执行', title: '各自干活，再协作', detail: '相关 BE 读取数据、过滤和计算。集群可并行处理不同分片；需要时 BE 之间交换中间结果，完成进一步计算。' },
  { label: '返回结果', title: '结果怎么回来？——原路返回', detail: '各 BE 算出局部结果 → 由一个执行节点汇聚成最终结果 → 网络回传给 FE → FE 用 MySQL 协议写回你的客户端。回程就是 BE → FE → 客户端：FE 在回程里只是“收发室”，负责转交，不做汇总计算。' },
]
</script>

<template>
  <section class="query-flow" aria-label="Doris 查询过程交互图">
    <div class="flow-header"><span class="eyebrow">让一条查询走一遍</span><span>存算一体 · 简化示意</span></div>
    <div class="flow-diagram">
      <div class="flow-client" :class="{ active: current === 0 || current === 3 }"><span>你的客户端</span><small>提出问题 / 接收结果</small></div>
      <div class="flow-arrow" aria-hidden="true">{{ current === 3 ? '↑ 返回结果' : '↓ 发出 SQL' }}</div>
      <div class="flow-fe" :class="{ active: current === 1 }"><b>FE</b><span>接请求 · 管元数据 · 做计划</span></div>
      <div class="flow-arrow" aria-hidden="true">{{ current === 3 ? '↑ 回传最终结果' : '↓ 下发任务' }}</div>
      <div class="flow-workers" :class="{ active: current === 2 }">
        <div><b>BE 01</b><span>存储 + 计算</span></div>
        <div><b>BE 02</b><span>存储 + 计算</span></div>
        <div><b>BE 03</b><span>存储 + 计算</span></div>
      </div>
    </div>
    <p class="flow-caveat">图中 1FE + 3BE 就是一个合法集群（恰好放满默认 3 副本）；你的测试机 1FE + 1BE 也能学完整流程——FE 和 BE 的数量各自独立，没有配比要求。</p>
    <div class="flow-steps" aria-label="选择查询步骤">
      <button v-for="(step, index) in steps" :key="step.label" :class="{ selected: current === index }"
        :aria-pressed="current === index" @click="current = index"><span>{{ index + 1 }}</span>{{ step.label }}</button>
    </div>
    <div class="flow-explanation" role="status"><h4>{{ steps[current].title }}</h4><p>{{ steps[current].detail }}</p></div>
  </section>
</template>
