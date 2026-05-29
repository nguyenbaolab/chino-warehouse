/** ISO YYYY-MM-DD → DD/MM/YYYY cho ô edit (rỗng nếu không có hạn). */
export function isoExpiryToDisplay(iso?: string): string {
  if (!iso?.trim()) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!match) return ''
  return `${match[3]}/${match[2]}/${match[1]}`
}

/** DD/MM/YYYY hoặc MM/YYYY → YYYY-MM-DD; rỗng → undefined; không hợp lệ → undefined. */
export function parseDisplayDateToIso(raw: string): string | undefined {
  const value = raw.trim()
  if (!value) return undefined

  const fullMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (fullMatch) {
    const day = Number(fullMatch[1])
    const month = Number(fullMatch[2])
    const year = Number(fullMatch[3])
    const date = new Date(year, month - 1, day)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return undefined
    }
    const mm = String(month).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  const monthYearMatch = /^(\d{2})\/(\d{4})$/.exec(value)
  if (monthYearMatch) {
    const month = Number(monthYearMatch[1])
    const year = Number(monthYearMatch[2])
    if (month < 1 || month > 12) return undefined
    const date = new Date(year, month - 1, 1)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1) {
      return undefined
    }
    const mm = String(month).padStart(2, '0')
    return `${year}-${mm}-01`
  }

  return undefined
}

export function isValidDisplayDate(display: string): boolean {
  const value = display.trim()
  if (!value) return true
  return parseDisplayDateToIso(value) !== undefined
}
