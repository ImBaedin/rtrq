/** @typedef  {import("prettier").Config} PrettierConfig */
/** @typedef  {import("@ianvs/prettier-plugin-sort-imports").PluginConfig} SortImportsConfig */

/** @type { PrettierConfig | SortImportsConfig } */
const config = {
	tabWidth: 4,
	useTabs: true,
	plugins: ["@ianvs/prettier-plugin-sort-imports"],
	importOrder: [
		"^(react/(.*)$)|^(react$)|^(react-native(.*)$)",
		"^(next/(.*)$)|^(next$)",
		"<THIRD_PARTY_MODULES>",
		"",
		"^@rtrq/(.*)$",
		"",
		"^~/utils/(.*)$",
		"^~/components/(.*)$",
		"^~/styles/(.*)$",
		"^~/(.*)$",
		"^[./]",
	],
	importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
	importOrderTypeScriptVersion: "4.4.0",
};

export default config;
