export type CanvasPlatform = 'mobile' | 'web'
export type CanvasDensity = 'compact' | 'balanced' | 'airy'
export type CanvasMediaMode = 'none' | 'data' | 'illustration' | 'photo' | 'mixed'
export type CanvasNavigation = 'bottom-tabs' | 'top-bar' | 'sidebar' | 'minimal'
export type CanvasComposition =
  | 'dashboard'
  | 'immersive'
  | 'editorial'
  | 'workspace'
  | 'feed'
  | 'map'
  | 'commerce'
  | 'guided'
  | 'experimental'

export interface DesignDirection {
  id: string
  name: string
  thesis: string
  userFeeling: string
  composition: CanvasComposition
  density: CanvasDensity
  mediaMode: CanvasMediaMode
  navigation: CanvasNavigation
  focalPoint: string
  primaryAction: string
  sectionFlow: string[]
  paletteIntent: string
  typographyIntent: string
  signatureMove: string
  avoid: string[]
}

export type CanvasNodeKind =
  | 'frame'
  | 'text'
  | 'button'
  | 'image'
  | 'metric'
  | 'card'
  | 'list'
  | 'navigation'
  | 'shape'

export interface CanvasNode {
  id: string
  kind: CanvasNodeKind
  role: string
  x: number
  y: number
  width: number
  height: number
  text?: string
  /** Secondary line under `text`, e.g. a real data point for a card. */
  caption?: string
  styleRole?: string
  children?: CanvasNode[]
}

export interface DesignCanvasIR {
  version: 1
  id: string
  platform: CanvasPlatform
  width: number
  height: number
  direction: DesignDirection
  visualContract?: {
    accent: string
    accent2: string
    soft: string
    ink: string
    page: string
  }
  nodes: CanvasNode[]
}

export interface DesignDirectionRequest {
  brief: string
  projectSummary?: string
  platform: CanvasPlatform
  domain?: string
  targetAudience?: string
  primaryJourney?: string
  coreObjects?: string[]
  keyDataPoints?: string[]
  designSystemSummary?: string
  /** A/B/C가 실제로 사용할 미디어 역할. 방향 선택과 렌더 정책의 충돌을 막는다. */
  visualRoles?: Array<'data' | '3d' | 'photo'>
  /** Real content produced by ServiceAnalysis, so the preview shows the service
   *  instead of placeholder copy. */
  contentSeed?: {
    kpis?: Array<{ label: string; value: string; meta?: string }>
    quickActions?: string[]
    listItems?: Array<{ title: string; meta?: string; value?: string; badge?: string }>
    activityItems?: Array<{ title: string; meta?: string; value?: string }>
  }
}
