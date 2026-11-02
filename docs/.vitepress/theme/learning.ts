import { computed, onMounted, onUnmounted, ref } from 'vue'

export const lessons = [
  { id: 'database', path: '/learn/01-database', number: '01', title: '数据库在做什么？', description: '从运维台账出发，理解表、SQL，以及交易与分析的区别。', time: '约 10 分钟', tag: '先建立直觉' },
  { id: 'doris', path: '/learn/02-doris', number: '02', title: 'FE 与 BE，谁在忙什么？', description: '跟着一条查询，认识 Doris 的入口、计划与执行。', time: '约 12 分钟', tag: '交互架构图' },
  { id: 'storage', path: '/learn/03-storage', number: '03', title: '数据到底是怎么放的？', description: '用文件柜的比喻，区分列存、分区、分桶与副本。', time: '约 12 分钟', tag: '用例子理解' },
] as const

const key = 'zhixu-learning-v1'
const completed = ref<string[]>([])
const storageAvailable = ref(true)

// 只在浏览器挂载后读取；不将阅读记录写入服务器。
function load() {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || '[]')
    completed.value = Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && lessons.some(l => l.id === id)))]
      : []
    storageAvailable.value = true
  } catch {
    completed.value = []
    storageAvailable.value = false
  }
}

export function useLearning() {
  const sync = (event: StorageEvent) => {
    if (event.key === key || event.key === null) load()
  }
  onMounted(() => {
    load()
    window.addEventListener('storage', sync)
  })
  onUnmounted(() => window.removeEventListener('storage', sync))

  function toggle(id: string) {
    if (!lessons.some(l => l.id === id)) return
    completed.value = completed.value.includes(id)
      ? completed.value.filter(value => value !== id)
      : [...completed.value, id]
    try {
      localStorage.setItem(key, JSON.stringify(completed.value))
      storageAvailable.value = true
    } catch {
      storageAvailable.value = false
    }
  }

  return {
    completed,
    storageAvailable,
    toggle,
    count: computed(() => completed.value.length),
    nextLesson: computed(() => lessons.find(l => !completed.value.includes(l.id)) || lessons[0]),
  }
}
