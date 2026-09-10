export type MemoryDomainId = 'all' | 'finance' | 'commerce' | 'public' | 'healthcare' | 'manufacturing' | 'telecom' | 'design'

export type MemoryKind = 'source' | 'conversation' | 'decision' | 'concept' | 'pattern' | 'rule'

export interface MemoryDomain {
  id: Exclude<MemoryDomainId, 'all'>
  label: string
  description: string
  colorToken: string
}

export interface MemoryNode {
  id: string
  title: string
  domain: Exclude<MemoryDomainId, 'all'>
  kind: MemoryKind
  sourcePath: string
  summary: string
  x: number
  y: number
  weight: number
  approved: boolean
}

export interface MemoryEdge {
  source: string
  target: string
  inferred: boolean
}

export interface MemoryGraphData {
  nodes: MemoryNode[]
  edges: MemoryEdge[]
}

export const MEMORY_DOMAINS: MemoryDomain[] = [
  { id: 'finance', label: '금융', description: '계좌, 자산, 거래와 규제 지식', colorToken: '--aui-primary' },
  { id: 'commerce', label: '커머스', description: '상품, 주문, 결제와 고객 여정', colorToken: '--aui-positive' },
  { id: 'public', label: '공공', description: '민원, 행정 절차와 접근성 기준', colorToken: '--aui-caution-text' },
  { id: 'healthcare', label: '헬스케어', description: '진료, 예약, 건강 데이터 원칙', colorToken: '--aui-negative' },
  { id: 'manufacturing', label: '제조', description: '생산, 설비와 품질 관리 흐름', colorToken: '--aui-text-neutral' },
  { id: 'telecom', label: '통신', description: '요금제, 회선과 고객 지원 지식', colorToken: '--aui-primary-strong' },
  { id: 'design', label: 'UX·디자인', description: '화면 패턴, 컴포넌트와 검증 원칙', colorToken: '--aui-text' },
]

const TITLES: Record<Exclude<MemoryDomainId, 'all'>, string[]> = {
  finance: ['포트폴리오 요약', '계좌 잔액', '보유 종목', '주문 상태', '투자 성향', '수익률 기준일', '이상 거래', '고객 확인'],
  commerce: ['상품 탐색', '장바구니', '주문 내역', '결제 실패', '배송 추적', '쿠폰 정책', '반품 절차', '재고 상태'],
  public: ['민원 접수', '신청 자격', '처리 단계', '구비 서류', '전자 서명', '접근성 기준', '알림 정책', '담당 부서'],
  healthcare: ['진료 예약', '환자 요약', '복약 기록', '검사 결과', '개인정보 동의', '응급 분류', '의료진 일정', '건강 지표'],
  manufacturing: ['생산 현황', '설비 상태', '품질 검사', '작업 지시', '공정 이력', '불량 원인', '안전 점검', '자재 흐름'],
  telecom: ['회선 현황', '요금제 비교', '사용량', '장애 접수', '개통 절차', '혜택 조건', '고객 등급', '상담 이력'],
  design: ['화면 골격', '정보 위계', '빈 상태', '오류 상태', '접근성', '디자인 토큰', '컴포넌트 규칙', '사용자 여정'],
}

const KINDS: MemoryKind[] = ['source', 'conversation', 'decision', 'concept', 'pattern', 'rule']

function mulberry32(seed: number) {
  return () => {
    let value = seed += 0x6d2b79f5
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

export function buildDemoMemoryGraph(nodeCount = 840): MemoryGraphData {
  const random = mulberry32(240910)
  const nodes: MemoryNode[] = []
  const edges: MemoryEdge[] = []
  const perDomain = Math.floor(nodeCount / MEMORY_DOMAINS.length)

  MEMORY_DOMAINS.forEach((domain, domainIndex) => {
    const angle = (Math.PI * 2 * domainIndex) / MEMORY_DOMAINS.length - Math.PI / 2
    const centerRadius = domainIndex === MEMORY_DOMAINS.length - 1 ? 210 : 430
    const centerX = Math.cos(angle) * centerRadius
    const centerY = Math.sin(angle) * centerRadius * 0.7
    const domainNodes: MemoryNode[] = []

    for (let index = 0; index < perDomain; index += 1) {
      const isHub = index < 3
      const ring = Math.sqrt(index / perDomain)
      const theta = index * 2.399963 + random() * 0.45
      const spread = 210 + random() * 105
      const baseTitle = TITLES[domain.id][index % TITLES[domain.id].length]
      const kind = KINDS[index % KINDS.length]
      const node: MemoryNode = {
        id: `${domain.id}-${index}`,
        title: isHub ? baseTitle : `${baseTitle} ${Math.floor(index / TITLES[domain.id].length) + 1}`,
        domain: domain.id,
        kind,
        sourcePath: `wiki/${domain.id}/${kind}/${baseTitle.replaceAll(' ', '-')}.md`,
        summary: `${domain.label} 업무에서 ${baseTitle}을 설계할 때 적용하는 ${kind === 'rule' ? '필수 규칙' : '검증된 조직 기억'}입니다.`,
        x: centerX + Math.cos(theta) * ring * spread,
        y: centerY + Math.sin(theta) * ring * spread * 0.78,
        weight: isHub ? 3.4 - index * 0.55 : 0.65 + random() * 1.05,
        approved: index % 11 !== 0,
      }
      nodes.push(node)
      domainNodes.push(node)
      if (index > 0) {
        const parent = domainNodes[Math.max(0, Math.floor((index - 1) / 3))]
        edges.push({ source: parent.id, target: node.id, inferred: index % 5 === 0 })
        if (index % 4 === 0) {
          const sibling = domainNodes[Math.floor(random() * index)]
          edges.push({ source: sibling.id, target: node.id, inferred: index % 3 === 0 })
        }
      }
    }
  })

  MEMORY_DOMAINS.forEach((domain, index) => {
    const next = MEMORY_DOMAINS[(index + 1) % MEMORY_DOMAINS.length]
    edges.push({ source: `${domain.id}-0`, target: `${next.id}-0`, inferred: true })
    edges.push({ source: `${domain.id}-1`, target: `design-${index % 3}`, inferred: false })
  })

  return { nodes, edges }
}

