# tap - Multi-Tenant Restaurant POS System

A SaaS-ready, multi-tenant Point-of-Sale and Ordering System for the gastronomy sector.

## Features

### Phase 1 - Foundation & Core Architecture
- ✅ **Multi-Tenancy Architecture** - Row-level security with tenant isolation
- ✅ **PostgreSQL Database** - Complete schema for tenants, users, tables, orders, menu items
- ✅ **Authentication & User Management** - JWT-based auth with role-based access control
- ✅ **Offline-First / Sync Logic** - IndexedDB strategy with bulk sync endpoint
- ✅ **Real-time Communication** - Socket.IO for Kitchen Display System (KDS) updates

### Phase 2 - Critical Features
- ✅ **SaaS Billing Integration** - Stripe subscriptions and usage-based billing
- ✅ **Payment Provider Abstraction** - Unified interface for Stripe, Mollie, PayPal
- ✅ **TSE / Fiskalisierung** - Mock fiscalization service for German KassenSichV compliance
- ✅ **Room & Table Editor** - Complete API for managing floors, rooms, and tables
- ✅ **QR-Code Generator** - Tenant-specific QR codes for table ordering
- ✅ **Digital Menu & Inventory** - CRUD for categories and menu items with availability toggle

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Real-time**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **Payments**: Stripe, Mollie, PayPal
- **QR Codes**: qrcode library

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone the repository
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure your environment variables
nano .env

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gastro_pos
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=24h

# Stripe (SaaS Billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Payment Providers (Direct Payments)
MOLLIE_API_KEY=test_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# Frontend
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/pin-login` - Quick PIN login (requires tenant)
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/password` - Update password
- `POST /api/auth/refresh` - Refresh token

### Users (Admin)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Tables & Layout
- `GET /api/tables` - List tables
- `GET /api/tables/layout` - Get full layout (floors/rooms/tables)
- `POST /api/tables` - Create table
- `PATCH /api/tables/:id/status` - Update table status
- `GET /api/tables/:id/qr` - Generate QR code
- `GET /api/tables/qr/all` - Generate all QR codes

### Menu
- `GET /api/menu/public` - Public menu (for guests)
- `GET /api/menu/full` - Full menu with categories
- `GET /api/menu/categories` - List categories
- `POST /api/menu/items` - Create item
- `PATCH /api/menu/items/:id/availability` - Toggle availability

### Orders & Sync
- `POST /api/sync/bulk` - Bulk sync offline operations
- `GET /api/sync/changes` - Get changes since timestamp

### Billing (SaaS)
- `GET /api/billing/plans` - Available plans
- `GET /api/billing/usage` - Current usage
- `POST /api/billing/subscribe` - Create subscription
- `POST /api/billing/portal` - Customer portal

### Payments (Direct)
- `GET /api/payments/providers` - Available providers
- `POST /api/payments/create` - Create payment
- `POST /api/payments/:id/refund` - Process refund

### TSE (Fiscalization)
- `GET /api/tse/status` - Device status
- `POST /api/tse/sign` - Sign transaction
- `GET /api/tse/export` - Export for tax audit

## User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full system access, user management, billing |
| `manager` | Menu management, reports, table layout |
| `server` | Order taking, table status updates |
| `kitchen` | Order viewing, item availability toggle |
| `cashier` | Payment processing, order completion |

## Real-time Events (Socket.IO)

### Server → Client
- `order:new` - New order received
- `order:status` - Order status changed
- `order:item:updated` - Order item status changed
- `table:status` - Table status changed
- `menu:item:updated` - Menu item availability changed
- `waiter:called` - Guest called waiter

### Client → Server
- `join:table` - Join table room (for guests)
- `order:item:status` - Update item status (kitchen)
- `call:waiter` - Call waiter (guests)

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── index.js          # Configuration
│   │   └── db-connection.js  # Database pool
│   ├── middleware/
│   │   ├── auth-middleware.js    # JWT auth
│   │   └── tenant-middleware.js  # Multi-tenancy
│   ├── models/
│   │   ├── Tenant.js
│   │   ├── User.js
│   │   ├── Table.js
│   │   └── MenuItem.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── tables.routes.js
│   │   ├── menu.routes.js
│   │   ├── sync.routes.js
│   │   ├── billing.routes.js
│   │   ├── payments.routes.js
│   │   └── tse.routes.js
│   ├── services/
│   │   ├── socket.service.js
│   │   ├── sync.service.js
│   │   ├── billing.service.js
│   │   ├── qrcode.service.js
│   │   ├── tse.service.js
│   │   └── payment/
│   │       ├── index.js
│   │       ├── PaymentGateway.js
│   │       ├── StripePayment.js
│   │       ├── MolliePayment.js
│   │       └── PayPalPayment.js
│   └── database/
│       └── migrations/
│           └── 001_initial_schema.sql
├── .env.example
├── package.json
└── README.md
```

## License

MIT
