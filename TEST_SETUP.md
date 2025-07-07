# RTRQ Test Setup

This document describes the comprehensive test suite for the RTRQ (Real-Time Real-Quick) system.

## Overview

The test suite is organized into three main categories:

1. **Pure Functions Tests** - Testing utility functions and core logic
2. **Unit Tests** - Testing individual components in isolation
3. **Integration Tests** - Testing running instances and real interactions

## Test Structure

### Pure Functions Tests (`packages/utils/src/`)

Tests for utility functions that have no side effects:

- `versionCheck.test.ts` - Tests version compatibility checking
- `matcher.test.ts` - Tests key matching logic (prefix/exact matching)
- `validator.test.ts` - Tests packet validation schemas

### Manager Tests (`packages/manager/src/`)

Tests for the RTRQ server manager:

- `server.test.ts` - Unit tests for RTRQServer class
- `server.integration.test.ts` - Integration tests with real WebSocket connections
- `invalidation-api.test.ts` - Tests for HTTP invalidation API endpoint

### Core Client Tests (`packages/core/src/`)

Tests for the client-side WebSocket client:

- `client.test.ts` - Unit tests for WebSocketClient class

## Running Tests

### Prerequisites

Install dependencies:
```bash
pnpm install
```

### Run All Tests

```bash
pnpm test
```

### Run Tests by Package

```bash
# Utils tests
cd packages/utils && pnpm test

# Manager tests
cd packages/manager && pnpm test

# Core tests
cd packages/core && pnpm test
```

### Watch Mode

```bash
pnpm test:watch
```

### Coverage

```bash
pnpm test:coverage
```

## Test Features

### Pure Functions Testing

The utils package tests cover:

- **Version Checking**: Validates semver compatibility between client and server
- **Key Matching**: Tests prefix and exact matching for query invalidation
- **Packet Validation**: Ensures message schemas are properly validated

### Unit Testing

Unit tests use mocking to isolate components:

- **RTRQServer**: Tests event handling, client management, and invalidation logic
- **WebSocketClient**: Tests connection handling, message processing, and error scenarios

### Integration Testing

Integration tests use real connections:

- **WebSocket Communication**: Tests actual WebSocket connections between client and server
- **HTTP API**: Tests the REST invalidation endpoint
- **Multi-client Scenarios**: Tests behavior with multiple connected clients
- **Error Handling**: Tests graceful degradation and error recovery

## Test Utilities

### Mocking

The test suite uses Vitest's mocking capabilities:

- **WebSocket Mocking**: Custom MockWebSocket class for controlled testing
- **HTTP Mocking**: Fetch API mocking for HTTP endpoint tests
- **Module Mocking**: Mocking external dependencies like uWebSockets.js

### Test Helpers

- **Random Port Assignment**: Prevents port conflicts in parallel test runs
- **Async Test Utilities**: Helpers for managing async operations and timers
- **Event Simulation**: Methods to simulate WebSocket events and messages

## Key Test Scenarios

### Connection Management

- Client connection/disconnection
- Reconnection logic
- Multiple client handling
- Connection error scenarios

### Message Processing

- Subscription/unsubscription messages
- Invalidation message broadcasting
- Invalid message handling
- Version compatibility checking

### Query Invalidation

- Exact key matching
- Prefix key matching
- Cross-client invalidation
- Prevention of invalidation

### Error Handling

- Network errors
- Invalid JSON
- Schema validation failures
- Resource limits (body size, IP restrictions)

## Test Environment

### Dependencies

The test suite uses:

- **Vitest**: Testing framework
- **WebSocket (ws)**: For integration testing
- **Mock utilities**: For isolating components

### Configuration

Test configuration is handled by:

- `vitest.config.ts` files in each package
- `__tests__/setup.ts` files for test environment setup
- Package-specific test scripts

## Performance Considerations

### Test Isolation

- Each test runs in isolation with proper cleanup
- Ports are randomly assigned to prevent conflicts
- Mocks are reset between tests

### Timeout Management

- Integration tests include appropriate timeouts
- Async operations are properly awaited
- Test cleanup prevents hanging processes

## Continuous Integration

The test suite is designed to run in CI environments:

- No external dependencies required
- Random port usage prevents conflicts
- Comprehensive error handling
- Coverage reporting

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Tests use random ports, but conflicts can still occur
2. **Async Timing**: Some tests may need adjustment for slower environments
3. **Mock Cleanup**: Ensure mocks are properly restored between tests

### Debug Mode

Run tests with debug output:

```bash
DEBUG=* pnpm test
```

### Verbose Output

```bash
pnpm test --reporter=verbose
```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Include both positive and negative test cases
4. Add proper cleanup for integration tests
5. Update this documentation for new test categories