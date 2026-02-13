// src/component/ConfigPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { cls } from "../lib/format";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function ConfigPanel({
  connState,
  onSaveConfig,
  initialConfig, // optional (later: from get_state)
}) {
  const defaults = useMemo(
    () => ({
      idle_angle: 0,
      feed_angle: 150,
      feed_ms: 500,
      oled: 1,
    }),
    []
  );

  const [idleAngle, setIdleAngle] = useState(defaults.idle_angle);
  const [feedAngle, setFeedAngle] = useState(defaults.feed_angle);
  const [feedMs, setFeedMs] = useState(defaults.feed_ms);
  const [oled, setOled] = useState(!!defaults.oled);

 
  useEffect(() => {
    if (!initialConfig) return;
    if (typeof initialConfig.idle_angle === "number") setIdleAngle(initialConfig.idle_angle);
    if (typeof initialConfig.feed_angle === "number") setFeedAngle(initialConfig.feed_angle);
    if (typeof initialConfig.feed_ms === "number") setFeedMs(initialConfig.feed_ms);
    if (typeof initialConfig.oled === "number") setOled(initialConfig.oled !== 0);
    if (typeof initialConfig.oled === "boolean") setOled(initialConfig.oled);
  }, [initialConfig]);

  const disabled = connState !== "connected";

  function submit() {
    if (disabled) {
      toast.error("Not connected");
      return;
    }

    const payload = {
      idle_angle: clamp(Number(idleAngle), 0, 180),
      feed_angle: clamp(Number(feedAngle), 0, 180),
      feed_ms: clamp(Number(feedMs), 50, 10000),
      oled: oled ? 1 : 0,
    };

    onSaveConfig?.(payload);
  }

  return (
    <div className="mt-4 rounded-2xl bg-black ring-1 ring-white/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Device config</div>
          <div className="mt-1 text-xs text-slate-400">
            Set servo angles, feed time, and OLED power.
          </div>
        </div>

        <span
          className={cls(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1",
            disabled
              ? "bg-rose-500/10 ring-rose-400/30 text-rose-200"
              : "bg-emerald-500/10 ring-emerald-400/30 text-emerald-200"
          )}
        >
          {disabled ? "Locked" : "Ready"}
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
          disabled={disabled}
          className="mt-2 w-full"
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
          disabled={disabled}
          className="mt-2 w-full"
        />
      </div>

      {/* Feed ms */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Feed time (ms)</span>
          <span className="font-mono text-slate-200">{feedMs} ms</span>
        </div>
        <input
          type="number"
          min={50}
          max={10000}
          value={feedMs}
          onChange={(e) => setFeedMs(e.target.value)}
          disabled={disabled}
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
          onClick={() => setOled((v) => !v)}
          disabled={disabled}
          className={cls(
            "rounded-full px-3 py-1.5 text-xs font-semibold ring-1",
            oled
              ? "bg-emerald-500/10 ring-emerald-400/30 text-emerald-200"
              : "bg-rose-500/10 ring-rose-400/30 text-rose-200",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {oled ? "ON" : "OFF"}
        </button>
      </div>

      <button
        onClick={submit}
        disabled={disabled}
        className={cls(
          "mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold",
          "bg-gradient-to-r from-indigo-600 to-fuchsia-500 text-slate-950",
          "hover:opacity-95 active:translate-y-px transition",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        Save config
      </button>
    </div>
  );
}
