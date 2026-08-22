---
title: Bismi POS Backend
emoji: 🐔
colorFrom: red
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# Bismi Chicken POS — Backend API

Production-grade modular monolith backend for Bismi Chicken Shop POS.

## Environment Variables to Configure in Hugging Face Settings -> Variables and Secrets:

| Secret / Variable Name | Value |
| --- | --- |
| `DATABASE_URL` | Your Neon PostgreSQL connection string (`postgresql://neondb_owner:...`) |
| `JWT_SECRET` | `bismi-pos-super-secure-production-jwt-secret-key-2026` |
| `JWT_REFRESH_SECRET` | `bismi-pos-super-secure-production-refresh-secret-2026` |
| `PORT` | `7860` |
| `NODE_ENV` | `production` |
