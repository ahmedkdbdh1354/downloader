import { CheckCircle2, ChevronDown, Clock3, Download, Film, LoaderCircle, MonitorSmartphone, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatBytes, formatTime } from '../lib'

export default function MediaCard({ media, onDownload, downloading, downloadProgress }) {
  const [selectedId, setSelectedId] = useState(media.formats[0]?.id ?? '')
  useEffect(() => setSelectedId(media.formats[0]?.id ?? ''), [media])
  const selectedFormat = media.formats.find((format) => format.id === selectedId) ?? media.formats[0]
  const activeFormat = media.formats.find((format) => format.id === downloading)
  return <section className="animate-rise-in mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border border-white/[.09] bg-[#11182d]/90 shadow-2xl shadow-black/20">
    <div className="border-b border-white/[.07] px-5 py-4 sm:px-6">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300"><CheckCircle2 size={18} /> تم تحليل الوسائط بنجاح <span className="mr-auto rounded-full bg-white/[.06] px-2.5 py-1 text-xs text-slate-300">{media.platform}</span></div>
    </div>
    <div className="grid gap-5 p-5 sm:grid-cols-[190px_1fr] sm:p-6">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-800">
        {media.thumbnail ? <img src={media.thumbnail} className="h-full w-full object-cover" alt="" /> : <div className="grid h-full place-items-center"><Film className="text-slate-600" size={34} /></div>}
        {media.duration && <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium">{formatTime(media.duration)}</span>}
      </div>
      <div className="min-w-0">
        <h2 className="line-clamp-2 text-lg font-bold leading-7 text-white">{media.title}</h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          {media.uploader && <span className="flex items-center gap-1"><UserRound size={14} /> {media.uploader}</span>}
          <span className="flex items-center gap-1"><MonitorSmartphone size={14} /> MP4 متوافق مع الهاتف والكمبيوتر</span>
        </div>
        <div className="mt-5 rounded-xl border border-white/[.08] bg-white/[.025] p-3">
          <label htmlFor="quality" className="mb-2 block text-xs font-medium text-slate-300">اختر الجودة</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <select id="quality" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={!!downloading} className="h-11 w-full appearance-none rounded-lg border border-white/[.08] bg-[#0b1020] px-10 text-sm font-medium text-slate-100 outline-none transition focus:border-cyan-300/50 disabled:opacity-60">
                {media.formats.map((format) => <option key={format.id} value={format.id}>{format.label}{format.filesize ? ` — ${formatBytes(format.filesize)}` : ''}</option>)}
              </select>
              <ChevronDown size={17} className="pointer-events-none absolute left-3 top-3 text-slate-500" />
            </div>
            <button onClick={() => selectedFormat && onDownload(selectedFormat)} disabled={!selectedFormat || !!downloading} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">
              {downloading ? <LoaderCircle size={17} className="animate-spin" /> : <Download size={17} />} تنزيل MP4
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><CheckCircle2 size={13} className="text-emerald-400" /> فيديو وصوت في ملف واحد.</p>
        </div>
        {downloading && <div className="animate-rise-in mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] px-3.5 py-3">
          <div className="mb-2.5 flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 font-medium text-cyan-100"><LoaderCircle size={15} className="animate-spin text-cyan-300" /> جارٍ تجهيز التنزيل…</span>
            <span className="shrink-0 text-slate-500">{downloadProgress === null ? activeFormat?.label : `${downloadProgress}%`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-900/70"><div className={`h-full rounded-full bg-gradient-to-l from-cyan-300 to-indigo-400 transition-[width] duration-300 ${downloadProgress === null ? 'loading-bar w-2/5' : ''}`} style={downloadProgress === null ? undefined : { width: `${Math.max(downloadProgress, 4)}%` }} /></div>
        </div>}
      </div>
    </div>
  </section>
}
