# aFlow

Workflow automation platform for building and executing automated workflows with triggers and actions.

## Demo

[aflow.site](https://aflow.site)

## Account for Testing

test@gmail.com:123456

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Queue**: BullMQ (Redis)
- **Authentication**: Clerk
- **Monorepo**: pnpm workspaces, Turborepo

## Project Structure

```
aflow/
├── apps/
│   ├── web/          # Next.js frontend application
│   ├── api/          # Express.js REST API
│   └── worker/       # BullMQ background worker
├── packages/
│   ├── db/           # Prisma database package
│   ├── queue/        # BullMQ queue configuration
│   ├── workflow-core/ # Workflow execution engine
│   └── integrations/ # Action integrations (HTTP, Email, Database, Telegram)
```

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
# Copy .env.example files in each app/package directory
```

### Development

```bash
# Start all services in development mode
pnpm dev

# Build all packages and apps
pnpm build

# Run linter
pnpm lint
```

### Local Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker compose up -d
```

## API Documentation

Once the API is running, Swagger UI is available at:

```
http://localhost:3001/api-docs
```

## Deployment

The project is configured for deployment on Railway:

- Each service (`web`, `api`, `worker`) has a `nixpacks.toml` configuration
- Services can be deployed independently
- PostgreSQL and Redis plugins should be added in Railway dashboard

See individual service directories for deployment-specific configuration.

## License

Private
