import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { ASTRYX_TEMPLATES, ASTRYX_TEMPLATES_BY_ID } from '@/lib/astryx-templates';
import { GEMINI_ECONOMY_MODEL } from '@/lib/gemini-model-policy';

// Compose mode: the brief picks ONE Astryx page template to open in the Playground
// (no A/B/C). A small LLM 1-pass over the template catalog — no regex keyword map
// (AGENTS.md) — with a deterministic fallback so an offline/failed model still
// opens something sensible.

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse((fenced ?? text).trim());
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { brief?: string };
    const brief = body.brief?.trim();
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
      return NextResponse.json({ error: 'Gemini API Key를 먼저 설정해주세요.' }, { status: 400 });
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
      return NextResponse.json({ error: '브리프에 맞는 템플릿을 찾지 못했습니다.' }, { status: 422 });
    }

    return NextResponse.json({
      id: matched.id,
      name: matched.name,
      confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : null,
      reason: typeof raw.reason === 'string' ? raw.reason : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    const isAuthError = /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|401/i.test(message);
    return NextResponse.json(
      {
        error: isAuthError
          ? 'Gemini API Key가 없거나 유효하지 않습니다. 홈의 API 설정에서 키를 확인해주세요.'
          : `템플릿 매칭에 실패했습니다: ${message}`,
      },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
