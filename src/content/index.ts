import { createApp } from 'vue'
import App from './App.vue'
import i18n from '@/i18n'
import '@/outline/OutlineGenerator'
import "@/styles"

(function () {
  const id = 'prompt-master-root-host'
  if (document.getElementById(id)) return

  // 1. Create a host element that will contain our shadow root.
  const host = document.createElement('div')
  host.id = id
  document.documentElement.appendChild(host)

  // 2. Create a shadow root.
  const shadowRoot = host.attachShadow({ mode: 'open' })

  // 3. Create the element to mount the Vue app on, inside the shadow root.
  const appContainer = document.createElement('div')

  // 4. Inject CSS into the shadow root.
  const styleEl = document.createElement('link')
  styleEl.setAttribute('rel', 'stylesheet')
  styleEl.setAttribute('href', chrome.runtime.getURL('content.css'))
  shadowRoot.appendChild(styleEl)

  shadowRoot.appendChild(appContainer)

  // 5. Mount the Vue app onto the container inside the shadow root.
  const app = createApp(App)
  app.use(i18n)
  app.mount(appContainer)
})()