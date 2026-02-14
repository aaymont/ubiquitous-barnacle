import type { GeotabApi } from "../types/geotab";
import type { Device, ExceptionEvent, Rule, User } from "../types/entities";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

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
    let attempt = 0;
    const doCall = () => {
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
          attempt++;
          if (attempt <= MAX_RETRIES) {
            setTimeout(doCall, RETRY_DELAY_MS);
          } else {
            reject(error);
          }
        }
      );
    };
    doCall();
  });
}

export function multiCall<T extends unknown[]>(
  api: GeotabApi,
  calls: Array<[string, Record<string, unknown>]>,
  abort?: AbortSignal
): Promise<T> {
  if (!api.multiCall) {
    const promises = calls.map(([method, params]) =>
      apiCall(api, method, params, abort)
    );
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

export async function getRules(api: GeotabApi, abort?: AbortSignal): Promise<Rule[]> {
  const rules = await apiCall<Rule[]>(api, "Get", { typeName: "Rule" }, abort);
  return rules ?? [];
}

const SAFETY_KEYWORDS = [
  "speed",
  "speeding",
  "seatbelt",
  "harsh",
  "distract",
  "following",
  "collision",
  "phone",
  "fatigue",
  "braking",
  "cornering",
  "acceleration",
  "exception",
  "idling",
  "yard",
];

export function filterSafetyRules(rules: Rule[]): Rule[] {
  return rules.filter((r) => {
    const name = (r.name ?? "").toLowerCase();
    const comment = (r.comment ?? "").toLowerCase();
    const text = name + " " + comment;
    return SAFETY_KEYWORDS.some((kw) => text.includes(kw));
  });
}

export interface ExceptionEventSearchParams {
  fromDate: string;
  toDate: string;
  ruleIds?: string[];
  deviceSearch?: { id: string } | { groups: Array<{ id: string }> };
  includeExceptionCount?: boolean;
}

async function getExceptionEventsSingleRule(
  api: GeotabApi,
  params: ExceptionEventSearchParams,
  ruleId: string | undefined,
  abort?: AbortSignal
): Promise<ExceptionEvent[]> {
  const search: Record<string, unknown> = {
    fromDate: params.fromDate,
    toDate: params.toDate,
    includeExceptionCount: params.includeExceptionCount ?? true,
  };
  if (ruleId) search.ruleSearch = { id: ruleId };
  if (params.deviceSearch) search.deviceSearch = params.deviceSearch;
  const batch = await apiCall<ExceptionEvent[]>(
    api,
    "Get",
    { typeName: "ExceptionEvent", search, resultsLimit: 50000 },
    abort
  );
  return batch ?? [];
}

export async function getExceptionEvents(
  api: GeotabApi,
  params: ExceptionEventSearchParams,
  abort?: AbortSignal
): Promise<ExceptionEvent[]> {
  const ruleIds = params.ruleIds?.length ? params.ruleIds : [undefined];
  const batches = await Promise.all(
    ruleIds.map((ruleId) =>
      getExceptionEventsSingleRule(api, params, ruleId, abort)
    )
  );
  const seen = new Set<string>();
  const combined: ExceptionEvent[] = [];
  for (const e of batches.flat()) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      combined.push(e);
    }
  }
  return combined;
}

export async function getDevices(api: GeotabApi, abort?: AbortSignal): Promise<Device[]> {
  const list = await apiCall<Device[]>(api, "Get", { typeName: "Device" }, abort);
  return list ?? [];
}

export async function getUsers(api: GeotabApi, abort?: AbortSignal): Promise<User[]> {
  const list = await apiCall<User[]>(api, "Get", { typeName: "User" }, abort);
  return list ?? [];
}

export async function getGroups(api: GeotabApi, abort?: AbortSignal): Promise<{ id: string; name?: string }[]> {
  const list = await apiCall<{ id: string; name?: string }[]>(api, "Get", { typeName: "Group" }, abort);
  return list ?? [];
}
