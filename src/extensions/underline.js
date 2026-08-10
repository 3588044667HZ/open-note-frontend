import { Mark } from '@tiptap/core'

// class 中的 color_red（下划线）→ CSS 变量名 color-red（连字符）
const CSS_VAR_MAP = {
  default: 'default',
  color_red: 'color-red',
  color_orange: 'color-orange',
  color_yellow: 'color-yellow',
  color_green: 'color-green',
  color_blue: 'color-blue',
  color_gray: 'color-gray',
}

// 波浪线 SVG 实际填充色（SVG data URI 中无法解析 var()，必须用实际色值）
const SVG_FILL_MAP = {
  default: 'rgba(0,0,0,0.8)',
  color_red: 'rgba(213,73,51,1)',
  color_orange: 'rgba(225,132,19,1)',
  color_yellow: 'rgba(219,154,0,1)',
  color_green: 'rgba(44,136,72,1)',
  color_blue: 'rgba(50,88,197,1)',
  color_gray: 'rgba(0,0,0,0.26)',
}

const WAVY_SVG = (color, opacity = 1) => {
  const fill = SVG_FILL_MAP[color] || SVG_FILL_MAP.default
  const svg = `<svg width="10" height="3" viewBox="0 0 10 3" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd"
      d="M5 1C3 1 2.5 3 0 3V2C1.75 2 2.5 0 5 0C7.5 0 8.25 2 10 2V3C7.5 3 7 1 5 1Z"
      fill="${String(fill).replaceAll('#', '%23')}" fill-opacity="${opacity}"/>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export const ColoredUnderline = Mark.create({
  name: 'coloredUnderline',

  inclusive: true,

  addAttributes() {
    return {
      type: { default: 'solid' },
      color: { default: 'default' },
    }
  },

  parseHTML() {
    return [
      { tag: 'u[class*="underline_solid_"]', getAttrs: (el) => ({ type: 'solid', color: parseColorFromClass(el.getAttribute('class')) }) },
      { tag: 'u[class*="underline_wavy_"]', getAttrs: (el) => ({ type: 'wavy', color: parseColorFromClass(el.getAttribute('class')) }) },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { type, color } = HTMLAttributes
    console.log('[underline] renderHTML:', { type, color, HTMLAttributes })
    if (type === 'wavy') {
      return ['u', {
        class: `underline_wavy_${color}`,
        style: `background:url('${WAVY_SVG(color, 1)}');background-size:10px 4px;background-repeat:repeat no-repeat;background-position:left 100%;padding-bottom:4px`,
      }, 0]
    }
    return ['u', {
      class: `underline_solid_${color}`,
      style: `text-decoration-line:underline;text-decoration-color:var(--${CSS_VAR_MAP[color] || color});text-decoration-style:solid`,
    }, 0]
  },

  addCommands() {
    return {
      /**
       * 设置彩色下划线。手动操作 transaction：
       * 先 removeMark 再 addMark —— addMark 单独使用不会更新已存在 mark 的 attrs
       */
      setColoredUnderline: (attrs) => ({ state, tr, dispatch }) => {
        const markType = state.schema.marks.coloredUnderline
        if (!markType) return false
        const { from, to } = state.selection
        const mark = markType.create(attrs)
        console.log('[underline] setColoredUnderline:', { attrs, from, to, empty: from === to })
        if (from === to) {
          tr.removeStoredMark(markType)
          tr.addStoredMark(mark)
        } else {
          tr.removeMark(from, to, markType)
          tr.addMark(from, to, mark)
        }
        console.log('[underline] set done, mark attrs:', mark.attrs)
        if (dispatch) dispatch(tr)
        return true
      },

      unsetColoredUnderline: () => ({ state, tr, dispatch }) => {
        const markType = state.schema.marks.coloredUnderline
        if (!markType) return false
        const { from, to } = state.selection
        console.log('[underline] unsetColoredUnderline:', { from, to, empty: from === to })
        if (from === to) {
          tr.removeStoredMark(markType)
        } else {
          tr.removeMark(from, to, markType)
        }
        if (dispatch) dispatch(tr)
        return true
      },

      toggleColoredUnderline: (attrs) => ({ editor, state }) => {
        const isActive = editor.isActive('coloredUnderline', attrs)
        return isActive
          ? editor.commands.unsetColoredUnderline()
          : editor.commands.setColoredUnderline(attrs)
      },
    }
  },
})

function parseColorFromClass(classStr = '') {
  const m = classStr.match(/underline_(?:solid|wavy)_(.+)$/)
  return m ? m[1] : 'default'
}
