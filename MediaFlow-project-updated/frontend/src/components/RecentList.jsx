import { Clock3, Download, Inbox, Trash2 } from 'lucide-react'
import { relativeDate } from '../lib'

export default function RecentList({ items, onClear }) {
  const safeItems = Array.isArray(items) ? items : []

  return <section className="mx-auto mt-20 max-w-5xl">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-semibold text-white">آخر التنزيلات</p><p className="mt-1 text-xs text-slate-500">خاصة بهذا المتصفح والجهاز ولا تُحفظ على الخادم</p></div>{safeItems.length ? <button type="button" onClick={onClear} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-slate-500 transition hover:bg-white/[.05] hover:text-rose-300"><Trash2 size={15} /> مسح السجل</button> : <Clock3 className="text-slate-500" size={20} />}</div>
    <div className="overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.025]">
      {safeItems.length ? safeItems.map((item, index) => <div key={item.id} className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${index ? 'border-t border-white/[.06]' : ''}`}>
        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-800">{item.thumbnail && <img src={item.thumbnail} className="h-full w-full object-cover" alt="" />}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-200">{item.title}</p><p className="mt-0.5 text-xs text-slate-500">{item.platform} · {item.format_label}</p></div>
        <span className="hidden text-xs text-slate-500 sm:block">{relativeDate(item.created_at)}</span>
        <Download size={17} className="text-slate-600" />
      </div>) : <div className="flex flex-col items-center px-5 py-11 text-center"><Inbox size={28} className="mb-3 text-slate-600" /><p className="text-sm text-slate-400">لا توجد تنزيلات بعد</p><p className="mt-1 text-xs text-slate-600">ستظهر تنزيلات هذا المتصفح هنا فقط.</p></div>}
    </div>
  </section>
}
