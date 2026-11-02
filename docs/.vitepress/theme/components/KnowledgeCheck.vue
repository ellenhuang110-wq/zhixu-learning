<script setup lang="ts">
import { ref } from 'vue'
defineProps<{ question: string; options: string[]; answer: number; explanation: string }>()
const selected = ref<number | null>(null)
</script>

<template>
  <section class="knowledge-check" aria-label="想一想，不计分">
    <span class="eyebrow">想一想 · 不计分</span>
    <h3>{{ question }}</h3>
    <div class="check-options">
      <button v-for="(option, index) in options" :key="option"
        :aria-pressed="selected === index" :class="{ selected: selected === index }"
        @click="selected = index">
        <span class="option-letter">{{ String.fromCharCode(65 + index) }}</span>{{ option }}
      </button>
    </div>
    <div v-if="selected !== null" class="check-feedback" role="status">
      <strong>{{ selected === answer ? '对，这就是关键。' : '换个角度想一想。' }}</strong>
      <p>{{ explanation }}</p>
    </div>
  </section>
</template>
