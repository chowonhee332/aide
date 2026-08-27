import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { COMPONENT_DEFINITIONS } from '@/lib/builder-components';
import type { BuilderDevice } from '@/lib/builder-types';
import { GEMINI_ECONOMY_MODEL } from '@/lib/gemini-model-policy';

interface ComposeItem {
  componentId: string;
  props?: Record<string, string>;
}

interface ComposePlan {
  mode: 'append' | 'replace';
  summary: string;
  items: ComposeItem[];
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse((fenced ?? text).trim());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      prompt?: string;
      device?: BuilderDevice;
      currentItems?: Array<{ componentId: string; props?: Record<string, string> }>;
    };
    const prompt = body.prompt?.trim();
    const device = body.device === 'desktop' ? 'desktop' : 'mobile';
    if (!prompt) return NextResponse.json({ error: '요청 내용을 입력해주세요.' }, { status: 400 });

    const apiKey = request.headers.get('x-gemini-key')?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Gemini API Key를 먼저 설정해주세요.' }, { status: 400 });

    const catalog = COMPONENT_DEFINITIONS
      .filter((component) => component.supportedDevices?.includes(device) ?? true)
      .map((component) => ({
        id: component.id,
        name: component.name,
        description: component.description,
        category: component.category,
        props: component.propSchema.map((prop) => ({ key: prop.key, type: prop.type, options: prop.options })),
        defaults: component.defaultProps,
      }));

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: GEMINI_ECONOMY_MODEL,
      contents: `You are the layout planner for the Aide Playground component editor.
Convert the user's Korean or English request into editable components from the supplied catalog only.

Rules:
- Return JSON only: {"mode":"append|replace","summary":"short Korean summary","items":[{"componentId":"catalog id","props":{"validPropKey":"string value"}}]}.
- Use "append" for additions or short component requests. Use "replace" only when the user clearly asks to create/rebuild an entire screen.
- Never invent component IDs or prop keys.
- Arrange items in visual reading order. The client automatically places headers, content, bottom actions, and overlays.
- For a bare noun such as "검색창", add the closest single component.
- Keep the plan compact and useful; do not add decorative components unless requested.

Device: ${device}
Current components: ${JSON.stringify(body.currentItems ?? [])}
Available catalog: ${JSON.stringify(catalog)}
User request: ${prompt}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 4096,
        httpOptions: { timeout: 45_000 },
      },
    });

    const rawPlan = extractJson(result.text ?? '') as Partial<ComposePlan>;
    const definitions = new Map(COMPONENT_DEFINITIONS.map((component) => [component.id, component]));
    const items = Array.isArray(rawPlan.items) ? rawPlan.items.flatMap((item) => {
      const definition = definitions.get(item?.componentId);
      if (!definition || !(definition.supportedDevices?.includes(device) ?? true)) return [];
      const allowedProps = new Set(definition.propSchema.map((prop) => prop.key));
      const props = Object.fromEntries(
        Object.entries(item.props ?? {})
          .filter(([key, value]) => allowedProps.has(key) && ['string', 'number', 'boolean'].includes(typeof value))
          .map(([key, value]) => [key, String(value)]),
      );
      return [{ componentId: definition.id, props }];
    }) : [];

    if (items.length === 0) {
      return NextResponse.json({ error: '요청에 맞는 컴포넌트를 찾지 못했습니다. 조금 더 구체적으로 입력해주세요.' }, { status: 422 });
    }

    return NextResponse.json({
      mode: rawPlan.mode === 'replace' ? 'replace' : 'append',
      summary: typeof rawPlan.summary === 'string' ? rawPlan.summary : `${items.length}개 컴포넌트 적용`,
      items,
    } satisfies ComposePlan);
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    const isAuthError = /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|401/i.test(message);
    return NextResponse.json(
      { error: isAuthError ? 'Gemini API Key가 없거나 유효하지 않습니다. 홈의 API 설정에서 키를 확인해주세요.' : `AI 편집에 실패했습니다: ${message}` },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
