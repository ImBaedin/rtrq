import type { QueryKey, RtrqPackageInfo } from "@rtrq/shared";

export interface ClientCoreConfig {
  appId: string;
  serverUrl: string;
}

export interface ClientSubscription {
  key: QueryKey;
}

export const packageInfo: RtrqPackageInfo = {
  name: "@rtrq/client-core",
  runtime: "browser",
  status: "scaffold"
};
