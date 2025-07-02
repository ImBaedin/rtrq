#!/usr/bin/env node

import { config } from "dotenv";
import { createRTRQ } from "@rtrq/manager";

// Load environment variables
config();

// Validate required environment variables
function validateEnv() {
	const required = ["PORT", "RTRQ_SECRET_KEY"];
	const missing = required.filter(key => !process.env[key]);
	
	if (missing.length > 0) {
		console.error("❌ Missing required environment variables:");
		missing.forEach(key => console.error(`   ${key}`));
		console.error("\nPlease set these environment variables and try again.");
		process.exit(1);
	}
}

function getEnvValue(key: string, defaultValue?: string): string | undefined {
	return process.env[key] || defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
	const value = process.env[key];
	if (!value) return defaultValue;
	const parsed = parseInt(value, 10);
	if (isNaN(parsed)) {
		console.warn(`⚠️  Invalid number for ${key}: ${value}, using default: ${defaultValue}`);
		return defaultValue;
	}
	return parsed;
}

function main() {
	console.log("🚀 Starting RTRQ Self-Hosted Server...\n");
	
	// Validate environment
	validateEnv();
	
	// Get configuration from environment
	const port = getEnvNumber("PORT", 8080);
	const secretKey = getEnvValue("RTRQ_SECRET_KEY")!; // Required, validated above
	const corsOrigin = getEnvValue("RTRQ_CORS_ORIGIN");
	const allowedIpsStr = getEnvValue("RTRQ_ALLOWED_IPS");
	const allowedIps = allowedIpsStr ? allowedIpsStr.split(",").map(ip => ip.trim()) : undefined;
	const maxBodySize = getEnvNumber("RTRQ_MAX_BODY_SIZE", 1024 * 1024); // 1MB default
	
	// Display configuration
	console.log("📋 Configuration:");
	console.log(`   Port: ${port}`);
	console.log(`   Secret Key: ${"*".repeat(secretKey.length)} (${secretKey.length} characters)`);
	console.log(`   CORS Origin: ${corsOrigin || "Any origin allowed"}`);
	console.log(`   Allowed IPs: ${allowedIps ? allowedIps.join(", ") : "All IPs allowed"}`);
	console.log(`   Max Body Size: ${(maxBodySize / 1024 / 1024).toFixed(1)}MB`);
	console.log();
	
	// Create and configure the RTRQ server
	const server = createRTRQ({
		secretKey,
		corsOrigin,
		allowedIps,
		maxBodySize,
	});
	
	// Set up event listeners for monitoring
	server
		.onClientConnect((event) => {
			console.log(`✅ Client connected: ${event.clientId} (total: ${event.totalConnections})`);
		})
		.onClientDisconnect((event) => {
			console.log(`❌ Client disconnected: ${event.clientId} (remaining: ${event.remainingConnections})`);
			if (event.removedSubscriptions.length > 0) {
				console.log(`   Removed ${event.removedSubscriptions.length} subscription(s)`);
			}
		})
		.onQuerySubscribe((event) => {
			console.log(`🔔 Query subscription: ${JSON.stringify(event.key)} by ${event.clientId} (subscribers: ${event.totalSubscribers})`);
		})
		.onQueryUnsubscribe((event) => {
			console.log(`🔕 Query unsubscription: ${JSON.stringify(event.key)} by ${event.clientId} (remaining: ${event.remainingSubscribers})`);
		})
		.onQueryInvalidate((event) => {
			console.log(`🔄 Query invalidated: ${JSON.stringify(event.key)} (notified ${event.notifiedClients} clients)`);
		});
	
	// Handle graceful shutdown
	process.on("SIGINT", () => {
		console.log("\n🛑 Received SIGINT, shutting down gracefully...");
		process.exit(0);
	});
	
	process.on("SIGTERM", () => {
		console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
		process.exit(0);
	});
	
	// Start the server
	server.listen(port);
	
	console.log("🌐 Server endpoints:");
	console.log(`   WebSocket: ws://localhost:${port}/`);
	console.log(`   Invalidation: http://localhost:${port}/invalidate`);
	console.log();
	console.log("💡 To invalidate a query, send a POST request to /invalidate with:");
	console.log("   - Authorization header with your secret key");
	console.log("   - JSON body: { \"key\": [\"your\", \"query\", \"key\"] }");
	console.log();
	console.log("✨ RTRQ Self-Hosted Server is ready!");
}

// Run the application
if (require.main === module) {
	main();
}