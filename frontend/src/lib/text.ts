// Live feedback for coaches while editing. The server re-checks on approve.
const WORD = /[A-Za-zÀ-ÿ']+/g
const VOWEL_GROUPS = /[aeiouy]+/g

export function countWords(text: string): number {
  return text.match(WORD)?.length ?? 0
}

function syllables(word: string): number {
  const lower = word.toLowerCase()
  let count = lower.match(VOWEL_GROUPS)?.length ?? 0
  if (lower.endsWith('e') && !lower.endsWith('le') && !lower.endsWith('ee') && count > 1) count--
  return Math.max(count, 1)
}

/** Flesch-Kincaid grade level (English). */
export function gradeLevel(text: string): number {
  const words = text.match(WORD) ?? []
  if (words.length === 0) return 0
  const sentences = Math.max(text.split(/[.!?]+/).filter((s) => s.trim()).length, 1)
  const syllableCount = words.reduce((sum, w) => sum + syllables(w), 0)
  return 0.39 * (words.length / sentences) + 11.8 * (syllableCount / words.length) - 15.59
}
