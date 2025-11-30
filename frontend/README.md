# tap - Frontend

A modern, touch-optimized PWA for restaurant point of sale operations.

## Features

- 🎨 **Modern UI** - Dark theme with high contrast, touch-friendly design
- 📱 **PWA** - Install as app, works offline
- ⚡ **Real-time** - Socket.IO for live order updates
- 🔐 **Role-based Access** - Admin, Manager, Server, Kitchen roles
- 📊 **Dashboard** - Overview of tables, orders, revenue
- 🍽️ **Table Management** - Visual floor plan with status indicators
- 📋 **Menu Management** - Categories, items, availability toggle
- 🛒 **Order Taking** - Step-by-step order flow
- 👨‍🍳 **Kitchen Display** - Real-time order queue
- 📱 **Guest Ordering** - QR code menu for guests

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **React Router** - Navigation
- **Socket.IO Client** - Real-time updates
- **Lucide React** - Icons
- **Vite PWA** - Progressive Web App

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── layout/
│   │       ├── DashboardLayout.jsx
│   │       └── GuestLayout.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── TablesPage.jsx
│   │   ├── MenuPage.jsx
│   │   ├── OrdersPage.jsx
│   │   ├── KitchenPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── GuestOrderPage.jsx
│   ├── services/
│   │   ├── api.js        # HTTP API client
│   │   └── socket.js     # Socket.IO client
│   ├── stores/
│   │   ├── authStore.js  # Auth state
│   │   ├── tablesStore.js
│   │   └── menuStore.js
│   ├── styles/
│   │   └── index.css     # Tailwind + custom styles
│   ├── App.jsx
│   └── main.jsx
├── tailwind.config.js
├── vite.config.js
└── package.json
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email/password authentication |
| Dashboard | `/dashboard` | Overview and quick actions |
| Tables | `/tables` | Floor plan and table management |
| Menu | `/menu` | Categories and menu items |
| Orders | `/orders` | New order creation |
| Kitchen | `/kitchen` | Kitchen display system |
| Settings | `/settings` | Restaurant and account settings |
| Guest Order | `/order/:token` | QR code ordering for guests |

## Environment

The frontend proxies API requests to the backend:
- Development: `http://localhost:3000`
- Configure in `vite.config.js`

## Design System

### Colors
- **Primary**: Warm amber/copper (#ed7620)
- **Surface**: Slate grays (dark theme)
- **Status**: Green (available), Blue (reserved), Amber (cleaning)

### Typography
- **Display**: Outfit
- **Body**: DM Sans
- **Mono**: JetBrains Mono

### Components
- `.btn-primary` / `.btn-secondary` / `.btn-ghost`
- `.card` / `.card-interactive`
- `.input` / `.label`
- `.badge-*`
- `.table-*` (status indicators)

## License

MIT
