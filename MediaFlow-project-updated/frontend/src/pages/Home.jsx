import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import UrlBox from '../components/UrlBox'
import MediaCard from '../components/MediaCard'
import RecentList from '../components/RecentList'
import { api } from '../api'
import {
  clearRecentDownloads,
  detectDisabledProvider,
  loadRecentDownloads,
  providers,
  RECENT_STORAGE_KEY,
  saveRecentDownload,
} from '../lib'

export default function Home() {
  const [media, setMedia] = useState(null)
  const [recent, setRecent] = useState(() => loadRecentDownloads())
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState('')
  const [downloadProgress, setDownloadProgress] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const syncRecent = (event) => {
      if (event.key === RECENT_STORAGE_KEY) setRecent(loadRecentDownloads())
    }
    window.addEventListener('storage', syncRecent)
    return () => window.removeEventListener('storage', syncRecent)
  }, [])
  async function inspect(url) {
    const disabledProvider = detectDisabledProvider(url)
    if (disabledProvider) {
      setMedia(null)
      setError(`روابط ${disabledProvider.name} غير مدعومة حاليًا. استخدم رابطًا من منصة أخرى.`)
      return
    }
    setBusy(true); setError(''); setMedia(null)
    try { setMedia(await api.inspect(url)) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function download(format) {
    setDownloading(format.id); setDownloadProgress(0); setError('')
    try {
      const result = await api.download(media, format.id, setDownloadProgress)
      const objectUrl = URL.createObjectURL(result.blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = result.filename
      document.body.appendChild(anchor); anchor.click(); anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
      setRecent(saveRecentDownload(media, format))
    } catch (err) { setError(err.message) } finally { setDownloading(''); setDownloadProgress(null) }
  }
  return <>
    <section className="px-5 pb-9 pt-20 text-center sm:pt-28">
      <div className="animate-rise-in mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[.06] px-3 py-1.5 text-xs font-medium text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> معالجة ذكية للروابط العامة</div>
      <h1 className="animate-rise-in mx-auto mt-6 max-w-4xl text-4xl font-bold leading-[1.22] tracking-tight text-white sm:text-5xl lg:text-6xl">وسائطك من أي رابط،<br /><span className="text-gradient">بخطوة واحدة فقط.</span></h1>
      <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">ألصق الرابط، ودع MediaFlow يكتشف المصدر ويعرض لك تفاصيل الوسائط وخياراتها المتاحة خلال ثوانٍ.</p>
      <div className="mt-10"><UrlBox onInspect={inspect} busy={busy} /></div>
      {error && <div className="animate-rise-in mx-auto mt-12 flex max-w-3xl items-center gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[.08] px-4 py-3 text-right text-sm text-rose-200"><AlertCircle size={19} className="shrink-0" />{error}</div>}
      {media && <MediaCard media={media} onDownload={download} downloading={downloading} downloadProgress={downloadProgress} />}
    </section>
    <section className="mx-auto mt-12 max-w-4xl px-5 text-center"><p className="text-xs text-slate-600">مصادر يتعرف عليها النظام تلقائيًا</p><div className="mt-4 flex flex-wrap justify-center gap-2">{providers.map((item) => <span key={item.key} className="rounded-lg border border-white/[.07] bg-white/[.025] px-3 py-1.5 text-xs text-slate-400"><span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />{item.name}</span>)}</div></section>
    <div className="px-5"><RecentList items={recent} onClear={() => { clearRecentDownloads(); setRecent([]) }} /></div>
  </>
}
