// src/components/SchedulePanel.jsx
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { cls } from "../lib/format";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function normalizeTime(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function sortTimes(list) {
  return [...list].sort((a, b) => a.localeCompare(b));
}

export function timesToCsv(list) {
  return sortTimes(list).join(",");
}

export default function SchedulePanel({
  connState,
  scheduleTimes,
  setScheduleTimes,
  onSaveSchedule,
  onClearSchedule,
}) {
  const [timeDraft, setTimeDraft] = useState("08:00");
  const timeInputRef = useRef(null);

  function addTime() {
    const t = normalizeTime(timeDraft);
    if (!t) {
      toast.error("Pick a valid time");
      return;
    }
    setScheduleTimes((prev) => {
      if (prev.includes(t)) {
        toast.info("Already added");
        return prev;
      }
      return sortTimes([...prev, t]);
    });
  }

  function removeTime(t) {
    setScheduleTimes((prev) => prev.filter((x) => x !== t));
  }

  return (
    <div className="mt-5 rounded-2xl bg-black ring-1 ring-white/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Schedule</div>
          <div className="mt-1 text-xs text-slate-400">
            Add one or more feed times (HH:MM)
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 ring-1 ring-white/10 rounded-xl ">
        <input
          ref={timeInputRef}
          type="time"
          value={timeDraft}
          onChange={(e) => setTimeDraft(e.target.value)}
          className="w-36 rounded-xl bg-slate-950/60  px-3 py-2 text-sm outline-none focus:ring-sky-400/30"
        />

        <button
          type="button"
          onClick={() =>
            timeInputRef.current?.showPicker?.() || timeInputRef.current?.click?.()
          }
          disabled={connState !== "connected"}
          className={cls(
            "rounded-xl px-2 w-42 py-4  text-sm font-semibold animate-pulse  ring-1 bg-gradient-to-r from-indigo-600 to-fuchsia-500 text-slate-950",
            "cursor-pointer hover:opacity-95 active:translate-y-px transition hover:animate-none hover:bg-gradient-to-r hover:from-sky-500 hover:to-emerald-500 text-slate-950",
            connState !== "connected" && "opacity-50 cursor-not-allowed"
          )}
          title="Pick time"
        >
          ⏰ Add time
        </button>
      </div>

      <div className="flex gap-2 justify-center mt-2">
        <button
          type="button"
          onClick={addTime}
          disabled={connState !== "connected"}
          className={cls(
            "rounded-xl px-3 py-2 text-sm font-semibold w-1/2",
            "bg-sky-500/90 text-slate-950 hover:opacity-95",
            connState !== "connected" && "opacity-50 cursor-not-allowed"
          )}
        >
          Add
        </button>

        <button
          type="button"
          onClick={onClearSchedule}
          disabled={connState !== "connected"}
          className={cls(
            "ml-auto rounded-xl px-3 py-2 text-sm font-semibold w-1/2",
            "bg-rose-500/90 text-slate-950 hover:opacity-95",
            connState !== "connected" && "opacity-50 cursor-not-allowed"
          )}
        >
          Clear all
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {scheduleTimes.length === 0 ? (
          <div className="text-xs text-slate-500">No times added.</div>
        ) : (
          scheduleTimes.map((t) => (
            <div
              key={t}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950/60 ring-1 ring-white/10 px-3 py-1.5 text-sm"
            >
              <span className="font-mono text-slate-200">{t}</span>
              <button
                type="button"
                onClick={() => removeTime(t)}
                className="h-6 w-6 rounded-full grid place-items-center bg-white/5 hover:bg-white/10"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onSaveSchedule}
        disabled={connState !== "connected" || scheduleTimes.length === 0}
        className={cls(
          "mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold",
          "bg-gradient-to-r from-indigo-600 to-fuchsia-500 text-slate-950",
          "hover:opacity-95 active:translate-y-px transition",
          (connState !== "connected" || scheduleTimes.length === 0) &&
            "opacity-50 cursor-not-allowed"
        )}
      >
        Save schedule
      </button>
    </div>
  );
}
