// In production Firebase Hosting rewrites /api to Cloud Run, keeping the API
// on the same public domain. Local development continues to use FastAPI:8000.
const API_ROOT = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api/v1' : '/api/v1')

async function call(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.detail || 'حدث خطأ غير متوقع.')
  return payload
}

export const api = {
  inspect: (url) => call('/media/inspect', { method: 'POST', body: JSON.stringify({ url }) }),
  download: (media, formatId) => call('/media/download', {
    method: 'POST', body: JSON.stringify({
      url: media.source_url, format_id: formatId, title: media.title,
      platform: media.platform, thumbnail: media.thumbnail,
    }),
  }),
  recent: () => call('/recent'),
  platforms: () => call('/platforms'),
  root: API_ROOT,
}
