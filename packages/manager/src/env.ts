import dotenv from "dotenv";
import * as v from "valibot";

dotenv.config();

const envSchema = v.object({
	PORT: v.pipe(
		v.number(),
		v.transform((value) => Number(value)),
		v.minValue(1000),
	),
	NODE_ENV: v.optional(
		v.picklist(["development", "test", "production"]),
		"development",
	),
});

const env = v.safeParse(envSchema, process.env);

if (!env.success) {
	console.error(
		"Invalid environment variables:",
		env.issues.map((issue) => issue.message).join("\n"),
	);
	throw new Error("Invalid environment variables");
}

export default env.output;
