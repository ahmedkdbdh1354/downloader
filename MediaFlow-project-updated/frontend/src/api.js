// In production Firebase Hosting rewrites /api to Cloud Run, keeping the API
// on the same public domain. Local development continues to use FastAPI:8000.
const API_ROOT = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api/v1' : '/api/v1')

async function call(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null

  if (!response.ok) {
    const fallback = response.status === 404
      ? 'خدمة التنزيل غير متصلة بالموقع حاليًا.'
      : 'حدث خطأ غير متوقع.'
    throw new Error(payload?.detail || fallback)
  }
  if (payload === null) {
    throw new Error('خدمة المعالجة غير متاحة حاليًا. حاول مجددًا بعد قليل.')
  }
  return payload
}

function filenameFromHeader(header) {
  if (!header) return ''
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) {
    try { return decodeURIComponent(encoded) } catch { return encoded }
  }
  return header.match(/filename="?([^";]+)"?/i)?.[1] || ''
}

async function downloadFile(media, formatId, onProgress) {
  const response = await fetch(`${API_ROOT}/media/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: media.source_url, format_id: formatId, title: media.title,
      platform: media.platform, thumbnail: media.thumbnail,
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.detail || 'لم يكتمل التنزيل. حاول مجددًا بعد قليل.')
  }

  const total = Number(response.headers.get('content-length')) || 0
  const filename = filenameFromHeader(response.headers.get('content-disposition')) || `${media.title || 'media'}.mp4`
  if (!response.body) return { blob: await response.blob(), filename }

  const reader = response.body.getReader()
  const chunks = []
  let loaded = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    onProgress?.(total ? Math.min(100, Math.round((loaded / total) * 100)) : null)
  }

  return {
    blob: new Blob(chunks, { type: response.headers.get('content-type') || 'video/mp4' }),
    filename,
  }
}

export const api = {
  inspect: (url) => call('/media/inspect', { method: 'POST', body: JSON.stringify({ url }) }),
  download: downloadFile,
  recent: () => call('/recent'),
  platforms: () => call('/platforms'),
  root: API_ROOT,
}
