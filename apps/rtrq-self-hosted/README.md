# RTRQ Self-Hosted Server

A batteries-included, self-hosted RTRQ server that you can deploy anywhere. This application provides a console-based RTRQ server with comprehensive logging and security features.

## Features

- 🔐 **Secret Key Authentication**: Secure invalidation endpoint with Bearer token authentication
- 🌐 **CORS Support**: Optional origin validation for WebSocket connections
- 🛡️ **IP Whitelisting**: Optional IP address restrictions for both connections and invalidations
- 📊 **Real-time Monitoring**: Comprehensive logging of all server events
- ⚙️ **Environment-based Configuration**: Fully configurable via environment variables
- 🚀 **Easy Deployment**: Single binary with minimal dependencies

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   pnpm install
   ```

2. **Create your environment configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server:**
   ```bash
   # For development
   pnpm start:dev
   
   # For production (after building)
   pnpm build
   pnpm start
   ```

## Configuration

All configuration is done via environment variables:

### Required Variables

- `PORT`: Port number for the server (e.g., `8080`)
- `RTRQ_SECRET_KEY`: Secret key required for invalidation requests

### Optional Variables

- `RTRQ_CORS_ORIGIN`: Allowed origin for WebSocket connections (e.g., `https://myapp.com`)
- `RTRQ_ALLOWED_IPS`: Comma-separated list of allowed IP addresses (e.g., `192.168.1.100,10.0.0.5`)
- `RTRQ_MAX_BODY_SIZE`: Maximum request body size in bytes (default: 1MB)
- `NODE_ENV`: Node environment (`development`, `test`, `production`)

### Example Configuration

```env
# Required
PORT=8080
RTRQ_SECRET_KEY=your-super-secret-key-here

# Optional - Enable CORS for a specific domain
RTRQ_CORS_ORIGIN=https://myapp.com

# Optional - Restrict to specific IPs
RTRQ_ALLOWED_IPS=192.168.1.100,10.0.0.5

# Optional - Increase max body size to 5MB
RTRQ_MAX_BODY_SIZE=5242880
```

## Usage

### Client Connections

WebSocket clients can connect to:
```
ws://localhost:8080/
```

### Invalidating Queries

Send POST requests to the invalidation endpoint:
```bash
curl -X POST http://localhost:8080/invalidate \
  -H "Authorization: Bearer your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"key": ["todos", "user-123"]}'
```

### Response Format

**Success Response:**
```json
{
  "message": "Key invalidated successfully"
}
```

**Error Responses:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing secret key"
}
```

## Security Features

### Authentication
- All invalidation requests require a valid secret key
- Secret key can be provided as `Authorization: Bearer <key>` or `Authorization: <key>`

### Access Control
- **CORS**: Optionally restrict WebSocket connections to specific origins
- **IP Whitelisting**: Optionally restrict both connections and invalidations to specific IP addresses
- **Request Size Limits**: Configurable maximum request body size

### Headers Checked
- `Origin` header for CORS validation
- `Authorization` header for secret key authentication
- `X-Forwarded-For` and `X-Real-IP` headers for IP validation

## Monitoring and Logging

The server provides comprehensive logging for all events:

- ✅ **Client Connections**: When clients connect/disconnect
- 🔔 **Subscriptions**: When clients subscribe/unsubscribe to queries
- 🔄 **Invalidations**: When queries are invalidated and how many clients were notified
- 🚫 **Security Events**: When connections or invalidations are denied

### Example Log Output

```
🚀 Starting RTRQ Self-Hosted Server...

📋 Configuration:
   Port: 8080
   Secret Key: ************ (24 characters)
   CORS Origin: https://myapp.com
   Allowed IPs: All IPs allowed
   Max Body Size: 1.0MB

✅ Client connected: client-1 (total: 1)
🔔 Query subscription: ["todos","user-123"] by client-1 (subscribers: 1)
🔄 Query invalidated: ["todos","user-123"] (notified 1 clients)
❌ Client disconnected: client-1 (remaining: 0)
```

## Deployment

### Docker (Recommended)

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

### Environment Variables in Production

```bash
# Set your environment variables
export PORT=8080
export RTRQ_SECRET_KEY="your-production-secret-key"
export RTRQ_CORS_ORIGIN="https://yourapp.com"
export NODE_ENV=production

# Start the server
node dist/index.js
```

### Process Management

For production deployment, consider using a process manager:

```bash
# With PM2
pm2 start dist/index.js --name rtrq-server

# With systemd (create a service file)
sudo systemctl start rtrq-server
```

## Development

```bash
# Install dependencies
pnpm install

# Start in development mode with hot reload
pnpm start:dev

# Build for production
pnpm build

# Run linting
pnpm lint

# Run type checking
pnpm typecheck
```

## Architecture

This self-hosted server is built on top of the `@rtrq/manager` package and uses event-driven hooks for authentication and authorization:

- **Connection Control**: Uses `onBeforeConnection` events to validate CORS and IP restrictions
- **Invalidation Control**: Uses `onBeforeInvalidation` events to validate secret keys and IP restrictions
- **Pure Data Broker**: The underlying manager remains a pure data broker without security logic

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Ensure `PORT` and `RTRQ_SECRET_KEY` are set

2. **"Connection denied: Invalid origin"**
   - Check your `RTRQ_CORS_ORIGIN` setting matches your client's origin

3. **"IP address not allowed"**
   - Verify the client's IP is in the `RTRQ_ALLOWED_IPS` list
   - Check that reverse proxy headers (`X-Forwarded-For`) are configured correctly

4. **"Invalid or missing secret key"**
   - Ensure the `Authorization` header contains the correct secret key
   - Verify the secret key matches exactly (no extra spaces)

### Debug Mode

Set `NODE_ENV=development` for more verbose logging during development.

## License

ISC