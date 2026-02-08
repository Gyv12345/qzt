# QZT Backend

QZT Backend Service - NestJS API Server

[中文](./README.md)

## Tech Stack

| Technology | Version | Description |
|------------|---------|-------------|
| NestJS | ^10.0.0 | Progressive Node.js Framework |
| Prisma | ^5.7.1 | Modern ORM |
| TypeScript | ^5.1.3 | Type Safety |
| Redis | ^4.6.11 | Cache & Message Queue |
| BullMQ | ^5.67.2 | Job Queue |
| JWT | ^10.2.0 | JSON Web Token Authentication |
| Passport | ^10.0.3 | Authentication Middleware |

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env

# Generate Prisma Client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Start development server
pnpm start:dev

# API Documentation: http://localhost:7890/api-docs
```

## Project Structure

```
backend/
├── prisma/           # Prisma schema and migrations
├── src/
│   ├── auth/         # Authentication module (JWT, Passport, TOTP)
│   ├── cms/          # Content Management module
│   ├── contracts/    # Contract Management module
│   ├── customers/    # Customer Management module
│   ├── departments/  # Department Management module
│   ├── invoices/     # Invoice Management module
│   ├── logs/         # Logging module
│   ├── payments/     # Payment Management module
│   ├── permissions/  # Permission Management module
│   ├── products/     # Product Management module
│   ├── service-teams/# Service Team module
│   ├── system/       # System Configuration module
│   ├── users/        # User Management module
│   └── main.ts       # Application entry point
└── scripts/          # Utility scripts
```

## API Conventions

### Naming Conventions

- **@ApiTags** must use English tags (e.g., `'users'`, `'customers'`)
- Controller naming: `XxxController`
- Service naming: `XxxService`
- Module naming: `XxxModule`

### Response Format

**Success Response**
```typescript
// Single resource
{
  data: { id: 1, name: "xxx" }
}

// Paginated data
{
  data: [...],
  total: 100,
  page: 1,
  pageSize: 10,
  totalPages: 10
}
```

**HTTP Status Codes**
- `200` - Success (GET, PUT, PATCH)
- `201` - Created (POST)
- `204` - No Content (DELETE)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Development Commands

```bash
# Build
pnpm build

# Lint
pnpm lint

# Format
pnpm format

# Run tests
pnpm test
pnpm test:e2e
pnpm test:cov

# Prisma commands
pnpm prisma:generate    # Generate Prisma Client
pnpm prisma:migrate     # Run migrations
pnpm prisma:studio      # Open Prisma Studio

# PM2 management (production)
pnpm pm2:start
pnpm pm2:stop
pnpm pm2:restart
pnpm pm2:logs
pnpm pm2:monit
```

## Environment Variables

See `.env.example` for the complete environment variables list:

```bash
# Database
DATABASE_URL=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=

# Redis
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

# Alibaba Cloud OSS (optional)
ALI_OSS_REGION=
ALI_OSS_ACCESS_KEY_ID=
ALI_OSS_ACCESS_KEY_SECRET=
ALI_OSS_BUCKET=
```

## License

MIT
