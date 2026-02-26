# Bitespeed Identity Reconciliation Service

A backend service that identifies and consolidates customer identity across multiple purchases. Built with **Node.js**, **TypeScript**, **Express**, and **Prisma** (PostgreSQL).

## 🚀 Live Endpoint

> **Base URL**: `https://bitspeed-m9io.onrender.com`
>
> **Identify Endpoint**: `POST https://bitspeed-m9io.onrender.com/identify`

---

## 📋 Features

- **Identity Reconciliation**: Links customer contacts sharing an email or phone number
- **Primary/Secondary Linking**: Oldest contact becomes primary, newer ones become secondary
- **Automatic Merging**: When two separate primary contacts are found to be the same person, they are merged
- **Input Validation**: Zod schema validation with email format checking
- **Transaction Safety**: Merge operations wrapped in database transactions
- **RESTful API**: Single `POST /identify` endpoint

---

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **ORM**: Prisma (v7) with PostgreSQL
- **Validation**: Zod
- **Testing**: Jest + Supertest
- **Logging**: Morgan

---

## 🏗️ Architecture

```
src/
├── config/
│   ├── index.ts              # Environment configuration
│   └── database.ts           # Prisma client setup with pg.Pool
├── controllers/
│   └── contact.controller.ts # Request validation & response formatting
├── middleware/
│   └── errorHandler.ts       # Global error handling middleware
├── routes/
│   └── contact.routes.ts     # Route definitions
├── services/
│   └── contact.service.ts    # Core reconciliation business logic
├── validators/
│   └── identify.validator.ts # Zod request schemas
├── utils/
│   └── errors.ts             # Custom error classes (AppError, ValidationError)
├── __tests__/
│   └── identify.test.ts      # Integration tests (10 test cases)
├── generated/prisma/         # Auto-generated Prisma client
└── index.ts                  # Express app setup, middleware, graceful shutdown
```

### Design Pattern: Layered Architecture

```
Request → Routes → Controller → Service → Database
                      ↓              ↓
                  Validator      Prisma ORM
                      ↓
              Error Middleware ← (catches all errors)
```

---

## 🧠 Design Decisions

### 1. Transactional Merge Operations
When two primary contacts need to be merged, the operation involves multiple database updates. These are wrapped in a `prisma.$transaction()` to ensure **atomicity** — either all changes succeed or none do, preventing inconsistent state from race conditions.

### 2. Database Indexing Strategy
Indexes are placed on `email`, `phoneNumber`, and `linkedId` columns for fast lookups. These are the three most frequently queried fields in the reconciliation algorithm.

### 3. Connection Pooling
Using `pg.Pool` (via `@prisma/adapter-pg`) for efficient database connection management. Connections are reused across requests rather than creating new ones per query.

### 4. Idempotent Identify Endpoint
Calling `/identify` with the same data multiple times produces the same result without creating duplicate contacts. The service checks for exact matches before creating new secondary contacts.

### 5. Input Validation with Zod
Request bodies are validated using Zod schemas at the controller layer. This catches malformed requests (invalid emails, missing fields) before they reach the business logic, providing clear error messages.

### 6. Graceful Shutdown
The server handles `SIGTERM` and `SIGINT` signals by closing the HTTP server and disconnecting the database client before exiting, preventing connection leaks.

---

## 📦 Setup & Installation

### Prerequisites

- Node.js >= 18
- PostgreSQL database (local or hosted)

### Steps

1. **Clone the repository**

```bash
git clone https://github.com/adityasuhane-06/BitSpeed.git
cd BitSpeed
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` and set your PostgreSQL connection string:

```
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

4. **Run database migrations**

```bash
npx prisma migrate deploy
```

5. **Start the development server**

```bash
npm run dev
```

The server runs on `http://localhost:3000`.

---

## 📡 API Reference

### `GET /`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "message": "Bitespeed Identity Reconciliation Service"
}
```

### `POST /identify`

Identify and consolidate a customer's contact information.

**Request Body:**

```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

> At least one of `email` or `phoneNumber` must be provided. Email is validated for format. PhoneNumber can be string or number (auto-converted).

**Success Response (200):**

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

**Validation Error (400):**

```json
{
  "success": false,
  "error": "Invalid email format"
}
```

---

## 🧪 Running Tests

```bash
npm test
```

**Test Coverage:**

| Test | Description |
|------|-------------|
| New contact creation | Creates primary when no match exists |
| Secondary creation | Links with existing via shared phone |
| No duplicate secondaries | Same request doesn't create duplicates |
| Email-only lookup | Returns consolidated contact |
| Phone-only lookup | Returns consolidated contact |
| Primary turnover | Merges two primaries correctly |
| Empty input validation | Returns 400 for missing fields |
| Invalid email validation | Returns 400 for bad email format |
| Numeric phone handling | Converts number to string |
| Health check | GET / returns status ok |

---

## 🏗️ Build for Production

```bash
npm run build
npm start
```
