import mqtt from "mqtt";

export function connectAblyMqtt() {
  const key = import.meta.env.VITE_ABLY_KEY;
  if (!key || !key.includes(":")) {
    throw new Error("Missing/invalid VITE_ABLY_KEY (must be name:secret)");
  }

  const [username, password] = key.split(":");

  const client = mqtt.connect("wss://main.mqtt.ably.net:443", {
    // Auth for Ably MQTT
    username,
    password,

    // Force MQTT 3.1.1 (this fixes the PUBCOMP header flags issue)
    protocol: "wss",
    protocolVersion: 4,          // 4 = MQTT 3.1.1
    clean: true,

    // Stability
    keepalive: 30,
    reconnectPeriod: 2000,
    connectTimeout: 10_000,

    // Make clientId stable-ish but unique
    clientId: `web-${Math.random().toString(16).slice(2)}`,

    // IMPORTANT: avoid QoS2 flows
    // (we'll publish/subscribe at qos 0 in App.jsx)
  });

  return client;
}
