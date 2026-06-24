import type { ClientCoreConfig } from "@rtrq/client-core";
import type { QueryKey, RtrqPackageInfo } from "@rtrq/shared";

export interface ReactQueryAdapterConfig extends ClientCoreConfig {
  defaultKeys?: readonly QueryKey[];
}

export const packageInfo: RtrqPackageInfo = {
  name: "@rtrq/adapter-react-query",
  runtime: "browser",
  status: "scaffold"
};
