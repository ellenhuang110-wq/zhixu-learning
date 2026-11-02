import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import LearningHome from './components/LearningHome.vue'
import LessonProgress from './components/LessonProgress.vue'
import QueryFlow from './components/QueryFlow.vue'
import KnowledgeCheck from './components/KnowledgeCheck.vue'
import NoteEditor from './components/NoteEditor.vue'
import MaterialTracker from './components/MaterialTracker.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('LearningHome', LearningHome)
    app.component('LessonProgress', LessonProgress)
    app.component('QueryFlow', QueryFlow)
    app.component('KnowledgeCheck', KnowledgeCheck)
    app.component('NoteEditor', NoteEditor)
    app.component('MaterialTracker', MaterialTracker)
  },
} satisfies Theme
