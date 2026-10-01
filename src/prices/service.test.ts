import { afterEach, describe, expect, it, vi } from 'vitest'
import { move } from '../money/test-helpers.ts'
import type { PriceRecord } from '../money/types.ts'
import dated20251031 from './fixtures/dated-2025-10-31.json'
import dated20260930 from './fixtures/dated-2026-09-30.json'
import latest from './fixtures/latest-2026-10-01.json'
import { datedAddresses, fetchDay, fetchLatest, implausible, latestAddresses, missingMonthEnds, readAnswer, stale, TIMEOUT_MS, type Fetcher } from './service.ts'

const NOW = new Date('2026-10-01T09:00:00.000Z')
const now = () => NOW
const answer = (body: unknown, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
// A request that never answers, but gives up when it is told to, as fetch does.
const hanging: Fetcher = (_url, { signal }) =>
  new Promise((_resolve, reject) => {
    const giveUp = () => reject(new DOMException('Aborted', 'AbortError'))
    if (signal?.aborted) giveUp()
    signal?.addEventListener('abort', giveUp)
  })
const record = (date: string, usdTry = 49): PriceRecord => ({ date, usdTry, eurTry: 55.5, xauTry: 205_000, fetchedAt: `${date}T09:00:00.000Z` })
/** A network that answers each address from a table; anything else fails as an offline fetch does. */
const network = (table: Record<string, () => Response | Promise<Response>>, asked: string[] = []): Fetcher => async (url, init) => {
  asked.push(url)
  expect(init.cache).toBe('no-cache')
  const reply = table[url]
  if (!reply) throw new TypeError('Failed to fetch')
  return reply()
}

afterEach(() => vi.useRealTimers())

describe('reading an answer', () => {
  it('turns what a lira buys into what a dollar, a euro and an ounce cost', () => {
    const read = readAnswer(latest, NOW.toISOString())!
    expect(read.date).toBe('2026-10-01')
    expect(read.usdTry).toBeCloseTo(49.03, 2)
    expect(read.eurTry).toBeCloseTo(55.48, 2)
    expect(read.xauTry / 31.1034768).toBeCloseTo(6592.99, 1) // a gram
    expect(read.fetchedAt).toBe(NOW.toISOString())
  })

  it('drops an answer with a rate missing, not a number, or not above zero', () => {
    const without = (key: string, value?: unknown) => ({ date: '2026-10-01', try: { ...latest.try, [key]: value } })
    expect(readAnswer(without('xau'), '')).toBeUndefined()
    expect(readAnswer(without('usd', '0.02'), '')).toBeUndefined()
    expect(readAnswer(without('eur', 0), '')).toBeUndefined()
    expect(readAnswer(without('eur', -1), '')).toBeUndefined()
    expect(readAnswer(without('usd', Number.NaN), '')).toBeUndefined()
    expect(readAnswer({ ...latest, date: '01.10.2026' }, '')).toBeUndefined()
    expect(readAnswer('<html>Wi-Fi login</html>', '')).toBeUndefined()
    expect(readAnswer(null, '')).toBeUndefined()
  })
})

describe('a jump too large to be true', () => {
  it('is more than half within a week', () => {
    expect(implausible(record('2026-10-01', 74), record('2026-09-28', 49))).toBe(true)
    expect(implausible(record('2026-10-01', 24), record('2026-09-28', 49))).toBe(true)
    expect(implausible(record('2026-10-01', 70), record('2026-09-28', 49))).toBe(false)
    expect(implausible(record('2026-10-01', 49), undefined)).toBe(false)
  })

  it('is not judged against a record older than a week, or the app could never catch up', () => {
    expect(implausible(record('2026-10-01', 90), record('2026-09-23', 49))).toBe(false)
    expect(implausible(record('2026-10-01', 90), record('2026-09-24', 49))).toBe(true)
  })
})

describe('the latest prices', () => {
  const [jsdelivr, pages] = latestAddresses()

  it('asks both mirrors and keeps the newer day', async () => {
    const asked: string[] = []
    const result = await fetchLatest(undefined, network({ [jsdelivr]: () => answer(dated20260930), [pages]: () => answer(latest) }, asked), now)
    expect(asked.sort()).toEqual([jsdelivr, pages].sort())
    expect(result.kind === 'record' && result.record.date).toBe('2026-10-01')
  })

  it('makes do with one mirror when the other fails', async () => {
    const one = await fetchLatest(undefined, network({ [jsdelivr]: () => answer(latest) }), now)
    expect(one.kind === 'record' && one.record.date).toBe('2026-10-01')
    const other = await fetchLatest(undefined, network({ [jsdelivr]: () => answer('Not found', 404), [pages]: () => answer(latest) }), now)
    expect(other.kind === 'record' && other.record.date).toBe('2026-10-01')
  })

  it('fails when neither answers usefully', async () => {
    expect(await fetchLatest(undefined, network({}), now)).toEqual({ kind: 'failed' })
    expect(await fetchLatest(undefined, network({ [jsdelivr]: () => answer('<html></html>'), [pages]: () => answer({ date: '2026-10-01', try: {} }) }), now)).toEqual({ kind: 'failed' })
  })

  it('gives up after ten seconds', async () => {
    vi.useFakeTimers()
    const result = fetchLatest(undefined, hanging, now)
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    expect(await result).toEqual({ kind: 'failed' })
  })

  it('drops an answer that jumped too far since the last, and keeps a sound one', async () => {
    const wild = { date: '2026-10-01', try: { ...latest.try, usd: latest.try.usd / 3 } } // the dollar tripled
    const previous = record('2026-09-30', 49.01)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(await fetchLatest(previous, network({ [jsdelivr]: () => answer(wild) }), now)).toEqual({ kind: 'implausible' })
    const mixed = await fetchLatest(previous, network({ [jsdelivr]: () => answer(wild), [pages]: () => answer(dated20260930) }), now)
    expect(mixed.kind === 'record' && mixed.record.date).toBe('2026-09-30')
    vi.restoreAllMocks()
  })
})

describe('a past day’s prices', () => {
  it('comes from the dated address of that day', async () => {
    const [jsdelivr] = datedAddresses('2025-10-31')
    const found = await fetchDay('2025-10-31', network({ [jsdelivr]: () => answer(dated20251031) }), now)
    expect(found).toMatchObject({ date: '2025-10-31' })
    expect(found).not.toHaveProperty('monthEnd')
    expect(found!.usdTry).toBeCloseTo(42.03, 2)
  })

  it('tries the other mirror, then up to three days back, and marks what it found with the day asked for', async () => {
    const asked: string[] = []
    const [, pages] = datedAddresses('2026-09-28')
    const found = await fetchDay('2026-09-30', network({ [pages]: () => answer({ ...dated20260930, date: '2026-09-28' }) }, asked), now)
    expect(found).toMatchObject({ date: '2026-09-28', monthEnd: '2026-09-30' })
    expect(asked).toEqual([...datedAddresses('2026-09-30'), ...datedAddresses('2026-09-29'), ...datedAddresses('2026-09-28')])
  })

  it('stops after three days back', async () => {
    const asked: string[] = []
    expect(await fetchDay('2026-09-30', network({}, asked), now)).toBeUndefined()
    expect(asked).toHaveLength(8) // the day and three before it, at two mirrors each
  })
})

describe('when to ask', () => {
  it('asks again after six hours, or when there is nothing yet', () => {
    expect(stale(undefined, NOW)).toBe(true)
    expect(stale({ ...record('2026-10-01'), fetchedAt: '2026-10-01T03:30:00.000Z' }, NOW)).toBe(false)
    expect(stale({ ...record('2026-10-01'), fetchedAt: '2026-10-01T02:59:00.000Z' }, NOW)).toBe(true)
  })

  it('downloads the month ends the chart lacks, none for a month of lira alone', () => {
    const list = [move('TRY', 1000, '2026-05-10'), move('GRAM', 2, '2026-07-15')]
    expect(missingMonthEnds(list, '2026-10-01', [])).toEqual(['2026-07-31', '2026-08-31', '2026-09-30'])
    const kept = [record('2026-07-31'), { ...record('2026-08-29'), monthEnd: '2026-08-31' }]
    expect(missingMonthEnds(list, '2026-10-01', kept)).toEqual(['2026-09-30'])
    expect(missingMonthEnds([], '2026-10-01', [])).toEqual([])
  })

  it('looks no further back than the chart shows', () => {
    expect(missingMonthEnds([move('USD', 1, '2024-01-01')], '2026-10-01', [])).toHaveLength(11)
    expect(missingMonthEnds([move('USD', 1, '2024-01-01')], '2026-10-01', [])[0]).toBe('2025-11-30')
  })
})
