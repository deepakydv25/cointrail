# 💰 CoinTrail

**A clean, self-hosted personal expense tracker** — register, log in, log expenses, categorize spending, and watch your dashboard update in real time.

Built with Spring Boot, React, TypeScript, PostgreSQL, and Docker.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://cointrail.up.railway.app)
[![API Health](https://img.shields.io/badge/api-status-blue)](https://cointrail-api.up.railway.app/actuator/health)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](#)

---

## 🎥 Demo

See the full flow in action — landing page → registration → login → dashboard → adding, editing, and deleting an expense.

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