import { ref, reactive } from 'vue'

export const COLOR_DEFAULT = 'color_default'
export const COLOR_RED    = 'color_red'
export const COLOR_ORANGE = 'color_orange'
export const COLOR_BLUE   = 'color_blue'
export const COLOR_GREEN  = 'color_green'
export const COLOR_YELLOW = 'color_yellow'
export const COLOR_GRAY   = 'color_gray'

export const TEXT_COLOR_MAP = {
  [COLOR_DEFAULT]: 'rgba(0,0,0,0.8)',
  [COLOR_GRAY]:    'rgba(0,0,0,0.26)',
  [COLOR_RED]:     'rgba(213,73,51,1)',
  [COLOR_ORANGE]:  'rgba(225,132,19,1)',
  [COLOR_YELLOW]:  'rgba(219,154,0,1)',
  [COLOR_GREEN]:   'rgba(44,136,72,1)',
  [COLOR_BLUE]:    'rgba(50,88,197,1)',
}

export const HIGHLIGHT_COLOR_MAP = {
  [COLOR_YELLOW]: 'rgba(247,198,0,0.3)',
  [COLOR_RED]:    'rgba(255,173,190,0.3)',
  [COLOR_BLUE]:   'rgba(85,184,241,0.3)',
  [COLOR_GREEN]:  'rgba(104,209,121,0.3)',
}

export function useEditorStore() {
  const activeFormat = ref(null)
  const activeTab = ref('text')

  const markStatus = reactive({
    textColor: false,
    textHighlight: false,
    textUnderLine: false,
    textWavyLine: false,
  })

  let editor = null
  function bind(ed) { editor = ed }

  function applyFormat(className, category) {
    if (!editor) return

    console.log('[format] applyFormat called:', { className, category, selection: editor.state.selection.empty })

    // None：恢复默认透明强调 / 取消下划线
    if (className === 'none') {
      if (category === 'text' || category === 'highlight') {
        editor.chain().focus().unsetFormat((c) => c.startsWith('color_') || c.startsWith('highlight_')).run()
      } else {
        editor.chain().focus().unsetColoredUnderline().run()
      }
      console.log('[format] → none (clear format)')
      activeFormat.value = null
      activeTab.value = category
      return
    }

    if (category === 'text' || category === 'highlight') {
      if (className === 'color_default') {
        editor.chain().focus().unsetFormat((c) => c.startsWith('color_') || c.startsWith('highlight_')).run()
      } else {
        editor.chain().focus().setFormat({ class: className }).run()
      }
    } else if (category === 'underline' || category === 'wavy') {
      const parts = className.split('_')
      const type = category === 'wavy' ? 'wavy' : 'solid'
      const color = parts.slice(2).join('_')
      // 已激活相同 type+color → 取消；否则 setColoredUnderline（内部 removeMark+addMark 自动换色）
      const isActive = editor.isActive('coloredUnderline', { type, color })
      console.log('[format] underline branch:', { type, color, isActive })
      if (isActive) {
        editor.chain().focus().unsetColoredUnderline().run()
        console.log('[format] → unset (same color active)')
      } else {
        editor.chain().focus().setColoredUnderline({ type, color }).run()
        console.log('[format] → set (replace color)', { type, color })
      }
    }

    console.log('[format] after apply, getHTML:', editor.getHTML())
    activeFormat.value = className
    activeTab.value = category
  }

  function updateMarkStatus() {
    if (!editor) return
    const { state } = editor
    const textStyleType = state.schema.marks.textStyle
    const underlineType = state.schema.marks.coloredUnderline

    markStatus.textColor = false
    markStatus.textHighlight = false
    markStatus.textUnderLine = false
    markStatus.textWavyLine = false

    const { from, to } = state.selection
    state.doc.nodesBetween(Math.min(from, to), Math.max(from, to), (node) => {
      if (!node.marks?.length) return
      for (const mark of node.marks) {
        if (mark.type === textStyleType) {
          const cls = mark.attrs.class || ''
          if (cls.includes('highlight_')) markStatus.textHighlight = true
          else if (cls.includes('color_')) markStatus.textColor = true
          if (cls === activeFormat.value) activeFormat.value = cls
        }
        if (mark.type === underlineType) {
          if (mark.attrs.type === 'solid') markStatus.textUnderLine = true
          if (mark.attrs.type === 'wavy') markStatus.textWavyLine = true
        }
      }
    })
  }

  return reactive({
    activeFormat, activeTab, markStatus,
    bind, applyFormat, updateMarkStatus,
  })
}
