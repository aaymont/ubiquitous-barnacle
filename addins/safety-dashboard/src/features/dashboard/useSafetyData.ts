import { useCallback, useEffect, useState } from "react";
import { useAddin } from "../../context/AddinContext";
import {
  createAbortSignal,
  getExceptionEvents,
  getRules,
  filterSafetyRules,
  getDevices,
  getUsers,
  getGroups,
} from "../../api/geotabApi";
import type { ExceptionEventSearchParams } from "../../api/geotabApi";
import type { Rule, ExceptionEvent, Device, User } from "../../types/entities";
import { aggregateByDriver, aggregateByAsset, topRulesByCount } from "../../utils/aggregation";
import type { DriverRow, AssetRow, RuleCount } from "../../utils/aggregation";
import { last30Days, toISODate } from "../../utils/dateUtils";
import { getExceptionDurationSeconds } from "../../utils/exceptionUtils";
import { registerAbortSignal } from "../../abortScope";

export interface SafetyFilters {
  fromDate: Date;
  toDate: Date;
  groupId: string | null;
  ruleIds: string[];
  view: "driver" | "asset";
}

const defaultRange = last30Days();

export const defaultFilters: SafetyFilters = {
  fromDate: defaultRange.from,
  toDate: defaultRange.to,
  groupId: null,
  ruleIds: [],
  view: "driver",
};

export interface SafetyDataState {
  loading: boolean;
  error: string | null;
  rules: Rule[];
  safetyRules: Rule[];
  events: ExceptionEvent[];
  devices: Device[];
  users: User[];
  groups: { id: string; name?: string }[];
  driverRows: DriverRow[];
  assetRows: AssetRow[];
  topRules: RuleCount[];
  totalDuration: number;
  totalDistance: number;
}

const initialState: SafetyDataState = {
  loading: true,
  error: null,
  rules: [],
  safetyRules: [],
  events: [],
  devices: [],
  users: [],
  groups: [],
  driverRows: [],
  assetRows: [],
  topRules: [],
  totalDuration: 0,
  totalDistance: 0,
};

export function useSafetyData(filters: SafetyFilters) {
  const { api, refreshKey } = useAddin();
  const [state, setState] = useState<SafetyDataState>(initialState);

  const load = useCallback(async () => {
    if (!api) {
      setState((s) => ({ ...s, loading: false, error: "No API" }));
      return;
    }
    const abort = createAbortSignal();
    registerAbortSignal(abort);
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const [rules, groups] = await Promise.all([
        getRules(api, abort),
        getGroups(api, abort),
      ]);
      const safetyRules = filterSafetyRules(rules);
      const ruleIds = filters.ruleIds.length > 0 ? filters.ruleIds : safetyRules.map((r) => r.id);

      const searchParams: ExceptionEventSearchParams = {
        fromDate: toISODate(filters.fromDate),
        toDate: toISODate(filters.toDate),
        includeExceptionCount: true,
      };
      if (ruleIds.length > 0) searchParams.ruleIds = ruleIds;
      if (filters.groupId) {
        searchParams.deviceSearch = { groups: [{ id: filters.groupId }] };
      }

      const [events, devices, users] = await Promise.all([
        getExceptionEvents(api, searchParams, abort),
        getDevices(api, abort),
        getUsers(api, abort),
      ]);

      const driverRows = aggregateByDriver(events);
      const assetRows = aggregateByAsset(events);
      const topRules = topRulesByCount(events, 3);
      const totalDuration = events.reduce(
        (s, e) => s + getExceptionDurationSeconds(e),
        0
      );
      const totalDistance = events.reduce((s, e) => s + (e.distance ?? 0), 0);

      setState({
        loading: false,
        error: null,
        rules,
        safetyRules,
        events,
        devices,
        users,
        groups,
        driverRows,
        assetRows,
        topRules,
        totalDuration,
        totalDistance,
      });
    } catch (err) {
      if ((err as Error).message === "Aborted") return;
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      registerAbortSignal(null);
    }
  }, [api, refreshKey, filters.fromDate, filters.toDate, filters.groupId, filters.ruleIds.join(",")]);

  useEffect(() => {
    load();
  }, [load]);

  return state;
}
