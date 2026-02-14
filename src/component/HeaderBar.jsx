// src/components/HeaderBar.jsx
import { cls } from "../lib/format";

function fmt(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

function rssiLabel(rssi) {
  if (typeof rssi !== "number") return "—";
  if (rssi >= -55) return "Excellent";
  if (rssi >= -65) return "Good";
  if (rssi >= -75) return "Fair";
  return "Weak";
}

function agoLabel(d) {
  if (!d) return "—";
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec<5) return "Just now"
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function HeaderBar({
  deviceId,
  topicCmd,
  topicEvt,
  connState,
  connError,
  connBadge,
  deviceBadge,

  onToggleEmailNotify,
  emailNotify,

  lastSeen,
  lastFeed,
  lastRssi,
  deviceOnline,
}) {
  return (
    <div
      className="
        rounded-3xl
        bg-white/[0.05]
        backdrop-blur-xl
        ring-1 ring-white/10
        shadow-2xl shadow-black/30
        px-4 py-4
        sm:px-5 sm:py-5
      "
    >
      {/* ===== TOP ROW: Title + Badges ===== */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        {/* Title + small meta */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
              Fish Feeder
            </h1>

            <span
              className={cls(
                "text-[11px] px-2 py-0.5 rounded-full ring-1 shrink-0",
                deviceOnline
                  ? "bg-emerald-500/10 text-emerald-200 ring-emerald-400/20"
                  : "bg-rose-500/10 text-rose-200 ring-rose-400/20"
              )}
            >
              {deviceOnline ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          <div className="mt-1 text-sm text-slate-400">
            Device{" "}
            <span className="font-medium text-slate-200 break-all">
              {deviceId}
            </span>
          </div>

          <div className="mt-1 text-xs text-slate-400">
            Server:{" "}
            <span className="font-mono text-slate-200">{connState}</span>
            {connError ? (
              <span className="ml-2 text-rose-300 break-words">{connError}</span>
            ) : null}
          </div>

          {/* Topics: show on md+ to avoid clutter */}
        
        </div>

        {/* Badges cluster */}
        <div className="flex flex-wrap gap-2 md:justify-end">
          <div
            className={cls(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1",
              connBadge.bg,
              connBadge.ring
            )}
          >
            <span className={cls("h-2 w-2 rounded-full animate-pulse", connBadge.dot)} />
            <span className="font-medium">{connBadge.text}</span>
          </div>

          <div
            className={cls(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1",
              deviceBadge.bg,
              deviceBadge.ring
            )}
          >
            <span className={cls("h-2 w-2 rounded-full animate-pulse", deviceBadge.dot)} />
            <span className="font-medium">Device {deviceBadge.text}</span>
          </div>

          <div
            className={cls(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1",
              deviceOnline
                ? "bg-emerald-500/10 text-emerald-200 ring-emerald-400/20"
                : "bg-rose-500/10 text-rose-200 ring-rose-400/20"
            )}
          >
            <span className="font-medium">
              {deviceOnline ? "Realtime connected" : "Waiting for Response"}
            </span>
          </div>
        </div>
              <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 px-3 py-3">
          <label className="flex items-center justify-between gap-4 w-full cursor-pointer group">
           <div className="flex flex-col leading-tight">
  <span className="text-sm font-semibold text-slate-200">
    Email Alerts
  </span>

  <span className="text-xs text-slate-400">
    Notifications are sent for:
  </span>

  <div className="text-[11px] text-slate-500 mt-1 space-x-2">
    <span>• Device Online</span>
    <span>• Device Offline</span>
    <span>• Feeding Completed</span>
  </div>
</div>


            <div className="relative shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!!emailNotify}
                onChange={(e) => onToggleEmailNotify(e.target.checked)}
              />

              <div
                className="
                  w-12 h-6 rounded-full
                  bg-slate-700/80
                  ring-1 ring-white/10
                  transition-all duration-300
                  peer-checked:bg-emerald-500/80
                  peer-checked:shadow-lg
                  peer-checked:shadow-emerald-500/30
                  group-hover:ring-emerald-400/40
                "
              />

              <div
                className="
                  absolute top-0.5 left-0.5
                  h-5 w-5 rounded-full
                  bg-white shadow-md
                  transition-all duration-300 ease-out
                  peer-checked:translate-x-6
                "
              />
            </div>
          </label>

          <div className="mt-2 text-[11px] text-slate-500">
            {emailNotify
              ? "Alerts will be sent for offline/online/feed."
              : "No emails will be sent."}
          </div>
        </div>
      </div>

      {/* divider */}
      <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* ===== BOTTOM ROW: Metrics + Toggle ===== */}
      <div className="">
        {/* metrics */}
        <div className="grid lg:grid-cols-4 grid-cols-2 lg:gap-4 gap-2 font-mono">
          <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 px-3 py-2 ">
            <div className="text-[11px] text-slate-400">Seen</div>
            <div className="text-slate-200 font-medium truncate">
              {agoLabel(lastSeen)}
            </div>
            <div className="text-[11px] text-slate-500 truncate">{fmt(lastSeen)}</div>
          </div>

          <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 px-3 py-2 ">
            <div className="text-[11px] text-slate-400">Fed</div>
            <div className="text-slate-200 font-medium truncate">
              {agoLabel(lastFeed)}
            </div>
            <div className="text-[11px] text-slate-500 truncate">{fmt(lastFeed)}</div>
          </div>

          <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 px-3 py-2 ">
            <div className="text-[11px] text-slate-400">RSSI</div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-200 font-medium">
                {typeof lastRssi === "number" ? `${lastRssi} dBm` : "—"}
              </span>
              <span className="text-xs text-slate-400">{rssiLabel(lastRssi)}</span>
            </div>
            <div className="text-[11px] text-slate-500">Signal quality</div>
          </div>

          <div className="rounded-2xl bg-black/20 ring-1 ring-white/10 px-3 py-2 ">
            <div className="text-[11px] text-slate-400">Email alerts</div>
            <div
              className={cls(
                "font-medium",
                emailNotify ? "text-emerald-300" : "text-slate-300"
              )}
            >
              {emailNotify ? "Enabled" : "Disabled"}
            </div>
            <div className="text-[11px] text-slate-500">Keep enabled to get notified.</div>
          </div>
        </div>

        {/* toggle card */}
  
      </div>

      {/* error box */}
      {connError ? (
        <div className="mt-4 rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/20 px-3 py-2 text-xs text-rose-200">
          {connError}
        </div>
      ) : null}
    </div>
  );
}
