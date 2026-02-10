import Ably from "ably";

export function createAbly() {
  const key = import.meta.env.VITE_ABLY_KEY;

  if (!key || !key.includes(":")) {
    throw new Error("Bad or missing VITE_ABLY_KEY. It must look like name:secret");
  }

  return new Ably.Realtime({ key });
}
