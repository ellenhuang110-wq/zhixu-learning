<script setup lang="ts">
import { ref } from 'vue'
import { withBase } from 'vitepress'

// 全部主题的学习笔记文件（相对 docs/ 的路径）
const topics = [
  { group: 'Doris 主线', dir: 'doris', names: ['01-架构原理', '02-部署与变更', '03-监控与可观测', '04-备份恢复与容灾', '05-账号与安全', '06-数据集成', '07-性能与容量', '08-日常运维与故障案例'] },
  { group: 'PostgreSQL 线', dir: 'pgsql', names: ['01-架构原理', '02-部署与变更', '03-监控与可观测', '04-备份恢复与容灾', '05-账号与安全', '06-数据集成', '07-性能与容量', '08-日常运维与故障案例'] },
  { group: 'ClickHouse 线', dir: 'clickhouse', names: ['01-架构原理', '02-部署与变更', '03-监控与可观测', '04-备份恢复与容灾', '05-账号与安全', '06-数据集成', '07-性能与容量', '08-日常运维与故障案例'] },
  { group: '向量库副线', dir: 'vector', names: ['01-基础原理', '02-选型对比', '03-Doris向量检索实践'] },
]

const selected = ref('doris/01-架构原理/01-学习笔记.md')
const title = ref('')
const body = ref('')
const status = ref('')
const saving = ref(false)

// 截图粘贴：自动上传并在光标处插入图片引用
async function onPaste(event: ClipboardEvent) {
  const file = Array.from(event.clipboardData?.files || []).find(f => f.type.startsWith('image/'))
  if (!file) return
  event.preventDefault()
  status.value = '正在上传截图…'
  const dataBase64 = await new Promise<string>((resolvePromise) => {
    const reader = new FileReader()
    reader.onload = () => resolvePromise(String(reader.result).split(',')[1])
    reader.readAsDataURL(file)
  })
  const ext = file.type.split('/')[1] || 'png'
  const resp = await fetch('/__notes/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataBase64, ext }),
  }).then(r => r.json())
  if (resp.url) {
    body.value += `\n\n![截图说明](${resp.url})\n\n`
    status.value = '截图已插入正文，保存后生效'
  } else {
    status.value = `截图上传失败：${resp.error || '未知错误'}`
  }
}

async function save() {
  if (!title.value.trim() || !body.value.trim()) {
    status.value = '请先填写标题和正文'
    return
  }
  saving.value = true
  status.value = '保存中…'
  try {
    const resp = await fetch('/__notes/append', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selected.value, title: title.value, body: body.value }),
    }).then(r => r.json())
    if (resp.ok) {
      status.value = 'saved'
    } else {
      status.value = `保存失败：${resp.error || '未知错误'}`
    }
  } catch (err) {
    status.value = `保存失败：${err}（请确认 dev 服务正在运行）`
  } finally {
    saving.value = false
  }
}

function reset() {
  title.value = ''
  body.value = ''
  status.value = ''
}
</script>

<template>
  <div class="note-editor">
    <div class="editor-field">
      <label>记到哪个主题？</label>
      <select v-model="selected">
        <optgroup v-for="g in topics" :key="g.group" :label="g.group">
          <option v-for="n in g.names" :key="n" :value="`${g.dir}/${n}/01-学习笔记.md`">{{ n }}</option>
        </optgroup>
      </select>
    </div>

    <div class="editor-field">
      <label>这篇笔记的标题（素材名或问题名）</label>
      <input v-model="title" placeholder="例如：SelectDB 视频课第 1 章（约 1 小时）" />
    </div>

    <div class="editor-field">
      <label>正文（直接写大白话就行，换行会保留；截图按 Ctrl+V 粘贴）</label>
      <textarea
        v-model="body"
        rows="14"
        placeholder="学到了什么、关键命令、没搞懂的问题……随手记。&#10;&#10;想插截图：先截图，再点一下这个输入框，Ctrl+V。"
        @paste="onPaste"
      ></textarea>
    </div>

    <div class="editor-actions">
      <button class="study-button primary" :disabled="saving" @click="save">保存笔记</button>
      <button class="study-button ghost" @click="reset">清空</button>
      <a class="study-button ghost" :href="withBase('/' + selected.replace(/\.md$/, ''))" target="_blank">打开该主题笔记页 ↗</a>
    </div>

    <p v-if="status === 'saved'" class="editor-status ok">
      已保存！笔记追加到了文件末尾，点上方「打开该主题笔记页」即可看到（若未出现请刷新）。
      <a href="javascript:void 0" @click="reset">再写一篇 →</a>
    </p>
    <p v-else-if="status" class="editor-status">{{ status }}</p>

    <details class="editor-help">
      <summary>保存到哪里了？和后台编辑是什么关系？</summary>
      <p>这个页面只是把内容追加到对应主题的 <code>01-学习笔记.md</code> 文件末尾，和你用编辑器打开文件手写完全等价，两边可以随时混用。截图会存到 <code>docs/public/assets/notes/</code> 并在正文插入图片引用。此功能依赖本地 dev 服务，仅在 <code>npm run docs:dev</code> 运行时可用。</p>
    </details>
  </div>
</template>
