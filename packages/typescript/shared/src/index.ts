export type QueryKey = readonly unknown[];

export interface RtrqPackageInfo {
  name: string;
  runtime: "shared" | "browser" | "server";
  status: "scaffold";
}

export const packageInfo: RtrqPackageInfo = {
  name: "@rtrq/shared",
  runtime: "shared",
  status: "scaffold"
};
