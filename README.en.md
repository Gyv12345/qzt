# QZT (Enterprise CRM)

<div align="center">

<!-- Basics -->
![Version](https://img.shields.io/badge/version-2026.02.08.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E=20.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.9.3-3178C6)

<!-- Backend Stack -->
![NestJS](https://img.shields.io/badge/nestjs-10.0.0-E0234E?style=flat-square&logo=nestjs)
![Prisma](https://img.shields.io/badge/prisma-5.7.1-0C344B?style=flat-square&logo=prisma)
![Redis](https://img.shields.io/badge/redis-4.6.11-DC382D?style=flat-square&logo=redis)

<!-- Frontend Stack -->
![React](https://img.shields.io/badge/react-19.2.3-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/vite-7.3.0-646CFF?style=flat-square&logo=vite)
![Tailwind](https://img.shields.io/badge/tailwind-4.1.18-06B6D4?style=flat-square&logo=tailwind-css)
![TanStack](https://img.shields.io/badge/tanstack--query-5.90.12-FF4154?style=flat-square)

<!-- Dev Tools -->
![PNPM](https://img.shields.io/badge/pnpm-monorepo-F69220?style=flat-square&logo=pnpm)
![PM2](https://img.shields.io/badge/pm2-5.4.2-2B037A?style=flat-square&logo=pm2)

<!-- Status -->
![Development](https://img.shields.io/badge/status-active-success)
![AI](https://img.shields.io/badge/AI-Glm--4.7-8B5CF6?style=flat-square)

<br/>

> Enterprise Customer Relationship Management System - Fifth Edition

A modern CRM system developed with **Claude Code** + **GLM-4.7**. Started in September 2025, it went through five major refactors before settling on this technology stack.

[Live Demo](#) · [Quick Start](#quick-start) · [Features](#feature-modules) · [Documentation](#development-philosophy) · [中文](./README.md)

**⭐ If this project helps you, please give a Star**

</div>

---

## Tech Stack

### Backend
![NestJS](https://img.shields.io/badge/NestJS-10.0.0-E0234E?style=flat-square&logo=nestjs)
![Prisma](https://img.shields.io/badge/Prisma-5.7.1-0C344B?style=flat-square&logo=prisma)
![TypeScript](https://img.shields.io/badge/TypeScript-5.1.3-3178C6?style=flat-square&logo=typescript)

| Technology | Version | Description |
|------------|---------|-------------|
| NestJS | ^10.0.0 | Progressive Node.js framework |
| Prisma | ^5.7.1 | Modern ORM |
| JWT | ^10.2.0 | JSON Web Token authentication |
| Passport | ^10.0.3 | Authentication middleware |
| BullMQ | ^5.67.2 | Redis-based job queue |
| Redis | ^4.6.11 | Caching and message queue |

### Frontend
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-7.3.0-646CFF?style=flat-square&logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-4.1.18-06B6D4?style=flat-square&logo=tailwind-css)

| Technology | Version | Description |
|------------|---------|-------------|
| React | 19.2.3 | UI framework |
| TanStack Router | ^1.141.2 | Type-safe routing |
| TanStack Query | ^5.90.12 | Server state management |
| shadcn/ui | - | Copy-paste component library |
| Tailwind CSS | ^4.1.18 | Utility-first CSS framework |
| react-i18next | ^16.5.4 | Internationalization |
| Recharts | ^3.6.0 | Data visualization |

### Development Tools
| Tool | Purpose |
|------|---------|
| pnpm | Monorepo package management |
| Orval | OpenAPI client generation |
| PM2 | Production process management |
| Playwright | E2E testing |

### AI-Assisted Development
- **Primary Model**: GLM-4.7
- **Tool**: Claude Code

---

## Project Timeline

| Version | Time | Tech Stack | Result |
|---------|------|------------|--------|
| First Edition | Sept 2025 | Java Distributed → Monolith | ❌ Severe AI hallucinations, chaotic code |
| Second Edition | Oct 2025 | React + Node.js | ❌ Unfamiliar stack, difficult debugging |
| Third Edition | Nov 2025 | Java + Custom Frontend | ❌ Unresolvable white screen issues |
| Fourth Edition | Nov 2025 - Jan 2026 | Java + Outsourced Frontend | ❌ Slow progress, messy API definitions |
| **Fifth Edition** | **Feb 2026 - Present** | **NestJS + React** | ✅ **OpenAPI contract, frontend-backend sync** |

---

## Development Philosophy

### Vibe Coding Insights

1. **Skills are Key**: Development efficiency skyrocketed after Claude Code's Skill feature was released
2. **Context Awareness**: AI needs complete code context, not fragmented instructions
3. **Convention over Configuration**: Enforcing frontend-backend API contracts through OpenAPI
4. **Know Your Limits**: Without top-tier models, choose traditional CRUD projects and avoid over-engineering

---

## Project Statistics

<div align="center">

| Metric | Value |
|--------|-------|
| 📦 Backend TS/TSX Files | 202 |
| 🎨 Frontend TS/TSX Files | 526 |
| 📄 Total Lines of Code | ~30,000+ |
| 🔧 NPM Dependencies | ~80+ |
| 📅 Development Cycle | 5 months |
| 🔄 Major Refactors | 5 |

</div>

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Gyv12345/qzt.git
cd qzt

# Install dependencies
pnpm install

# Start development services
./start-dev.sh

# Frontend: http://localhost:3456
# Backend: http://localhost:7890
# API Docs: http://localhost:7890/api-docs
```

---

## Feature Modules

- 👥 **User Management**: User CRUD, role assignment, department management
- 🏢 **Customer Management**: Customer info, follow-up records, statistics dashboard
- 📄 **Contract Management**: Full contract lifecycle management
- 💰 **Product Management**: Product and service configuration
- 🔐 **Two-Factor Auth**: TOTP verification, backup codes
- 📊 **Logging System**: Login logs, operation logs

---

## Development Mode Evolution

### Early Mode (Sept 2025 - Dec 2025)
- Used Superpower plugin
- Manual context management
- Frequent AI tool switching

### Current Mode (Feb 2026 onwards)
- **Plan Mode**: Plan first, execute later
- **Conductor IDE**: Multi-track parallel development
- **Single Model Flow**: Avoid switching during peak hours, maintain consistency

---

## Why the Fifth Edition?

### Problems with Previous Editions

1. **Unfamiliar Tech Stack**: High learning curve for React/Node/TypeScript
2. **Frontend-Backend Separation Costs**: API definitions, integration testing, version management
3. **AI Capability Limits**: Model hallucinations, context loss, slowdowns during peak hours
4. **Project Management**: Outsourced collaboration, uncontrollable progress

### Improvements in Fifth Edition

1. **OpenAPI-Driven**: Backend first, generate frontend APIs, type-safe
2. **Unified Development**: Single codebase using pnpm workspace
3. **Skill Reuse**: Accumulate best practices, reduce repetitive communication
4. **Reality Check**: Top models are expensive, GLM is good enough

---

## Acknowledgments

- [Claude Code Infrastructure Showcase](https://github.com/diet103/claude-code-infrastructure-showcase) - @diet103's Vibe Coding practice sharing, experience from months of development and hundreds of thousands of lines of code
- [shadcn-admin](https://github.com/satnaing/shadcn-admin) - Excellent shadcn/ui + React Admin template, providing ready-to-use CRUD architecture
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful React component library
- Zhipu AI - High-volume, cost-effective AI services

---

## License

MIT

---

> "From September to now, I've accumulated a lot of vibe coding experience. I don't have access to top-tier models, so I focus on traditional management projects. But so what? Slow is fast."
