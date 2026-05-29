/**
 * Dùng normalizeText() cho MỌI tìm kiếm / filter text trong app —
 * không dùng .toLowerCase().includes() trực tiếp.
 */

const MANUAL_CHAR_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['đ', 'd'],
  ['ă', 'a'],
  ['â', 'a'],
  ['ê', 'e'],
  ['ô', 'o'],
  ['ơ', 'o'],
  ['ư', 'u'],
  ['å', 'a'],
  ['ä', 'a'],
  ['ö', 'o'],
]

export function normalizeText(text: string): string {
  let s = text.toLowerCase()
  s = s.replace(/[,'\-_.\s!?@#$%^&*()+=\[\]{}|\\/<>~`"]/g, '')
  for (const [from, to] of MANUAL_CHAR_REPLACEMENTS) {
    s = s.replaceAll(from, to)
  }
  s = s.normalize('NFD')
  s = s.replace(/[\u0300-\u036f]/g, '')
  return s
}
