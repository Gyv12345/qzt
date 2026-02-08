# QZT Website

QZT Official Website - Next.js 15 Marketing Site

[中文](./README.md)

## Tech Stack

| Technology | Version | Description |
|------------|---------|-------------|
| Next.js | ^15.1.6 | React Framework |
| React | ^19.2.4 | UI Library |
| Tailwind CSS | ^4.1.18 | Utility-first CSS |
| shadcn/ui | - | Component Library |
| Framer Motion | ^12.33.0 | Animation Library |

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env.local

# Start development server
pnpm dev

# Visit: http://localhost:5180
```

## Project Structure

```
website/
├── app/              # Next.js App Router
│   ├── articles/     # Articles pages
│   ├── cases/        # Case studies pages
│   ├── globals.css   # Global styles
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Homepage
├── components/       # React components
│   ├── layout/       # Layout components
│   ├── sections/     # Page sections
│   └── ui/           # UI components
└── lib/              # Utility functions
```

## Features

- **Homepage**: Product introduction, feature showcase
- **Articles**: Tech blog, product updates
- **Case Studies**: Customer cases, success stories
- **Responsive Design**: Mobile and desktop support

## Development Commands

```bash
# Development
pnpm dev

# Build
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint
```

## License

MIT
