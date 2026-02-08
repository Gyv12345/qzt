# QZT Packages

QZT Monorepo Shared Packages Directory

[中文](./README.md)

## Packages

### [@qzt/shared-types](./shared-types/)

Shared TypeScript type definitions for frontend and backend.

**Tech Stack**: TypeScript, Zod

**Usage**:
- API response type definitions
- Shared data models
- Type-safe validation

**How to use**:
```typescript
// Backend
import { PaginatedResponseDto } from '@qzt/shared-types'

// Frontend
import { type Customer } from '@qzt/shared-types'
```

## Development Commands

```bash
# Build all packages
pnpm -F @qzt/shared-types build

# Development mode (watch)
pnpm -F @qzt/shared-types dev

# Type check
pnpm -F @qzt/shared-types type-check
```

## License

MIT
