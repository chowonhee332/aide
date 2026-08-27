import fs from 'fs'
import path from 'path'

export interface GeminiUsageEntry {
  timestamp: string
  model: string
  source: string
  promptTokens: number
  outputTokens: number
}

export interface GeminiUsageByModel {
  model: string
  calls: number
  promptTokens: number
  outputTokens: number
  costUsd: number
  priced: boolean
}

export interface GeminiUsageByDay {
  date: string
  calls: number
  promptTokens: number
  outputTokens: number
  costUsd: number
}

export interface GeminiUsageSummary {
  totalCalls: number
  totalCostUsd: number
  totalPromptTokens: number
  totalOutputTokens: number
  byModel: GeminiUsageByModel[]
  byDay: GeminiUsageByDay[]
  recent: GeminiUsageEntry[]
}

// Gemini API 공식 가격표 (ai.google.dev/gemini-api/docs/pricing, 2026-08-25 확인 기준, 1M 토큰당 USD).
// 가격이 바뀌면 이 표만 갱신하면 된다. 이미지 출력도 Gemini가 해상도별 고정 토큰 수로 과금하므로
// candidatesTokenCount를 그대로 쓰면 텍스트·이미지 모델 모두 같은 공식으로 계산된다.
const PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  'gemini-3.7-flash': { inputPerM: 0.75, outputPerM: 3.75 },
  'gemini-3.6-flash': { inputPerM: 0.75, outputPerM: 3.75 },
  'gemini-3.5-flash-lite': { inputPerM: 0.30, outputPerM: 2.50 },
  'gemini-3.1-pro-preview': { inputPerM: 2.00, outputPerM: 12.00 },
  'gemini-3.1-flash-image': { inputPerM: 0.50, outputPerM: 60.00 },
  'gemini-3.1-flash-lite-image': { inputPerM: 0.25, outputPerM: 30.00 },
  'gemini-3-pro-image': { inputPerM: 2.00, outputPerM: 120.00 },
}

const LOG_DIR = path.join(process.cwd(), '.aide-logs')
const LOG_FILE = path.join(LOG_DIR, 'gemini-usage.jsonl')

function estimateCostUsd(model: string, promptTokens: number, outputTokens: number): number {
  const price = PRICING[model]
  if (!price) return 0
  return (promptTokens / 1_000_000) * price.inputPerM + (outputTokens / 1_000_000) * price.outputPerM
}

export function logGeminiUsage(
  model: string,
  source: string,
  usage?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number },
) {
  if (!usage || (!usage.promptTokenCount && !usage.candidatesTokenCount)) return
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
    const entry: GeminiUsageEntry = {
      timestamp: new Date().toISOString(),
      model,
      source,
      promptTokens: usage.promptTokenCount ?? 0,
      outputTokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0),
    }
    fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`)
  } catch (err) {
    console.warn('[gemini-usage] log failed:', err instanceof Error ? err.message : err)
  }
}

export function readGeminiUsageSummary(): GeminiUsageSummary {
  if (!fs.existsSync(LOG_FILE)) return { totalCalls: 0, totalCostUsd: 0, totalPromptTokens: 0, totalOutputTokens: 0, byModel: [], byDay: [], recent: [] }
  const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean)
  const entries: GeminiUsageEntry[] = []
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as GeminiUsageEntry)
    } catch {
      // 손상된 줄은 건너뛴다
    }
  }

  const byModelMap = new Map<string, GeminiUsageByModel>()
  const byDayMap = new Map<string, GeminiUsageByDay>()
  for (const entry of entries) {
    const existing = byModelMap.get(entry.model) ?? {
      model: entry.model,
      calls: 0,
      promptTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      priced: entry.model in PRICING,
    }
    existing.calls += 1
    existing.promptTokens += entry.promptTokens
    existing.outputTokens += entry.outputTokens
    existing.costUsd += estimateCostUsd(entry.model, entry.promptTokens, entry.outputTokens)
    byModelMap.set(entry.model, existing)

    const date = entry.timestamp.slice(0, 10)
    const day = byDayMap.get(date) ?? { date, calls: 0, promptTokens: 0, outputTokens: 0, costUsd: 0 }
    day.calls += 1
    day.promptTokens += entry.promptTokens
    day.outputTokens += entry.outputTokens
    day.costUsd += estimateCostUsd(entry.model, entry.promptTokens, entry.outputTokens)
    byDayMap.set(date, day)
  }

  const byModel = [...byModelMap.values()].sort((a, b) => b.costUsd - a.costUsd)
  const today = new Date()
  const byDay = Array.from({ length: 14 }, (_, offset) => {
    const date = new Date(today)
    date.setUTCDate(today.getUTCDate() - (13 - offset))
    const key = date.toISOString().slice(0, 10)
    return byDayMap.get(key) ?? { date: key, calls: 0, promptTokens: 0, outputTokens: 0, costUsd: 0 }
  })
  return {
    totalCalls: entries.length,
    totalCostUsd: byModel.reduce((sum, m) => sum + m.costUsd, 0),
    totalPromptTokens: entries.reduce((sum, entry) => sum + entry.promptTokens, 0),
    totalOutputTokens: entries.reduce((sum, entry) => sum + entry.outputTokens, 0),
    byModel,
    byDay,
    recent: entries.slice(-50).reverse(),
  }
}
