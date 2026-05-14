import airbnbMd from './design-systems/airbnb.md'
import framerMd from './design-systems/framer.md'
import ktdsMd from './design-systems/ktds.md'
import uberMd from './design-systems/uber.md'

export type DesignPreset = 'none' | 'airbnb' | 'framer' | 'ktds' | 'uber'

export interface ColorSwatch {
  name: string
  hex: string
}

export interface DesignPresetMeta {
  label: string
  md: string
  color?: string
  description?: string
  palette?: ColorSwatch[]
  fonts?: { headline: string; body: string }
  traits?: string[]
}

export const DESIGN_PRESETS: Record<DesignPreset, DesignPresetMeta> = {
  none: {
    label: '없음',
    md: '',
    description: 'AI가 브랜드에 맞는 디자인 시스템을 직접 설계합니다',
  },
  airbnb: {
    label: 'Airbnb',
    md: airbnbMd,
    color: '#ff385c',
    description: '따뜻한 여행 마켓플레이스',
    palette: [
      { name: 'Rausch', hex: '#ff385c' },
      { name: 'Ink', hex: '#222222' },
      { name: 'Canvas', hex: '#ffffff' },
      { name: 'Gray', hex: '#f7f7f7' },
    ],
    fonts: { headline: 'Airbnb Cereal', body: 'Airbnb Cereal' },
    traits: ['rounded corners', 'warm tones', 'card-based layout'],
  },
  framer: {
    label: 'Framer',
    md: framerMd,
    color: '#0055FF',
    description: '다크 빌더 툴 UI',
    palette: [
      { name: 'Canvas', hex: '#111111' },
      { name: 'Accent', hex: '#0055FF' },
      { name: 'Surface', hex: '#1e1e1e' },
      { name: 'Neutral', hex: '#787776' },
    ],
    fonts: { headline: 'GT Walsheim', body: 'Inter' },
    traits: ['dark mode', 'minimal chrome', 'precision UI'],
  },
  ktds: {
    label: 'kt ds',
    md: ktdsMd,
    color: '#1a75ff',
    description: 'KT 디지털서비스 시스템',
    palette: [
      { name: 'Primary', hex: '#1a75ff' },
      { name: 'Surface', hex: '#ffffff' },
      { name: 'Neutral', hex: '#70737c' },
      { name: 'Negative', hex: '#ff4242' },
    ],
    fonts: { headline: 'Pretendard', body: 'Pretendard' },
    traits: ['enterprise grade', 'accessible', 'structured layout'],
  },
  uber: {
    label: 'Uber',
    md: uberMd,
    color: '#000000',
    description: '미니멀 B&W 슈퍼앱',
    palette: [
      { name: 'Ink Black', hex: '#000000' },
      { name: 'Canvas', hex: '#ffffff' },
      { name: 'Canvas Soft', hex: '#efefef' },
      { name: 'Body', hex: '#5e5e5e' },
    ],
    fonts: { headline: 'UberMove', body: 'UberMoveText' },
    traits: ['monochrome', 'bold typography', 'high contrast'],
  },
}
