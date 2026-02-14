import { http } from "./https";

export const api = {
  getDeviceState: (deviceId) =>
    http.get(`/api/devices/${deviceId}/state`).then((r) => r.data),

  getDeviceEvents: (deviceId, limit = 50) =>
    http.get(`/api/devices/${deviceId}/events`, { params: { limit } }).then((r) => r.data),

  saveSchedule: (deviceId, scheduleCsv) =>
    http.post(`/api/devices/${deviceId}/schedule`, { scheduleCsv }).then((r) => r.data),

  saveConfig: (deviceId, config) =>
    http.post(`/api/devices/${deviceId}/config`, config).then((r) => r.data),
};
