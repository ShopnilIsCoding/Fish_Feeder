// src/components/EventsPanel.jsx
export default function EventsPanel({ events, topicEvt, onClear }) {
  return (
    <div className="rounded-2xl bg-slate-900/40 ring-1 ring-white/10 p-5 lg:col-span-1">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Live events</h2>
        <button
          onClick={onClear}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10 bg-slate-950/30 hover:bg-slate-950/50"
        >
          Clear
        </button>
      </div>

      <div className="mt-3 lg:h-[500px] h-fit overflow-auto rounded-xl bg-slate-950/40 ring-1 ring-white/10">
        {events.length === 0 ? (
          <div className="p-4 text-sm text-slate-400">No events yet.</div>
        ) : (
          <ul className="divide-y divide-white/5 ">
            {events.map((e) => (
              <li key={e.id} className="p-3 flex gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{e.t}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    {e.label}
                  </span>
                </div>
                {/* {e.detail ? (
                  <div className=" text-sm text-slate-200 break-words">
                    {e.detail}
                  </div> )
                   : null} */}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* <div className="mt-3 text-xs text-slate-500">
        Listening on <span className="font-mono text-slate-300">{topicEvt}</span>
      </div> */}
    </div>
  );
}
