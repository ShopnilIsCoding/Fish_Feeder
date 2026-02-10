import { useEffect, useMemo, useRef, useState } from "react";
import { createAbly } from "./lib/ably";
import FloatingLines from "./component/FloatingLines";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function cls(...a) {
  return a.filter(Boolean).join(" ");
}

function shortTime(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function tsLabel(d) {
  if (!d) return "—";
  return d.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function decodeAblyData(data) {
  if (typeof data === "string") return data;

  try {
    const decoder = new TextDecoder();
    if (data instanceof ArrayBuffer) return decoder.decode(new Uint8Array(data));
    if (ArrayBuffer.isView(data)) return decoder.decode(data);
    return String(data);
  } catch {
    return String(data);
  }
}

export default function App() {

  // bg
  const waves = useMemo(() => ["bottom","top","middle"], []);
const lineCountMemo = useMemo(() => 12, []);
const lineDistanceMemo = useMemo(() => 40.5, []);


  const deviceId = import.meta.env.VITE_DEVICE_ID || "feeder01";
  const topicCmd = `${deviceId}/cmd`;
  const topicEvt = `${deviceId}/evt`;

  const ably = useMemo(() => createAbly(), []);
  const cmdCh = useRef(null);
  const evtCh = useRef(null);

  const [connState, setConnState] = useState("init");
  const [connError, setConnError] = useState("");

  const [status, setStatus] = useState("READY");
  const [sending, setSending] = useState(false);

  const [deviceOnline, setDeviceOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [lastEvent, setLastEvent] = useState("—");
  const [lastFeed, setLastFeed] = useState(null);
  const [lastRssi, setLastRssi] = useState(null);

  const [scheduleTimes, setScheduleTimes] = useState(["08:00", "20:00"]);
const [timeDraft, setTimeDraft] = useState("08:00");
const timeInputRef = useRef(null);


  const [events, setEvents] = useState([]);

  const feedTimeoutRef = useRef(null);
  const staleTimerRef = useRef(null);

  function pushEvent(label, detail = "") {
    setEvents((prev) => {
      const item = { id: crypto.randomUUID(), t: shortTime(new Date()), label, detail };
      return [item, ...prev].slice(0, 60);
    });
  }

  function markSeen(evtName) {
    const now = new Date();
    setLastSeen(now);
    setLastEvent(evtName);
    setDeviceOnline(true);

    // Offline if no events for 60s (good with 20s heartbeat)
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    staleTimerRef.current = setTimeout(() => {
      setDeviceOnline(false);
      pushEvent("offline", "No device events recently");
      toast.warn("Device offline");
    }, 3000);
  }

  function clearFeedTimeout() {
    if (feedTimeoutRef.current) {
      clearTimeout(feedTimeoutRef.current);
      feedTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    const onConn = (stateChange) => {
      setConnState(stateChange.current);

      if (stateChange.current === "failed" || stateChange.current === "suspended") {
        const msg =
          stateChange.reason?.message ||
          stateChange.reason?.toString?.() ||
          "Connection issue";
        setConnError(msg);
        pushEvent(stateChange.current, msg);
        toast.error(msg);
      } else {
        setConnError("");
      }
    };

    ably.connection.on(onConn);

    cmdCh.current = ably.channels.get(topicCmd);
    evtCh.current = ably.channels.get(topicEvt);

    const onEvt = (msg) => {
      const raw = decodeAblyData(msg.data).trim();

      // JSON heartbeat: {"type":"hb","rssi":-62}
      let type = raw;
      let rssi = null;

      if (raw.startsWith("{") && raw.endsWith("}")) {
        try {
          const obj = JSON.parse(raw);
          type = obj.type || raw;
          if (typeof obj.rssi === "number") rssi = obj.rssi;
        } catch {}
      }

      markSeen(type);

      if (rssi !== null) setLastRssi(rssi);

      // heartbeat: no log spam
      if (type === "hb") return;

      if (String(type).includes("device_online")) {
        pushEvent("device_online", "Device is online");
        toast.success("Device online");
        setStatus((s) => (s === "FEEDING" ? s : "READY"));
        return;
      }

      if (String(type).includes("feed_done")) {
        clearFeedTimeout();
        setSending(false);
        setStatus("READY");
        setLastFeed(new Date());
        pushEvent("feed_done", "Feed completed");
        toast.success("Feeding done ✅");
        return;
      }

      if (String(type).includes("schedule_saved")) {
        pushEvent("schedule_saved", `Saved: ${timesToCsv(scheduleTimes)}`);
        toast.success("Schedule saved on device");
        return;
      }

      if (String(type).includes("schedule_cleared")) {
        pushEvent("schedule_cleared", "Schedule cleared on device");
        toast.info("Schedule cleared");
        return;
      }

      pushEvent("evt", raw || "(empty)");
    };

    evtCh.current.subscribe(onEvt);
    pushEvent("subscribed", `Listening on ${topicEvt}`);

    return () => {
      try {
        clearFeedTimeout();
        if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
        evtCh.current?.unsubscribe(onEvt);
        ably.connection.off(onConn);
        ably.close();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function feedNow() {
    if (!cmdCh.current || connState !== "connected") {
      toast.error("Not connected");
      return;
    }

    setSending(true);
    setStatus("FEEDING");
    pushEvent("cmd", "feed_now");
    toast.info("Feed command sent");

    clearFeedTimeout();
    feedTimeoutRef.current = setTimeout(() => {
      setSending(false);
      setStatus("READY");
      pushEvent("no_ack", "No feed_done received (timeout)");
      toast.error("No response from device (timeout)");
    }, 12000);

    try {
      await cmdCh.current.publish("cmd", "feed_now");
    } catch (e) {
      clearFeedTimeout();
      setSending(false);
      setStatus("READY");
      pushEvent("error", e?.message || "Failed to publish feed_now");
      toast.error(e?.message || "Failed to send feed command");
    }
  }

  function pad2(n) {
  return String(n).padStart(2, "0");
}

function normalizeTime(t) {
  // expect "HH:MM"
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

function timesToCsv(list) {
  return sortTimes(list).join(",");
}

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

function clearTimesLocal() {
  setScheduleTimes([]);
}


  function normalizeSchedule(csv) {
    // keep it simple: HH:MM,HH:MM
    return csv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(",");
  }

async function saveSchedule() {
  if (!cmdCh.current || connState !== "connected") {
    toast.error("Not connected");
    return;
  }

  if (scheduleTimes.length === 0) {
    toast.error("Add at least one time");
    return;
  }

  const csv = timesToCsv(scheduleTimes);

  try {
    const msg = JSON.stringify({ type: "set_schedule", times: csv });
    await cmdCh.current.publish("cmd", msg);
    pushEvent("cmd", `set_schedule ${csv}`);
    toast.success("Schedule sent");
  } catch (e) {
    toast.error(e?.message || "Failed to send schedule");
  }
}

async function clearSchedule() {
  if (!cmdCh.current || connState !== "connected") {
    toast.error("Not connected");
    return;
  }

  try {
    const msg = JSON.stringify({ type: "clear_schedule" });
    await cmdCh.current.publish("cmd", msg);
    pushEvent("cmd", "clear_schedule");
    clearTimesLocal();
    toast.info("Schedule cleared");
  } catch (e) {
    toast.error(e?.message || "Failed to clear schedule");
  }
}

  const connBadge = (() => {
    if (connState === "connected")
      return { text: "Connected", ring: "ring-emerald-400/30", bg: "bg-emerald-500/10", dot: "bg-emerald-400" };
    if (connState === "failed")
      return { text: "Failed", ring: "ring-rose-400/30", bg: "bg-rose-500/10", dot: "bg-rose-400" };
    if (connState === "suspended")
      return { text: "Suspended", ring: "ring-amber-400/30", bg: "bg-amber-500/10", dot: "bg-amber-400" };
    return { text: connState === "init" ? "Starting" : "Connecting", ring: "ring-sky-400/30", bg: "bg-sky-500/10", dot: "bg-sky-400" };
  })();

  const deviceBadge = deviceOnline
    ? { text: "Online", ring: "ring-emerald-400/30", bg: "bg-emerald-500/10", dot: "bg-emerald-400" }
    : { text: "Offline", ring: "ring-rose-400/30", bg: "bg-rose-500/10", dot: "bg-rose-400" };

  return (
    <div className="relative  min-h-screen bg-transparent text-slate-100">

  <FloatingLines
  enabledWaves={waves}
  lineCount={lineCountMemo}
  lineDistance={lineDistanceMemo}
  bendRadius={13.5}
  bendStrength={4.5}
  interactive={true}
  parallax={true}
/>


      <div className="mx-auto  max-w-6xl px-4 py-8 ">
        <div className="flex flex-col gap-3  sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Fish Feeder</h1>
            <p className="text-sm text-slate-400">
              Device <span className="font-medium text-slate-200">{deviceId}</span> •{" "}
              <span className="font-mono text-slate-300">{topicCmd}</span>{" "}
              <span className="text-slate-500">/</span>{" "}
              <span className="font-mono text-slate-300">{topicEvt}</span>
            </p>

            <div className="mt-2 text-xs text-slate-400">
              Conn: <span className="font-mono text-slate-200">{connState}</span>
              {connError ? <div className="mt-1 text-rose-300 break-words">{connError}</div> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className={cls("inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1", connBadge.bg, connBadge.ring)}>
              <span className={cls("h-2 w-2 rounded-full", connBadge.dot)} />
              <span>{connBadge.text}</span>
            </div>

            <div className={cls("inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1", deviceBadge.bg, deviceBadge.ring)}>
              <span className={cls("h-2 w-2 rounded-full", deviceBadge.dot)} />
              <span>Device {deviceBadge.text}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 grid-cols-1 lg:grid-cols-3 bg-transparent p-6 rounded-2xl">
          {/* Control */}
          <div className="rounded-2xl bg-slate-950/30 ring-1 ring-white/10 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Control</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Send <span className="font-mono">feed_now</span> or set schedule.
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
              onClick={feedNow}
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

            {/* Schedule */}
{/* Schedule */}
<div className="mt-5 rounded-2xl bg-black ring-1 ring-white/10 p-4">
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="text-sm font-semibold">Schedule</div>
      <div className="mt-1 text-xs text-slate-400">Add one or more feed times (HH:MM)</div>
    </div>

    
  </div>

  {/* Hidden-ish time input (still visible enough for desktop) */}
  <div className="mt-3 flex items-center gap-2 ring-1 ring-white/10 rounded-xl ">
    <input
      ref={timeInputRef}
      type="time"
      value={timeDraft}
      onChange={(e) => setTimeDraft(e.target.value)}
      className="w-36 rounded-xl bg-slate-950/60  px-3 py-2 text-sm outline-none focus:ring-sky-400/30"
    />
{/* "clock" button */}
    <button
      type="button"
      onClick={() => timeInputRef.current?.showPicker?.() || timeInputRef.current?.click?.()}
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
  <div className="flex gap-2 justify-center mt-2"><button
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
      onClick={clearSchedule}
      disabled={connState !== "connected"}
      className={cls(
        "ml-auto rounded-xl px-3 py-2 text-sm font-semibold w-1/2",
        "bg-rose-500/90 text-slate-950 hover:opacity-95",
        connState !== "connected" && "opacity-50 cursor-not-allowed"
      )}
    >
      Clear all
    </button></div>

  {/* Chips */}
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

  {/* Save */}
  <button
    onClick={saveSchedule}
    disabled={connState !== "connected" || scheduleTimes.length === 0}
    className={cls(
      "mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold",
      "bg-gradient-to-r from-indigo-600 to-fuchsia-500 text-slate-950",
      "hover:opacity-95 active:translate-y-px transition",
      (connState !== "connected" || scheduleTimes.length === 0) && "opacity-50 cursor-not-allowed"
    )}
  >
    Save schedule
  </button>
</div>

            {/* Info */}
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-slate-950/40 ring-1 ring-white/10 px-3 py-2">
                <span className="text-slate-400">Last seen</span>
                <span className="font-medium text-slate-200">{tsLabel(lastSeen)}</span>
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

              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Online/offline is based on heartbeat events. Use 20–30s heartbeat and 60s offline timeout.
              </p>
            </div>
          </div>

          {/* Events */}
          <div className="rounded-2xl bg-slate-900/40 ring-1 ring-white/10 p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Live events</h2>
              <button
                onClick={() => setEvents([])}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10 bg-slate-950/30 hover:bg-slate-950/50"
              >
                Clear
              </button>
            </div>

            <div className="mt-3 h-[520px] overflow-auto rounded-xl bg-slate-950/40 ring-1 ring-white/10">
              {events.length === 0 ? (
                <div className="p-4 text-sm text-slate-400">No events yet.</div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {events.map((e) => (
                    <li key={e.id} className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{e.t}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                          {e.label}
                        </span>
                      </div>
                      {e.detail ? (
                        <div className="mt-1 text-sm text-slate-200 break-words">{e.detail}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Listening on <span className="font-mono text-slate-300">{topicEvt}</span>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" theme="dark" autoClose={2500} />

    </div>
  );
}
