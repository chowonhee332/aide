export interface HistoryItem {
  id: string
  brief: string
  preset: string | null
  designMdFileName: string | null
  html: string
  thumbnail: string  // compressed jpeg base64
  createdAt: number
  platform?: 'mobile' | 'web'
  itemType?: 'variant' | 'design' | 'board'
  board?: {
    stage?: 'variants-ready' | 'prototype-ready'
    designSystemName?: string | null
    designMd?: string | null
    mainVariants?: Array<{
      html: string
      image?: string
      variantDescription?: unknown
      imageWarnings?: string[]
      isCanvasPreview?: boolean
      designDirection?: unknown
      designCanvas?: unknown
      screenIr?: unknown
    } | null>
    pickedVariantIdx?: 0 | 1 | 2 | null
    prototypeHtml?: string | null
    prototypeThumbnail?: string | null
    prototypeScreens?: Array<{ id: string; label: string }>
    bSceneImage?: { base64: string; mimeType: string } | null
    questionnaire?: unknown | null
    answers?: Record<string, string | string[]>
    generationEngine?: 'node-graph' | 'legacy-html'
    logoDataUrl?: string | null
    brandColors?: string[]
    sourceContext?: {
      asIsAnalysis?: unknown
      prdDoc?: string
      iaImage?: string
      iaText?: string
      referenceImage?: string
      referenceImageKind?: string
    }
  }
}

const DB_NAME = 'aide_db'
const STORE_NAME = 'history'
const DB_VERSION = 1
const MAX_ITEMS = 50

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadHistory(): Promise<HistoryItem[]> {
  if (typeof window === 'undefined') return []
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('createdAt')
      const req = index.getAll()
      req.onsuccess = () => resolve((req.result as HistoryItem[]).reverse())
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function saveHistoryItem(item: Omit<HistoryItem, 'id' | 'createdAt'>): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const db = await openDB()
    const newItem: HistoryItem = { ...item, id: crypto.randomUUID(), createdAt: Date.now() }

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.add(newItem)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    // Trim to MAX_ITEMS
    const all = await loadHistory()
    if (all.length > MAX_ITEMS) {
      const toDelete = all.slice(MAX_ITEMS)
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      toDelete.forEach(h => store.delete(h.id))
    }
    return newItem.id
  } catch {
    // Silently ignore — IndexedDB not available (SSR, private mode with restrictions)
  }
  return null
}

export async function updateHistoryItem(id: string, patch: Partial<Omit<HistoryItem, 'id' | 'createdAt'>>): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(id)
      getReq.onsuccess = () => {
        const existing = getReq.result as HistoryItem | undefined
        if (!existing) {
          resolve()
          return
        }
        store.put({ ...existing, ...patch, board: patch.board ? { ...existing.board, ...patch.board } : existing.board })
      }
      getReq.onerror = () => reject(getReq.error)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* ignore */ }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* ignore */ }
}


export async function compressThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const maxW = 1200
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.88))
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
