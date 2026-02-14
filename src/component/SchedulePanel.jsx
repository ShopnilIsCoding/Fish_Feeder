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

// ---- button styles (consistent + clean) ----
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold " +
  "ring-1 ring-white/10 transition " +
  "active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0";

const btnPrimary =
  btnBase +
  " bg-indigo-500/90 text-white shadow-lg shadow-indigo-500/15 " +
  "hover:bg-indigo-400";

const btnSecondary =
  btnBase +
  " bg-white/5 text-slate-200 hover:bg-white/10";

const btnDanger =
  btnBase +
  " bg-rose-500/85 text-rose-100 ring-rose-500/20 hover:bg-rose-600";

export default function SchedulePanel({
  connState,
  scheduleTimes,
  setScheduleTimes,
  onSaveSchedule,
  onClearSchedule,
}) {
  const [timeDraft, setTimeDraft] = useState("08:00");
  const timeInputRef = useRef(null);

  const disabled = connState !== "connected";

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
    <div className="mt-4 lg:w-1/2 rounded-2xl flex flex-col h-fit bg-slate-900/30 backdrop-blur-xl ring-1 ring-white/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">Schedule</div>
          <div className="mt-1 text-xs text-slate-400">
            Add one or more feed times (HH:MM)
          </div>
        </div>

        <button
          type="button"
          onClick={onClearSchedule}
          disabled={disabled || scheduleTimes.length === 0}
          className={btnDanger}
          title="Clear all scheduled times"
        >
          Clear
        </button>
      </div>

      {/* time picker row */}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-black/20 ring-1 ring-white/10 p-2">
        <input
          ref={timeInputRef}
          type="time"
          value={timeDraft}
          onChange={(e) => setTimeDraft(e.target.value)}
          className="
            w-36 rounded-lg bg-slate-950/60
            font-mono px-3 py-2 h-full text-sm text-slate-100
            outline-none ring-1 ring-white/10
            focus:ring-2 focus:ring-indigo-400/30
          "
        />

        <button
          type="button"
          onClick={() =>
            timeInputRef.current?.showPicker?.() || timeInputRef.current?.click?.()
          }
          disabled={disabled}
          className={btnSecondary + " px-3 py-2"}
          title="Pick time"
        >
          ⏰ Pick
        </button>

        <button
          type="button"
          onClick={addTime}
          disabled={disabled}
          className={btnPrimary + " ml-auto px-4 py-2"}
        >
          + Add
        </button>
      </div>

      {/* chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        {scheduleTimes.length === 0 ? (
          <div className="text-xs text-slate-500">No times added.</div>
        ) : (
          scheduleTimes.map((t) => (
            <div
              key={t}
              className="
                inline-flex items-center gap-2
                rounded-full bg-black/20 ring-1 ring-white/10
                px-3 py-1.5 text-sm
              "
            >
              <span className="font-mono text-slate-200">{t}</span>
              <button
                type="button"
                onClick={() => removeTime(t)}
                className="
                  h-6 w-6 grid place-items-center
                  rounded-full bg-white/5 hover:bg-white/10
                  ring-1 ring-white/10 transition
                "
                title="Remove"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* save */}
      <button
        onClick={onSaveSchedule}
        disabled={disabled || scheduleTimes.length === 0}
        className={cls(
          btnPrimary,
          "mt-4 w-full py-3",
          (disabled || scheduleTimes.length === 0) && "shadow-none"
        )}
      >
        Save schedule
      </button>
    </div>
  );
}
