export const providers = [
  { key: 'tiktok', name: 'TikTok', host: /(^|\.)tiktok\.com/i, color: '#20d5ec' },
  { key: 'instagram', name: 'Instagram', host: /(^|\.)instagram\.com/i, color: '#e1306c' },
  { key: 'facebook', name: 'Facebook', host: /(^|\.)facebook\.com|fb\.watch/i, color: '#1877f2' },
  { key: 'x', name: 'X / Twitter', host: /(^|\.)x\.com|twitter\.com/i, color: '#111827' },
  { key: 'vimeo', name: 'Vimeo', host: /(^|\.)vimeo\.com/i, color: '#1ab7ea' },
  { key: 'soundcloud', name: 'SoundCloud', host: /(^|\.)soundcloud\.com/i, color: '#ff5500' },
]

const disabledProviders = [
  { key: 'youtube', name: 'YouTube', domains: ['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'googlevideo.com'] },
]

export const RECENT_STORAGE_KEY = 'mediaflow:recent-downloads:v1'

export function detectProvider(url) {
  return providers.find((item) => item.host.test(url)) || null
}

export function detectDisabledProvider(url) {
  let hostname = ''
  try { hostname = new URL(url).hostname.toLowerCase() } catch { return null }
  return disabledProviders.find((item) => item.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) || null
}

export function loadRecentDownloads() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object').slice(0, 10) : []
  } catch {
    return []
  }
}

export function saveRecentDownload(media, format) {
  const item = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: media.title || 'وسائط بدون عنوان',
    platform: media.platform || 'رابط ويب',
    thumbnail: media.thumbnail || null,
    format_label: format.label || format.quality || 'MP4',
    created_at: new Date().toISOString(),
    status: 'completed',
  }
  const updated = [item, ...loadRecentDownloads()].slice(0, 30)
  try { localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated)) } catch { /* storage may be unavailable */ }
  return updated.slice(0, 10)
}

export function clearRecentDownloads() {
  try { localStorage.removeItem(RECENT_STORAGE_KEY) } catch { /* storage may be unavailable */ }
}

export function formatBytes(bytes) {
  if (!bytes) return 'الحجم غير معروف'
  const units = ['بايت', 'KB', 'MB', 'GB']
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** power).toFixed(power ? 1 : 0)} ${units[power]}`
}

export function formatTime(seconds) {
  if (!seconds) return '—'
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

export function relativeDate(value) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `قبل ${minutes} د`
  if (minutes < 1440) return `قبل ${Math.floor(minutes / 60)} س`
  return `قبل ${Math.floor(minutes / 1440)} ي`
}
