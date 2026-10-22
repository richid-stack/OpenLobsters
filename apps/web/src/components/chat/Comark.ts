import { defineMarkdownComponent } from '@comark/vue'
import shiki from '@comark/vue/plugins/shiki'
import python from '@shikijs/langs/python'
import sql from '@shikijs/langs/sql'
import diff from '@shikijs/langs/diff'

export default defineMarkdownComponent({
  name: 'ChatComark',
  plugins: [shiki({ languages: [python, sql, diff] })],
  class: '*:first:mt-0 *:last:mb-0'
})
