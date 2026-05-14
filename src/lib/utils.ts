import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isSafeUrl(urlStr: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(urlStr)
  } catch {
    return false
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return false

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '') // strip IPv6 brackets

  if (hostname === 'localhost' || hostname === '0.0.0.0') return false

  // IPv6 loopback and private ranges
  if (hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd')) return false

  // IPv4 private/reserved ranges
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (a === 0) return false                           // 0.x.x.x
    if (a === 10) return false                          // 10.0.0.0/8
    if (a === 127) return false                         // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return false            // 169.254.0.0/16 link-local / AWS metadata
    if (a === 172 && b >= 16 && b <= 31) return false  // 172.16.0.0/12
    if (a === 192 && b === 168) return false            // 192.168.0.0/16
  }

  return true
}
