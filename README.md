# RTRQ - Real-Time Real-Quick

A monorepo containing the RTRQ system components.

## Project Overview

RTRQ bridges the gap between fully real-time applications and purely request-based applications. It leverages modern request caching and invalidation patterns to create a seamless real-time experience without the complexity of traditional real-time systems.

### Key Features

- **Global Query Invalidation**: By externalizing query keys into a global database, RTRQ enables cross-client query invalidation
- **Smart Real-time Updates**: When multiple users share the same query key and it's enabled as "realtime", updates are synchronized across all clients
- **Efficient Data Transfer**: Uses cache invalidation instead of data transfer over websockets, reducing bandwidth usage and ensuring data privacy
- **Server SDK**: Provides tools for backend-driven query invalidation after data changes

### How It Works

Consider a scenario where two users are viewing the same todo list:
1. User A adds a new item
2. During the API request, the associated query key is invalidated
3. Both User A (who knows about the pending update) and User B (who is unaware of the change) receive the invalidation
4. React Query automatically refetches the data for both users
5. The update is synchronized without sending the actual data over websockets

This approach combines the best of both worlds:
- The simplicity and reliability of request-based applications
- The real-time feel of websocket-based systems
- Reduced bandwidth usage through smart cache invalidation
- Enhanced data privacy by not broadcasting data changes

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `apps/manager`: The management interface for RTRQ
- `packages/server`: The core server implementation
- `packages/adapters`: Adapters for different data sources and sinks
  - `adapters/trpc`: tRPC adapter for RTRQ
  - `adapters/react-query`: React Query adapter for RTRQ
- `packages/core`: Core functionality and shared utilities
- `packages/eslint-config`: `eslint` configurations
- `packages/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```sh
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```sh
pnpm dev
```

### Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```sh
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```sh
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)
