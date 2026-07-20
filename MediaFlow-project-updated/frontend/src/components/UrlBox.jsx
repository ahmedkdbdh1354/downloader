import { ArrowLeft, ClipboardPaste, Link2, LoaderCircle, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { detectProvider } from '../lib'

export default function UrlBox({ onInspect, busy }) {
  const [url, setUrl] = useState('')
  const [hint, setHint] = useState(null)
  useEffect(() => setHint(detectProvider(url)), [url])

  async function paste() {
    try { setUrl(await navigator.clipboard.readText()) } catch { /* browser permissions may prevent this */ }
  }
  function submit(event) {
    event.preventDefault()
    if (url.trim()) onInspect(url.trim())
  }
  return <form onSubmit={submit} className="relative mx-auto max-w-3xl">
    <div className="relative rounded-2xl bg-gradient-to-r from-indigo-500/80 via-cyan-300/70 to-indigo-500/80 p-px shadow-glow">
      <div className="flex flex-col gap-2 rounded-[15px] bg-[#11182d] p-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
          <Link2 size={20} className="shrink-0 text-cyan-300" />
          <input value={url} onChange={(event) => setUrl(event.target.value)} className="h-12 min-w-0 flex-1 bg-transparent text-right text-sm text-white outline-none placeholder:text-slate-500 sm:text-base" placeholder="ألصق رابط الفيديو أو الصوت هنا…" inputMode="url" aria-label="رابط الوسائط" />
          <button type="button" onClick={paste} className="hidden shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-slate-400 transition hover:bg-white/[.06] hover:text-white sm:flex"><ClipboardPaste size={16} /> لصق</button>
        </div>
        <button disabled={!url.trim() || busy} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-900 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />} {busy ? 'جارٍ التحليل…' : 'اكتشاف الرابط'} <ArrowLeft size={17} />
        </button>
      </div>
    </div>
    <div className="absolute top-[calc(100%+10px)] right-3 flex h-6 items-center gap-2 text-xs text-slate-500">
      {hint ? <><span className="h-2 w-2 rounded-full" style={{ background: hint.color }} /> تم التعرف تلقائيًا: <strong className="font-medium text-slate-300">{hint.name}</strong></> : url ? 'سنكتشف المنصة تلقائيًا' : 'يدعم الروابط العامة من أشهر المنصات'}
    </div>
  </form>
}
