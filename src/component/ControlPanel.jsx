// src/components/ControlPanel.jsx
import { cls } from "../lib/format"; 
import SchedulePanel from "./SchedulePanel";
import ConfigPanel from "./ConfigPanel";
import Button from "./Button";

export default function ControlPanel({
  status,
  sending,
  connState,
  onFeedNow,

  scheduleTimes,
  setScheduleTimes,
  onSaveSchedule,
  onClearSchedule,

  onSaveConfig,
  initialConfig,
}) {
  const canSend = connState === "connected" && !sending;

  return (
    <div className="rounded-2xl lg:col-span-2 bg-slate-950/30 ring-1 ring-white/10 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Control</h2>
          <p className="mt-1 text-sm text-slate-400">
            Feed now, update schedule, or change device settings.
          </p>
        </div>

        <div className="text-xs text-slate-400">
          Status{" "}
          <span
            className={cls(
              "ml-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 ring-1",
              status === "FEEDING"
                ? "bg-amber-500/10 ring-amber-400/25 text-amber-200"
                : "bg-emerald-500/10 ring-emerald-400/25 text-emerald-200"
            )}
          >
            <span
              className={cls(
                "h-1.5 w-1.5 rounded-full",
                status === "FEEDING" ? "bg-amber-300" : "bg-emerald-300"
              )}
            />
            {status}
            {status === "FEEDING" ? (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-amber-200/40 border-t-amber-200" />
            ) : null}
          </span>
        </div>
      </div>

      {/* Feed Now hero */}
      <div className="mt-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-200">Manual feed</div>
            <div className="text-xs text-slate-400">
              Sends a command to the feeder right now.
            </div>
          </div>

          <Button
            onClick={onFeedNow}
            disabled={!canSend}
            className="w-full sm:w-auto min-w-[160px]"
          >
            {sending ? "Sending..." : "Feed now"}
          </Button>
        </div>

        {!canSend ? (
          <div className="mt-3 text-xs text-slate-400">
            {connState !== "connected"
              ? "Connect to server and make sure the device is online to send commands."
              : "Sending command…"}
          </div>
        ) : null}
      </div>

      {/* Panels */}
      <div className="mt-4 flex flex-col lg:flex-row gap-3">
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
      </div>
    </div>
  );
}
