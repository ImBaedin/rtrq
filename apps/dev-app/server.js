const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

console.log('🚀 RTRQ Test Server running on ws://localhost:8080');

// Store connected clients
const clients = new Set();

// Store active subscriptions per client
const clientSubscriptions = new Map();

wss.on('connection', (ws) => {
  console.log('📱 Client connected');
  clients.add(ws);
  clientSubscriptions.set(ws, new Set());

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    version: '1.0.0',
    timestamp: new Date(),
    source: 'rtrq-server',
    payload: {
      message: 'Connected to RTRQ test server',
      clientId: Math.random().toString(36).substr(2, 9)
    }
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received message:', message);

      const clientSubs = clientSubscriptions.get(ws);

      switch (message.type) {
        case 'subscription':
          const subKey = JSON.stringify(message.payload.key);
          clientSubs.add(subKey);
          console.log(`✅ Client subscribed to: ${subKey}`);
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'subscription_confirmed',
            version: '1.0.0',
            timestamp: new Date(),
            source: 'rtrq-server',
            payload: {
              key: message.payload.key,
              status: 'subscribed'
            }
          }));
          break;

        case 'unsubscription':
          const unsubKey = JSON.stringify(message.payload.key);
          clientSubs.delete(unsubKey);
          console.log(`❌ Client unsubscribed from: ${unsubKey}`);
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'unsubscription_confirmed',
            version: '1.0.0',
            timestamp: new Date(),
            source: 'rtrq-server',
            payload: {
              key: message.payload.key,
              status: 'unsubscribed'
            }
          }));
          break;

        default:
          console.log('❓ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('📱 Client disconnected');
    clients.delete(ws);
    clientSubscriptions.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Simulate server-side invalidations for testing
setInterval(() => {
  if (clients.size === 0) return;

  const testKeys = [
    ['users'],
    ['posts'],
    ['comments'],
    ['stats'],
    ['optional', 'query1'],
    ['optional', 'query2']
  ];

  // Randomly pick a key to invalidate
  const randomKey = testKeys[Math.floor(Math.random() * testKeys.length)];
  const keyString = JSON.stringify(randomKey);

  // Find clients subscribed to this key
  const subscribedClients = [];
  for (const [client, subscriptions] of clientSubscriptions.entries()) {
    if (subscriptions.has(keyString) && client.readyState === WebSocket.OPEN) {
      subscribedClients.push(client);
    }
  }

  if (subscribedClients.length > 0) {
    const invalidationMessage = {
      type: 'invalidation',
      version: '1.0.0',
      timestamp: new Date(),
      source: 'rtrq-server',
      payload: {
        key: randomKey,
        invalidationRecievedAt: new Date(),
        reason: 'automatic_test_invalidation'
      }
    };

    subscribedClients.forEach(client => {
      client.send(JSON.stringify(invalidationMessage));
    });

    console.log(`🔄 Sent invalidation for ${keyString} to ${subscribedClients.length} client(s)`);
  }
}, 15000); // Every 15 seconds

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  wss.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});

console.log('🔄 Automatic invalidations will be sent every 15 seconds');
console.log('💡 Use Ctrl+C to stop the server');