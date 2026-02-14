import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export const qk = {
  deviceState: (deviceId) => ["deviceState", deviceId],
  deviceEvents: (deviceId) => ["deviceEvents", deviceId],
};

export function useDeviceState(deviceId) {
  return useQuery({
    queryKey: qk.deviceState(deviceId),
    queryFn: () => api.getDeviceState(deviceId),
    enabled: !!deviceId,
    refetchInterval: 2000, // keep it fresh
  });
}

export function useDeviceEvents(deviceId, limit = 30) {
  return useQuery({
    queryKey: qk.deviceEvents(deviceId),
    queryFn: () => api.getDeviceEvents(deviceId, limit),
    enabled: !!deviceId,
  });
}

export function useSaveSchedule(deviceId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (scheduleCsv) => api.saveSchedule(deviceId, scheduleCsv),

    // optimistic UI update
    onMutate: async (scheduleCsv) => {
      await qc.cancelQueries({ queryKey: qk.deviceState(deviceId) });
      const prev = qc.getQueryData(qk.deviceState(deviceId));

      qc.setQueryData(qk.deviceState(deviceId), (old) => ({
        ...(old || {}),
        scheduleCsv,
        updatedAt: new Date().toISOString(),
      }));

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.deviceState(deviceId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.deviceState(deviceId) });
    },
  });
}

export function useSaveConfig(deviceId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (config) => api.saveConfig(deviceId, config),

    onMutate: async (config) => {
      await qc.cancelQueries({ queryKey: qk.deviceState(deviceId) });
      const prev = qc.getQueryData(qk.deviceState(deviceId));

      qc.setQueryData(qk.deviceState(deviceId), (old) => ({
        ...(old || {}),
        config,
        updatedAt: new Date().toISOString(),
      }));

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.deviceState(deviceId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.deviceState(deviceId) });
    },
  });
}
