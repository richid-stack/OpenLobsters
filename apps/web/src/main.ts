import './assets/css/main.css'

import { createApp } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { setupLayouts } from 'virtual:generated-layouts'
import { createHead } from '@unhead/vue/client'
import ui from '@nuxt/ui/vue-plugin'
import { addCollection } from '@iconify/vue'
import bundledIcons from './generated/icons.json'

import App from './App.vue'

// Icons ship with the app (see scripts/build-icons.mjs): the Lucide ones in use plus the custom OpenLobs set.
for (const collection of bundledIcons) addCollection(collection as unknown as Parameters<typeof addCollection>[0])

const app = createApp(App)
app.config.errorHandler = err => console.error(err)

const router = createRouter({
  routes: setupLayouts(routes as RouteRecordRaw[]),
  history: createWebHistory()
})

app.use(createHead())
app.use(router)
app.use(ui)
app.mount('#app')

if (import.meta.hot) handleHotUpdate(router)
