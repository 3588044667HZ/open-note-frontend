import { Extension } from '@tiptap/core'

export const FormatCommands = Extension.create({
  name: 'formatCommands',

  addCommands() {
    return {
      setFormat: (attrs) => ({ commands }) => {
        return commands.setMark('textStyle', attrs)
      },
      unsetFormat: (filter) => ({ state, tr, dispatch }) => {
        const markType = state.schema.marks.textStyle
        if (!markType) return false
        const { from, to } = state.selection
        let applied = false

        state.doc.nodesBetween(from, Math.max(from, to), (node, pos) => {
          if (!node.isText || !node.marks?.length) return
          const mark = node.marks.find((m) => m.type === markType)
          if (!mark) return
          const classes = (mark.attrs.class || '').split(' ').filter(Boolean)
          const remaining = classes.filter((c) => !filter(c))
          if (remaining.length === 0) {
            tr.removeMark(pos, pos + node.nodeSize, markType)
          } else {
            tr.addMark(pos, pos + node.nodeSize, markType.create({ class: remaining.join(' ') }))
          }
          applied = true
        })

        // 始终清理 storedMarks，确保光标处后续输入不继承旧格式
        tr.removeStoredMark(markType)
        applied = true

        if (dispatch) dispatch(tr)
        return applied
      },
      clearExtraFormat: () => ({ state, tr, dispatch }) => {
        tr.removeStoredMark(state.schema.marks.textStyle)
        if (dispatch) dispatch(tr)
        return true
      },
    }
  },
})
