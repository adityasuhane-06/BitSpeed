# Bitespeed Identity Reconciliation Service

A backend service that identifies and consolidates customer identity across multiple purchases. Built with **Node.js**, **TypeScript**, **Express**, and **Prisma** (PostgreSQL).

## 🚀 Live Endpoint

> **Base URL**: [https://bitspeed-m9io.onrender.com](https://bitspeed-m9io.onrender.com)
>
> **Identify Endpoint**: `POST` [https://bitspeed-m9io.onrender.com/identify](https://bitspeed-m9io.onrender.com/identify)

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

## 🏗️ Architecture & System Design

### Clean Architecture Layers

Our codebase is structured to separate concerns, making it highly testable and maintainable:

```
src/
├── config/           # Infrastructure setup (Environment, DB Pool)
├── routes/           # API endpoints (Express routing)
├── controllers/      # Request lifecycle (Zod validation, error catching)
├── services/         # Core business logic & transactions
├── validators/       # Input schemas (Zod)
├── middleware/       # Global error formatting
└── index.ts          # Express app composition & graceful shutdown
```

### Request Lifecycle (Control Flow)

```mermaid
sequenceDiagram
    participant Client
    participant Router as Express Router
    participant Validator as Zod Validator
    participant Service as Contact Service
    participant DB as PostgreSQL (Prisma)
    
    Client->>Router: POST /identify { email, phone }
    Router->>Validator: Validate Input
    
    alt Invalid Input
        Validator-->>Client: 400 Bad Request (Error Details)
    else Valid Input
        Validator->>Service: identifyContact(data)
        
        Service->>DB: Query exact matches (email OR phone)
        DB-->>Service: Return matching records
        
        alt No Matches Found
            Service->>DB: Create new Primary Contact
        else Matches Found
            Service->>DB: BEGIN Transaction
            Service->>DB: Update newer contacts to secondary
            Service->>DB: Link all to oldest Primary
            Service->>DB: COMMIT Transaction
        end
        
        Service->>DB: Fetch consolidated group
        DB-->>Service: Return all linked contacts
        Service-->>Client: 200 OK (Consolidated Identity)
    end
```

### Database Schema

```mermaid
erDiagram
    Contact {
        Int id PK
        String phoneNumber "nullable"
        String email "nullable"
        Int linkedId "FK (Self-referencing), nullable"
        String linkPrecedence "primary | secondary"
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt "nullable"
    }

    Contact ||--o{ Contact : "links to (secondary)"
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
