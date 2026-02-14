export interface GeotabApi {
  call: (
    method: string,
    params: Record<string, unknown>,
    callback: (result: unknown) => void,
    errorCallback?: (error: unknown) => void
  ) => void;
  multiCall?: (
    calls: Array<[string, Record<string, unknown>]>,
    callback: (results: unknown[]) => void,
    errorCallback?: (error: unknown) => void
  ) => void;
  getSession?: (callback: (session: { userName?: string; database?: string }) => void) => void;
}

export interface GeotabAddInState {
  language?: string;
  user?: { id: string };
  group?: { id: string };
  device?: { id: string };
  gotoPage?: (page: string, params?: Record<string, unknown>) => void;
  setState?: (state: Record<string, unknown>) => void;
  getState?: () => Record<string, unknown>;
}

declare global {
  interface Window {
    geotab?: {
      addin: Record<string, () => GeotabAddInModule>;
    };
  }
}

export interface GeotabAddInModule {
  initialize: (api: GeotabApi, state: GeotabAddInState, callback: () => void) => void;
  focus: (api: GeotabApi, state: GeotabAddInState) => void;
  blur: (api: GeotabApi, state: GeotabAddInState) => void;
}
