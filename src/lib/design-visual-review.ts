export interface DesignVisualReview {
  score: number
  needsPatch: boolean
  summary: string
  issues: string[]
  cssPatch: string
}

type VisionGenerator = (prompt: string, imageBase64: string) => Promise<string>

function extractJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('비주얼 리뷰 JSON을 찾지 못했습니다.')
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
}

function cleanCssPatch(value: unknown, allowedClasses: Set<string>): string {
  if (typeof value !== 'string') return ''
  const css = value.trim().slice(0, 3500)
  if (!css.includes('{') || !css.includes('}')) return ''
  if (/@|url\s*\(|expression\s*\(|javascript:|<\/?style|<script|!important/i.test(css)) return ''
  const rules = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)]
  if (rules.length === 0) return ''
  for (const rule of rules) {
    for (const selector of rule[1].split(',')) {
      const classes = [...selector.matchAll(/\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g)].map(match => match[1])
      if (classes.length === 0 || classes.some(className => !allowedClasses.has(className))) return ''
      if (/#|\b(?:html|body|main|header|footer|section|button|img|svg)\b/i.test(selector.replace(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g, ''))) return ''
    }
  }
  return css
}

function htmlInventory(html: string): string {
  const classes = [...html.matchAll(/class=["']([^"']+)["']/gi)]
    .flatMap(match => match[1].split(/\s+/))
    .filter(Boolean)
  const uniqueClasses = [...new Set(classes)].slice(0, 100)
  const sections = (html.match(/<section\b/gi) ?? []).length
  const buttons = (html.match(/<button\b|class=["'][^"']*\b(?:btn|button|cta)\b/gi) ?? []).length
  const images = (html.match(/<img\b/gi) ?? []).length
  return `sections=${sections}, buttons=${buttons}, images=${images}\nexisting classes=${uniqueClasses.join(', ')}`
}

export async function reviewDesignScreenshot(args: {
  screenshotBase64: string
  html: string
  directionPlan?: string
  platform: 'mobile' | 'web'
  generateVision: VisionGenerator
}): Promise<DesignVisualReview> {
  const prompt = `당신은 시니어 프로덕트 UI 디렉터다. 첨부된 ${args.platform} UI 스크린샷을 비판적으로 검수하라.

디자인 방향:
${(args.directionPlan || '지정 없음').slice(0, 4500)}

DOM 인벤토리:
${htmlInventory(args.html)}

판단 기준:
- focal point가 0.5초 안에 보이는가
- 정보 계층·여백·정렬·밀도가 안정적인가
- 기존의 평범한 header + hero + 같은 카드 반복으로 환원하지 않았는가
- 이미지·CTA·타이포그래피가 경쟁하거나 겹치지 않는가
- 텍스트 잘림, 세로 글자, 과도한 라운드 카드, 빈 영역이 없는가

수정 규칙:
- HTML이나 새 요소를 작성하지 말라.
- 반드시 DOM 인벤토리에 있는 class만 selector로 사용한다.
- CSS는 구도·간격·크기·정렬·타입 계층 교정에만 사용한다.
- 색상은 기존 CSS variable만 사용하고 새 hex·rgb를 추가하지 말라.
- 외부 URL, @import, @font-face, script는 금지한다.
- 이미 좋으면 needsPatch=false로 두라. 억지로 수정하지 말라.

설명 없이 JSON 객체만 출력:
{"score":0,"needsPatch":false,"summary":"","issues":[""],"cssPatch":""}`

  try {
    const raw = extractJson(await args.generateVision(prompt, args.screenshotBase64))
    const score = typeof raw.score === 'number' ? Math.max(0, Math.min(100, Math.round(raw.score))) : 70
    const issues = Array.isArray(raw.issues) ? raw.issues.filter((item): item is string => typeof item === 'string').slice(0, 5) : []
    const allowedClasses = new Set([...args.html.matchAll(/class=["']([^"']+)["']/gi)].flatMap(match => match[1].split(/\s+/)).filter(Boolean))
    const cssPatch = cleanCssPatch(raw.cssPatch, allowedClasses)
    return {
      score,
      needsPatch: raw.needsPatch === true && score < 82 && cssPatch.length > 0,
      summary: typeof raw.summary === 'string' ? raw.summary.slice(0, 300) : '',
      issues,
      cssPatch,
    }
  } catch (error) {
    console.warn('[design-visual-review] skipped:', error instanceof Error ? error.message : error)
    return { score: 0, needsPatch: false, summary: '', issues: [], cssPatch: '' }
  }
}

export function injectVisualReviewCss(html: string, review: DesignVisualReview): string {
  if (!review.needsPatch || !review.cssPatch) return html
  const style = `<style data-aide-visual-review="1">\n${review.cssPatch}\n</style>`
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${style}\n</head>`) : `${style}\n${html}`
}
