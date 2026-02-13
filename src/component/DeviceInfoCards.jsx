// src/components/DeviceInfoCards.jsx
import { tsLabel, tsLabeltrimmed } from "../lib/format";

export default function DeviceInfoCards({ lastSeen, lastEvent, lastFeed, lastRssi }) {
    if (lastEvent=='hb')
    {
        lastEvent='online'
    }
    
  return (
    <div className="mt-4 grid gap-2 text-sm">
      <div className="flex items-center justify-between rounded-xl bg-slate-950/40 ring-1 ring-white/10 px-3 py-2">
        <span className="text-slate-400">Last seen</span>
        <span className="font-medium text-slate-200">{tsLabeltrimmed(lastSeen)}</span>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-slate-950/40 ring-1 ring-white/10 px-3 py-2">
        <span className="text-slate-400">Last event</span>
        <span className="font-medium text-slate-200">{lastEvent}</span>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-slate-950/40 ring-1 ring-white/10 px-3 py-2">
        <span className="text-slate-400">Last feed</span>
        <span className="font-medium text-slate-200">{tsLabel(lastFeed)}</span>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-slate-950/40 ring-1 ring-white/10 px-3 py-2">
        <span className="text-slate-400">RSSI</span>
        <span className="font-medium text-slate-200">
          {typeof lastRssi === "number" ? `${lastRssi} dBm` : "—"}
        </span>
      </div>
    </div>
  );
}
