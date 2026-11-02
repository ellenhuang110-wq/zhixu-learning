<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 各主题素材清单文件（相对 docs/ 的路径）
const topics = [
  { group: 'Doris 主线', dir: 'doris', names: ['01-架构原理', '02-部署与变更', '03-监控与可观测', '04-备份恢复与容灾', '05-账号与安全', '06-数据集成', '07-性能与容量', '08-日常运维与故障案例'] },
  { group: 'PostgreSQL 线', dir: 'pgsql', names: ['01-架构原理', '02-部署与变更', '03-监控与可观测', '04-备份恢复与容灾', '05-账号与安全', '06-数据集成', '07-性能与容量', '08-日常运维与故障案例'] },
  { group: 'ClickHouse 线', dir: 'clickhouse', names: ['01-架构原理', '02-部署与变更', '03-监控与可观测', '04-备份恢复与容灾', '05-账号与安全', '06-数据集成', '07-性能与容量', '08-日常运维与故障案例'] },
  { group: '向量库副线', dir: 'vector', names: ['01-基础原理', '02-选型对比', '03-Doris向量检索实践'] },
]

type Item = { no: number; name: string; status: string }

const selected = ref('doris/01-架构原理/00-素材清单.md')
const items = ref<Item[]>([])
const loading = ref(false)
const message = ref('')
// 线上（GitHub Pages）没有本地 API，仅在本地 dev 环境可写
const isDev = import.meta.env.DEV

async function load() {
  loading.value = true
  message.value = ''
  try {
    const resp = await fetch(`/__notes/materials?path=${encodeURIComponent(selected.value)}`).then(r => r.json())
    if (resp.items) {
      items.value = resp.items
      if (!resp.items.length) message.value = '这个主题暂时没有素材条目'
    } else {
      items.value = []
      message.value = `加载失败：${resp.error || '未知错误'}`
    }
  } catch (err) {
    message.value = `加载失败：${err}（请确认 dev 服务正在运行）`
  } finally {
    loading.value = false
  }
}

async function updateStatus(item: Item) {
  const status = item.status
  message.value = `正在保存第 ${item.no} 条…`
  try {
    const resp = await fetch('/__notes/materials/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selected.value, no: item.no, status }),
    }).then(r => r.json())
    message.value = resp.ok ? `第 ${item.no} 条已更新为「${status}」` : `保存失败：${resp.error || '未知错误'}`
  } catch (err) {
    message.value = `保存失败：${err}（请确认 dev 服务正在运行）`
  }
}

onMounted(() => {
  if (isDev) load()
})
</script>

<template>
  <div class="tracker">
    <div v-if="!isDev" class="editor-status">
      线上版为只读：更新素材进度只在你自己电脑上运行站点（<code>npm run docs:dev</code>）时可用。线上看进度，直接看各主题的「素材清单」页即可。
    </div>
    <template v-else>
    <div class="editor-field">
      <label>更新哪个主题的素材进度？</label>
      <select v-model="selected" @change="load">
        <optgroup v-for="g in topics" :key="g.group" :label="g.group">
          <option v-for="n in g.names" :key="n" :value="`${g.dir}/${n}/00-素材清单.md`">{{ n }}</option>
        </optgroup>
      </select>
    </div>

    <p v-if="loading" class="editor-status">加载中…</p>
    <p v-else-if="message" class="editor-status">{{ message }}</p>

    <table v-if="items.length" class="tracker-table">
      <thead>
        <tr><th>#</th><th>素材</th><th>状态</th></tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.no">
          <td>{{ item.no }}</td>
          <td class="tracker-name">{{ item.name }}</td>
          <td>
            <select v-model="item.status" class="tracker-select" @change="updateStatus(item)">
              <option value="未开始">未开始</option>
              <option value="学习中">学习中</option>
              <option value="已学完">已学完</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>

    <details class="editor-help">
      <summary>状态改了之后会怎样？</summary>
      <p>会直接改写该主题「素材清单」里对应行的问题状态格，和手动编辑文件等价。刷新素材清单页即可看到变化。只收录标准状态「未开始 / 学习中 / 已学完」；若某条素材已带「过时风险」等标记，选完状态后建议去确认一下备注列是否完好。</p>
    </details>
    </template>
  </div>
</template>
