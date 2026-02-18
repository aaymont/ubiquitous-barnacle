import type { GeotabApi } from "../types/geotab";
import type { Device, DeviceStatusInfo, ExceptionEvent, LogRecord, Trip } from "../types/entities";

export type AbortSignal = { aborted: boolean };

export function createAbortSignal(): AbortSignal {
  return { aborted: false };
}

export function apiCall<T>(
  api: GeotabApi,
  method: string,
  params: Record<string, unknown>,
  abort?: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (abort?.aborted) {
      reject(new Error("Aborted"));
      return;
    }
    api.call(
      method,
      params,
      (result) => {
        if (abort?.aborted) {
          reject(new Error("Aborted"));
          return;
        }
        resolve(result as T);
      },
      (error) => {
        if (abort?.aborted) {
          reject(new Error("Aborted"));
          return;
        }
        reject(error);
      }
    );
  });
}

export function multiCall<T extends unknown[]>(
  api: GeotabApi,
  calls: Array<[string, Record<string, unknown>]>,
  abort?: AbortSignal
): Promise<T> {
  if (!api.multiCall) {
    const promises = calls.map(([method, params]) => apiCall(api, method, params, abort));
    return Promise.all(promises) as Promise<T>;
  }
  return new Promise((resolve, reject) => {
    if (abort?.aborted) {
      reject(new Error("Aborted"));
      return;
    }
    api.multiCall!(
      calls,
      (results) => {
        if (abort?.aborted) {
          reject(new Error("Aborted"));
          return;
        }
        resolve(results as T);
      },
      (error) => reject(error)
    );
  });
}

export async function getDevices(api: GeotabApi, abort?: AbortSignal): Promise<Device[]> {
  const list = await apiCall<Device[]>(api, "Get", { typeName: "Device" }, abort);
  return list ?? [];
}

export async function getDeviceStatus(
  api: GeotabApi,
  deviceId: string,
  abort?: AbortSignal
): Promise<DeviceStatusInfo | null> {
  const results = await apiCall<DeviceStatusInfo[]>(api, "Get", {
    typeName: "DeviceStatusInfo",
    search: { deviceSearch: { id: deviceId } },
  }, abort);
  return results?.[0] ?? null;
}

export async function getTrips(
  api: GeotabApi,
  deviceId: string,
  fromDate: string,
  toDate: string,
  abort?: AbortSignal
): Promise<Trip[]> {
  const results = await apiCall<Trip[]>(api, "Get", {
    typeName: "Trip",
    search: {
      deviceSearch: { id: deviceId },
      fromDate,
      toDate,
    },
    resultsLimit: 5000,
  }, abort);
  return results ?? [];
}

export async function getExceptionEvents(
  api: GeotabApi,
  deviceId: string,
  fromDate: string,
  toDate: string,
  abort?: AbortSignal
): Promise<ExceptionEvent[]> {
  try {
    const results = await apiCall<ExceptionEvent[]>(api, "Get", {
      typeName: "ExceptionEvent",
      search: {
        deviceSearch: { id: deviceId },
        fromDate,
        toDate,
      },
      resultsLimit: 2000,
    }, abort);
    return results ?? [];
  } catch {
    return [];
  }
}

export async function getLogRecords(
  api: GeotabApi,
  deviceId: string,
  fromDate: string,
  toDate: string,
  abort?: AbortSignal
): Promise<LogRecord[]> {
  try {
    const results = await apiCall<LogRecord[]>(api, "Get", {
      typeName: "LogRecord",
      search: {
        deviceSearch: { id: deviceId },
        fromDate,
        toDate,
      },
      resultsLimit: 10000,
    }, abort);
    return results ?? [];
  } catch {
    return [];
  }
}
