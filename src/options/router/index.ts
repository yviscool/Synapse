import { createRouter, createWebHashHistory } from 'vue-router'
import Prompts from '../views/Prompts.vue'
import Chat from '../views/Chat.vue'
import Tools from '../views/Tools.vue'

const routes = [
  {
    path: '/',
    redirect: '/prompts',
  },
  {
    path: '/prompts',
    name: 'prompts',
    component: Prompts,
  },
  {
    path: '/chat',
    name: 'chat',
    component: Chat,
  },
  {
    path: '/tools',
    name: 'tools',
    component: Tools,
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  linkActiveClass: 'is-active',
})

export default router