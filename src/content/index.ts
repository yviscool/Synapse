import { createApp } from 'vue'
import App from './App.vue'
import i18n from '@/i18n'
import '@/styles'
import { setupShadowStyles } from './shadowStyleSync'
import { setupHostThemeSync } from './useHostTheme'

;(function () {
  const id = 'prompt-master-root-host'
  if (document.getElementById(id)) return

  const host = document.createElement('div')
  host.id = id
  document.documentElement.appendChild(host)

  const shadowRoot = host.attachShadow({ mode: 'open' })
  const appContainer = document.createElement('div')

  const cleanupStyles = setupShadowStyles(shadowRoot)
  const cleanupTheme = setupHostThemeSync(appContainer, host)

  shadowRoot.appendChild(appContainer)

  const app = createApp(App)
  app.use(i18n)
  app.mount(appContainer)

  window.addEventListener('beforeunload', () => {
    cleanupStyles()
    cleanupTheme()
  }, { once: true })
})()
