import { Link, NavLink, useLocation } from 'react-router-dom'
import { Code2, Menu, X } from 'lucide-react'
import { useState } from 'react'
import Brand from './Brand'

const links = [
  { to: '/', label: 'الرئيسية' },
]

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const close = () => setOpen(false)
  return <div className="min-h-screen overflow-hidden bg-[#090d1a] text-slate-100">
    <div className="pointer-events-none fixed inset-0 grid-bg opacity-30" />
    <header className="relative z-20 border-b border-white/[.07] bg-[#090d1a]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/" onClick={close}><Brand /></Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) =>
            `rounded-lg px-4 py-2 text-sm font-medium transition ${isActive ? 'bg-white/[.08] text-white' : 'text-slate-400 hover:text-white'}`}>{link.label}</NavLink>)}
        </nav>
        <a href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noreferrer" className="hidden items-center gap-2 text-sm text-slate-400 transition hover:text-white md:flex"><Code2 size={17} /> المصدر المفتوح</a>
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-slate-300 md:hidden" aria-label="القائمة">{open ? <X /> : <Menu />}</button>
      </div>
      {open && <nav className="border-t border-white/[.06] bg-[#0c1121] px-5 pb-4 pt-2 md:hidden">
        {links.map((link) => <NavLink onClick={close} key={link.to} to={link.to} className={({ isActive }) => `block rounded-lg px-3 py-3 text-sm ${isActive ? 'bg-white/[.08] text-white' : 'text-slate-400'}`}>{link.label}</NavLink>)}
      </nav>}
    </header>
    <main className="relative z-10">{children}</main>
    <footer className="relative z-10 border-t border-white/[.07] px-5 py-7 text-center text-xs text-slate-500">
      MediaFlow · استخدمه للوسائط التي تملكها أو لديك إذن بتنزيلها.
    </footer>
  </div>
}
