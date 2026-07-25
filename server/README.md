# Express + TypeScript Production Backend Template 🚀

[![CI/CD Pipeline](https://github.com/kabirjaipal/express-typescript-template/actions/workflows/ci.yml/badge.svg)](https://github.com/kabirjaipal/express-typescript-template/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-grade, lightweight, and database-agnostic **Express.js + TypeScript** template repository engineered for building scalable REST APIs, microservices, and modern web application backends.

---

## ✨ Features

- ⚡ **TypeScript-First**: Configured with strict type checking, ES modules (`"type": "module"`), and zero `any`.
- 🛡️ **Security Defaults**: Pre-configured with [Helmet](https://helmetjs.github.io/), CORS, and rate limiting.
- 🪵 **High-Performance Logging**: Structured logging via [Pino](https://getpino.io/) with custom `Intl` timestamp formatting and request correlation IDs (`x-request-id`).
- 🚨 **Centralized Error Handling**: Robust global exception handling with structured JSON error payloads and type-safe `AppError`.
- 🐳 **Docker Ready**: Includes an optimized multi-stage `Dockerfile`.
- 🔄 **Automated CI/CD**: Pre-configured GitHub Actions workflow for linting, type-checking, and building.

---

## 📁 Project Structure

```text
src/
├── controllers/       # Route request handlers
│   └── healthController.ts
├── lib/               # Shared utilities & services
│   ├── config.ts      # Strict Zod environment schema
│   └── logger.ts      # Pino logger configuration
├── middleware/        # Custom Express middlewares
│   ├── errorHandler.ts# Global error & 404 handler
│   ├── logging.ts     # HTTP request logging middleware
│   └── requestId.ts   # Correlation ID generator
├── routes/            # Express routers
│   ├── healthRoutes.ts
│   └── index.ts
├── types/             # Common TypeScript interfaces & declarations
│   └── index.ts
└── index.ts           # Server entry point & graceful shutdown
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/kabirjaipal/express-typescript-template.git
cd express-typescript-template
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

### 3. Run Development Server

```bash
npm run dev
```

Server will be running at `http://localhost:3000`.

---

## 🛠️ Available Scripts

- `npm run dev` - Start development server with hot-reload (`tsx watch`)
- `npm run build` - Compile TypeScript source to `dist/`
- `npm start` - Launch compiled production server
- `npm run lint` - Run ESLint checks and fixes
- `npm run format` - Format code with Prettier

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).