export const DEFAULT_API_URL = "http://localhost:8001";
export const DEFAULT_RTRQ_SERVER_URL = "http://localhost:8000";
export const DEFAULT_RTRQ_APP_ID = "dev";

export interface DemoConfig {
  apiUrl: string;
  rtrqServerUrl: string;
  rtrqAppId: string;
}

type DemoEnv = Partial<
  Record<"VITE_API_URL" | "VITE_RTRQ_SERVER_URL" | "VITE_RTRQ_APP_ID", string>
>;

export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getDemoConfig(
  env: DemoEnv = import.meta.env as DemoEnv,
): DemoConfig {
  return {
    apiUrl: normalizeBaseUrl(env.VITE_API_URL || DEFAULT_API_URL),
    rtrqServerUrl: normalizeBaseUrl(
      env.VITE_RTRQ_SERVER_URL || DEFAULT_RTRQ_SERVER_URL,
    ),
    rtrqAppId: env.VITE_RTRQ_APP_ID || DEFAULT_RTRQ_APP_ID,
  };
}
