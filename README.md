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
- **RESTful API**: Single `POST /identify` endpoint

---

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **ORM**: Prisma (v7)
- **Database**: PostgreSQL

---

## 📦 Setup & Installation

### Prerequisites

- Node.js >= 18
- PostgreSQL database (local or hosted)

### Steps

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/bitespeed-backend.git
cd bitespeed-backend
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
DATABASE_URL="postgresql://user:password@host:5432/bitespeed?schema=public"
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

> At least one of `email` or `phoneNumber` must be provided.

**Response:**

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

---

## 🧪 Testing with cURL

```bash
# Create a new contact
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"lorraine@hillvalley.edu","phoneNumber":"123456"}'

# Link with existing (creates secondary)
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"mcfly@hillvalley.edu","phoneNumber":"123456"}'

# Lookup by email only
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"lorraine@hillvalley.edu"}'
```

---

## 🏗️ Build for Production

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
├── prisma/
│   └── schema.prisma        # Database schema
├── src/
│   ├── generated/prisma/     # Generated Prisma client
│   ├── services/
│   │   └── contact.service.ts # Core reconciliation logic
│   └── index.ts              # Express server entry point
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```
