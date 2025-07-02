import dotenv from "dotenv";
import * as v from "valibot";

dotenv.config();

const envSchema = v.object({
	PORT: v.pipe(
		v.string(),
		v.transform((value) => Number(value)),
		v.number(),
		v.minValue(1000),
	),
	NODE_ENV: v.optional(
		v.picklist(["development", "test", "production"]),
		"development",
	),
	RTRQ_SECRET_KEY: v.pipe(
		v.string(),
		v.minLength(1, "RTRQ_SECRET_KEY is required"),
	),
	RTRQ_CORS_ORIGIN: v.optional(v.string()),
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
