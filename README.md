# 💰 CoinTrail

CoinTrail is a full-stack personal expense tracking application built with Spring Boot, React, TypeScript, PostgreSQL, and Docker.

It allows users to securely register and log in, manage their personal expenses, filter and sort transactions, and view spending insights through an interactive dashboard.

The application uses JWT-based authentication, user-scoped expense data, Flyway database migrations, automated testing, Docker-based containerization, GitHub Actions CI, and is deployed on Railway.

## 🌐 Live Demo

**Application:**  
https://cointrail.up.railway.app

**API Health:**  
https://cointrail-api.up.railway.app/actuator/health

> The application is deployed on Railway, so the first request may occasionally take a little longer depending on service state.

---

## ✨ Features

### Authentication

- User registration
- User login
- JWT-based stateless authentication
- BCrypt password hashing
- Protected frontend routes
- Protected backend endpoints
- User-specific expense data
- Automatic JWT attachment to API requests
- Logout support

### Expense Management

- Create expenses
- View all expenses
- View individual expense details
- Edit expenses
- Delete expenses
- Categorize expenses
- Validate expense data
- Prevent future expense dates
- Pagination
- Sorting
- Category filtering

Supported categories:

- Food
- Travel
- Shopping
- Entertainment
- Bills
- Health
- Education
- Other

### Dashboard

The dashboard provides an overview of the authenticated user's spending:

- Total spending
- Total number of expenses
- Spending breakdown by category
- Interactive category spending chart
- Recent expenses

### Responsive UI

- Responsive navigation
- Mobile-friendly layout
- Landing page
- Login and registration pages
- Dashboard
- Expense listing
- Create/Edit expense forms
- Expense details page

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| Java 25 | Programming language |
| Spring Boot 4 | Backend framework |
| Spring Web | REST API development |
| Spring Security | Authentication and authorization |
| JWT | Stateless authentication |
| Spring Data JPA | Persistence layer |
| Hibernate | ORM |
| PostgreSQL | Relational database |
| Flyway | Database migrations |
| Bean Validation | Request validation |
| Maven | Build and dependency management |
| Spring Boot Actuator | Health and application monitoring |

### Frontend

| Technology | Purpose |
|---|---|
| React | UI library |
| TypeScript | Type-safe frontend development |
| Vite | Frontend build tool |
| React Router | Client-side routing |
| Axios | HTTP client |
| Tailwind CSS | Styling |
| Recharts | Dashboard visualization |
| Vitest | Frontend testing |
| React Testing Library | Component testing |

### DevOps / Infrastructure

| Technology | Purpose |
|---|---|
| Docker | Application containerization |
| Docker Compose | Local multi-container environment |
| Nginx | Production frontend server |
| GitHub Actions | Continuous Integration |
| Railway | Production deployment |
| Railway PostgreSQL | Production database |

---

## 🏗️ Architecture

```text
                         User
                          │
                          ▼
              ┌─────────────────────┐
              │   React Frontend    │
              │ TypeScript + Vite   │
              │       Nginx         │
              └──────────┬──────────┘
                         │
                         │ HTTPS / REST
                         │ JWT Bearer Token
                         ▼
              ┌─────────────────────┐
              │  Spring Boot API    │
              │                     │
              │ Spring Security     │
              │ JWT Authentication  │
              │ Service Layer       │
              │ Spring Data JPA     │
              └──────────┬──────────┘
                         │
                         │ JDBC
                         ▼
              ┌─────────────────────┐
              │     PostgreSQL      │
              │                     │
              │ Flyway Migrations   │
              └─────────────────────┘
```

### Production Deployment

```text
https://cointrail.up.railway.app
                │
                ▼
        React + Nginx
                │
                │ HTTPS
                ▼
https://cointrail-api.up.railway.app
                │
                ▼
          Spring Boot
                │
                │ Railway Private Network
                ▼
           PostgreSQL
```

---


## 🔐 Authentication Flow

CoinTrail uses JWT-based stateless authentication.

```text
User
 │
 │ email + password
 ▼
POST /api/v1/auth/login
 │
 ▼
Spring Security
 │
 ▼
AuthenticationManager
 │
 ▼
UserDetailsService
 │
 ▼
Password verification
 │
 ▼
JWT generated
 │
 ▼
Access Token returned
 │
 ▼
Frontend stores token
 │
 ▼
Authorization: Bearer <token>
 │
 ▼
JwtAuthenticationFilter
 │
 ▼
Authenticated API request
```

The frontend automatically includes the access token in protected API requests:

```http
Authorization: Bearer <JWT_TOKEN>
```

The backend remains stateless and does not maintain server-side login sessions.

---

## 🔌 REST API

Base URL:

```text
/api/v1
```

### Authentication

| Method | Endpoint | Authentication | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Authenticate and receive JWT |

### Expenses

| Method | Endpoint | Description |
|---|---|---|
| POST | `/expenses` | Create an expense |
| GET | `/expenses` | Get authenticated user's expenses |
| GET | `/expenses/{id}` | Get an expense by ID |
| PUT | `/expenses/{id}` | Update an expense |
| DELETE | `/expenses/{id}` | Delete an expense |
| GET | `/expenses/summary` | Get spending summary |

Expense endpoints require authentication.

Example:

```http
Authorization: Bearer <JWT_TOKEN>
```

### Pagination and Sorting

Expenses support pagination and sorting.

Example:

```text
GET /api/v1/expenses?page=0&size=10&sort=expenseDate,desc
```

Expenses can also be filtered by category.

---

## 📊 Expense Model

An expense contains information such as:

```json
{
  "id": 1,
  "amount": 450.00,
  "category": "FOOD",
  "description": "Dinner",
  "expenseDate": "2026-09-15",
  "createdAt": "2026-09-15T20:30:00",
  "updatedAt": "2026-09-15T20:30:00"
}
```

Each expense belongs to a user. Authenticated users can only access their own expense data.

---

## 🗄️ Database Migrations

CoinTrail uses **Flyway** to manage database schema changes.

Migration files are located under:

```text
cointrail-api/src/main/resources/db/migration/
```

When the backend starts, Flyway:

1. Connects to PostgreSQL
2. Checks `flyway_schema_history`
3. Validates existing migrations
4. Executes any pending migrations
5. Allows Hibernate to validate the resulting schema

Hibernate is configured with:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

This means database schema evolution is handled by Flyway rather than Hibernate automatically modifying the schema.

---

## 🚀 Running Locally with Docker

The easiest way to run CoinTrail locally is with Docker Compose.

### Prerequisites

Install:

- Docker
- Docker Compose
- Git

### 1. Clone the repository

```bash
git clone https://github.com/deepakydv25/cointrail.git
cd cointrail
```

### 2. Configure JWT secret

The backend expects:

```text
JWT_SECRET
```

Generate a secure Base64 secret and expose it as an environment variable.

PowerShell example:

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Then set the generated value:

```powershell
$env:JWT_SECRET="YOUR_GENERATED_SECRET"
```

### 3. Start the application

```bash
docker compose up --build
```

Docker Compose starts:

```text
cointrail-frontend   → localhost:8080
cointrail-api        → localhost:8081
PostgreSQL           → localhost:5432
```

Open:

```text
http://localhost:8080
```

Backend health:

```text
http://localhost:8081/actuator/health
```

### Stop the application

```bash
docker compose down
```

To also delete the PostgreSQL volume:

```bash
docker compose down -v
```

> `docker compose down -v` permanently removes the local database data stored in the Compose volume.

---

## 💻 Running Without Docker

You can also run the backend and frontend separately during development.

### Backend Requirements

- Java 25
- PostgreSQL
- Maven / Maven Wrapper

Create a PostgreSQL database:

```text
cointrail
```

Configure the following environment variables if your PostgreSQL configuration differs from the defaults:

```text
DB_URL
DB_USERNAME
DB_PASSWORD
JWT_SECRET
CORS_ALLOWED_ORIGIN
```

Example:

```text
DB_URL=jdbc:postgresql://localhost:5432/cointrail
DB_USERNAME=cointrail
DB_PASSWORD=cointrail
JWT_SECRET=<your-secret>
CORS_ALLOWED_ORIGIN=http://localhost:5173
```

Start the backend:

```bash
cd cointrail-api
./mvnw spring-boot:run
```

On Windows:

```powershell
cd cointrail-api
.\mvnw.cmd spring-boot:run
```

The API runs at:

```text
http://localhost:8081
```

### Frontend Requirements

- Node.js 22+
- npm

Start the frontend:

```bash
cd cointrail-frontend
npm install
npm run dev
```

The Vite development server is normally available at:

```text
http://localhost:5173
```

---

## ⚙️ Environment Variables

### Backend

| Variable | Description |
|---|---|
| `DB_URL` | PostgreSQL JDBC connection URL |
| `DB_USERNAME` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | Secret used to sign and verify JWTs |
| `CORS_ALLOWED_ORIGIN` | Frontend origin allowed by CORS |

Example:

```text
DB_URL=jdbc:postgresql://localhost:5432/cointrail
DB_USERNAME=cointrail
DB_PASSWORD=cointrail
JWT_SECRET=<secure-secret>
CORS_ALLOWED_ORIGIN=http://localhost:5173
```

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL |

Development example:

```text
VITE_API_BASE_URL=http://localhost:8081/api/v1
```

Production:

```text
VITE_API_BASE_URL=https://cointrail-api.up.railway.app/api/v1
```

> Production secrets are configured through deployment environment variables and should never be committed to the repository.

---

## 🧪 Testing

CoinTrail contains automated tests for both the backend and frontend.

### Backend Tests

The backend test suite covers areas including:

- Service-layer business logic
- REST controllers
- Authentication/security behavior
- Expense operations
- User-specific expense access
- Integration behavior

Run all backend tests:

```bash
cd cointrail-api
./mvnw clean test
```

Windows:

```powershell
.\mvnw.cmd clean test
```

### Frontend Tests

Frontend tests use Vitest and React Testing Library.

The tests cover UI behavior such as:

- Login
- Registration
- Expense creation
- Dashboard behavior
- API interaction through mocked services

Run:

```bash
cd cointrail-frontend
npm test
```

Build the production frontend:

```bash
npm run build
```

---

## 🔄 Continuous Integration

CoinTrail uses **GitHub Actions** for Continuous Integration.

The workflow runs on:

- Pushes to `main`
- Pull requests targeting `main`

The CI pipeline validates the application before changes are merged/deployed.

```text
Push / Pull Request
        │
        ▼
   GitHub Actions
        │
        ├───────────────┐
        ▼               ▼
 Backend Tests     Frontend Tests
        │               │
        ▼               ▼
 Maven Build       Vite Build
        │               │
        └───────┬───────┘
                ▼
          Docker Build
```

This helps ensure that backend tests, frontend tests, production builds, and container builds remain healthy as the project evolves.

---

## 🐳 Docker

Both application layers are containerized.

### Backend

The Spring Boot Docker image uses a multi-stage build:

```text
Java 25 JDK
     │
     ▼
Maven Build
     │
     ▼
Executable JAR
     │
     ▼
Java 25 JRE
```

This keeps build tooling out of the final runtime image.

### Frontend

The frontend also uses a multi-stage Docker build:

```text
Node.js
   │
   ▼
npm ci
   │
   ▼
Vite Production Build
   │
   ▼
Nginx
   │
   ▼
Static React Application
```

Nginx serves the generated production files.

---

## ☁️ Deployment

CoinTrail is deployed on **Railway**.

The production environment consists of three services:

```text
┌───────────────────────────┐
│       React Frontend      │
│       Nginx Container     │
│ cointrail.up.railway.app  │
└─────────────┬─────────────┘
              │
              │ HTTPS
              ▼
┌───────────────────────────────┐
│       Spring Boot API         │
│     Java Docker Container     │
│ cointrail-api.up.railway.app  │
└──────────────┬────────────────┘
               │
               │ Private networking
               ▼
┌───────────────────────────────┐
│          PostgreSQL           │
│       Railway Database        │
└───────────────────────────────┘
```

Railway environment variables provide database credentials, JWT configuration, CORS configuration, and frontend/backend connectivity without storing production secrets in source control.

---

## 🩺 Monitoring

Spring Boot Actuator exposes application health information.

Production health endpoint:

```text
https://cointrail-api.up.railway.app/actuator/health
```

Example:

```json
{
  "status": "UP"
}
```

Actuator information endpoints are intentionally limited rather than exposing all management endpoints publicly.

---

## 🛡️ Security

CoinTrail includes several security measures:

- Stateless JWT authentication
- Spring Security filter chain
- BCrypt password hashing
- Protected API endpoints
- Per-user expense isolation
- CORS origin restrictions
- Request validation
- JWT secrets supplied through environment variables
- Database credentials supplied through environment variables
- No production credentials committed to source control

Public endpoints include authentication and selected Actuator endpoints, while expense endpoints require authentication.

---

## 🧭 Frontend Routes

```text
/                     Landing page
/login                Login
/register             Registration

/dashboard            Dashboard
/expenses             Expense list
/expenses/create      Create expense
/expenses/:id         Expense details
/expenses/:id/edit    Edit expense
```

Dashboard and expense routes are protected and require authentication.

---

## 🔮 Future Improvements

Possible future enhancements include:

- Refresh tokens
- Forgot/reset password flow
- User profile management
- Monthly and yearly spending analytics
- Date-range filtering
- Budget management
- Spending limits
- Export expenses to CSV/PDF
- Additional dashboard charts
- Improved loading skeletons
- Toast notifications
- Dark mode
- API documentation with OpenAPI/Swagger
- Automated Railway deployment workflow
- AWS deployment using services such as ECS, RDS, S3, and CloudFront

---

## 🎯 Project Goals

CoinTrail was built as a hands-on full-stack project to practice and demonstrate:

- REST API design
- Layered Spring Boot architecture
- Spring Security and JWT
- Relational database design
- Database migrations
- Transaction management
- Validation and exception handling
- Automated backend testing
- React and TypeScript development
- Frontend testing
- API integration
- Docker containerization
- Multi-container applications
- Continuous Integration
- Cloud deployment

---

## 👤 Author

**Deepak Yadav**

GitHub:  
https://github.com/deepakydv25

---

## ⭐ Repository

If you find the project useful or want to follow its development, consider starring the repository.

https://github.com/deepakydv25/cointrail