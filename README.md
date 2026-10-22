# 💰 CoinTrail

A personal expense tracker for everyday spending — sign up, log in, add expenses, categorize them, and watch your dashboard update in real time.

Built with Spring Boot, React, TypeScript, PostgreSQL, and Docker.

[![License](https://img.shields.io/badge/license-MIT-lightgrey)](#)

---

## 🎥 Demo

See the full flow in action — landing page → sign up → login → dashboard → expense management.

https://github.com/user-attachments/assets/fa640467-b855-46db-b4e8-e04f0a6ffdfb

## Deployment

CoinTrail is deployed using separate services:

| Component | Provider |
|---|---|
| Frontend (React + Vite) | Vercel |
| Backend (Spring Boot API) | Render |
| PostgreSQL database | Neon |

**Architecture:** Browser → Vercel frontend → Render API → Neon PostgreSQL.

The previous Railway deployment has been replaced. Production frontend and API URLs should be added after confirming the current public endpoints.

### Production configuration

Configure the backend with `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, and `CORS_ALLOWED_ORIGIN` (the Vercel origin). Use Neon's PostgreSQL connection details for the database. Configure the frontend's API base URL to point to the Render service.

Keep database credentials and JWT secrets in hosting environment settings, never in Git.

## ✨ Features

- 🔐 User registration and login with JWT-based authentication
- ➕ Add, edit, view, and delete expenses
- 🏷️ Category-wise tracking (Food, Transport, Shopping, Bills, and more)
- 📊 Dashboard with total spending and category breakdown
- 🕒 Recent expense history
- 📱 Responsive UI across devices

## 🛠️ Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Java, Spring Boot, Spring Security, Spring Data JPA |
| Database | PostgreSQL |
| Deployment | Vercel (frontend), Render (backend), Neon (PostgreSQL); Docker (local) |

## 🚀 Run locally

### With Docker

```bash
docker compose up --build
```

Then open:

```text
http://localhost:8080
```

### Without Docker

**Backend**

```bash
cd cointrail-api
./mvnw spring-boot:run
```

**Frontend**

```bash
cd cointrail-frontend
npm install
npm run dev
```

## 🔄 App flow

1. User opens the landing page
2. Registers a new account or logs in
3. Lands on the dashboard
4. Adds an expense (category, description, amount)
5. Edits or deletes an expense as needed
6. Dashboard totals and history update automatically

## 📝 Notes

This project focuses on a clean personal finance workflow — the goal is to keep the experience simple, fast, and practical rather than feature-heavy.

---

<p align="center">Made with care for people who just want to track where their money goes.</p>