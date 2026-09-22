import { checkCsv } from './csv'
import { daysLabel, humanize, isUrgent } from './format'
import { readStored, writeStored } from './storage'
import { countWords, gradeLevel } from './text'

describe('text', () => {
  it('counts words including accents and apostrophes', () => {
    expect(countWords("Hola María, it's me.")).toBe(4)
    expect(countWords('')).toBe(0)
  })

  it('scores simple text below grade 8 and dense text above it', () => {
    expect(gradeLevel('')).toBe(0)
    expect(gradeLevel('The cat sat. The dog ran.')).toBeLessThan(2)
    expect(
      gradeLevel('Institutional reconciliation necessitates comprehensive documentation.'),
    ).toBeGreaterThan(12)
  })
})

describe('format', () => {
  it.each([
    [5, '5 days to drop'],
    [1, '1 day to drop'],
    [0, 'Drop date is today'],
    [-1, 'Drop date passed 1 day ago'],
    [-3, 'Drop date passed 3 days ago'],
  ])('labels %i days', (days, label) => {
    expect(daysLabel(days)).toBe(label)
  })

  it('marks urgency below the threshold only', () => {
    expect(isUrgent(6, 7)).toBe(true)
    expect(isUrgent(7, 7)).toBe(false)
  })

  it('humanizes identifiers', () => {
    expect(humanize('aid_office')).toBe('Aid office')
  })
})

describe('checkCsv', () => {
  it('reports missing columns and counts rows, ignoring a BOM and blank lines', async () => {
    const file = new File(['﻿student_id,first_name\nS1,Ana\n\nS2,Bo\n'], 'a.csv')
    await expect(checkCsv(file, ['student_id', 'program'])).resolves.toEqual({
      missing: ['program'],
      rowCount: 2,
    })
  })
})

describe('storage', () => {
  it('round-trips values and survives storage errors', () => {
    writeStored('k', 'v')
    expect(readStored('k')).toBe('v')
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readStored('k')).toBeNull()
    expect(() => writeStored('k', 'x')).not.toThrow()
    spy.mockRestore()
    vi.restoreAllMocks()
  })
})
