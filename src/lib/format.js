// src/lib/format.js

export function cls(...a) {
  return a.filter(Boolean).join(" ");
}

export function shortTime(d) {
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function tsLabel(d) {
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

export function tsLabeltrimmed(d) {
  if (!d) return "—";
  return d.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function decodeAblyData(data) {
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
