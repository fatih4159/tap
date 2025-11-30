"You are a Senior Full-Stack Engineer specializing in modern web and mobile-first (PWA) applications. Your goal is to systematically implement a SaaS-ready, multi-tenant Point-of-Sale (POS) and Ordering System for the gastronomy sector, based on the provided detailed To-Do list. Prioritize high-value, critical, and foundational tasks first. The application includes a dual payment strategy: SaaS Billing (Subscription) and Direct Transaction Processing (Restaurant choice).

The core technology stack is:

Backend: Node.js (Express/NestJS or similar), Socket.IO, PostgreSQL.

Frontend: React/Vue/Svelte (PWA), optimized for touch/high-contrast UIs.

Architecture: Multi-Tenancy (SaaS) with strong data isolation (schema-per-tenant or row-level security) and Offline-First capabilities.

Phase 1: Foundation & Core Architecture (High Priority)
Implement the following critical tasks sequentially:

[Task: Multi-Tenancy Architecture (SaaS)]: Set up the foundational logic for client isolation.

Goal: Define the data model for tenants/restaurants. Implement middleware to correctly route requests and ensure data access is strictly limited to the current tenant.

[Task: PostgreSQL Setup & DB Design]: Design and implement the core database schema.

Goal: Create essential tables (Tenants, Users, Tables, Orders, OrderItems). Ensure the design supports the chosen multi-tenancy strategy.

[Task: Authentifizierung & User Management (Initial)]: Implement secure access control.

Goal: Set up secure Login/Session Management (e.g., JWT). Create initial models/endpoints for Admin and basic Server/Waiter roles.

[Task: Offline-First / Sync-Logik (Foundation)]: Establish the data queuing mechanism.

Goal: Design the client-side (PWA) strategy for storing pending data (e.g., using IndexedDB) when offline. Create a simple API endpoint to handle bulk synchronization upon re-connect.

[Task: Socket.IO Integration (Core)]: Set up real-time communication.

Goal: Initialize the Socket.IO server. Implement the first real-time channel to broadcast a status update (e.g., 'New Order Received') to the relevant tenant's Kitchen Display System (KDS).

Phase 2: Critical Features (Legal, Operative & PAYMENT)
Address the following essential requirements:

[Task: SaaS Billing Integration (Stripe)]: Implement the subscription and usage-based billing mechanism.

Goal: Integrate Stripe Billing API. Create logic to meter and invoice tenants based on either 'Anzahl der Bestellungen' (Order Count) or 'Anzahl der aktiven User' (Active User Count). Implement webhook handling for subscription status changes (e.g., payment failed, subscription canceled).

[Task: Payment Provider Abstraction Layer]: Implement a flexible gateway for direct payments.

Goal: Design an abstraction layer/interface (e.g., PaymentGatewayService) that allows the system to communicate with multiple providers. Implement initial modules for Stripe, Mollie, and PayPal that adhere to this interface for processing individual transactions (e.g., guest checkouts).

[Task: TSE / Fiskalisierung (Conceptual)]: Research and integrate the legal requirement.

Goal: Define the necessary integration points for a Technical Security Equipment (TSE) (Germany/KassenSichV) or equivalent local fiscalization logic. Develop a mock/placeholder service that logs required transaction details to prepare for final integration.

[Task: Raum- & Tisch-Editor]: Build the restaurant layout configuration UI.

Goal: Develop the Back-Office UI allowing Managers to create and edit Floors, Rooms, and Tables.

[Task: QR-Code Generator]: Link physical tables to the digital ordering system.

Goal: Implement a service to generate unique, tenant-specific QR-Codes (containing Tenant ID and Table ID) for print.

[Task: Digitale Menükarte & Warenwirtschaft (Basic)]: Implement the core content management.

Goal: Create the Back-Office UI/API for Managers to add/edit Menu Items (Name, Price, Category). Include a basic toggle for "Ausverkauft" (Out of Stock) that affects the guest-facing menu.

Call to Action
"Start with Phase 1, Task 1: Multi-Tenancy Architecture. Develop the necessary backend files (e.g., tenant-middleware.js, db-connection.js) and the initial data models in PostgreSQL. After implementing and testing this task, provide a summary of the implemented code and ask for the next task."
