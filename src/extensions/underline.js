import { Mark } from '@tiptap/core'

const WAVY_SVG = (color, opacity = 1) => {
  const svg = `<svg width="10" height="3" viewBox="0 0 10 3" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd"
      d="M5 1C3 1 2.5 3 0 3V2C1.75 2 2.5 0 5 0C7.5 0 8.25 2 10 2V3C7.5 3 7 1 5 1Z"
      fill="${String(color).replaceAll('#', '%23')}" fill-opacity="${opacity}"/>
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
    if (type === 'wavy') {
      return ['u', {
        class: `underline_wavy_${color}`,
        style: `background:url('${WAVY_SVG(`var(--${color})`, 1)}');background-size:10px 4px;background-repeat:repeat no-repeat;background-position:left 100%;padding-bottom:4px`,
      }, 0]
    }
    return ['u', {
      class: `underline_solid_${color}`,
      style: `text-decoration-line:underline;text-decoration-color:var(--${color});text-decoration-style:solid`,
    }, 0]
  },

  addCommands() {
    return {
      setColoredUnderline: (attrs) => ({ commands }) => commands.setMark(this.name, attrs),
      unsetColoredUnderline: () => ({ commands }) => commands.unsetMark(this.name),
      toggleColoredUnderline: (attrs) => ({ commands }) => commands.toggleMark(this.name, attrs),
    }
  },
})

function parseColorFromClass(classStr = '') {
  const m = classStr.match(/underline_(?:solid|wavy)_(.+)$/)
  return m ? m[1] : 'default'
}
