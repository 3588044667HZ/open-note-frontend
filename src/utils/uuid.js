// UUID v4：优先 crypto.randomUUID（需 secure context），否则降级 Math.random 拼装
export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  const s = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')
  return `${s()}${s()}-${s()}-4${s().slice(1)}-${((Math.random() * 4) | 8).toString(16)}${s().slice(1)}-${s()}${s()}${s()}`
}
