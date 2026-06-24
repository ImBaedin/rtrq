import type { QueryKey, RtrqPackageInfo } from "@rtrq/shared";

export interface ServerSdkConfig {
  apiKey: string;
  appId: string;
  serverUrl: string;
}

export interface InvalidationRequest {
  key: QueryKey;
}

export const packageInfo: RtrqPackageInfo = {
  name: "@rtrq/server-sdk",
  runtime: "server",
  status: "scaffold"
};
