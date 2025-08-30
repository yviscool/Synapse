import { createApp } from 'vue'
import App from './App.vue'
import '@/styles'
import '@/outline/OutlineGenerator'

;(function () {
  const id = 'apm-root'
  if (document.getElementById(id)) return
  const el = document.createElement('div')
  el.id = id
  document.documentElement.appendChild(el)
  createApp(App).mount(el)
})()
