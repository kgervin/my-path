export interface HeaderCheck {
  missing: string[]
  rowCount: number
}

/** Reads only the header and counts rows so problems surface before upload (heuristic 5). */
export async function checkCsv(file: File, required: readonly string[]): Promise<HeaderCheck> {
  const text = (await file.text()).replace(/^﻿/, '')
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  const header = new Set((lines[0] ?? '').split(',').map((h) => h.trim()))
  return {
    missing: required.filter((column) => !header.has(column)),
    rowCount: Math.max(lines.length - 1, 0),
  }
}
