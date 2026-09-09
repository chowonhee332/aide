import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { ASTRYX_TEMPLATES, ASTRYX_TEMPLATES_BY_ID } from '@/lib/astryx-templates';
import { GEMINI_ECONOMY_MODEL } from '@/lib/gemini-model-policy';

// Compose mode: the brief picks ONE Astryx page template to open in the Playground
// (no A/B/C). A small LLM 1-pass over the template catalog — no regex keyword map
// (AGENTS.md) — with a deterministic word-overlap fallback so an offline / no-key
// / failed model still opens the closest template instead of dead-ending.

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse((fenced ?? text).trim());
}

/** Lowercased word/character tokens for loose brief↔catalog overlap scoring. */
function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const words = lower.match(/[a-z0-9]{3,}/g) ?? [];
  const hangul = lower.match(/[가-힣]{2,}/g) ?? [];
  return [...words, ...hangul];
}

/**
 * Deterministic fallback: the catalog row sharing the most tokens with the brief.
 * The catalog is English-only, so a Korean brief usually scores 0 across the
 * board — in that case fall back to a neutral scaffold rather than whatever
 * happens to sort first.
 */
function pickTemplateByOverlap(brief: string): { id: string; name: string } {
  const briefTokens = new Set(tokenize(brief));
  let best: (typeof ASTRYX_TEMPLATES)[number] | undefined;
  let bestScore = 0;
  for (const template of ASTRYX_TEMPLATES) {
    const haystack = tokenize(`${template.name} ${template.description} ${template.category}`);
    let score = 0;
    for (const token of haystack) if (briefTokens.has(token)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = template;
    }
  }
  const chosen = best ?? ASTRYX_TEMPLATES_BY_ID['blank'] ?? ASTRYX_TEMPLATES[0];
  return { id: chosen.id, name: chosen.name };
}

export async function POST(request: NextRequest) {
  let brief = '';
  try {
    const body = (await request.json()) as { brief?: string };
    brief = body.brief?.trim() ?? '';
    if (!brief) {
      return NextResponse.json({ error: '브리프를 입력해주세요.' }, { status: 400 });
    }

    const catalog = ASTRYX_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
    }));

    const apiKey = request.headers.get('x-gemini-key')?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = pickTemplateByOverlap(brief);
      return NextResponse.json({ ...fallback, confidence: null, reason: '오프라인 추정 (API Key 없음)' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: GEMINI_ECONOMY_MODEL,
      contents: `You match a product brief to the single closest page template from the catalog below.

Rules:
- Return JSON only: {"id":"<catalog id>","confidence":0-1,"reason":"short Korean phrase"}.
- "id" MUST be one of the catalog ids exactly. Never invent one.
- Pick the template whose purpose and layout best fit the brief's primary screen.
- If nothing fits well, still return the closest id with a low confidence.

Catalog: ${JSON.stringify(catalog)}
Brief: ${brief}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 512,
        httpOptions: { timeout: 30_000 },
      },
    });

    const raw = extractJson(result.text ?? '') as { id?: string; confidence?: number; reason?: string };
    const matched = raw.id && ASTRYX_TEMPLATES_BY_ID[raw.id];
    if (!matched) {
      const fallback = pickTemplateByOverlap(brief);
      return NextResponse.json({ ...fallback, confidence: null, reason: '오프라인 추정 (모델 응답 불명확)' });
    }

    return NextResponse.json({
      id: matched.id,
      name: matched.name,
      confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : null,
      reason: typeof raw.reason === 'string' ? raw.reason : null,
    });
  } catch (error) {
    // Model call failed (network, quota, invalid key, timeout). Still open the
    // closest template rather than blocking compose mode.
    if (brief) {
      const fallback = pickTemplateByOverlap(brief);
      return NextResponse.json({ ...fallback, confidence: null, reason: '오프라인 추정 (모델 호출 실패)' });
    }
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ error: `템플릿 매칭에 실패했습니다: ${message}` }, { status: 500 });
  }
}
