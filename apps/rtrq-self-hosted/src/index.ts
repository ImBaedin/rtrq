#!/usr/bin/env node

import { config } from "dotenv";
import { 
	createRTRQ,
	BeforeConnectionEvent,
	BeforeInvalidationEvent,
	ClientConnectionEvent,
	ClientDisconnectionEvent,
	QuerySubscriptionEvent,
	QueryUnsubscriptionEvent,
	QueryInvalidationEvent
} from "@rtrq/manager";

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
		maxBodySize,
	});
	
	// Set up authentication and authorization hooks
	server
		.onBeforeConnection((event: BeforeConnectionEvent) => {
			const authHeader = event.headers.authorization;
			const origin = event.headers.origin;
			const clientIp = event.headers["x-forwarded-for"] || event.headers["x-real-ip"];
			
			// Determine client type based on provided credentials
			const hasSecretKey = authHeader && (authHeader === secretKey || authHeader === `Bearer ${secretKey}`);
			const hasOrigin = !!origin;
			
			if (hasSecretKey) {
				// This is an application server connection
				console.log(`🔑 Server connection detected with valid secret key`);
				
				// Check allowed IPs if configured (servers must still respect IP restrictions)
				if (allowedIps && clientIp && allowedIps.indexOf(clientIp) === -1) {
					console.log(`🚫 Server connection denied: IP ${clientIp} not in allowed list`);
					event.deny(`IP address ${clientIp} not allowed`);
					return;
				}
				
				console.log(`✅ Server connection allowed`);
				event.allow();
			} else if (hasOrigin) {
				// This is a user client connection (browser)
				console.log(`🌐 User client connection detected from origin: ${origin}`);
				
				// Check CORS origin if configured
				if (corsOrigin && origin !== corsOrigin) {
					console.log(`🚫 Client connection denied: Invalid origin ${origin} (expected: ${corsOrigin})`);
					event.deny(`Origin ${origin} not allowed`);
					return;
				}
				
				// Check allowed IPs if configured
				if (allowedIps && clientIp && allowedIps.indexOf(clientIp) === -1) {
					console.log(`🚫 Client connection denied: IP ${clientIp} not in allowed list`);
					event.deny(`IP address ${clientIp} not allowed`);
					return;
				}
				
				console.log(`✅ User client connection allowed`);
				event.allow();
			} else {
				// Neither server credentials nor browser origin - reject
				console.log(`🚫 Connection denied: No valid authentication (missing secret key or origin header)`);
				event.deny("Authentication required: provide either secret key (servers) or origin header (browsers)");
			}
		})
		.onBeforeInvalidation((event: BeforeInvalidationEvent) => {
			// Check secret key authentication
			const authHeader = event.headers.authorization;
			const providedKey = authHeader?.startsWith("Bearer ") 
				? authHeader.slice(7) 
				: authHeader;
			
			if (providedKey !== secretKey) {
				console.log(`🚫 Invalidation denied: Invalid secret key provided`);
				event.deny("Invalid or missing secret key");
				return;
			}
			
			// Check allowed IPs if configured
			if (allowedIps) {
				const clientIp = event.headers["x-forwarded-for"] || event.headers["x-real-ip"];
				if (!clientIp || allowedIps.indexOf(clientIp) === -1) {
					console.log(`🚫 Invalidation denied: IP ${clientIp} not in allowed list`);
					event.deny(`IP address ${clientIp} not allowed`);
					return;
				}
			}
			
			// Allow the invalidation
			event.allow();
		});
	
	// Set up event listeners for monitoring
	server
		.onClientConnect((event: ClientConnectionEvent) => {
			console.log(`✅ Client connected: ${event.clientId} (total: ${event.totalConnections})`);
		})
		.onClientDisconnect((event: ClientDisconnectionEvent) => {
			console.log(`❌ Client disconnected: ${event.clientId} (remaining: ${event.remainingConnections})`);
			if (event.removedSubscriptions.length > 0) {
				console.log(`   Removed ${event.removedSubscriptions.length} subscription(s)`);
			}
		})
		.onQuerySubscribe((event: QuerySubscriptionEvent) => {
			console.log(`🔔 Query subscription: ${JSON.stringify(event.key)} by ${event.clientId} (subscribers: ${event.totalSubscribers})`);
		})
		.onQueryUnsubscribe((event: QueryUnsubscriptionEvent) => {
			console.log(`🔕 Query unsubscription: ${JSON.stringify(event.key)} by ${event.clientId} (remaining: ${event.remainingSubscribers})`);
		})
		.onQueryInvalidate((event: QueryInvalidationEvent) => {
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