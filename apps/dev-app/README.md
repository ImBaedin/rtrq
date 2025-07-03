# RTRQ Development Dashboard

A comprehensive development and testing environment for RTRQ (Real-Time React Query) that demonstrates real-time query invalidation capabilities.

## Features

- **🔌 Real-time Connection Status**: Monitor WebSocket connection state
- **📊 Active Query Monitoring**: View all currently subscribed React Query instances
- **📝 Interaction Logging**: Real-time log of all RTRQ events and communications
- **⚡ Server Actions**: Trigger manual and server-side invalidations
- **📈 Query Cache Analytics**: Detailed React Query cache information
- **🎛️ Dynamic Query Management**: Enable/disable optional queries on-the-fly

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build RTRQ Packages

From the workspace root:

```bash
# Build core package
cd packages/core && pnpm build

# Build React Query adapter
cd ../adapters/react-query && pnpm build
```

### 3. Start the Test Server (Optional)

The dev app includes a test WebSocket server that simulates RTRQ backend behavior:

```bash
# In a separate terminal
cd apps/dev-app
node server.js
```

The test server will:
- Accept WebSocket connections on `ws://localhost:8080`
- Handle subscription/unsubscription messages
- Send automatic invalidations every 15 seconds
- Log all interactions to the console

### 4. Start the Development App

```bash
cd apps/dev-app
pnpm dev
```

The app will be available at `http://localhost:3000`

## Using the Dashboard

### Connection Status

The top-right badge shows the current WebSocket connection status:
- **🟢 Connected**: Successfully connected to RTRQ server
- **🟡 Connecting**: Attempting to establish connection
- **🔴 Disconnected**: No active connection
- **🔴 Error**: Connection failed

### Active Query Subscriptions

View and manage all active React Query subscriptions:

#### Core Queries (Always Active)
- **Users Query** (`['users']`) - Fetches user data
- **Posts Query** (`['posts']`) - Fetches blog posts
- **Comments Query** (`['comments']`) - Fetches comment data
- **Stats Query** (`['stats']`) - Fetches dashboard statistics

#### Optional Queries (Toggleable)
- **Optional Query 1** (`['optional', 'query1']`) - Can be enabled/disabled
- **Optional Query 2** (`['optional', 'query2']`) - Can be enabled/disabled

Each query shows:
- Current status (Loading, Success, Error)
- Manual refresh button
- Query key information

### Server Actions

Test different invalidation scenarios:

#### Manual Invalidations
- **Invalidate Users**: Manually refresh user data
- **Invalidate Posts**: Manually refresh post data
- **Invalidate All**: Refresh all core queries at once

#### Server-Side Triggers
- **Server Invalidate Users**: Simulate server-triggered user data update
- **Server Invalidate Stats**: Simulate server-triggered stats update
- **Bulk Server Invalidate**: Trigger multiple server-side invalidations

### Interaction Log

Real-time log showing:
- **Connection Events**: WebSocket connection changes
- **Subscription Events**: Query subscriptions/unsubscriptions
- **Invalidation Events**: Both manual and server-triggered invalidations
- **Query Events**: Cache operations and query state changes

Each log entry includes:
- Event type badge
- Precise timestamp
- Event details and payload information

### Query Cache Analytics

Monitor React Query cache health:
- **Total Queries**: All queries in the cache
- **Active Queries**: Queries with active observers
- **Stale Queries**: Queries that need refreshing
- **Loading Queries**: Currently fetching queries

### Data Preview

See actual query results:
- Sample user data
- Recent posts
- Live statistics
- Query cache metadata

## Architecture

### RTRQ Integration

The app demonstrates RTRQ's key features:

1. **Automatic Subscription Management**: Queries are automatically subscribed to the WebSocket when they become active
2. **Real-time Invalidation**: Server can invalidate specific queries in real-time
3. **Connection Resilience**: Automatic reconnection on connection loss
4. **Type Safety**: Full TypeScript support for query keys and payloads

### Query Key Strategy

The app uses a structured query key approach:
- `['users']` - User data
- `['posts']` - Blog posts
- `['comments']` - User comments
- `['stats']` - Dashboard statistics
- `['optional', 'query1']` - Optional feature data
- `['optional', 'query2']` - Additional optional data

### WebSocket Protocol

Messages follow the RTRQ protocol specification:

```typescript
// Client to Server
{
  type: 'subscription' | 'unsubscription',
  version: string,
  timestamp: Date,
  source: 'rtrq-client',
  payload: { key: QueryKey }
}

// Server to Client
{
  type: 'invalidation',
  version: string,
  timestamp: Date,
  source: 'rtrq-server',
  payload: { 
    key: QueryKey,
    invalidationRecievedAt: Date 
  }
}
```

## Development Tips

### Testing Scenarios

1. **Connection Loss**: Stop the server to test reconnection behavior
2. **Rapid Invalidations**: Use bulk server invalidate to test performance
3. **Selective Updates**: Enable/disable optional queries to test subscription management
4. **Cache Behavior**: Use cache clear to test query refetching

### Extending the App

- Add new query types in the main component
- Modify `server.js` to test different invalidation patterns
- Customize logging to capture specific events
- Add query mutation testing

### Debugging

- Check browser console for detailed RTRQ logs
- Monitor server console for WebSocket events
- Use React Query DevTools for cache inspection
- Review interaction log for event sequence

## Troubleshooting

### Common Issues

**Connection Failed**
- Ensure the test server is running on port 8080
- Check firewall settings
- Verify WebSocket support in browser

**Queries Not Updating**
- Confirm queries are actively subscribed (have observers)
- Check server logs for invalidation messages
- Verify query keys match between client and server

**Build Errors**
- Ensure RTRQ packages are built (`pnpm build` in each package)
- Clear node_modules and reinstall if needed
- Check TypeScript compilation errors

## Contributing

When adding features to the dev app:
1. Maintain backward compatibility with RTRQ core
2. Add comprehensive logging for new interactions
3. Update this README with new features
4. Test with both connected and disconnected states
