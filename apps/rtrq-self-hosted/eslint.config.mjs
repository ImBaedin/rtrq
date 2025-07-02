import baseConfig from "@rtrq/eslint-config/base.js";

export default [
	...baseConfig,
	{
		ignores: ["dist/**"],
	},
];