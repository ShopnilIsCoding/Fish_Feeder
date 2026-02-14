// src/components/ConfigPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { cls } from "../lib/format";

function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

// ---- button styles (same as SchedulePanel) ----
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold " +
  "ring-1 ring-white/10 transition " +
  "active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0";

const btnPrimary =
  btnBase +
  " bg-indigo-500/90 text-white shadow-lg shadow-indigo-500/15 hover:bg-indigo-400";

const btnSecondary =
  btnBase + " bg-white/5 text-slate-200 hover:bg-white/10";

const pillBase =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1";

export default function ConfigPanel({
  connState,
  onSaveConfig,
  initialConfig, // from DB: { idleAngle, feedAngle, feedMs, oledOn }
}) {
  const defaults = useMemo(
    () => ({
      idleAngle: 0,
      feedAngle: 150,
      feedMs: 500,
      oledOn: true,
    }),
    []
  );

  const [idleAngle, setIdleAngle] = useState(defaults.idleAngle);
  const [feedAngle, setFeedAngle] = useState(defaults.feedAngle);
  const [feedMs, setFeedMs] = useState(defaults.feedMs);
  const [oledOn, setOledOn] = useState(defaults.oledOn);

  // hydrate from DB config after reload
  useEffect(() => {
    if (!initialConfig) return;

    if (typeof initialConfig.idleAngle === "number") setIdleAngle(initialConfig.idleAngle);
    if (typeof initialConfig.feedAngle === "number") setFeedAngle(initialConfig.feedAngle);
    if (typeof initialConfig.feedMs === "number") setFeedMs(initialConfig.feedMs);
    if (typeof initialConfig.oledOn === "boolean") setOledOn(initialConfig.oledOn);
  }, [initialConfig]);

  // DB save should NOT be blocked when device is offline
  function submit() {
    const dbPayload = {
      idleAngle: clamp(idleAngle, 0, 180),
      feedAngle: clamp(feedAngle, 0, 180),
      feedMs: clamp(feedMs, 50, 10000),
      oledOn: !!oledOn,
    };

    onSaveConfig?.(dbPayload);

    if (connState !== "connected") {
      toast.info("Saved in database. Device offline, will sync later.");
    }
  }

  const isConnected = connState === "connected";

  return (
    <div className="mt-4 lg:w-1/2 rounded-2xl bg-slate-900/30 backdrop-blur-xl ring-1 ring-white/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">Device config</div>
          <div className="mt-1 text-xs text-slate-400">
            Servo angles, feed time, and OLED power.
          </div>
        </div>

        <span
          className={cls(
            pillBase,
            isConnected
              ? "bg-emerald-500/10 ring-emerald-400/30 text-emerald-200 text-nowrap"
              : "bg-amber-500/10 ring-amber-400/30 text-amber-200 text-nowrap"
          )}
        >
          {isConnected ? "DB + Device" : "DB only"}
        </span>
      </div>

      {/* Idle angle */}
      <div className="mt-4 rounded-xl bg-black/20 ring-1 ring-white/10 p-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Idle angle</span>
          <span className="font-mono text-slate-200">{idleAngle}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={180}
          value={idleAngle}
          onChange={(e) => setIdleAngle(Number(e.target.value))}
          className="
            mt-3 w-full cursor-pointer
            accent-indigo-400
          "
        />
      </div>

      {/* Feed angle */}
      <div className="mt-3 rounded-xl bg-black/20 ring-1 ring-white/10 p-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Feed angle</span>
          <span className="font-mono text-slate-200">{feedAngle}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={180}
          value={feedAngle}
          onChange={(e) => setFeedAngle(Number(e.target.value))}
          className="
            mt-3 w-full cursor-pointer
            accent-indigo-400
          "
        />
      </div>

      {/* Feed ms */}
      <div className="mt-3 rounded-xl bg-black/20 ring-1 ring-white/10 p-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Feeding time</span>
          <span className="font-mono text-slate-200">{feedMs} ms</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={50}
            max={10000}
            value={feedMs}
            onChange={(e) => setFeedMs(e.target.value)}
            className="
              w-full font-mono rounded-lg
              bg-slate-950/60 px-3 py-2 text-sm text-slate-100
              ring-1 ring-white/10 outline-none
              focus:ring-2 focus:ring-indigo-400/30
            "
          />

          <button
            type="button"
            onClick={() => setFeedMs(500)}
            className={btnSecondary + " whitespace-nowrap"}
            title="Reset to default (500ms)"
          >
            Reset
          </button>
        </div>
      </div>

      {/* OLED toggle */}
      <div className="mt-3 flex items-center justify-between rounded-xl bg-black/20 ring-1 ring-white/10 px-3 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">OLED</div>
          <div className="text-xs text-slate-400">
            Turn the display on or off
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOledOn((v) => !v)}
          className={cls(
            btnBase,
            "rounded-full px-4 py-2 text-xs",
            oledOn
              ? "bg-emerald-500/10 text-emerald-100 ring-emerald-500/25 hover:bg-emerald-500/15"
              : "bg-rose-500/10 text-rose-100 ring-rose-500/25 hover:bg-rose-500/15"
          )}
        >
          {oledOn ? "ON" : "OFF"}
        </button>
      </div>

      {/* actions */}
      <div className="mt-4 flex gap-2">
        <button onClick={submit} className={btnPrimary + " w-full py-3"}>
          Save config
        </button>
      </div>
    </div>
  );
}
