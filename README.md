# 🧳 Travel Buddy & Meetup – Backend

A scalable, secure backend for the **Travel Buddy & Meetup Platform**, built to connect travelers, manage trips, subscriptions, reviews, and real-time interactions.  
This backend powers authentication, travel matching, payments, reviews, notifications, and admin management.

---

## 📌 Project Overview

The **Travel Buddy & Meetup Backend** provides REST APIs to support a social-travel platform where users can:

- Create travel plans
- Find compatible travel buddies
- Request to join trips
- Review fellow travelers
- Subscribe to premium plans
- Receive notifications
- Connect with other travelers

Built with **Node.js, Express, Prisma, PostgreSQL**, and **JWT authentication**, the backend follows modular architecture and role-based access control.

---

## 🛠 Tech Stack

| Category | Technology |
|--------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Authentication | JWT (Access + Refresh Token) |
| Payments | Stripe |
| File Upload | Multer + Cloudinary / ImgBB |
| Validation | Zod |
| Security | bcrypt, RBAC |
| AI | Travel suggestion endpoint |

---

## 📁 Project Structure

backend/
├── prisma/
│ └── schema.prisma
├── src/
│ ├── app/
│ │ ├── config/
│ │ ├── middlewares/
│ │ ├── modules/
│ │ │ ├── auth/
│ │ │ ├── users/
│ │ │ ├── travelPlans/
│ │ │ ├── reviews/
│ │ │ ├── payments/
│ │ │ ├── connection/
│ │ │ └── notifications/
│ │ ├── routes/
│ │ └── helpers/
│ ├── app.ts
│ └── server.ts


---

## 🔐 Authentication & Authorization

### Authentication
- Email & Password login
- Google OAuth login
- JWT-based Access & Refresh tokens
- Secure password hashing using bcrypt

### Roles
- **USER** – Manage profile, trips, reviews, connections
- **ADMIN** – Manage users, travel plans, platform statistics

### Middleware
- `auth()` – Role-based access control
- `validateRequest()` – Zod validation
- `globalErrorHandler`
- `notFound`

---

## 🧠 Database Models (Prisma)

### Core Models
- User
- TravelPlan
- TravelBuddy
- Review
- Payment
- Notification
- Connection

### Enums
- Role
- UserStatus
- BuddyStatus
- SubscriptionType
- PaymentStatus
- NotificationType
- ConnectionStatus

---

## 🌐 API Base URL


---

## 🔑 Auth Routes

| Method | Endpoint | Description |
|------|---------|-------------|
| POST | `/auth/login` | Login with email & password |
| POST | `/auth/login/google` | Google OAuth login |
| POST | `/auth/refresh-token` | Refresh access token |

---

## 👤 User Routes

| Method | Endpoint | Access | Description |
|------|---------|--------|-------------|
| POST | `/user/register` | Public | Register new user |
| GET | `/user` | USER / ADMIN | Get all users |
| GET | `/user/:id` | Public | Get user profile |
| PATCH | `/user/:id` | USER / ADMIN | Update user profile |
| GET | `/user/top-rated` | Public | Top-rated travelers |
| GET | `/user/recently-active` | Public | Recently active users |
| GET | `/user/stats/regions` | Public | Region-wise user stats |
| POST | `/user/create-admin` | ADMIN | Create admin user |
| GET | `/user/admin/stats` | ADMIN | Admin dashboard stats |

---

## ✈️ Travel Plan Routes

| Method | Endpoint | Access | Description |
|------|---------|--------|-------------|
| POST | `/travelPlan` | USER / ADMIN | Create travel plan |
| GET | `/travelPlan` | Public | Get all travel plans |
| GET | `/travelPlan/:id` | Public | Get single travel plan |
| PATCH | `/travelPlan/:id` | USER / ADMIN | Update travel plan |
| DELETE | `/travelPlan/:id` | USER / ADMIN | Delete travel plan |
| GET | `/travelPlan/my-plans` | USER | Get my travel plans |
| GET | `/travelPlan/match` | Public | Match travel plans |
| GET | `/travelPlan/recommended` | USER | Recommended travelers |
| POST | `/travelPlan/request/:id` | USER | Request to join trip |
| PATCH | `/travelPlan/request-status/:buddyId` | USER | Approve/Reject join request |
| GET | `/travelPlan/my-plans/requests` | USER | Incoming join requests |
| GET | `/travelPlan/stats` | Public | Community statistics |
| POST | `/travelPlan/suggestion` | Public | AI travel suggestions |

---

## 🤝 Connection Routes

| Method | Endpoint | Description |
|------|---------|-------------|
| GET | `/connections/all` | Get all connections |
| GET | `/connections/buddies` | Get accepted buddies |
| POST | `/connections/request` | Send connection request |
| GET | `/connections/incoming` | Incoming requests |
| PATCH | `/connections/respond/:connectionId` | Accept/Reject request |
| DELETE | `/connections/:connectionId` | Delete connection |

---

## ⭐ Review Routes

| Method | Endpoint | Access | Description |
|------|---------|--------|-------------|
| GET | `/review` | Public | Get all reviews |
| GET | `/review/:id` | Public | Get single review |
| GET | `/review/pending` | USER | Pending reviews |
| POST | `/review` | USER | Create review |
| PATCH | `/review/:id` | USER | Update review |
| DELETE | `/review/:id` | USER | Delete review |

> Reviews can only be created after a trip is completed.

---

## 💳 Payment & Subscription Routes

| Method | Endpoint | Description |
|------|---------|-------------|
| POST | `/payment/create-intent` | Create Stripe payment intent |
| POST | `/payment/confirm` | Confirm payment |
| POST | `/webhook` | Stripe webhook endpoint |

### Subscription Types
- EXPLORER
- MONTHLY
- YEARLY

Premium users receive:
- Verified badge
- Advanced travel matching
- Priority trip requests

---

## 🔔 Notifications

Users receive notifications for:
- Trip join requests
- Trip approval or rejection
- Review reminders
- Subscription updates

Stored in the database and linked to users and travel plans.

---

## 📦 File Upload

- Profile images
- Travel plan images
- Handled using **Multer**
- Supports **Cloudinary / ImgBB**

---

## ⚙️ Environment Variables

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/travelbuddy
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Getting Started

# Install dependencies
npm install

# Prisma setup
npx prisma generate
npx prisma migrate dev

# Run the server
npm run dev
