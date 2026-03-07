# QZT Admin Dashboard

QZT (Enterprise CRM) Admin Dashboard

[中文](./README.md)

Admin Dashboard UI crafted with Shadcn and Vite. Built with responsiveness and accessibility in mind.

![alt text](public/images/shadcn-admin.png)

> This project is based on [Shadcn Admin](https://github.com/satnaing/shadcn-admin) template, customized for QZT project.

## Tech Stack

**UI:** [ShadcnUI](https://ui.shadcn.com) (TailwindCSS + RadixUI)

**Build Tool:** [Vite](https://vitejs.dev/)

**Routing:** [TanStack Router](https://tanstack.com/router/latest)

**Type Checking:** [TypeScript](https://www.typescriptlang.org/)

**Linting/Formatting:** [ESLint](https://eslint.org/) & [Prettier](https://prettier.io/)

**Icons:** [Lucide Icons](https://lucide.dev/icons/)

**API Client:** [Orval](https://orval.dev/) - OpenAPI TypeScript client generation

## Features

- Light/dark mode
- Responsive
- Accessible
- Built-in Sidebar component
- Global search command
- 10+ pages
- Extra custom components
- RTL support

## Run Locally

Clone the project

```bash
git clone https://github.com/Gyv12345/qzt.git
```

Go to the frontend directory

```bash
cd qzt/frontend
```

Install dependencies

```bash
pnpm install
```

Start the server

```bash
pnpm run dev
```

## Development Commands

```bash
# Development
pnpm dev

# Build
pnpm build

# Preview
pnpm preview

# Lint
pnpm lint

# Format
pnpm format

# Generate API client
pnpm generate:api

# Run tests
pnpm test
pnpm test:ui
pnpm test:headed
```

## License

MIT

---

> Based on [Shadcn Admin](https://github.com/satnaing/shadcn-admin) template
