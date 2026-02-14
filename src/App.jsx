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
import { useDeviceState } from "./lib/queries";
import { useSaveSchedule,useSaveConfig } from "./lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "./lib/queries";
import Footer from "./component/Footer";

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


  const [lastEvent, setLastEvent] = useState("—");
    const { data: deviceState, isLoading: stateLoading } = useDeviceState(deviceId);

  
  const [draftScheduleTimes, setDraftScheduleTimes] = useState([]);
const scheduleTimes =
  (deviceState?.scheduleCsv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
    const saveConfigMut = useSaveConfig(deviceId);

const defaultConfig = {
  idleAngle: 0,
  feedAngle: 150,
  feedMs: 500,
  oledOn: true,
  emailNotify: true,
};

const [draft, setDraft] = useState(defaultConfig);

const deviceOnline = !!deviceState?.online;
const canTalkToDevice = connState === "connected" && deviceOnline && !!cmdCh.current;

const lastSeen = deviceState?.lastSeen ? new Date(deviceState.lastSeen) : null;
const lastFeed = deviceState?.lastFeed ? new Date(deviceState.lastFeed) : null;
const lastRssi = typeof deviceState?.rssi === "number" ? deviceState.rssi : null;
const initialConfig = deviceState?.config || null;


  const [events, setEvents] = useState([]);

  const feedTimeoutRef = useRef(null);
  const staleTimerRef = useRef(null);




const qc = useQueryClient();

async function saveConfig(payload) {
  // payload is DB shape: { idleAngle, feedAngle, feedMs, oledOn }

  // 1) save DB first
  try {
    await saveConfigMut.mutateAsync(payload);

    qc.setQueryData(qk.deviceState(deviceId), (old) => ({
      ...(old || {}),
      config: payload,
      updatedAt: new Date().toISOString(),
    }));

    toast.success("Saved config in database");
  } catch (e) {
    toast.error(e?.message || "Failed to save config in database");
    return;
  }

  // 2) push to device if online
  if (!canTalkToDevice) {
  toast.info("Saved — will apply when device is online");
  return;
}


  const devicePayload = {
    type: "set_config",
    idle_angle: payload.idleAngle,
    feed_angle: payload.feedAngle,
    feed_ms: payload.feedMs,
    oled: payload.oledOn ? 1 : 0,
  };

  try {
    await cmdCh.current.publish("cmd", JSON.stringify(devicePayload));
    pushEvent("Config sent to device", JSON.stringify(devicePayload));
    toast.success("Config sent to device");
  } catch (e) {
    toast.error(e?.message || "Failed to send config to device");
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
    setLastEvent(evtName);


    // Offline if no events for 60s (good with 20s heartbeat)
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    
  }

  function clearFeedTimeout() {
    if (feedTimeoutRef.current) {
      clearTimeout(feedTimeoutRef.current);
      feedTimeoutRef.current = null;
    }
  }


  const saveScheduleMut = useSaveSchedule(deviceId);

useEffect(() => {
  // whenever DB schedule changes, reset draft
  setDraftScheduleTimes(scheduleTimes);
}, [deviceState?.scheduleCsv]);

useEffect(() => {
  if (!initialConfig) return;

  setDraft({
    ...defaultConfig,
    ...initialConfig,
  });
}, [initialConfig]);

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

      

      // heartbeat: no log spam
 if (type === "hb") {
  qc.setQueryData(qk.deviceState(deviceId), (old) => ({
    ...(old || {}),
    lastSeen: new Date().toISOString(),
    online: true,
    rssi: typeof rssi === "number" ? rssi : (old?.rssi ?? null),
  }));
  return; // no log spam
}

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
if (!canTalkToDevice) {
  toast.error("Device is offline");
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
      toast.info("Feed command sent");
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
  if (draftScheduleTimes.length === 0) {
    toast.error("Add at least one time");
    return;
  }

  const csv = timesToCsv(draftScheduleTimes);

  // 1) DB first
  try {
    await saveScheduleMut.mutateAsync(csv);

    qc.setQueryData(qk.deviceState(deviceId), (old) => ({
      ...(old || {}),
      scheduleCsv: csv,
      updatedAt: new Date().toISOString(),
    }));

    toast.success("Saved schedule in database");
  } catch (e) {
    toast.error(e?.message || "Failed to save schedule in database");
    return;
  }

  // 2) Device push only if connected
if (!canTalkToDevice) {
  toast.info("Saved — will apply when device is online");
  return;
}


  try {
    const msg = JSON.stringify({ type: "set_schedule", times: csv });
    await cmdCh.current.publish("cmd", msg);
    toast.success("Schedule sent to device");
  } catch (e) {
    toast.error(e?.message || "Failed to send schedule to device");
  }
}


async function clearSchedule() {
  // 1) DB first
  try {
    await saveScheduleMut.mutateAsync("");
    qc.setQueryData(qk.deviceState(deviceId), (old) => ({
      ...(old || {}),
      scheduleCsv: "",
      updatedAt: new Date().toISOString(),
    }));
    toast.success("Cleared schedule in database");
  } catch (e) {
    toast.error(e?.message || "Failed to clear schedule in database");
    return;
  }

  // 2) Device push if online
  if (!canTalkToDevice) {
    toast.info("Saved — will apply when device is online");
    return;
  }

  try {
    await cmdCh.current.publish("cmd", JSON.stringify({ type: "clear_schedule" }));
    pushEvent("Schedule cleared (sent to device)", "clear_schedule");
    toast.success("Clear sent to device");
  } catch (e) {
    toast.error(e?.message || "Failed to send clear to device");
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
    <div className="relative min-h-screen text-slate-100 overflow-hidden bg-slate-950">
  {/* ✅ MOBILE BG (no arbitrary classes, should always show) */}
  <div className="absolute inset-0 z-0 lg:hidden pointer-events-none">
    {/* base gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/40 to-emerald-950/30" />

    {/* glowing blobs */}
    <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
    <div className="absolute top-10 -right-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
    <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

    {/* subtle highlight sweep */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/5" />

    {/* soft grain */}
    <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(transparent_0,rgba(255,255,255,0.08)_1px,transparent_2px)] bg-[length:100%_6px]" />
  </div>

  {/* ✅ DESKTOP BG (FloatingLines only on lg+) */}
  <div className="absolute inset-0 z-0 hidden lg:block pointer-events-none">
    <FloatingLines
      enabledWaves={waves}
      lineCount={lineCountMemo}
      lineDistance={lineDistanceMemo}
      bendRadius={13.5}
      bendStrength={4.5}
      interactive
      parallax
    />
  </div>

  {/* ✅ CONTENT */}
  <div className="relative z-10 mx-auto max-w-6xl px-4 py-8">
    <HeaderBar
      deviceId={deviceId}
      topicCmd={topicCmd}
      topicEvt={topicEvt}
      connState={connState}
      connError={connError}
      connBadge={connBadge}
      deviceBadge={deviceBadge}
      lastSeen={deviceState?.lastSeen}
      lastFeed={deviceState?.lastFeed}
      lastRssi={deviceState?.rssi}
      deviceOnline={!!deviceState?.online}
      emailNotify={!!draft.emailNotify}
      onToggleEmailNotify={(v) => {
        const updated = { ...draft, emailNotify: v };
        setDraft(updated);
        saveConfig(updated);
      }}
    />

    <div className="mt-6 grid gap-4 grid-cols-1 lg:grid-cols-3 bg-transparent lg:p-6 rounded-2xl">
      <ControlPanel
        status={status}
        sending={sending}
        connState={connState}
        onFeedNow={feedNow}
        scheduleTimes={draftScheduleTimes}
        setScheduleTimes={setDraftScheduleTimes}
        onSaveSchedule={saveSchedule}
        onClearSchedule={clearSchedule}
        onSaveConfig={(payload) => saveConfig(payload)}
        initialConfig={initialConfig}
        lastSeen={lastSeen}
        lastEvent={lastEvent}
        lastFeed={lastFeed}
        lastRssi={lastRssi}
      />

      <EventsPanel events={events} topicEvt={topicEvt} onClear={() => setEvents([])} />
    </div>

    <Footer />
  </div>

  <ToastContainer position="top-right" theme="dark" autoClose={2500} />
</div>

  );
}
