<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { lessons, useLearning } from '../learning'
const props = defineProps<{ lesson: string }>()
const { completed, toggle, storageAvailable } = useLearning()
const isDone = computed(() => completed.value.includes(props.lesson))
const following = computed(() => lessons[lessons.findIndex(l => l.id === props.lesson) + 1])
</script>

<template>
  <section class="lesson-finish" aria-label="阅读记录">
    <div>
      <span class="eyebrow">这一小步，就到这里</span>
      <h3>{{ isDone ? '已经留下了一次阅读记录。' : '今天多理解了一件事，就很好。' }}</h3>
      <p>标记仅代表读过，不是考试，也不要求全部记住。</p>
    </div>
    <div class="finish-actions">
      <button class="study-button primary" :aria-pressed="isDone" @click="toggle(lesson)">
        {{ isDone ? '✓ 已读过 · 点击撤销' : '标记为读过' }}
      </button>
      <a v-if="following" class="study-button secondary" :href="withBase(following.path)">下一课：{{ following.title }} →</a>
      <a v-else class="study-button secondary" :href="withBase('/')">回到学习空间 →</a>
    </div>
    <small>{{ storageAvailable ? '记录只保存在当前浏览器，不会上传。换设备或清除浏览器数据后不会保留。' : '浏览器存储不可用，记录暂时只在本次页面中保留。' }}</small>
  </section>
</template>
