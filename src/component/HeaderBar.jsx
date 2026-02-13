// src/components/HeaderBar.jsx
import { cls } from "../lib/format";

export default function HeaderBar({
  deviceId,
  topicCmd,
  topicEvt,
  connState,
  connError,
  connBadge,
  deviceBadge,
}) {
  return (
    <div className="flex flex-col gap-3  sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Fish Feeder</h1>
        <p className="text-sm text-slate-400">
          Device Name: <span className="font-medium text-slate-200">•{" "}{deviceId} •{" "}</span>
          {/* <span className="font-mono text-slate-300">{topicCmd}</span>{" "}
          <span className="text-slate-500">/</span>{" "}
          <span className="font-mono text-slate-300">{topicEvt}</span> */}
        </p>

        <div className="mt-2 text-xs text-slate-400">
          Server: <span className="font-mono text-slate-200">{connState}</span>
          {connError ? (
            <div className="mt-1 text-rose-300 break-words">{connError}</div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div
          className={cls(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1",
            connBadge.bg,
            connBadge.ring
          )}
        >
          <span className={cls("h-2 w-2 rounded-full", connBadge.dot)} />
          <span>{connBadge.text}</span>
        </div>

        <div
          className={cls(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1",
            deviceBadge.bg,
            deviceBadge.ring
          )}
        >
          <span className={cls("h-2 w-2 rounded-full", deviceBadge.dot)} />
          <span>Device {deviceBadge.text}</span>
        </div>
      </div>
    </div>
  );
}
