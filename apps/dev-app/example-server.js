#!/usr/bin/env node
/**
 * Simple RTRQ Server Example
 * 
 * This is a minimal example of how to create an RTRQ server using the manager package.
 * Use this for testing the RTRQ dev app.
 */

const { createRTRQ } = require('@rtrq/manager');

// Configuration
const PORT = process.env.PORT || 3001;
const ALLOWED_IPS = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [];

// Create RTRQ server
const server = createRTRQ({
  allowedIps: ALLOWED_IPS.length > 0 ? ALLOWED_IPS : undefined,
  maxBodySize: 1024 * 1024, // 1MB
});

// Event handlers for monitoring
server.onClientConnect((event) => {
  console.log(`📱 Client connected: ${event.clientId} (Total: ${event.totalConnections})`);
});

server.onClientDisconnect((event) => {
  console.log(`📱 Client disconnected: ${event.clientId} (Remaining: ${event.remainingConnections})`);
  if (event.removedSubscriptions.length > 0) {
    console.log(`🗑️  Removed subscriptions: ${event.removedSubscriptions.map(s => JSON.stringify(s)).join(', ')}`);
  }
});

server.onQuerySubscribe((event) => {
  console.log(`📊 Query subscribed: ${JSON.stringify(event.key)} by ${event.clientId} (Total subscribers: ${event.totalSubscribers})`);
});

server.onQueryUnsubscribe((event) => {
  console.log(`📊 Query unsubscribed: ${JSON.stringify(event.key)} by ${event.clientId} (Remaining subscribers: ${event.remainingSubscribers})`);
});

server.onQueryInvalidate((event) => {
  console.log(`🔄 Query invalidated: ${JSON.stringify(event.key)}`);
  console.log(`   📤 Notified ${event.notifiedClients} clients across ${event.matchedKeys.length} matching subscriptions`);
  if (event.matchedKeys.length > 0) {
    console.log(`   🎯 Matched keys: ${event.matchedKeys.map(k => JSON.stringify(k)).join(', ')}`);
  }
});

server.onBeforeInvalidate((event) => {
  console.log(`⏳ Before invalidation: ${JSON.stringify(event.key)} (${event.matchedKeys.length} matches)`);
  // Add any custom logic here to potentially prevent invalidation
  // event.preventDefault(); // Uncomment to prevent invalidation
});

// Start the server
console.log('🚀 Starting RTRQ Server...');
console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
console.log(`🌐 HTTP invalidation endpoint: http://localhost:${PORT}/invalidate`);
console.log(`🔐 Allowed IPs: ${ALLOWED_IPS.length > 0 ? ALLOWED_IPS.join(', ') : 'All IPs allowed'}`);
console.log('');

server.listen(PORT);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down RTRQ server...');
  console.log('✅ Server shut down gracefully');
  process.exit(0);
});

// Example usage information
console.log('💡 Usage examples:');
console.log('');
console.log('   Test WebSocket connection:');
console.log(`   wscat -c ws://localhost:${PORT}`);
console.log('');
console.log('   Trigger invalidation via HTTP:');
console.log(`   curl -X POST http://localhost:${PORT}/invalidate \\`);
console.log('     -H "Content-Type: application/json" \\');
console.log('     -d \'{"key": ["users"]}\'');
console.log('');
console.log('   Environment variables:');
console.log('   PORT=3001 - Server port');
console.log('   ALLOWED_IPS=127.0.0.1,192.168.1.100 - Comma-separated allowed IPs for /invalidate');
console.log('');
console.log('📖 Connect your RTRQ dev app to: ws://localhost:' + PORT);
console.log('💡 Use Ctrl+C to stop the server');
console.log('');