import { defineConfig } from 'vite'
import { nitro } from 'nitro/vite'
import vue from '@vitejs/plugin-vue'
import vueRouter from 'vue-router/vite'
import vueLayouts from 'vite-plugin-vue-layouts'
import ui from '@nuxt/ui/vite'

// Same stack and design system as the proven OpenLobs app: Vue 3, Vite, Nitro server routes, Nuxt UI 4.
export default defineConfig({
  server: { host: '0.0.0.0', port: 3000, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 3000, allowedHosts: true },
  plugins: [
    vueRouter({ dts: 'src/route-map.d.ts' }),
    vueLayouts(),
    vue(),
    ui({
      prose: true,
      ui: {
        colors: { primary: 'blue', neutral: 'zinc' }
      }
    }),
    nitro({ serverDir: './server' })
  ]
})
