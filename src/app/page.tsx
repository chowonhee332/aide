'use client'

import { useState, useCallback, useRef, useEffect, startTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUp, Sparkles, MessageSquare, Layers, Sliders, FileText, Upload, X,
  ChevronLeft, ChevronRight, Check, ChevronDown, Zap, Palette, MousePointer2, Share2,
  Clock, Trash2, ExternalLink, Link2,
} from 'lucide-react'
import { type DesignPreset, DESIGN_PRESETS } from '@/lib/design-presets'
import Grainient from '@/components/Grainient'
import { DesignMdPreview } from '@/components/DesignMdPreview'
import { type HistoryItem, loadHistory, deleteHistoryItem, clearHistory, relativeTime } from '@/lib/history'

const F = {
  canvas:       '#ffffff',
  surface1:     '#f7f7f7',
  surface2:     '#f2f2f2',
  ink:          '#222222',
  inkMuted:     '#6a6a6a',
  primary:      '#ff385c', // Airbnb Rausch
  primaryActive:'#e00b41',
  hairline:     '#dddddd',
  hairlineSoft: '#ebebeb',
}

const HOW_IT_WORKS = [
  {
    step: '01', icon: <MessageSquare size={20} strokeWidth={1.5} />,
    title: '화면을 묘사하세요',
    desc: '만들고 싶은 UI를 자유롭게 설명합니다. 앱 이름, 목적, 타깃 사용자를 간단히 적어도 충분합니다.',
  },
  {
    step: '02', icon: <Sparkles size={20} strokeWidth={1.5} />,
    title: 'AI가 핵심을 파악합니다',
    desc: 'AI가 레이아웃, 색상, 인터랙션에 관한 맞춤 질문을 던져 여러분의 의도를 정확히 이해합니다.',
  },
  {
    step: '03', icon: <Layers size={20} strokeWidth={1.5} />,
    title: '3가지 시안이 완성됩니다',
    desc: '클래식·볼드·미니멀 스타일의 시안을 동시에 생성합니다. 마음에 드는 시안을 골라 바로 편집하세요.',
  },
]

const LOGO_ITEMS = [
  'Airbnb Design', 'Framer', 'Uber Design', 'KT 디지털서비스', 'Google', 'Figma', 'Notion', 'Apple HIG',
  'Airbnb Design', 'Framer', 'Uber Design', 'KT 디지털서비스', 'Google', 'Figma', 'Notion', 'Apple HIG',
]

const TESTIMONIALS_A = [
  { name: '김서연', role: 'Product Designer, Kakao', text: '3시간이면 충분했어요. 클라이언트 발표용 UI를 aide로 만들었는데 반응이 정말 좋았습니다.' },
  { name: '이준호', role: 'Frontend Engineer, Toss', text: '디자이너 없이 혼자 MVP를 만들어야 했는데, aide 덕에 하루 만에 프로토타입이 완성됐습니다.' },
  { name: 'Sarah K.', role: 'Startup Founder', text: '투자자 미팅 전날 밤에 쓴 도구인데 다음 날 "UI가 인상적이다"는 피드백을 받았어요.' },
  { name: '박민준', role: 'UX Researcher, Naver', text: '사용자 테스트용 프로토타입을 빠르게 만들 때 정말 유용합니다. 시간이 10배 줄었어요.' },
]
const TESTIMONIALS_B = [
  { name: '최유진', role: 'Brand Designer, Musinsa', text: 'Airbnb 스타일로 뽑아보니 놀라울 만큼 완성도가 높았습니다. 디자인 시스템 연동이 핵심이에요.' },
  { name: '정대현', role: 'PM, Coupang', text: '스펙 문서만 있어도 UI 시안이 나오는 게 신기합니다. 개발팀과의 소통이 훨씬 쉬워졌어요.' },
  { name: '윤소희', role: 'Design Lead, Line', text: '팀원들에게 바로 공유할 수 있는 클린한 아웃풋이 나옵니다. 리뷰 사이클이 절반으로 줄었어요.' },
  { name: 'Jake L.', role: 'Growth PM, Viva Republica', text: '브리프 한 줄로 이 퀄리티가 나오다니 믿기지 않습니다. A/B 테스트 시안도 빠르게 만들 수 있어요.' },
]

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: '무료',
    per: null,
    desc: '개인 프로젝트와 탐색용',
    features: ['월 5회 시안 생성', '기본 3가지 스타일', '템플릿 갤러리 이용', 'PNG 내보내기'],
    cta: '무료로 시작',
    featured: false,
  },
  {
    name: 'Pro',
    price: '₩29,000',
    per: '/월',
    desc: '개인 디자이너와 소규모 팀',
    features: ['무제한 시안 생성', '4가지 디자인 시스템', 'DESIGN.md 업로드', '실시간 편집', '프로토타입 링크 공유', '우선 지원'],
    cta: 'Pro 시작하기',
    featured: true,
  },
  {
    name: 'Team',
    price: '₩79,000',
    per: '/월',
    desc: '팀과 함께 쓰는 플랜',
    features: ['Pro의 모든 기능', '팀원 5명까지', '브랜드 킷 저장', 'Figma 연동 (출시 예정)', '전용 온보딩', 'SLA 보장'],
    cta: 'Team 시작하기',
    featured: false,
  },
]

const FAQ = [
  { q: '디자인 지식이 없어도 쓸 수 있나요?', a: '네, 완전히 자연어로 설명하면 됩니다. "음식 배달 앱 홈 화면, 따뜻하고 친근한 느낌"처럼 적어도 충분합니다.' },
  { q: 'DESIGN.md가 무엇인가요?', a: '회사 디자인 가이드를 마크다운 형식으로 정리한 파일입니다. 업로드하면 AI가 해당 가이드에 맞춰 시안을 생성합니다.' },
  { q: '생성된 UI는 어떻게 활용하나요?', a: '인터랙티브 시안으로 팀에 공유하거나, 프로토타입 링크를 클라이언트에게 보낼 수 있습니다. 실제 코드 추출은 로드맵에 포함되어 있습니다.' },
  { q: '디자인 시스템은 어떻게 적용되나요?', a: 'Airbnb, Framer, KT 디지털서비스, Uber의 공식 가이드를 내재화했습니다. 프리셋을 선택하면 색상·타이포·컴포넌트가 해당 시스템에 맞게 생성됩니다.' },
  { q: '무료 플랜에서 Pro로 업그레이드하면 이전 작업은 유지되나요?', a: '네, 계정의 모든 작업물은 그대로 유지됩니다. 업그레이드 즉시 무제한 생성이 가능합니다.' },
]

interface TemplateItem {
  id: string
  type: string
  name: string
  preset: DesignPreset
  brief: string
  bg: string
  wide: boolean
}

const TEMPLATES: TemplateItem[] = [
  {
    id: 'logistics', type: 'Web Template', name: '물류 대시보드', preset: 'framer',
    brief: '물류 배송 관리 SaaS 대시보드. 사이드바 네비게이션, 실시간 배송 지도, KPI 위젯 포함',
    bg: 'linear-gradient(145deg, #9ecfac 0%, #e8c170 55%, #88c5d8 100%)', wide: true,
  },
  {
    id: 'health', type: 'Mobile Template', name: '헬스 트래커', preset: 'airbnb',
    brief: '헬스 & 웰니스 앱. 수면 품질 주간 그래프, 스트레스 지수 링 차트, 활동 통계 화면',
    bg: 'linear-gradient(160deg, #f0e9e0 0%, #e5d9ce 100%)', wide: false,
  },
  {
    id: 'streaming', type: 'Mobile Template', name: '엔터테인먼트 앱', preset: 'framer',
    brief: '다크 테마 영화 스트리밍 앱. 검색 바, 장르 필터 칩, 추천 콘텐츠 2열 그리드',
    bg: 'radial-gradient(ellipse at 40% 20%, #5a1a3a 0%, #0e0e0e 65%)', wide: false,
  },
  {
    id: 'fashion', type: 'Mobile Template', name: '패션 쇼핑 앱', preset: 'uber',
    brief: '미니멀 패션 이커머스. 전신 상품 이미지, 브랜드명, 가격, 사이즈 선택 포함',
    bg: '#efefef', wide: false,
  },
  {
    id: 'pricing', type: 'Web Template', name: '요금제 비교', preset: 'ktds',
    brief: '통신 서비스 요금제 비교 페이지. 3단 플랜 카드, 기능 비교 테이블, 추천 플랜 강조',
    bg: 'linear-gradient(145deg, #dbeafe 0%, #bfdbfe 100%)', wide: true,
  },
  {
    id: 'travel', type: 'Mobile Template', name: '여행 예약 앱', preset: 'airbnb',
    brief: '여행 예약 앱 홈. 목적지 검색, 인기 여행지 카드 그리드, 카테고리 탭 포함',
    bg: 'linear-gradient(145deg, #ffd6c4 0%, #ffb89a 100%)', wide: false,
  },
]

function TemplateMockup({ id, wide }: { id: string; wide: boolean }) {
  const [w, h, r] = wide ? [360, 218, 10] : [175, 318, 20]
  const shell = (children: ReactNode, bg = '#ffffff') => (
    <div style={{
      width: w, height: h, borderRadius: r, backgroundColor: bg,
      boxShadow: '0 20px 60px rgba(0,0,0,0.35)', overflow: 'hidden',
      flexShrink: 0, display: 'flex', flexDirection: 'column',
    }}>
      {children}
    </div>
  )

  if (id === 'logistics') return shell(
    <>
      <div style={{ height: 24, backgroundColor: '#e8e8e8', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4, flexShrink: 0 }}>
        {['#ff5f57', '#ffbd2e', '#28c940'].map(c => (
          <div key={c} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: c }} />
        ))}
        <div style={{ flex: 1, height: 12, backgroundColor: '#d0d0d0', borderRadius: 3, marginLeft: 6 }} />
      </div>
      <div style={{ display: 'flex', flex: 1 }}>
        <div style={{ width: 65, backgroundColor: '#1c2840', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ height: 14, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 6 }} />
          {[0.35, 0.1, 0.1, 0.1, 0.1].map((o, i) => (
            <div key={i} style={{ height: 11, backgroundColor: `rgba(255,255,255,${o})`, borderRadius: 3 }} />
          ))}
        </div>
        <div style={{ flex: 1, backgroundColor: '#f4f6f9', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: 90, height: 9, backgroundColor: '#333', borderRadius: 2 }} />
            <div style={{ display: 'flex', gap: 3 }}>
              <div style={{ width: 28, height: 14, backgroundColor: '#4CAF50', borderRadius: 4 }} />
              <div style={{ width: 28, height: 14, backgroundColor: '#ddd', borderRadius: 4 }} />
            </div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#e8d8b4', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,0,0,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.08) 1px,transparent 1px)', backgroundSize: '14px 14px' }} />
            <div style={{ position: 'absolute', top: '35%', left: '40%', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff5722', boxShadow: '0 0 6px #ff5722' }} />
            <div style={{ position: 'absolute', top: '60%', left: '65%', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2196f3' }} />
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {[['24.5', '#4CAF50'], ['9.2', '#2196f3'], ['+4.2%', '#9c27b0']].map(([v, c]) => (
              <div key={v} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 5, padding: '5px 6px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={{ height: 7, backgroundColor: '#eee', borderRadius: 2, marginBottom: 4 }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: c as string, lineHeight: 1 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )

  if (id === 'health') return shell(
    <div style={{ padding: '14px 12px' }}>
      <div style={{ fontSize: 7, color: '#bbb', marginBottom: 12 }}>9:41</div>
      <div style={{ fontSize: 7, color: '#888', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 2 }}>SLEEP QUALITY</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <div style={{ fontSize: 6, color: '#aaa', border: '1px solid #ddd', borderRadius: 4, padding: '1px 5px' }}>Weekly</div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1 }}>7h 42m</div>
      <div style={{ fontSize: 7, color: '#888', marginBottom: 8 }}>Average</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, marginBottom: 4 }}>
        {[55, 70, 80, 60, 95, 65, 78].map((hh, i) => (
          <div key={i} style={{ flex: 1, height: `${hh}%`, backgroundColor: i === 4 ? '#111' : '#e0e0e0', borderRadius: '2px 2px 0 0' }} />
        ))}
      </div>
      <div style={{ display: 'flex', marginBottom: 14 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} style={{ flex: 1, fontSize: 6, color: '#ccc', textAlign: 'center' }}>{d}</div>
        ))}
      </div>
      <div style={{ height: 1, backgroundColor: '#f0f0f0', marginBottom: 14 }} />
      <div style={{ fontSize: 7, color: '#888', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 4 }}>STRESS</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 12 }}>Low</div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 55, height: 55, borderRadius: '50%', background: 'conic-gradient(#111 0deg 88deg, #f0f0f0 88deg 360deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#111' }}>24%</span>
          </div>
        </div>
      </div>
    </div>
  )

  if (id === 'streaming') return shell(
    <div style={{ padding: '14px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#e91e8c' }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: '#fff' }}>CineSwipe</span>
        </div>
        <div style={{ width: 10, height: 10, border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%' }} />
      </div>
      <div style={{ height: 22, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 5, marginBottom: 10 }}>
        <div style={{ width: 7, height: 7, border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%' }} />
        <div style={{ height: 5, flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2 }} />
      </div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
        <div style={{ fontSize: 6, color: '#111', backgroundColor: '#f472b6', borderRadius: 12, padding: '2px 7px', fontWeight: 700 }}>All</div>
        {['Cyberpunk', 'Neo-Noir'].map(l => (
          <div key={l} style={{ fontSize: 6, color: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '2px 7px' }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: '#fff' }}>Late Night Thrills</div>
        <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.35)' }}>See All</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        {['#1a1a2e', '#0d1b2a', '#1a0a0a', '#0a1428'].map((bg, i) => (
          <div key={i} style={{ height: 55, borderRadius: 6, backgroundColor: bg, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }} />
            <div style={{ position: 'absolute', bottom: 4, left: 5 }}>
              <div style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 1, width: 28, marginBottom: 2 }} />
              <div style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1, width: 18 }} />
            </div>
          </div>
        ))}
      </div>
    </div>,
    '#0f0f0f'
  )

  if (id === 'fashion') return shell(
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 14, height: 1, backgroundColor: '#000' }} />)}
        </div>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '2px', color: '#000' }}>LUMIER</div>
        <div style={{ width: 12, height: 12, border: '1px solid #000', borderRadius: '50%' }} />
      </div>
      <div style={{ flex: 1, backgroundColor: '#d8d8d8', borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 50, height: '78%', background: 'linear-gradient(180deg, #888 0%, #555 100%)', borderRadius: '6px 6px 0 0' }} />
      </div>
      <div>
        <div style={{ height: 7, backgroundColor: '#111', borderRadius: 2, width: '60%', marginBottom: 5 }} />
        <div style={{ height: 6, backgroundColor: '#bbb', borderRadius: 2, width: '40%', marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {['XS', 'S', 'M', 'L'].map(s => (
            <div key={s} style={{ width: 20, height: 18, border: `1px solid ${s === 'M' ? '#000' : '#ddd'}`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 6, fontWeight: s === 'M' ? 700 : 400, color: s === 'M' ? '#000' : '#bbb' }}>{s}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 22, backgroundColor: '#000', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 7, color: '#fff', fontWeight: 600, letterSpacing: '1px' }}>ADD TO BAG</span>
        </div>
      </div>
    </div>
  )

  if (id === 'pricing') return shell(
    <>
      <div style={{ height: 24, backgroundColor: '#e0eaff', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4, flexShrink: 0 }}>
        {['#ff5f57', '#ffbd2e', '#28c940'].map(c => (
          <div key={c} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: c }} />
        ))}
        <div style={{ flex: 1, height: 12, backgroundColor: '#c0d4ff', borderRadius: 3, marginLeft: 6 }} />
      </div>
      <div style={{ flex: 1, padding: '10px 10px 12px', backgroundColor: '#f0f5ff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 10, backgroundColor: '#1a75ff', borderRadius: 2, width: '50%', margin: '0 auto 16px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, alignItems: 'start' }}>
          {[false, true, false].map((featured, i) => (
            <div key={i} style={{
              backgroundColor: featured ? '#1a75ff' : '#fff', borderRadius: 8, padding: '8px 6px',
              boxShadow: featured ? '0 4px 14px rgba(26,117,255,0.5)' : '0 1px 4px rgba(0,0,0,0.08)',
              transform: featured ? 'scale(1.04)' : undefined,
            }}>
              {featured && <div style={{ fontSize: 5, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 4 }}>추천</div>}
              <div style={{ height: 6, backgroundColor: featured ? 'rgba(255,255,255,0.35)' : '#eee', borderRadius: 2, marginBottom: 5 }} />
              <div style={{ height: 10, backgroundColor: featured ? '#fff' : '#222', borderRadius: 2, width: '65%', marginBottom: 8 }} />
              {[0, 1, 2, 3].map(j => (
                <div key={j} style={{ height: 5, backgroundColor: featured ? 'rgba(255,255,255,0.2)' : '#eee', borderRadius: 1, marginBottom: 3 }} />
              ))}
              <div style={{ height: 14, backgroundColor: featured ? 'rgba(255,255,255,0.9)' : '#1a75ff', borderRadius: 3, marginTop: 6 }} />
            </div>
          ))}
        </div>
      </div>
    </>,
    '#f0f5ff'
  )

  if (id === 'travel') return shell(
    <div style={{ padding: '14px 12px' }}>
      <div style={{ fontSize: 7, color: '#bbb', marginBottom: 14 }}>9:41</div>
      <div style={{ height: 24, backgroundColor: '#f7f7f7', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 5, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff385c' }} />
        <div style={{ height: 6, flex: 1, backgroundColor: '#e8e8e8', borderRadius: 2 }} />
      </div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
        {['숙소', '투어', '항공'].map((l, i) => (
          <div key={l} style={{ fontSize: 7, color: i === 0 ? '#fff' : '#888', backgroundColor: i === 0 ? '#ff385c' : '#f5f5f5', borderRadius: 12, padding: '3px 8px' }}>{l}</div>
        ))}
      </div>
      <div style={{ fontSize: 8, fontWeight: 700, color: '#222', marginBottom: 8 }}>인기 여행지</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[['#c8a882', '도쿄'], ['#82a8c8', '파리'], ['#82c8a8', '발리'], ['#c882a8', '뉴욕']].map(([bg, name]) => (
          <div key={name} style={{ height: 55, borderRadius: 8, backgroundColor: bg, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(transparent, rgba(0,0,0,0.45))' }} />
            <div style={{ position: 'absolute', bottom: 4, left: 5 }}>
              <div style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 1, width: 20 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return null
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        borderBottom: `1px solid ${F.hairlineSoft}`,
        padding: '20px 0',
        cursor: 'pointer',
      }}
      onClick={() => setOpen(v => !v)}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: F.ink, fontSize: '16px', fontWeight: 500, letterSpacing: '-0.4px', flex: 1 }}>{q}</span>
        <ChevronDown
          size={16}
          style={{
            color: F.inkMuted, flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </div>
      {open && (
        <p style={{ color: F.inkMuted, fontSize: '15px', lineHeight: 1.6, marginTop: '12px', letterSpacing: '-0.15px' }}>
          {a}
        </p>
      )}
    </div>
  )
}

function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let hue = 0
  switch (max) {
    case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: hue = ((b - r) / d + 2) / 6; break
    case b: hue = ((r - g) / d + 4) / 6; break
  }
  return [hue, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  if (s === 0) { const v = Math.round(l * 255); return '#' + [v, v, v].map(c => c.toString(16).padStart(2, '0')).join('') }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
  const g = Math.round(hue2rgb(p, q, h) * 255)
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

function deriveSecondaryColor(primaryHex: string): string {
  const [h, s, l] = hexToHsl(primaryHex)
  // 같은 색조에서 어두운 shade (primary의 700 단계 느낌)
  const newL = Math.max(0.12, l - 0.22)
  const newS = Math.min(1, s * 1.08)
  return hslToHex(h, newS, newL)
}

function extractColorsFromImage(dataUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const size = 80
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve([]); return }
      ctx.drawImage(img, 0, 0, size, size)
      const { data } = ctx.getImageData(0, 0, size, size)

      const buckets: Record<string, number> = {}
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
        if (a < 128) continue
        if (r > 230 && g > 230 && b > 230) continue
        if (r < 25 && g < 25 && b < 25) continue
        if (Math.max(r, g, b) - Math.min(r, g, b) < 30) continue
        const key = `${(r >> 3) << 3},${(g >> 3) << 3},${(b >> 3) << 3}`
        buckets[key] = (buckets[key] || 0) + 1
      }

      const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1])
      const selected: [number, number, number][] = []
      for (const [key] of sorted) {
        const [r, g, b] = key.split(',').map(Number)
        const tooClose = selected.some(([sr, sg, sb]) =>
          Math.sqrt((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2) < 60
        )
        if (!tooClose) {
          selected.push([r, g, b])
          if (selected.length >= 3) break
        }
      }

      const colors = selected.map(([r, g, b]) =>
        '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
      )
      // 추출된 색이 1개뿐이면 같은 hue의 어두운 shade를 secondary로 자동 파생
      if (colors.length === 1) colors.push(deriveSecondaryColor(colors[0]))
      resolve(colors)
    }
    img.onerror = () => resolve([])
    img.src = dataUrl
  })
}

export default function Home() {
  const router = useRouter()
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])

  useEffect(() => {
    if (historyModalOpen) {
      const items = loadHistory()
      startTransition(() => setHistoryItems(items))
    }
  }, [historyModalOpen])

  const [brief, setBrief] = useState('')
  const [platform, setPlatform] = useState<'mobile' | 'web'>('mobile')
  const [designPreset, setDesignPreset] = useState<DesignPreset>('none')
  const [designPanelOpen, setDesignPanelOpen] = useState(false)
  const [designMdContent, setDesignMdContent] = useState<string | null>(null)
  const [designMdFileName, setDesignMdFileName] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [urlAnalyzing, setUrlAnalyzing] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [urlPreviewMd, setUrlPreviewMd] = useState<string | null>(null)
  const [urlPreviewScreenshot, setUrlPreviewScreenshot] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const refImageInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [refPanelOpen, setRefPanelOpen] = useState(false)
  const [refPageImage, setRefPageImage] = useState<string | null>(null)
  const [refPageUrlInput, setRefPageUrlInput] = useState('')
  const [refCapturing, setRefCapturing] = useState(false)
  const [refError, setRefError] = useState<string | null>(null)
  const [refPreviewOpen, setRefPreviewOpen] = useState(false)

  const [brandPanelOpen, setBrandPanelOpen] = useState(false)
  const [brandLogo, setBrandLogo] = useState<string | null>(null)
  const [brandLogoName, setBrandLogoName] = useState<string | null>(null)
  const [brandColors, setBrandColors] = useState<string[]>([])
  const [extractingColors, setExtractingColors] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 380 : -380, behavior: 'smooth' })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setDesignMdContent(ev.target?.result as string)
      setDesignMdFileName(file.name)
      setDesignPreset('none')
      setDesignPanelOpen(false)
    }
    reader.readAsText(file)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      setBrandLogo(dataUrl)
      setBrandLogoName(file.name)
      setExtractingColors(true)
      const extracted = await extractColorsFromImage(dataUrl)
      if (extracted.length > 0) setBrandColors(extracted)
      setExtractingColors(false)
    }
    reader.readAsDataURL(file)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const clearBrand = () => {
    setBrandLogo(null)
    setBrandLogoName(null)
    setBrandColors([])
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const clearDesign = () => {
    setDesignPreset('none')
    setDesignMdContent(null)
    setDesignMdFileName(null)
    setUrlInput('')
    setUrlError(null)
    setUrlPreviewMd(null)
    setUrlPreviewScreenshot(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUrlAnalyze = async () => {
    if (!urlInput.trim() || urlAnalyzing) return
    setUrlAnalyzing(true)
    setUrlError(null)
    try {
      const res = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUrlError(data.error ?? '분석 실패')
        return
      }
      setUrlPreviewMd(data.designMd)
      setUrlPreviewScreenshot(data.screenshot ?? null)
    } catch {
      setUrlError('네트워크 오류가 발생했습니다.')
    } finally {
      setUrlAnalyzing(false)
    }
  }

  const handleApplyUrlDesign = () => {
    if (!urlPreviewMd) return
    setDesignMdContent(urlPreviewMd)
    setDesignMdFileName(urlInput.trim())
    setDesignPreset('none')
    setUrlPreviewMd(null)
    setUrlPreviewScreenshot(null)
    setDesignPanelOpen(false)
  }

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setRefPageImage(base64)
      setRefPanelOpen(false)
      setRefError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleRefCapture = async () => {
    if (!refPageUrlInput.trim() || refCapturing) return
    setRefCapturing(true)
    setRefError(null)
    try {
      const res = await fetch('/api/capture-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: refPageUrlInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setRefError(data.error ?? '캡처 실패'); return }
      setRefPageImage(data.screenshot)
      setRefPanelOpen(false)
    } catch {
      setRefError('네트워크 오류가 발생했습니다.')
    } finally {
      setRefCapturing(false)
    }
  }

  const clearRefPage = () => {
    setRefPageImage(null)
    setRefPageUrlInput('')
    setRefError(null)
    if (refImageInputRef.current) refImageInputRef.current.value = ''
  }

  const handleSubmit = useCallback(() => {
    if (!brief.trim()) return
    const params = new URLSearchParams({ brief: brief.trim() })
    if (designPreset !== 'none') params.set('preset', designPreset)
    params.set('platform', platform)
    if (designMdContent) {
      sessionStorage.setItem('designMd', designMdContent)
      params.set('hasDesignMd', '1')
    }
    if (refPageImage) {
      sessionStorage.setItem('referenceImage', refPageImage)
    } else {
      sessionStorage.removeItem('referenceImage')
    }
    if (brandLogo) {
      sessionStorage.setItem('brandLogo', brandLogo)
    } else {
      sessionStorage.removeItem('brandLogo')
    }
    if (brandColors.length > 0) {
      sessionStorage.setItem('brandColors', JSON.stringify(brandColors))
    } else {
      sessionStorage.removeItem('brandColors')
    }
    router.push(`/studio?${params.toString()}`)
  }, [brief, designPreset, platform, designMdContent, refPageImage, brandLogo, brandColors, router])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSubmit = brief.trim().length > 0
  const designButtonLabel = designMdFileName ?? null

  return (
    <div style={{
      backgroundColor: F.canvas,
      fontFamily: "var(--font-inter), Circular, -apple-system, system-ui, Roboto, \"Helvetica Neue\", sans-serif",
    }}>
      <style>{`
        ::placeholder { color: rgba(0,0,0,0.3); }
        textarea:focus { outline: none; }
        .tpl-scroll { scrollbar-width: none; }
        .tpl-scroll::-webkit-scrollbar { display: none; }
        @keyframes marquee-left { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes marquee-right { from { transform: translateX(-50%) } to { transform: translateX(0) } }
        .marquee-left { animation: marquee-left 32s linear infinite; display: flex; width: max-content; }
        .marquee-right { animation: marquee-right 28s linear infinite; display: flex; width: max-content; }
      `}</style>

      {/* ── 레퍼런스 이미지 전체보기 모달 ── */}
      {refPreviewOpen && refPageImage && (
        <div
          onClick={() => setRefPreviewOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '960px',
              backgroundColor: F.surface1, borderRadius: '16px',
              border: `1px solid ${F.hairline}`,
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100vh - 48px)',
            }}
          >
            {/* 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: `1px solid ${F.hairlineSoft}`, flexShrink: 0,
            }}>
              <span style={{ color: F.inkMuted, fontSize: '13px', letterSpacing: '-0.13px' }}>
                현재 페이지 레퍼런스
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => { setRefPreviewOpen(false); setRefPanelOpen(true); setDesignPanelOpen(false) }}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', border: `1px solid ${F.hairline}`,
                    backgroundColor: F.canvas, color: F.ink,
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.12px',
                    fontFamily: 'inherit',
                  }}
                >
                  변경하기
                </button>
                <button
                  onClick={() => { clearRefPage(); setRefPreviewOpen(false) }}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,80,80,0.25)',
                    backgroundColor: 'rgba(255,80,80,0.08)', color: 'rgba(255,100,100,0.8)',
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.12px',
                    fontFamily: 'inherit',
                  }}
                >
                  제거
                </button>
                <button
                  onClick={() => setRefPreviewOpen(false)}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                    backgroundColor: F.surface2, color: F.inkMuted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            {/* 이미지 */}
            <div style={{ overflow: 'auto', flexShrink: 1 }}>
              <img
                src={`data:image/png;base64,${refPageImage}`}
                alt="reference page"
                style={{ width: '100%', display: 'block' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div className="fixed inset-0 pointer-events-none">
          <Grainient
            color1="#ff385c"
            color2="#ff9aa2"
            color3="#ffffff"
            timeSpeed={0.8}
            colorBalance={0.1}
            warpStrength={1}
            warpFrequency={3.7}
            warpSpeed={2}
            warpAmplitude={50}
            blendAngle={10}
            blendSoftness={0.05}
            rotationAmount={400}
            noiseScale={1.8}
            grainAmount={0.12}
            grainScale={1.5}
            grainAnimated={false}
            contrast={1.4}
            gamma={1}
            saturation={1.1}
            centerX={0}
            centerY={0}
            zoom={0.9}
          />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '300px', background: `linear-gradient(to bottom, ${F.canvas} 0%, transparent 100%)` }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px', background: `linear-gradient(to top, ${F.canvas} 0%, transparent 100%)` }} />
        </div>

        <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-48px)] max-w-[1000px]">
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '20px',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
          }}>
            <div className="flex items-center gap-8">
              <span style={{ color: F.ink, fontWeight: 700, fontSize: '18px', letterSpacing: '-0.8px' }}>Aide</span>
              <nav className="hidden md:flex items-center gap-6">
                {([
                  ['Features', 'features'],
                  ['How it Works', 'how-it-works'],
                  ['Pricing', 'pricing'],
                ] as const).map(([label, id]) => (
                  <button
                    key={id}
                    onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
                    style={{ color: F.inkMuted, fontSize: '14px', fontWeight: 500, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setHistoryModalOpen(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: F.inkMuted, display: 'flex', alignItems: 'center',
                  padding: '6px', borderRadius: '8px', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = F.surface1; (e.currentTarget as HTMLButtonElement).style.color = F.ink }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = F.inkMuted }}
                title="히스토리"
              >
                <Clock size={18} />
              </button>
              <a
                href="/studio"
                style={{
                  backgroundColor: '#fff', color: '#111',
                  fontSize: '14px', fontWeight: 600, padding: '10px 20px', borderRadius: '12px',
                  textDecoration: 'none', transition: 'all 0.15s',
                  letterSpacing: '-0.14px',
                }}
              >
                Get Started
              </a>
            </div>
          </div>
        </header>


        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-24" style={{ paddingBottom: '100px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
            fontSize: '13px', fontWeight: 600, padding: '6px 16px', borderRadius: '100px',
            backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
            marginBottom: '40px', letterSpacing: '-0.13px',
          }}>
            <span style={{ backgroundColor: '#fff', color: '#111', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, marginRight: '4px' }}>NEW</span>
            Just shipped v2.0
          </div>

          <h1 style={{
            fontSize: 'clamp(40px, 6.5vw, 72px)', fontWeight: 800, color: '#fff',
            textAlign: 'center', lineHeight: 1.15, letterSpacing: '-2px',
            fontFamily: 'var(--font-poppins)',
            marginBottom: '24px', maxWidth: '860px',
            textShadow: '0 2px 20px rgba(0,0,0,0.1)',
            textWrap: 'balance',
          } as React.CSSProperties}>
            Start with a prompt.<br />Iterate into a design.
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 1.5vw, 18px)', color: 'rgba(255,255,255,0.72)',
            textAlign: 'center', lineHeight: 1.6, maxWidth: '560px',
            marginBottom: '52px',
          }}>
            Stitch transforms your ideas into designs through AI-powered iteration. Whether you&apos;re building web apps, mobile experiences, or prototypes, start here.
          </p>


          {/* Input card */}
          <div style={{
            width: '100%', maxWidth: '700px', borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.82)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            padding: '22px 22px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}>
            {designPreset !== 'none' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '4px 10px 4px 9px', borderRadius: '100px',
                  border: `1px solid ${F.hairlineSoft}`, backgroundColor: '#ffffff',
                  color: 'rgba(0,0,0,0.7)', fontSize: '12px', fontWeight: 500,
                }}>
                  <FileText size={11} />
                  <span>{designPreset}.md</span>
                  <button
                    onClick={() => setDesignPreset('none')}
                    style={{ display: 'flex', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.4)', padding: 0, marginLeft: '2px' }}
                  >
                    <X size={11} />
                  </button>
                </div>
                <span style={{ fontSize: '12px', color: 'rgba(0,0,0,0.4)' }}>이 design.md 파일의 디자인 시스템 사용</span>
              </div>
            )}
            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={designPreset !== 'none'
                ? `${DESIGN_PRESETS[designPreset].label} 디자인 시스템을 활용하여 어떤 앱 화면을 만들고 싶으세요?\n\n예시:\n${DESIGN_PRESETS[designPreset].label} 스타일로 대시보드를 만들어주세요. 주요 지표와 사용자 활동을 한눈에 볼 수 있어야 합니다.`
                : `어떤 앱 화면을 만들고 싶으세요? (예: 음식 배달 앱 홈 화면, 스마트 요금제 비교 페이지...)`}
              rows={3}
              style={{
                width: '100%', background: 'none', border: 'none', outline: 'none',
                color: 'rgba(0,0,0,0.9)', fontSize: '15px', lineHeight: 1.30,
                letterSpacing: '-0.15px', resize: 'none', fontFamily: 'inherit',
                caretColor: F.primary,
              }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: '14px',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                {/* + 버튼 (reference page) */}
                {refPageImage ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => setRefPreviewOpen(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '4px 10px 4px 6px', borderRadius: '100px',
                        border: '1px solid rgba(0,0,0,0.1)', backgroundColor: '#ffffff',
                        color: 'rgba(0,0,0,0.7)', fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer', letterSpacing: '-0.13px',
                      }}
                    >
                      <img
                        src={`data:image/png;base64,${refPageImage}`}
                        alt="ref"
                        style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }}
                      />
                      현재 페이지
                    </button>
                    <button
                      onClick={clearRefPage}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '22px', height: '22px', borderRadius: '50%',
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#555555',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setRefPanelOpen(v => !v); setDesignPanelOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '38px', height: '38px', borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'rgba(0,0,0,0.08)',
                      color: 'rgba(0,0,0,0.55)',
                      cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '20px', lineHeight: 1, marginTop: '-1px' }}>+</span>
                  </button>
                )}

                {/* 앱/웹 토글 */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '2px',
                  backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '100px',
                  padding: '3px', flexShrink: 0, height: '38px',
                }}>
                  {(['mobile', 'web'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      style={{
                        padding: '0 14px', borderRadius: '100px', height: '100%',
                        border: 'none', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 600,
                        transition: 'all 0.15s',
                        backgroundColor: platform === p ? '#ffffff' : 'transparent',
                        color: platform === p ? F.ink : 'rgba(0,0,0,0.5)',
                        boxShadow: platform === p ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                      }}
                    >
                      {p === 'mobile' ? '앱' : '웹'}
                    </button>
                  ))}
                </div>

                {/* DESIGN.md chip */}
                {designButtonLabel ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => setDesignPanelOpen(v => !v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '0 12px 0 13px', borderRadius: '100px', height: '38px',
                        border: 'none', backgroundColor: 'rgba(0,0,0,0.08)',
                        color: 'rgba(0,0,0,0.65)', fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer', letterSpacing: '-0.13px',
                      }}
                    >
                      <FileText size={11} />
                      {designButtonLabel}
                    </button>
                    <button
                      onClick={clearDesign}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '22px', height: '22px', borderRadius: '50%',
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#555555',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setDesignPanelOpen(v => !v); setBrandPanelOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '0 13px', height: '38px', borderRadius: '100px',
                      border: 'none',
                      backgroundColor: 'rgba(0,0,0,0.08)',
                      color: 'rgba(0,0,0,0.55)', fontSize: '13px', fontWeight: 500,
                      cursor: 'pointer', letterSpacing: '-0.13px', transition: 'all 0.15s',
                    }}
                  >
                    <FileText size={11} />
                    Start with a DESIGN.md
                  </button>
                )}

                {/* Brand button */}
                {(brandLogo !== null || brandColors.length > 0) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => { setBrandPanelOpen(v => !v); setDesignPanelOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '0 12px', height: '38px', borderRadius: '100px',
                        border: 'none', backgroundColor: 'rgba(0,0,0,0.08)',
                        color: 'rgba(0,0,0,0.65)', fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer', letterSpacing: '-0.13px',
                      }}
                    >
                      {brandLogo ? (
                        <img src={brandLogo} alt="logo" style={{ width: 14, height: 14, objectFit: 'contain', borderRadius: 2 }} />
                      ) : (
                        <Palette size={11} />
                      )}
                      브랜드
                      {brandColors.length > 0 && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          {brandColors.slice(0, 3).map((c, i) => (
                            <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c, display: 'inline-block' }} />
                          ))}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={clearBrand}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '22px', height: '22px', borderRadius: '50%',
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#555555',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setBrandPanelOpen(v => !v); setDesignPanelOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '0 13px', height: '38px', borderRadius: '100px',
                      border: 'none', backgroundColor: 'rgba(0,0,0,0.08)',
                      color: 'rgba(0,0,0,0.55)', fontSize: '13px', fontWeight: 500,
                      cursor: 'pointer', letterSpacing: '-0.13px', transition: 'all 0.15s',
                    }}
                  >
                    <Palette size={11} />
                    브랜드 정보
                  </button>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: canSubmit ? 'pointer' : 'default', transition: 'all 0.2s',
                  backgroundColor: canSubmit ? F.ink : F.surface2,
                  color: canSubmit ? F.canvas : 'rgba(0,0,0,0.25)', border: 'none',
                }}
              >
                <ArrowUp size={17} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {designPanelOpen && (
            <div style={{
              width: '100%', maxWidth: '700px', marginTop: '8px',
              borderRadius: '16px', backgroundColor: F.surface1,
              border: `1px solid ${F.hairline}`, padding: '16px',
            }}>
              <input ref={fileInputRef} type="file" accept=".md,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', padding: '14px', borderRadius: '10px',
                  border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                  color: F.inkMuted, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  marginBottom: '10px', letterSpacing: '-0.13px',
                }}
              >
                <Upload size={13} />
                DESIGN.md 파일 업로드
              </button>

              {/* URL 분석 or 미리보기 */}
              {urlPreviewMd ? (
                <DesignMdPreview
                  md={urlPreviewMd}
                  url={urlInput}
                  screenshot={urlPreviewScreenshot ?? undefined}
                  onApply={handleApplyUrlDesign}
                  onBack={() => { setUrlPreviewMd(null); setUrlPreviewScreenshot(null) }}
                />
              ) : (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={urlInput}
                        onChange={e => { setUrlInput(e.target.value); setUrlError(null) }}
                        onKeyDown={e => e.key === 'Enter' && handleUrlAnalyze()}
                        placeholder="타사 서비스 URL 붙여넣기 (예: airbnb.com)"
                        style={{
                          flex: 1, padding: '10px 12px', borderRadius: '10px',
                          border: urlError ? '1px solid rgba(255,80,80,0.5)' : `1px solid ${F.hairline}`,
                          backgroundColor: F.surface2, color: F.ink,
                          fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                          letterSpacing: '-0.13px',
                        }}
                      />
                      <button
                        onClick={handleUrlAnalyze}
                        disabled={!urlInput.trim() || urlAnalyzing}
                        style={{
                          padding: '10px 14px', borderRadius: '10px', flexShrink: 0,
                          border: 'none', cursor: urlInput.trim() && !urlAnalyzing ? 'pointer' : 'default',
                          backgroundColor: urlInput.trim() && !urlAnalyzing ? F.ink : F.surface2,
                          color: urlInput.trim() && !urlAnalyzing ? F.canvas : 'rgba(0,0,0,0.25)',
                          fontSize: '13px', fontWeight: 500, letterSpacing: '-0.13px',
                          transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}
                      >
                        {urlAnalyzing ? '분석 중…' : '분석하기'}
                      </button>
                    </div>
                    {urlError && (
                      <p style={{ color: 'rgba(255,80,80,0.8)', fontSize: '12px', marginTop: '6px', letterSpacing: '-0.12px' }}>
                        {urlError}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                    <span style={{ color: F.inkMuted, fontSize: '11px', letterSpacing: '-0.11px' }}>또는 프리셋 선택</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                  </div>
                </>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {(['airbnb', 'framer', 'ktds', 'uber'] as const).map(key => {
                  const preset = DESIGN_PRESETS[key]
                  const isActive = designPreset === key
                  return (
                    <button
                      key={key}
                      onClick={() => { setDesignPreset(isActive ? 'none' : key); if (!isActive) setDesignPanelOpen(false) }}
                      style={{
                        padding: '14px 16px', borderRadius: '10px', textAlign: 'left',
                        cursor: 'pointer',
                        border: isActive ? `1px solid ${preset.color}40` : `1px solid ${F.hairlineSoft}`,
                        backgroundColor: isActive ? `${preset.color}18` : F.surface2,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: preset.color, flexShrink: 0 }} />
                        <span style={{ color: isActive ? preset.color : F.ink, fontSize: '13px', fontWeight: 600, letterSpacing: '-0.5px' }}>
                          {preset.label}
                        </span>
                      </div>
                      <p style={{ color: F.inkMuted, fontSize: '12px', lineHeight: 1.5, margin: 0, letterSpacing: '-0.12px' }}>
                        {preset.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {brandPanelOpen && (
            <div style={{
              width: '100%', maxWidth: '700px', marginTop: '8px',
              borderRadius: '16px', backgroundColor: F.surface1,
              border: `1px solid ${F.hairline}`, padding: '16px',
            }}>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />

              {/* Logo section */}
              <p style={{ fontSize: '12px', fontWeight: 600, color: F.inkMuted, marginBottom: '8px', letterSpacing: '-0.12px' }}>로고</p>
              {brandLogo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, marginBottom: '14px' }}>
                  <img src={brandLogo} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4 }} />
                  <span style={{ fontSize: '12px', color: F.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandLogoName}</span>
                  <button onClick={() => { setBrandLogo(null); setBrandLogoName(null) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: F.inkMuted, display: 'flex' }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '10px', marginBottom: '14px',
                    border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                    color: F.inkMuted, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    letterSpacing: '-0.13px',
                  }}
                >
                  <Upload size={13} />
                  로고 이미지 업로드
                </button>
              )}

              {/* Colors section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: F.inkMuted, letterSpacing: '-0.12px', margin: 0 }}>브랜드 컬러</p>
                {extractingColors && (
                  <span style={{ fontSize: '11px', color: F.inkMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <circle cx="5" cy="5" r="4" fill="none" stroke={F.inkMuted} strokeWidth="1.5" strokeDasharray="6 4" />
                    </svg>
                    로고에서 추출 중…
                  </span>
                )}
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {brandColors.map((color, i) => (
                  <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <label style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: color, cursor: 'pointer', display: 'block', border: '2px solid rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                      <input
                        type="color"
                        value={color}
                        onChange={e => { const next = [...brandColors]; next[i] = e.target.value; setBrandColors(next) }}
                        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
                      />
                    </label>
                    <button
                      onClick={() => setBrandColors(brandColors.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    >
                      <X size={8} />
                    </button>
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: F.inkMuted }}>{color.toUpperCase()}</span>
                  </div>
                ))}
                {brandColors.length < 5 && (
                  <button
                    onClick={() => setBrandColors([...brandColors, '#000000'])}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1.5px dashed ${F.hairline}`, backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: F.inkMuted, fontSize: '20px', lineHeight: 1 }}
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          )}

          {refPanelOpen && (
            <div style={{
              width: '100%', maxWidth: '700px', marginTop: '8px',
              borderRadius: '16px', backgroundColor: F.surface1,
              border: `1px solid ${F.hairline}`, padding: '16px',
            }}>
              <input ref={refImageInputRef} type="file" accept="image/*" onChange={handleRefImageUpload} style={{ display: 'none' }} />
              <button
                onClick={() => refImageInputRef.current?.click()}
                style={{
                  width: '100%', padding: '14px', borderRadius: '10px',
                  border: `1px dashed ${F.hairline}`, backgroundColor: F.surface2,
                  color: F.inkMuted, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  marginBottom: '14px', letterSpacing: '-0.13px',
                }}
              >
                <Upload size={13} />
                이미지 파일 업로드 (PNG, JPG, WEBP)
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
                <span style={{ color: F.inkMuted, fontSize: '11px', letterSpacing: '-0.11px' }}>또는 URL로 캡처</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: F.hairlineSoft }} />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={refPageUrlInput}
                  onChange={e => { setRefPageUrlInput(e.target.value); setRefError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleRefCapture()}
                  placeholder="리뉴얼할 현재 페이지 URL (예: ktds.com)"
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: '10px',
                    border: refError ? '1px solid rgba(255,80,80,0.5)' : `1px solid ${F.hairline}`,
                    backgroundColor: F.surface2, color: F.ink,
                    fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                    letterSpacing: '-0.13px',
                  }}
                />
                <button
                  onClick={handleRefCapture}
                  disabled={!refPageUrlInput.trim() || refCapturing}
                  style={{
                    padding: '10px 14px', borderRadius: '10px', flexShrink: 0,
                    border: 'none', cursor: refPageUrlInput.trim() && !refCapturing ? 'pointer' : 'default',
                    backgroundColor: refPageUrlInput.trim() && !refCapturing ? F.ink : F.surface2,
                    color: refPageUrlInput.trim() && !refCapturing ? F.canvas : 'rgba(0,0,0,0.25)',
                    fontSize: '13px', fontWeight: 500, letterSpacing: '-0.13px',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  <Link2 size={12} />
                  {refCapturing ? '캡처 중…' : '캡처하기'}
                </button>
              </div>
              {refError && (
                <p style={{ color: 'rgba(255,80,80,0.8)', fontSize: '12px', marginTop: '6px', letterSpacing: '-0.12px' }}>
                  {refError}
                </p>
              )}
            </div>
          )}

          <p style={{ color: 'rgba(0,0,0,0.3)', fontSize: '13px', marginTop: '14px', letterSpacing: '-0.13px' }}>
            Enter로 전송 · Shift+Enter로 줄바꿈
          </p>
        </main>
      </section>

      {/* ══════════════════════════════════════════
          LOGOS MARQUEE
      ══════════════════════════════════════════ */}
      <section style={{ backgroundColor: F.canvas, position: 'relative', zIndex: 10, padding: '48px 0', borderTop: `1px solid ${F.hairlineSoft}`, overflow: 'hidden' }}>
        <p style={{ color: 'rgba(0,0,0,0.3)', fontSize: '12px', fontWeight: 500, letterSpacing: '0.06em', textAlign: 'center', marginBottom: '28px', textTransform: 'uppercase' }}>
          글로벌 기업의 디자인 시스템을 기반으로
        </p>
        <div style={{ overflow: 'hidden', maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}>
          <div className="marquee-left">
            {LOGO_ITEMS.map((logo, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 32px', marginRight: '2px',
                border: `1px solid ${F.hairlineSoft}`, borderRadius: '100px',
                backgroundColor: F.surface1, marginLeft: '12px', flexShrink: 0,
              }}>
                <span style={{ color: 'rgba(0,0,0,0.4)', fontSize: '13px', fontWeight: 600, letterSpacing: '-0.13px', whiteSpace: 'nowrap' }}>
                  {logo}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PROBLEM → SOLUTION
      ══════════════════════════════════════════ */}
      <section style={{ backgroundColor: F.canvas, position: 'relative', zIndex: 10, padding: '96px 24px', borderTop: `1px solid ${F.hairlineSoft}` }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', alignItems: 'stretch' }}>
          {/* Problem */}
          <div style={{ padding: '48px 40px', backgroundColor: F.surface1, borderRadius: '20px 0 0 20px', border: `1px solid ${F.hairlineSoft}` }}>
            <div style={{
              display: 'inline-flex', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
              color: 'rgba(255,80,80,0.8)', border: '1px solid rgba(255,80,80,0.2)',
              borderRadius: '100px', padding: '3px 10px', marginBottom: '28px', textTransform: 'uppercase',
            }}>
              Problem
            </div>
            <h3 style={{ color: F.ink, fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 500, lineHeight: 1.15, letterSpacing: '-1.6px', marginBottom: '24px' }}>
              UI 시안 하나에<br />며칠이 걸립니다
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                '디자이너와 일정을 맞추기가 어렵다',
                'Figma를 배우는 데만 몇 주가 걸린다',
                '초안을 만들어도 방향이 맞는지 확신이 없다',
                '수정 요청이 반복되며 시간이 낭비된다',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'rgba(255,80,80,0.12)', border: '1px solid rgba(255,80,80,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <X size={8} color="rgba(255,80,80,0.7)" />
                  </div>
                  <span style={{ color: F.inkMuted, fontSize: '15px', lineHeight: 1.4, letterSpacing: '-0.15px' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Solution */}
          <div style={{ padding: '48px 40px', backgroundColor: F.surface1, borderRadius: '0 20px 20px 0', border: `1px solid ${F.hairlineSoft}` }}>
            <div style={{
              display: 'inline-flex', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
              color: F.primary, border: `1px solid rgba(255,56,92,0.2)`,
              borderRadius: '100px', padding: '3px 10px', marginBottom: '28px', textTransform: 'uppercase',
            }}>
              Solution
            </div>
            <h3 style={{ color: F.ink, fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 500, lineHeight: 1.15, letterSpacing: '-1.6px', marginBottom: '24px' }}>
              설명 한 줄로<br />시안이 완성됩니다
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                '브리프를 입력하면 AI가 즉시 이해합니다',
                '검증된 디자인 시스템으로 완성도를 보장합니다',
                '3가지 스타일 시안을 동시에 비교합니다',
                '실시간으로 편집하고 팀에게 공유합니다',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'rgba(255,56,92,0.1)', border: '1px solid rgba(255,56,92,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <Check size={8} color={F.primary} />
                  </div>
                  <span style={{ color: F.inkMuted, fontSize: '15px', lineHeight: 1.4, letterSpacing: '-0.15px' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section id="how-it-works" style={{ backgroundColor: F.canvas, position: 'relative', zIndex: 10, padding: '96px 24px', borderTop: `1px solid ${F.hairlineSoft}` }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <p style={{ color: F.inkMuted, fontSize: '13px', fontWeight: 500, letterSpacing: '-0.13px', marginBottom: '16px', textAlign: 'center' }}>
            How it works
          </p>
          <h2 style={{ color: F.ink, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500, letterSpacing: '-2.4px', lineHeight: 1.05, textAlign: 'center', marginBottom: '64px' }}>
            세 단계로 완성되는<br />UI 시안
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2px' }}>
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} style={{
                padding: '40px 32px',
                backgroundColor: F.surface1,
                borderRadius: i === 0 ? '14px 0 0 14px' : i === 2 ? '0 14px 14px 0' : undefined,
                border: `1px solid ${F.hairlineSoft}`,
              }}>
                <span style={{ color: 'rgba(0,0,0,0.03)', fontSize: '48px', fontWeight: 600, letterSpacing: '-2.4px', lineHeight: 1, display: 'block', marginBottom: '24px' }}>
                  {item.step}
                </span>
                <div style={{ color: F.primary, opacity: 0.8, marginBottom: '16px' }}>
                  {item.icon}
                </div>
                <h3 style={{ color: F.ink, fontSize: '17px', fontWeight: 500, marginBottom: '10px', letterSpacing: '-0.5px' }}>
                  {item.title}
                </h3>
                <p style={{ color: F.inkMuted, fontSize: '15px', lineHeight: 1.30, letterSpacing: '-0.15px' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BENTO FEATURES
      ══════════════════════════════════════════ */}
      <section id="features" style={{ backgroundColor: F.canvas, position: 'relative', zIndex: 10, padding: '96px 24px', borderTop: `1px solid ${F.hairlineSoft}` }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <p style={{ color: F.inkMuted, fontSize: '13px', fontWeight: 500, letterSpacing: '-0.13px', marginBottom: '16px', textAlign: 'center' }}>
            Features
          </p>
          <h2 style={{ color: F.ink, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500, letterSpacing: '-2.4px', lineHeight: 1.05, textAlign: 'center', marginBottom: '64px' }}>
            아이디어를 현실로 만드는<br />모든 도구
          </h2>

          {/* Bento grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'auto auto', gap: '12px' }}>

            {/* Large left – Design Systems */}
            <div style={{ gridColumn: 'span 7', padding: '36px 32px', borderRadius: '14px', backgroundColor: F.surface1, border: `1px solid ${F.hairlineSoft}`, minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: F.inkMuted, border: `1px solid ${F.hairline}`, borderRadius: '100px', padding: '3px 10px', marginBottom: '24px', textTransform: 'uppercase' }}>
                  <Palette size={10} />
                  Design Systems
                </div>
                <h3 style={{ color: F.ink, fontSize: '22px', fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.9px', marginBottom: '12px' }}>검증된 디자인 시스템</h3>
                <p style={{ color: F.inkMuted, fontSize: '15px', lineHeight: 1.4, letterSpacing: '-0.15px' }}>
                  Airbnb, Framer, KT 디지털서비스, Uber의 공식 가이드를 기반으로 일관성 있는 UI를 생성합니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '24px' }}>
                {(['airbnb', 'framer', 'ktds', 'uber'] as const).map(key => (
                  <span key={key} style={{
                    fontSize: '12px', letterSpacing: '-0.12px',
                    color: key === 'airbnb' ? '#fff' : 'rgba(0,0,0,0.5)',
                    border: key === 'airbnb' ? `1px solid ${F.primary}` : '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '100px', padding: '3px 10px',
                    backgroundColor: key === 'airbnb' ? F.primary : 'rgba(0,0,0,0.04)',
                  }}>
                    {DESIGN_PRESETS[key].label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right top – Live Editor */}
            <div style={{ gridColumn: 'span 5', padding: '36px 32px', borderRadius: '14px', backgroundColor: F.surface1, border: `1px solid ${F.hairlineSoft}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: F.inkMuted, border: `1px solid ${F.hairline}`, borderRadius: '100px', padding: '3px 10px', marginBottom: '24px', textTransform: 'uppercase' }}>
                  <MousePointer2 size={10} />
                  Live Editor
                </div>
                <h3 style={{ color: F.ink, fontSize: '22px', fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.9px', marginBottom: '12px' }}>실시간 인터랙티브 편집</h3>
                <p style={{ color: F.inkMuted, fontSize: '15px', lineHeight: 1.4, letterSpacing: '-0.15px' }}>
                  요소를 클릭해 폰트·색상·여백을 바로 조정하고, AI 채팅으로 레이아웃을 수정합니다.
                </p>
              </div>
            </div>

            {/* Bottom left – Speed */}
            <div style={{ gridColumn: 'span 4', padding: '36px 32px', borderRadius: '14px', backgroundColor: F.surface1, border: `1px solid ${F.hairlineSoft}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: F.inkMuted, border: `1px solid ${F.hairline}`, borderRadius: '100px', padding: '3px 10px', marginBottom: '24px', textTransform: 'uppercase', width: 'fit-content' }}>
                <Zap size={10} />
                Speed
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: 'clamp(40px, 5vw, 56px)', fontWeight: 500, letterSpacing: '-3px', color: F.ink, lineHeight: 1 }}>3</span>
                <span style={{ fontSize: '20px', color: F.inkMuted, letterSpacing: '-0.5px' }}>분</span>
              </div>
              <p style={{ color: F.inkMuted, fontSize: '15px', lineHeight: 1.4, letterSpacing: '-0.15px' }}>
                브리프 입력부터 시안 완성까지 평균 3분이면 충분합니다.
              </p>
            </div>

            {/* Bottom middle – Prototype */}
            <div style={{ gridColumn: 'span 4', padding: '36px 32px', borderRadius: '14px', backgroundColor: F.surface1, border: `1px solid ${F.hairlineSoft}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: F.inkMuted, border: `1px solid ${F.hairline}`, borderRadius: '100px', padding: '3px 10px', marginBottom: '24px', textTransform: 'uppercase', width: 'fit-content' }}>
                <Layers size={10} />
                Prototype
              </div>
              <h3 style={{ color: F.ink, fontSize: '20px', fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.8px', marginBottom: '12px' }}>다중 화면 프로토타입</h3>
              <p style={{ color: F.inkMuted, fontSize: '15px', lineHeight: 1.4, letterSpacing: '-0.15px', flex: 1 }}>
                여러 화면을 연결해 실제 앱처럼 탐색할 수 있는 프로토타입을 만듭니다.
              </p>
            </div>

            {/* Bottom right – Share */}
            <div style={{ gridColumn: 'span 4', padding: '36px 32px', borderRadius: '14px', backgroundColor: F.surface1, border: `1px solid ${F.hairlineSoft}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', color: F.inkMuted, border: `1px solid ${F.hairline}`, borderRadius: '100px', padding: '3px 10px', marginBottom: '24px', textTransform: 'uppercase', width: 'fit-content' }}>
                <Share2 size={10} />
                Share
              </div>
              <h3 style={{ color: F.ink, fontSize: '20px', fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.8px', marginBottom: '12px' }}>링크로 즉시 공유</h3>
              <p style={{ color: F.inkMuted, fontSize: '15px', lineHeight: 1.4, letterSpacing: '-0.15px', flex: 1 }}>
                완성된 시안을 링크 하나로 팀 또는 클라이언트와 공유할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TEMPLATES
      ══════════════════════════════════════════ */}
      <section style={{ backgroundColor: F.canvas, position: 'relative', zIndex: 10, padding: '96px 0', borderTop: `1px solid ${F.hairlineSoft}` }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <p style={{ color: F.inkMuted, fontSize: '13px', fontWeight: 500, letterSpacing: '-0.13px', marginBottom: '12px' }}>
              Templates
            </p>
            <h2 style={{ color: F.ink, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500, letterSpacing: '-2.4px', lineHeight: 1.05 }}>
              Get started<br />with templates
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', paddingBottom: '6px' }}>
            {(['left', 'right'] as const).map(dir => (
              <button
                key={dir}
                onClick={() => scroll(dir)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: `1px solid ${F.hairline}`, backgroundColor: F.surface1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: F.ink, transition: 'all 0.15s',
                }}
              >
                {dir === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={scrollRef}
          className="tpl-scroll"
          style={{
            display: 'flex', gap: '14px', overflowX: 'auto',
            paddingLeft: 'max(24px, calc((100vw - 1080px) / 2))',
            paddingRight: '24px', paddingBottom: '4px',
          }}
        >
          {TEMPLATES.map(tpl => (
            <div
              key={tpl.id}
              onClick={() => router.push(`/studio?brief=${encodeURIComponent(tpl.brief)}&preset=${tpl.preset}`)}
              style={{
                minWidth: tpl.wide ? '440px' : '290px', height: '380px', borderRadius: '14px',
                background: tpl.bg, position: 'relative', overflow: 'hidden',
                cursor: 'pointer', flexShrink: 0, transition: 'transform 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.015)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <div style={{ position: 'absolute', top: tpl.wide ? '28px' : '20px', left: '50%', transform: 'translateX(-50%)' }}>
                <TemplateMockup id={tpl.id} wide={tpl.wide} />
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(transparent, rgba(0,0,0,0.72))' }} />
              <div style={{ position: 'absolute', bottom: '24px', left: '24px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '5px', letterSpacing: '-0.12px' }}>{tpl.type}</div>
                <div style={{ fontSize: '18px', fontWeight: 500, color: '#ffffff', letterSpacing: '-0.8px' }}>{tpl.name}</div>
              </div>
              <div style={{
                position: 'absolute', top: '16px', right: '16px',
                fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 500,
                backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: '100px', padding: '4px 10px',
                border: '1px solid rgba(255,255,255,0.15)', letterSpacing: '-0.11px',
                backdropFilter: 'blur(8px)',
              }}>
                {DESIGN_PRESETS[tpl.preset].label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS MARQUEE
      ══════════════════════════════════════════ */}
      <section style={{ backgroundColor: F.canvas, position: 'relative', zIndex: 10, padding: '96px 0', borderTop: `1px solid ${F.hairlineSoft}`, overflow: 'hidden' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 24px', marginBottom: '48px' }}>
          <p style={{ color: F.inkMuted, fontSize: '13px', fontWeight: 500, letterSpacing: '-0.13px', marginBottom: '16px', textAlign: 'center' }}>Testimonials</p>
          <h2 style={{ color: F.ink, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500, letterSpacing: '-2.4px', lineHeight: 1.05, textAlign: 'center' }}>
            실제 사용자의<br />이야기
          </h2>
        </div>
        <div style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', overflow: 'hidden', marginBottom: '12px' }}>
          <div className="marquee-left">
            {[...TESTIMONIALS_A, ...TESTIMONIALS_A].map((t, i) => (
              <div key={i} style={{
                minWidth: '300px', padding: '24px', borderRadius: '16px',
                backgroundColor: F.surface1, border: `1px solid ${F.hairlineSoft}`,
                marginLeft: '12px', flexShrink: 0,
              }}>
                <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '14px', lineHeight: 1.6, letterSpacing: '-0.14px', marginBottom: '16px' }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: F.inkMuted, fontSize: '11px', fontWeight: 600 }}>{t.name[0]}</span>
                  </div>
                  <div>
                    <div style={{ color: F.ink, fontSize: '13px', fontWeight: 500, letterSpacing: '-0.3px' }}>{t.name}</div>
                    <div style={{ color: 'rgba(0,0,0,0.3)', fontSize: '12px', letterSpacing: '-0.12px' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', overflow: 'hidden' }}>
          <div className="marquee-right">
            {[...TESTIMONIALS_B, ...TESTIMONIALS_B].map((t, i) => (
              <div key={i} style={{
                minWidth: '300px', padding: '24px', borderRadius: '16px',
                backgroundColor: F.surface1, border: `1px solid ${F.hairlineSoft}`,
                marginLeft: '12px', flexShrink: 0,
              }}>
                <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '14px', lineHeight: 1.6, letterSpacing: '-0.14px', marginBottom: '16px' }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: F.surface2, border: `1px solid ${F.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: F.inkMuted, fontSize: '11px', fontWeight: 600 }}>{t.name[0]}</span>
                  </div>
                  <div>
                    <div style={{ color: F.ink, fontSize: '13px', fontWeight: 500, letterSpacing: '-0.3px' }}>{t.name}</div>
                    <div style={{ color: 'rgba(0,0,0,0.3)', fontSize: '12px', letterSpacing: '-0.12px' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════ */}
      <section id="pricing" style={{ backgroundColor: F.canvas, position: 'relative', zIndex: 10, padding: '96px 24px', borderTop: `1px solid ${F.hairlineSoft}` }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <p style={{ color: F.inkMuted, fontSize: '13px', fontWeight: 500, letterSpacing: '-0.13px', marginBottom: '16px', textAlign: 'center' }}>Pricing</p>
          <h2 style={{ color: F.ink, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500, letterSpacing: '-2.4px', lineHeight: 1.05, textAlign: 'center', marginBottom: '16px' }}>
            심플한 요금제
          </h2>
          <p style={{ color: F.inkMuted, fontSize: '15px', textAlign: 'center', lineHeight: 1.4, marginBottom: '64px', letterSpacing: '-0.15px' }}>
            무료로 시작하고, 필요할 때 업그레이드하세요
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', alignItems: 'start' }}>
            {PRICING_PLANS.map(plan => (
              <div
                key={plan.name}
                style={{
                  padding: '36px 32px', borderRadius: '14px',
                  backgroundColor: plan.featured ? F.ink : F.surface1,
                  border: plan.featured ? 'none' : `1px solid ${F.hairlineSoft}`,
                  position: 'relative',
                }}
              >
                {plan.featured && (
                  <div style={{
                    position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                    fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: '#111', backgroundColor: '#fff',
                    borderRadius: '100px', padding: '4px 12px', whiteSpace: 'nowrap',
                  }}>
                    가장 인기
                  </div>
                )}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ color: plan.featured ? F.canvas : F.ink, fontSize: '18px', fontWeight: 500, letterSpacing: '-0.6px', marginBottom: '6px' }}>{plan.name}</h3>
                  <p style={{ color: plan.featured ? 'rgba(255,255,255,0.55)' : F.inkMuted, fontSize: '14px', letterSpacing: '-0.14px' }}>{plan.desc}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '32px' }}>
                  <span style={{ color: plan.featured ? F.canvas : F.ink, fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 500, letterSpacing: '-2px', lineHeight: 1 }}>{plan.price}</span>
                  {plan.per && <span style={{ color: plan.featured ? 'rgba(255,255,255,0.5)' : F.inkMuted, fontSize: '15px', letterSpacing: '-0.15px' }}>{plan.per}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Check size={13} color={plan.featured ? 'rgba(255,255,255,0.7)' : F.inkMuted} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      <span style={{ color: plan.featured ? 'rgba(255,255,255,0.8)' : F.inkMuted, fontSize: '14px', letterSpacing: '-0.14px' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a
                  href="/studio"
                  style={{
                    display: 'block', textAlign: 'center',
                    padding: '12px', borderRadius: '100px',
                    backgroundColor: plan.featured ? '#fff' : F.surface2,
                    color: plan.featured ? '#111' : F.ink,
                    fontSize: '14px', fontWeight: 500, letterSpacing: '-0.14px',
                    textDecoration: 'none', transition: 'all 0.15s',
                    border: plan.featured ? 'none' : `1px solid ${F.hairline}`,
                  }}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════ */}
      <section style={{ backgroundColor: F.canvas, position: 'relative', zIndex: 10, padding: '96px 24px', borderTop: `1px solid ${F.hairlineSoft}` }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <p style={{ color: F.inkMuted, fontSize: '13px', fontWeight: 500, letterSpacing: '-0.13px', marginBottom: '16px', textAlign: 'center' }}>FAQ</p>
          <h2 style={{ color: F.ink, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500, letterSpacing: '-2.4px', lineHeight: 1.05, textAlign: 'center', marginBottom: '56px' }}>
            자주 묻는 질문
          </h2>
          <div>
            {FAQ.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA
      ══════════════════════════════════════════ */}
      <section style={{ backgroundColor: F.canvas, position: 'relative', zIndex: 10, padding: '96px 24px', borderTop: `1px solid ${F.hairlineSoft}` }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            border: `1px solid ${F.hairline}`, color: F.inkMuted,
            fontSize: '13px', fontWeight: 500, padding: '5px 13px', borderRadius: '100px',
            backgroundColor: F.surface1, marginBottom: '32px', letterSpacing: '-0.13px',
          }}>
            <Sliders size={10} />
            무료로 시작
          </div>
          <h2 style={{ color: F.ink, fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 500, letterSpacing: '-2.6px', lineHeight: 1.00, marginBottom: '20px' }}>
            지금 바로<br />첫 시안을 만들어보세요
          </h2>
          <p style={{ color: F.inkMuted, fontSize: '15px', lineHeight: 1.30, marginBottom: '44px', letterSpacing: '-0.15px' }}>
            설명 한 줄로 시작합니다. 디자인 경험이 없어도 괜찮습니다.
          </p>
          <a
            href="/studio"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: F.ink, color: F.canvas,
              fontSize: '14px', fontWeight: 500, letterSpacing: '-0.14px',
              padding: '10px 15px', borderRadius: '100px',
              textDecoration: 'none', transition: 'all 0.2s',
            }}
          >
            <Sparkles size={14} />
            스튜디오 시작하기
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: F.canvas, borderTop: `1px solid ${F.hairlineSoft}`, padding: '40px 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px' }}>
            <div>
              <span style={{ color: F.ink, fontWeight: 500, fontSize: '16px', letterSpacing: '-0.8px', display: 'block', marginBottom: '8px' }}>aide</span>
              <span style={{ color: F.inkMuted, fontSize: '13px', letterSpacing: '-0.13px' }}>Powered by Gemini 2.5 Pro</span>
            </div>
            <div style={{ display: 'flex', gap: '48px' }}>
              <div>
                <div style={{ color: F.inkMuted, fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>제품</div>
                {['스튜디오', '템플릿', '디자인 시스템', '요금제'].map(item => (
                  <div key={item} style={{ color: F.inkMuted, fontSize: '14px', letterSpacing: '-0.14px', marginBottom: '10px' }}>{item}</div>
                ))}
              </div>
              <div>
                <div style={{ color: F.inkMuted, fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>회사</div>
                {['소개', '블로그', '문의하기'].map(item => (
                  <div key={item} style={{ color: F.inkMuted, fontSize: '14px', letterSpacing: '-0.14px', marginBottom: '10px' }}>{item}</div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${F.hairlineSoft}`, paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(0,0,0,0.3)', fontSize: '12px', letterSpacing: '-0.12px' }}>© 2025 aide. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '20px' }}>
              {['이용약관', '개인정보처리방침'].map(item => (
                <span key={item} style={{ color: 'rgba(0,0,0,0.3)', fontSize: '12px', letterSpacing: '-0.12px' }}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* History modal */}
      {historyModalOpen && (
        <div
          onClick={() => setHistoryModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '680px', maxHeight: '80vh',
              borderRadius: '20px', backgroundColor: F.canvas,
              border: `1px solid ${F.hairline}`,
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '20px 24px', borderBottom: `1px solid ${F.hairlineSoft}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color={F.inkMuted} />
                <span style={{ color: F.ink, fontSize: '15px', fontWeight: 600, letterSpacing: '-0.3px' }}>히스토리</span>
                {historyItems.length > 0 && (
                  <span style={{ color: F.inkMuted, fontSize: '12px', letterSpacing: '-0.12px' }}>{historyItems.length}개</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {historyItems.length > 0 && (
                  <button
                    onClick={() => { clearHistory(); setHistoryItems([]) }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(200,50,50,0.6)', fontSize: '12px',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      letterSpacing: '-0.12px', padding: '2px 0', fontFamily: 'inherit',
                    }}
                  >
                    <Trash2 size={11} />
                    전체 삭제
                  </button>
                )}
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: F.inkMuted, display: 'flex', alignItems: 'center',
                    padding: '4px', borderRadius: '6px', fontFamily: 'inherit',
                    fontSize: '18px', lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {historyItems.length === 0 ? (
                <div style={{
                  padding: '64px 24px', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                }}>
                  <Clock size={28} color={F.inkMuted} />
                  <p style={{ color: F.inkMuted, fontSize: '14px', letterSpacing: '-0.14px', margin: 0 }}>
                    아직 생성한 시안이 없습니다
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {historyItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: '14px', overflow: 'hidden',
                        backgroundColor: F.surface1, border: `1px solid ${F.hairline}`,
                        display: 'flex', flexDirection: 'column',
                        boxShadow: 'rgba(0, 0, 0, 0.04) 0 2px 6px',
                      }}
                    >
                      <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden', flexShrink: 0, backgroundColor: F.surface2 }}>
                        <img
                          src={item.thumbnail}
                          alt={item.brief}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                        />
                      </div>
                      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{
                          color: 'rgba(0,0,0,0.8)', fontSize: '13px', lineHeight: 1.4,
                          letterSpacing: '-0.13px', margin: 0,
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        } as React.CSSProperties}>
                          {item.brief}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {item.preset && item.preset in DESIGN_PRESETS && (
                              <span style={{
                                fontSize: '10px', fontWeight: 500,
                                color: DESIGN_PRESETS[item.preset as DesignPreset].color,
                                backgroundColor: `${DESIGN_PRESETS[item.preset as DesignPreset].color}18`,
                                borderRadius: '100px', padding: '2px 7px',
                                border: `1px solid ${DESIGN_PRESETS[item.preset as DesignPreset].color}30`,
                                letterSpacing: '-0.1px',
                              }}>
                                {DESIGN_PRESETS[item.preset as DesignPreset].label}
                              </span>
                            )}
                            <span style={{ color: F.inkMuted, fontSize: '10px', letterSpacing: '-0.1px' }}>
                              {relativeTime(item.createdAt)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button
                              onClick={() => { deleteHistoryItem(item.id); setHistoryItems(h => h.filter(x => x.id !== item.id)) }}
                              style={{
                                width: '28px', height: '28px', borderRadius: '6px',
                                border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                                color: F.inkMuted, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,50,50,0.8)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,80,80,0.1)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = F.inkMuted; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                            >
                              <Trash2 size={12} />
                            </button>
                            <button
                              onClick={() => router.push(`/studio?historyId=${item.id}`)}
                              style={{
                                width: '28px', height: '28px', borderRadius: '6px',
                                border: 'none', backgroundColor: 'rgba(0,0,0,0.04)', cursor: 'pointer',
                                color: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.08)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.04)' }}
                            >
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
