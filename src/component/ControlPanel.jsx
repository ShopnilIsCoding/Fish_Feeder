// src/components/ControlPanel.jsx
import { cls } from "../lib/format";
import SchedulePanel from "./SchedulePanel";
import DeviceInfoCards from "./DeviceInfoCards";
import ConfigPanel from "./ConfigPanel";

export default function ControlPanel({
  status,
  sending,
  connState,
  onFeedNow,

  // schedule
  scheduleTimes,
  setScheduleTimes,
  onSaveSchedule,
  onClearSchedule,

  // config
  onSaveConfig,
  initialConfig,

  // device info
  lastSeen,
  lastEvent,
  lastFeed,
  lastRssi,
}) {
  return (
    <div className="rounded-2xl bg-slate-950/30 ring-1 ring-white/10 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Control</h2>
          <p className="mt-1 text-sm text-slate-400">
            Send <span className="font-mono">feed_now</span>, set schedule, or update device config.
          </p>
        </div>

        <div className="text-xs text-slate-400">
          Status:{" "}
          <span
            className={cls(
              "ml-1 inline-flex items-center gap-2 rounded-full px-2 py-0.5 ring-1",
              status === "FEEDING"
                ? "bg-amber-500/10 ring-amber-400/30 text-amber-200"
                : "bg-emerald-500/10 ring-emerald-400/30 text-emerald-200"
            )}
          >
            {status}
            {status === "FEEDING" ? (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-amber-200/40 border-t-amber-200" />
            ) : null}
          </span>
        </div>
      </div>

      <button
        onClick={onFeedNow}
        disabled={sending || connState !== "connected"}
        className={cls(
          "mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold",
          "bg-gradient-to-r cursor-pointer from-indigo-600 to-fuchsia-500 text-slate-950",
          "hover:opacity-95 active:translate-y-px transition",
          (sending || connState !== "connected") && "opacity-50 cursor-not-allowed"
        )}
      >
        {sending ? "Sending..." : "Feed now"}
      </button>

      <SchedulePanel
        connState={connState}
        scheduleTimes={scheduleTimes}
        setScheduleTimes={setScheduleTimes}
        onSaveSchedule={onSaveSchedule}
        onClearSchedule={onClearSchedule}
      />

      <ConfigPanel
        connState={connState}
        onSaveConfig={onSaveConfig}
        initialConfig={initialConfig}
      />

      <DeviceInfoCards
        lastSeen={lastSeen}
        lastEvent={lastEvent}
        lastFeed={lastFeed}
        lastRssi={lastRssi}
      />
    </div>
  );
}
