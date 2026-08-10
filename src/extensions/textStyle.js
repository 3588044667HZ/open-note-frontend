import { Mark } from '@tiptap/core'

/**
 * 扩展官方 TextStyle，支持 class 属性（颜色/高亮存储载体）
 */
export const TextStyleWithClass = Mark.create({
  name: 'textStyle',

  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute('style'),
        renderHTML: (attributes) => {
          if (!attributes.style) return {}
          return { style: attributes.style }
        },
      },
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          if (!attributes.class) return {}
          return { class: attributes.class }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (element) =>
          element.hasAttribute('class') || element.hasAttribute('style') ? {} : false,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0]
  },

  addCommands() {
    return {
      removeEmptyTextStyle: () => ({ state, commands }) => {
        const attrs = state.selection.$from.marks().find((m) => m.type.name === this.name)?.attrs
        const hasAnyAttr = attrs && Object.entries(attrs).some(([, v]) => !!v)
        if (!hasAnyAttr) {
          return commands.unsetMark(this.name)
        }
        return true
      },
    }
  },
})
