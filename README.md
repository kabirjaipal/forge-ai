<div align="center">

  <h1>🚀 ForgeAI</h1>

  <p><b>Enterprise AI Workspace for Document RAG, Autonomous Agents, Custom Tools & Structured Data Extraction</b></p>

  <p>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
    <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express_TS-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Express TS" /></a>
    <a href="https://github.com/pgvector/pgvector"><img src="https://img.shields.io/badge/PostgreSQL_pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="pgvector" /></a>
    <a href="https://redis.io/"><img src="https://img.shields.io/badge/BullMQ_Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="BullMQ" /></a>
    <a href="https://www.better-auth.com/"><img src="https://img.shields.io/badge/Better_Auth-black?style=flat-square&logo=auth0&logoColor=white" alt="Better Auth" /></a>
    <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" /></a>
  </p>

  ---
</div>

## 💡 Overview

**ForgeAI** is a full-stack, enterprise-grade AI workspace unifying **Document RAG Search**, **Autonomous AI Agents**, **Dynamic Tool Execution (MCP & REST)**, and **Structured Data Extraction** into a single micro-decoupled platform.

---

## ✨ Key Features

* 📄 **Document RAG & Embeddings**: Async PDF/DOCX chunking via **BullMQ + Redis**, vector search in **pgvector**, and streaming citations.
* 🤖 **Autonomous AI Agents**: Custom system prompts, model controls (temperature, max tokens), and workspace knowledge isolation.
* 🛠️ **Dynamic Tools & MCP**: Register REST APIs with JSON schema validation & native Model Context Protocol (`@modelcontextprotocol/sdk`) support.
* 📊 **Structured Extraction**: Convert unstructured PDFs, resumes, and notes into strictly validated JSON payloads.
* 🔐 **Multi-Tenant Auth & Storage**: Google & GitHub OAuth via **Better Auth** with S3/MinIO document storage.

---

## ⚡ Quick Start

Launch the entire stack (Web App, API, Postgres+pgvector, Redis, MinIO) with Docker:

```bash
# 1. Setup environment files
cp server/.env.example server/.env
cp client/.env.example client/.env

# 2. Start the full stack
docker compose up --build
```

* 🌐 **Web Interface**: [http://localhost:3000](http://localhost:3000)
* 🔌 **API Server**: [http://localhost:3001](http://localhost:3001)
* 📦 **MinIO Storage**: [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`)

---

## 🛠️ Tech Stack

* **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
* **Backend**: Node.js, Express, Prisma, Zod, Better Auth, Pino
* **Data & Queue**: PostgreSQL (`pgvector`), Redis, BullMQ, MinIO S3 (`@aws-sdk/client-s3`)
* **AI Engine**: Groq API, HuggingFace Transformers, Model Context Protocol (`@modelcontextprotocol/sdk`)

---

## 📂 Repository Structure

```
ForgeAI/
├── client/          # Next.js Frontend (App Router, shadcn/ui, TanStack Query)
├── server/          # Express TypeScript API (Prisma, BullMQ, Better Auth)
├── docker-compose.yml
└── README.md
```

---

<div align="center">
  Crafted by <b>Kabir Jaipal</b> • Licensed under <b>MIT</b>
</div>
