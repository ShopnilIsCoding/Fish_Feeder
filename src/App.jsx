import { useEffect, useMemo, useRef, useState } from "react";
import { createAbly } from "./lib/ably";
import FloatingLines from "./component/FloatingLines";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { cls, shortTime, tsLabel, decodeAblyData } from "./lib/format";
import HeaderBar from "./component/HeaderBar";
import EventsPanel from "./component/EventsPanel";
import  { timesToCsv } from "./component/SchedulePanel";
import ControlPanel from "./component/ControlPanel";



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

  const [scheduleTimes, setScheduleTimes] = useState([]);
  const [deviceConfig, setDeviceConfig] = useState(null);



  const [events, setEvents] = useState([]);

  const feedTimeoutRef = useRef(null);
  const staleTimerRef = useRef(null);


  async function saveConfig(payload) {
  if (!cmdCh.current || connState !== "connected") {
    toast.error("Not connected");
    return;
  }

  try {
    const msg = JSON.stringify({ type: "set_config", ...payload });
    await cmdCh.current.publish("cmd", msg);
    pushEvent("Config sent", msg);
    toast.success("Config sent");
  } catch (e) {
    toast.error(e?.message || "Failed to send config");
  }
}


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
      pushEvent("offline: No device events recently", "No device events recently");
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

      if (String(type).includes("config_saved")) {
  pushEvent("Config saved on device", "config_saved");
  toast.success("Config saved ✅");
  return;
}


      if (String(type).includes("device_online")) {
        pushEvent("Device is online", "Device is online");
        toast.success("Device online");
        setStatus((s) => (s === "FEEDING" ? s : "READY"));
        return;
      }

      if (String(type).includes("feed_done")) {
        clearFeedTimeout();
        setSending(false);
        setStatus("READY");
        setLastFeed(new Date());
        pushEvent("Feeding completed", "Feed completed");
        toast.success("Feeding done ✅");
        return;
      }

      if (String(type).includes("schedule_saved")) {
        pushEvent(`Schedule Saved!`, `Saved: ${timesToCsv(scheduleTimes)}`);
        toast.success("Schedule saved on device");
        return;
      }

      if (String(type).includes("schedule_cleared")) {
        pushEvent("Schedule cleared on device", "Schedule cleared on device");
        toast.info("Schedule cleared");
        return;
      }

      pushEvent("evt", raw || "(empty)");
    };

    evtCh.current.subscribe(onEvt);
    pushEvent("Connected to Server", `Listening to Server`);

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
    pushEvent("Trying to feed now", "feed now");
    toast.info("Feed command sent");

    clearFeedTimeout();
    feedTimeoutRef.current = setTimeout(() => {
      setSending(false);
      setStatus("READY");
      pushEvent("no acknowledgement received (timeout)", "No feed done received (timeout)");
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
  // console.log(csv.replace(","," and "));

  try {
    const msg = JSON.stringify({ type: "set_schedule", times: csv });
    await cmdCh.current.publish("cmd", msg);
    pushEvent(`set schedule ${csv.replaceAll(","," & ")}`, `set_schedule ${csv}`);
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
    pushEvent("Schedule cleared", "clear_schedule");
    setScheduleTimes([]);
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
        <HeaderBar
  deviceId={deviceId}
  topicCmd={topicCmd}
  topicEvt={topicEvt}
  connState={connState}
  connError={connError}
  connBadge={connBadge}
  deviceBadge={deviceBadge}
/>


        <div className="mt-6 grid gap-4 grid-cols-1 lg:grid-cols-3 bg-transparent p-6 rounded-2xl">
          {/* Control */}
          <ControlPanel
  status={status}
  sending={sending}
  connState={connState}
  onFeedNow={feedNow}
  scheduleTimes={scheduleTimes}
  setScheduleTimes={setScheduleTimes}
  onSaveSchedule={saveSchedule}
  onClearSchedule={clearSchedule}
  onSaveConfig={saveConfig}
  initialConfig={deviceConfig}
  lastSeen={lastSeen}
  lastEvent={lastEvent}
  lastFeed={lastFeed}
  lastRssi={lastRssi}
/>



          {/* Events */}
          <EventsPanel
  events={events}
  topicEvt={topicEvt}
  onClear={() => setEvents([])}
/>

        </div>
      </div>

      <ToastContainer position="top-right" theme="dark" autoClose={2500} />

    </div>
  );
}
