# 🍽️ Gastro POS

A complete, SaaS-ready, multi-tenant Point-of-Sale and Ordering System for the gastronomy sector.

![Gastro POS](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 🏢 Multi-Tenancy (SaaS)
- Complete tenant isolation with row-level security
- Subdomain, header, or token-based tenant identification
- Per-tenant settings and branding

### 👥 User Management
- Role-based access control (Admin, Manager, Server, Kitchen, Cashier)
- JWT authentication with PIN login for quick access
- User activity tracking

### 🪑 Restaurant Layout
- Floors, rooms, and tables hierarchy
- Visual floor plan editor
- Real-time table status updates

### 📋 Menu Management
- Categories and items with images
- Pricing, tax rates, dietary info
- Availability toggle ("Sold Out" feature)
- Allergen tracking

### 🛒 Order System
- Multi-step order flow
- Offline-first with sync queue
- Real-time Kitchen Display System (KDS)
- QR code ordering for guests

### 💳 Payments
- SaaS billing with Stripe subscriptions
- Usage-based billing (orders/active users)
- Direct payments via Stripe, Mollie, PayPal
- Payment provider abstraction layer

### 🇩🇪 Compliance
- TSE/Fiskalisierung mock for German KassenSichV
- Transaction signing and logging
- DSFinV-K export format

### 📱 PWA Frontend
- Touch-optimized, high-contrast UI
- Offline support with service worker
- Install as native app
- Real-time updates via Socket.IO

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (PWA)                        │
│              React + Vite + Tailwind CSS                 │
│                   Socket.IO Client                       │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ HTTP/WebSocket
                      │
┌─────────────────────▼───────────────────────────────────┐
│                    Backend (Node.js)                     │
│                    Express.js + Socket.IO                │
├─────────────────────────────────────────────────────────┤
│  Routes    │  Middleware    │  Services    │  Models    │
├────────────┼────────────────┼──────────────┼────────────┤
│ auth       │ tenant-mw      │ billing      │ Tenant     │
│ users      │ auth-mw        │ socket       │ User       │
│ tables     │                │ sync         │ Table      │
│ menu       │                │ tse          │ MenuItem   │
│ orders     │                │ qrcode       │            │
│ billing    │                │ payment/*    │            │
│ payments   │                │              │            │
│ tse        │                │              │            │
│ sync       │                │              │            │
└────────────┴────────────────┴──────────────┴────────────┘
                      │
                      │ SQL
                      │
┌─────────────────────▼───────────────────────────────────┐
│                    PostgreSQL                            │
│           Tenants, Users, Tables, Orders, etc.          │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd gastro-pos

# Setup backend
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run migrate  # After setting up PostgreSQL
npm run dev

# Setup frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 📁 Project Structure

```
gastro-pos/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── middleware/     # Auth & tenant middleware
│   │   ├── models/         # Data models
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── database/       # Migrations
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API & Socket clients
│   │   ├── stores/         # Zustand state
│   │   └── styles/         # Tailwind CSS
│   ├── package.json
│   └── README.md
├── PROMPT.md               # Original requirements
└── README.md               # This file
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/pin-login` - PIN login
- `GET /api/auth/me` - Current user

### Tables
- `GET /api/tables` - List tables
- `GET /api/tables/layout` - Full layout
- `PATCH /api/tables/:id/status` - Update status
- `GET /api/tables/:id/qr` - Generate QR code

### Menu
- `GET /api/menu/public` - Public menu
- `GET /api/menu/full` - Full menu with items
- `PATCH /api/menu/items/:id/availability` - Toggle availability

### Orders & Sync
- `POST /api/sync/bulk` - Bulk sync offline data
- `GET /api/sync/changes` - Get changes since timestamp

### Billing
- `GET /api/billing/plans` - Available plans
- `POST /api/billing/subscribe` - Create subscription

### Payments
- `POST /api/payments/create` - Create payment
- `POST /api/payments/:id/refund` - Process refund

## 🎨 Screenshots

The application features a modern dark theme with warm amber accents, optimized for touch interfaces:

- **Dashboard**: Overview with quick stats and actions
- **Tables**: Visual floor plan with status colors
- **Menu**: Category-organized items with availability toggle
- **Kitchen Display**: Real-time order queue
- **Guest Ordering**: Mobile-first QR code menu

## 🛡️ Security

- JWT authentication with secure token storage
- Role-based access control
- Tenant isolation at middleware level
- Input validation with express-validator
- Helmet.js for HTTP security headers
- CORS configuration

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

---

Built with ❤️ for the gastronomy industry.
