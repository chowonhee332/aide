export interface HistoryItem {
  id: string
  brief: string
  preset: string | null
  designMdFileName: string | null
  html: string
  thumbnail: string  // compressed jpeg base64
  createdAt: number
}

const KEY = 'aide_history'
const MAX_ITEMS = 20

export function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveHistoryItem(item: Omit<HistoryItem, 'id' | 'createdAt'>): void {
  if (typeof window === 'undefined') return
  const history = loadHistory()
  const newItem: HistoryItem = { ...item, id: crypto.randomUUID(), createdAt: Date.now() }
  const updated = [newItem, ...history].slice(0, MAX_ITEMS)
  try {
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {
    // quota exceeded — purge oldest half and retry
    const trimmed = [newItem, ...history].slice(0, Math.floor(MAX_ITEMS / 2))
    try { localStorage.setItem(KEY, JSON.stringify(trimmed)) } catch { /* give up */ }
  }
}

export function deleteHistoryItem(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(loadHistory().filter(h => h.id !== id)))
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}

export async function compressThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const maxW = 480
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}
