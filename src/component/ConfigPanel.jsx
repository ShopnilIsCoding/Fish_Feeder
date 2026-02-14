// src/components/ConfigPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { cls } from "../lib/format";

function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

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

  return (
    <div className="mt-4 lg:w-1/2 rounded-2xl bg-black ring-1 ring-white/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Device config</div>
          <div className="mt-1 text-xs text-slate-400">
            Set servo angles, feed time, and OLED power.
          </div>
        </div>

        <span
          className={cls(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 text-nowrap",
            connState !== "connected"
              ? "bg-amber-500/10 ring-amber-400/30 text-amber-200"
              : "bg-emerald-500/10 ring-emerald-400/30 text-emerald-200"
          )}
        >
          {connState !== "connected" ? "DB only" : "DB + Device"}
        </span>
      </div>

      {/* Idle angle */}
      <div className="mt-4">
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
          className="mt-2 w-full cursor-pointer"
        />
      </div>

      {/* Feed angle */}
      <div className="mt-4">
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
          className="mt-2 w-full cursor-pointer"
        />
      </div>

      {/* Feed ms */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Feeding time (ms)</span>
          <span className="font-mono text-slate-200">{feedMs} ms</span>
        </div>
        <input
          type="number"
          min={50}
          max={10000}
          value={feedMs}
          onChange={(e) => setFeedMs(e.target.value)}
          className="mt-2 w-full rounded-xl bg-slate-950/60 px-3 py-2 text-sm ring-1 ring-white/10 outline-none"
        />
      </div>

      {/* OLED toggle */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950/40 ring-1 ring-white/10 px-3 py-2">
        <div>
          <div className="text-sm font-semibold">OLED</div>
          <div className="text-xs text-slate-400">Turn display on/off</div>
        </div>
        <button
          type="button"
          onClick={() => setOledOn((v) => !v)}
          className={cls(
            "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 cursor-pointer",
            oledOn
              ? "bg-emerald-500/10 ring-emerald-400/30 text-emerald-200"
              : "bg-rose-500/10 ring-rose-400/30 text-rose-200"
          )}
        >
          {oledOn ? "ON" : "OFF"}
        </button>
      </div>

      <button
        onClick={submit}
        className={cls(
          "mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold cursor-pointer",
          "bg-gradient-to-r from-indigo-600 to-fuchsia-500 text-slate-950",
          "hover:opacity-95 active:translate-y-px transition"
        )}
      >
        Save config
      </button>

      
    </div>
  );
}
