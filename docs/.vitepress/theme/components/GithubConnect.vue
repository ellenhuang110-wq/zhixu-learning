<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getToken, setToken, isOnline } from '../githubApi'

const token = ref('')
const saved = ref(false)
const isProd = isOnline()

onMounted(() => {
  token.value = getToken()
  saved.value = !!token.value
})

function save() {
  setToken(token.value)
  saved.value = !!token.value.trim()
}
</script>

<template>
  <div v-if="isProd" class="gh-connect">
    <p v-if="saved" class="editor-status ok">已连接 GitHub：现在可以直接在本页保存，改动会自动提交到仓库并重新发布（1-2 分钟生效）。</p>
    <p v-else class="editor-status">
      线上直写需要一次性连接你的 GitHub（令牌只存在本机浏览器，仅授权这一个仓库）。
    </p>
    <div class="editor-field">
      <label>GitHub 令牌（Personal Access Token）</label>
      <input v-model="token" type="password" placeholder="github_pat_... 或 ghp_..." @keyup.enter="save" />
    </div>
    <div class="editor-actions">
      <button class="study-button primary" @click="save">保存令牌</button>
    </div>
    <details class="editor-help">
      <summary>怎么获取这个令牌？（30 秒，只需做一次）</summary>
      <ol>
        <li>打开 <a href="https://github.com/settings/personal-access-tokens/new" target="_blank">github.com/settings/personal-access-tokens/new</a></li>
        <li>Token name 随便填，如 <code>zhixu-web</code>；Expiration 选 90 天或更长</li>
        <li>Repository access 选 <strong>Only select repositories</strong> → 勾选 <code>zhixu-learning</code></li>
        <li>Permissions → Repository permissions → 找到 <strong>Contents</strong>，改成 <strong>Read and write</strong></li>
        <li>点 Generate token，复制生成的 <code>github_pat_...</code> 粘到上面的输入框，点保存</li>
      </ol>
      <p>令牌只保存在你本机浏览器（localStorage），不会上传到任何地方；换电脑需要重新填一次。</p>
    </details>
  </div>
</template>
