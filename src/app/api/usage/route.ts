import { NextResponse } from 'next/server'
import { readGeminiUsageSummary } from '@/lib/gemini-usage'

export async function GET() {
  return NextResponse.json(readGeminiUsageSummary())
}
