# 🚀 ForgeAI

> **AI Workspace for Document RAG, Autonomous Agents, Custom Tools & Data Extraction.**

[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Express 5](https://img.shields.io/badge/Express_5_TS-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![BullMQ v5](https://img.shields.io/badge/BullMQ_v5-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Better Auth](https://img.shields.io/badge/Better_Auth_v1.6-black?style=flat-square&logo=auth0&logoColor=white)](https://www.better-auth.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

ForgeAI is a full-stack, enterprise-grade AI platform that unifies **Document RAG Search**, **Custom AI Agents**, **Dynamic Tool Execution**, and **Structured Output Parsing** into a single workspace.

---

## 🔥 Key Features

* 📄 **Document RAG & Embeddings**: Asynchronous PDF/DOCX parsing via **BullMQ 5 + Redis**, stored in **pgvector** with streaming citations.
* 🤖 **Autonomous AI Agents**: Custom system prompts, model controls, and dedicated knowledge bases.
* 🛠️ **Dynamic Tool Calling & MCP**: Build custom REST API tools with **JSON Schema** validation & native Model Context Protocol (`@modelcontextprotocol/sdk`) support.
* 📊 **Structured Data Extraction**: Parse invoices, resumes, and notes into validated JSON output.
* 🔐 **Multi-Tenant Auth & Storage**: Google & GitHub OAuth via **Better Auth v1.6** with S3/MinIO object storage (`@aws-sdk/client-s3`).

---

## ⚡ Quick Start

Launch the entire stack (Frontend, API, Postgres+pgvector, Redis, MinIO) in one command:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env

sudo docker compose up --build
```

* **Web App**: `http://localhost:3000`
* **API Server**: `http://localhost:3001`

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 16.2, React 19.2, TypeScript 5, Tailwind CSS 4, shadcn v4, TanStack Query v5
* **Backend**: Node.js >=20, Express 5.2 (TypeScript), Prisma 6.4, Zod, Better Auth 1.6
* **Data & Queue**: PostgreSQL (`pgvector`), Redis, BullMQ 5.41, MinIO S3 (`@aws-sdk/client-s3`)
* **AI & DevOps**: Groq API, Model Context Protocol (`@modelcontextprotocol/sdk`), Docker Compose

---

## 💼 Resume Highlights (Copy & Paste)

* **Full-Stack AI Engine**: Built a multi-tenant RAG platform using **Next.js 16**, **Express 5 (TypeScript)**, and **PostgreSQL `pgvector`** for document-grounded AI chat with citations.
* **Async Job Queue**: Engineered asynchronous document chunking and vector embedding pipelines offloaded to **BullMQ 5** & **Redis** background workers.
* **Custom Tool Execution**: Implemented dynamic JSON Schema API tool calling and integrated **Model Context Protocol (MCP)** server interfaces.
* **Cloud Architecture & DevOps**: Integrated AWS S3/MinIO presigned file uploads, OAuth multi-tenancy, and containerized deployment via **Docker Compose**.

---

<div align="center">
Made by <b>Kabir Jaipal</b>
</div>
