export default function Brand({ compact = false }) {
  return <div className="flex items-center gap-2.5 select-none">
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-glow">
      <span className="text-xl font-bold leading-none text-white">M</span>
    </div>
    {!compact && <span className="text-xl font-bold tracking-tight text-slate-100">Media<span className="text-cyan-300">Flow</span></span>}
  </div>
}

