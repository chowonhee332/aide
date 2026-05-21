export type AppDomain = 'finance' | 'commerce' | 'health' | 'food' | 'productivity' | 'social' | 'travel' | 'education' | 'entertainment' | 'business' | 'other';

export const DOMAIN_KEY_TO_LABEL: Record<AppDomain, string> = {
  finance: '금융/결제',
  commerce: '쇼핑/커머스',
  health: '헬스/의료',
  food: '음식/배달',
  productivity: '업무/생산성',
  social: 'SNS/커뮤니티',
  travel: '여행/숙박',
  education: '교육/학습',
  entertainment: '엔터테인먼트',
  business: '비즈니스/SaaS',
  other: '기타',
}

export const DOMAIN_LABEL_TO_KEY: Record<string, AppDomain> = Object.fromEntries(
  Object.entries(DOMAIN_KEY_TO_LABEL).map(([k, v]) => [v, k as AppDomain])
)
