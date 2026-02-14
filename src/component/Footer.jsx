// src/components/Footer.jsx
export default function Footer() {
  return (
    <footer className="mt-10">
      <div className="mx-auto max-w-6xl px-4 pb-8">
        <div
          className="
            rounded-2xl
            bg-white/[0.04]
            backdrop-blur-md
            ring-1 ring-white/10
            shadow-lg shadow-black/20
            overflow-hidden
          "
        >
          {/* top glow line */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            {/* left */}
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-200">
                Fish Feeder Dashboard
              </span>
              <span className="text-xs text-slate-400">
                Real-time control • Scheduling • Alerts
              </span>
            </div>

            {/* right */}
            <a
              href="https://shopnil.netlify.app"
              target="_blank"
              rel="noreferrer"
              className="
                group
                inline-flex items-center justify-center gap-2
                rounded-xl px-4 py-2
                text-sm font-semibold
                text-slate-950
                bg-gradient-to-r from-indigo-600 to-fuchsia-500
                shadow-lg shadow-emerald-500/10
                ring-1 ring-white/10
                transition
                hover:opacity-95
                active:translate-y-px
              "
              title="Open developer website"
            >
              <span className="opacity-95">Developed by</span>
              <span className="font-extrabold tracking-tight">
                Rahomotul Islam
              </span>

              {/* tiny arrow */}
              <span
                className="
                  ml-1 inline-flex h-6 w-6 items-center justify-center
                  rounded-full bg-white/25
                  transition
                  group-hover:translate-x-0.5
                "
                aria-hidden="true"
              >
                ↗
              </span>
            </a>
          </div>

          {/* bottom soft strip */}
          <div className="px-4 pb-4">
            <div className="h-px w-full bg-white/5" />
            <div className="mt-3 flex flex-col gap-2 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()} Fish Feeder</span>
              <span className="text-slate-400">
                Tip: turn on Email Notifications to receive alerts on{" "}
                <span className="text-slate-300">Feeding</span>,{" "}
                <span className="text-slate-300">Device Online</span>, and{" "}
                <span className="text-slate-300">Device Offline</span>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
