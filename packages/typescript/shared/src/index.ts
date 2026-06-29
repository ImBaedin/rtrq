export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };
export type QueryKey = readonly JsonValue[];

export interface RtrqPackageInfo {
  name: string;
  runtime: "shared" | "browser" | "server";
  status: "experimental" | "scaffold";
}

export const packageInfo: RtrqPackageInfo = {
  name: "@rtrq/shared",
  runtime: "shared",
  status: "scaffold",
};
