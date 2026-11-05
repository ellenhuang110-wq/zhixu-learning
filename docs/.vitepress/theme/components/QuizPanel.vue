<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { quizTopics, type QuizItem } from '../quizData'

const POOL_KEY = 'zhixu_review_pool'
const SCORE_KEY = 'zhixu_quiz_history'

type PoolItem = { id: string; topic: string; q: string; a: string; keys: string[]; date: string; streak: number }

const topicId = ref(quizTopics[0].id)
const mode = ref<'all' | 'random'>('random')
const phase = ref<'idle' | 'quiz' | 'done'>('idle')

const questions = ref<QuizItem[]>([])
const idx = ref(0)
const revealed = ref(false)
const picked = ref<boolean[]>([])
const myAnswer = ref('')
const results = ref<{ item: QuizItem; ratio: number; answer: string }[]>([])

const pool = ref<PoolItem[]>([])
const history = ref<{ topic: string; date: string; score: number; total: number }[]>([])

const currentTopic = computed(() => quizTopics.find(t => t.id === topicId.value)!)
const current = computed(() => questions.value[idx.value])
const ratioNow = computed(() => {
  if (!current.value) return 0
  const hit = picked.value.filter(Boolean).length
  return hit / current.value.keys.length
})

function start() {
  const all = [...currentTopic.value.items]
  const pickedQs = mode.value === 'random' ? all.sort(() => Math.random() - 0.5).slice(0, 5) : all
  questions.value = pickedQs
  idx.value = 0
  results.value = []
  revealed.value = false
  picked.value = []
  myAnswer.value = ''
  phase.value = 'quiz'
}

function reveal() {
  revealed.value = true
  picked.value = current.value.keys.map(() => false)
}

function next() {
  results.value.push({
    item: current.value,
    ratio: picked.value.filter(Boolean).length / current.value.keys.length,
    answer: myAnswer.value,
  })
  if (idx.value + 1 >= questions.value.length) {
    finish()
    return
  }
  idx.value++
  revealed.value = false
  picked.value = []
  myAnswer.value = ''
}

function finish() {
  const total = results.value.length
  const score = results.value.filter(r => r.ratio >= 0.6).length
  const rec = { topic: currentTopic.value.name, date: new Date().toISOString().slice(0, 10), score, total }
  history.value = [rec, ...history.value].slice(0, 20)
  localStorage.setItem(SCORE_KEY, JSON.stringify(history.value))
  phase.value = 'done'
  // 交卷时自动把错题收进复习池（无需手动点按钮）
  addWrongToPool()
}

const wrongs = computed(() => results.value.filter(r => r.ratio < 0.6))

function addWrongToPool() {
  const today = new Date().toISOString().slice(0, 10)
  const existing = new Set(pool.value.map(p => p.id))
  for (const w of wrongs.value) {
    const id = `${currentTopic.value.id}::${w.item.q}`
    if (existing.has(id)) {
      const p = pool.value.find(x => x.id === id)
      if (p) p.streak = 0
      continue
    }
    pool.value.push({ id, topic: currentTopic.value.name, q: w.item.q, a: w.item.a, keys: w.item.keys, date: today, streak: 0 })
  }
  savePool()
}

function markMastered(p: PoolItem) {
  p.streak += 1
  if (p.streak >= 2) pool.value = pool.value.filter(x => x.id !== p.id)
  savePool()
}

function removePool(p: PoolItem) {
  pool.value = pool.value.filter(x => x.id !== p.id)
  savePool()
}

function savePool() {
  localStorage.setItem(POOL_KEY, JSON.stringify(pool.value))
}

function retry() {
  phase.value = 'idle'
}

onMounted(() => {
  try {
    pool.value = JSON.parse(localStorage.getItem(POOL_KEY) || '[]')
    history.value = JSON.parse(localStorage.getItem(SCORE_KEY) || '[]')
  } catch {
    pool.value = []
    history.value = []
  }
})
</script>

<template>
  <div class="quiz">
    <!-- 选题 -->
    <template v-if="phase === 'idle'">
      <div class="editor-field">
        <label>考哪个主题？</label>
        <select v-model="topicId">
          <option v-for="t in quizTopics" :key="t.id" :value="t.id">{{ t.group }} · {{ t.name }}（{{ t.items.length }} 题）</option>
        </select>
      </div>
      <div class="editor-field">
        <label>怎么考？</label>
        <select v-model="mode">
          <option value="random">随机抽 5 题（快速检验）</option>
          <option value="all">全部题目（完整考试）</option>
        </select>
      </div>
      <div class="editor-actions">
        <button class="study-button primary" @click="start">开始考试</button>
      </div>
      <p class="editor-status">
        玩法：先合上材料，把答案讲出来/写下来 → 点「对答案」→ 勾选你讲到的关键点 → 自动判分。低于 60% 的题会进复习池。
      </p>

      <div v-if="history.length" class="quiz-block">
        <h4>最近成绩</h4>
        <table class="tracker-table">
          <thead><tr><th>日期</th><th>主题</th><th>结果</th></tr></thead>
          <tbody>
            <tr v-for="(h, i) in history.slice(0, 8)" :key="i">
              <td>{{ h.date }}</td><td>{{ h.topic }}</td>
              <td>{{ h.score }} / {{ h.total }} {{ h.score / h.total >= 0.8 ? '✅' : h.score / h.total >= 0.6 ? '⚠️' : '❌' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 答题 -->
    <template v-else-if="phase === 'quiz' && current">
      <div class="quiz-head">
        <span class="quiz-progress">第 {{ idx + 1 }} / {{ questions.length }} 题</span>
        <span class="quiz-topic">{{ currentTopic.name }}</span>
      </div>
      <h3 class="quiz-q">{{ current.q }}</h3>

      <template v-if="!revealed">
        <div class="editor-field">
          <label>先讲出来 / 写下来（也可空着直接对答案）</label>
          <textarea v-model="myAnswer" rows="4" placeholder="合上材料，用自己的话回答……"></textarea>
        </div>
        <div class="editor-actions">
          <button class="study-button primary" @click="reveal">对答案</button>
        </div>
      </template>

      <template v-else>
        <div class="quiz-answer">
          <p class="quiz-answer-title">参考答案</p>
          <p>{{ current.a }}</p>
        </div>
        <div class="quiz-keys">
          <p>刚才讲到了哪几点？（勾选，自动算分）</p>
          <label v-for="(k, i) in current.keys" :key="i" class="quiz-key">
            <input v-model="picked[i]" type="checkbox" /> {{ k }}
          </label>
        </div>
        <p class="editor-status" :class="{ ok: ratioNow >= 0.6 }">
          命中 {{ picked.filter(Boolean).length }} / {{ current.keys.length }} 个关键点 —— {{ ratioNow >= 0.6 ? '这道算掌握' : '这道进复习池' }}
        </p>
        <div class="editor-actions">
          <button class="study-button primary" @click="next">{{ idx + 1 >= questions.length ? '交卷' : '下一题' }}</button>
        </div>
      </template>
    </template>

    <!-- 结果 -->
    <template v-else-if="phase === 'done'">
      <h3 class="quiz-q">成绩：{{ results.filter(r => r.ratio >= 0.6).length }} / {{ results.length }}</h3>
      <table class="tracker-table">
        <thead><tr><th>#</th><th>题目</th><th>命中</th></tr></thead>
        <tbody>
          <tr v-for="(r, i) in results" :key="i">
            <td>{{ i + 1 }}</td>
            <td class="tracker-name">{{ r.item.q }}</td>
            <td>{{ Math.round(r.ratio * 100) }}% {{ r.ratio >= 0.6 ? '✅' : '❌' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="wrongs.length" class="editor-status">
        已自动把 {{ wrongs.length }} 道错题收进复习池 —— 就在本页最下方，每天开场抽 3 道复习。
      </p>
      <p v-else class="editor-status ok">全对！复习池没有新增错题。</p>
      <div class="editor-actions">
        <button class="study-button ghost" @click="retry">再考一次</button>
      </div>
    </template>

    <!-- 复习池 -->
    <div class="quiz-block">
      <h4>我的复习池（{{ pool.length }} 条）</h4>
      <p v-if="!pool.length" class="editor-status">还没有错题。考试时没答上的题，点结果页的按钮就会进来。</p>
      <div v-for="p in pool" :key="p.id" class="quiz-pool-item">
        <p class="quiz-pool-q">{{ p.topic }} · {{ p.q }}</p>
        <p class="quiz-pool-a">{{ p.a }}</p>
        <p class="quiz-pool-meta">记错于 {{ p.date }} · 已连续答对 {{ p.streak }} / 2 次</p>
        <div class="editor-actions">
          <button class="study-button ghost" @click="markMastered(p)">这次答对了</button>
          <button class="study-button ghost" @click="removePool(p)">移除</button>
        </div>
      </div>
    </div>
  </div>
</template>
