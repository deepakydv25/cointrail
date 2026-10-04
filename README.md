# 💰 CoinTrail

A personal expense tracker for everyday spending — sign up, log in, add expenses, categorize them, and watch your dashboard update in real time.

Built with Spring Boot, React, TypeScript, PostgreSQL, and Docker.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://cointrail.up.railway.app)
[![API Health](https://img.shields.io/badge/api-status-blue)](https://cointrail-api.up.railway.app/actuator/health)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](#)

---

## 🎥 Demo

See the full flow in action — landing page → sign up → login → dashboard → expense management.

https://github.com/user-attachments/assets/fa640467-b855-46db-b4e8-e04f0a6ffdfb

## Live

**Frontend** : [cointrail.up.railway.app](https://cointrail.up.railway.app) 

**API health** : [cointrail-api.up.railway.app/actuator/health](https://cointrail-api.up.railway.app/actuator/health) 


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
| Deployment | Railway, Docker |

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

## V2 API documentation

The backend includes generated OpenAPI and same-origin Swagger UI. Documentation is **disabled by default**, including its assets for authenticated users. Enable it explicitly for local/development use with `API_DOCS_ENABLED=true` alongside the existing database, JWT and recurring-timezone settings. Leave this switch false or unset in production; the absence of a Spring profile does not enable documentation.

With the backend running on its default port 8081:

- Swagger UI: http://localhost:8081/swagger-ui.html
- OpenAPI JSON: http://localhost:8081/v3/api-docs
- OpenAPI YAML: http://localhost:8081/v3/api-docs.yaml

Register through `/api/v1/auth/register`, then log in through `/api/v1/auth/login`. Copy `accessToken`, open **Authorize** in Swagger UI, and paste the token **without** a `Bearer` prefix. Try a protected read such as `GET /api/accounts`. Authorization does not persist across reloads. Try-it also supports writes and deletes: use disposable local data and read each operation's deletion/cancellation description before executing it.

The document covers Authentication, Accounts, Categories, Transactions, Budgets, Recurring Transactions, Dashboard and Analytics. Existing endpoint paths and API behavior are unchanged; legacy Expenses, Actuator and internal workers are excluded. See the [Recurring Transactions](cointrail-api/RECURRING_TRANSACTIONS.md), [Dashboard](cointrail-api/DASHBOARD_API.md) and [Analytics](cointrail-api/ANALYTICS_API.md) contracts for additional business details.
