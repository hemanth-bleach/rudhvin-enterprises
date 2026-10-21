# Rudhvin Enterprises — Invoice Management System

A production-grade, full-stack Invoice Management System built specifically for **Rudhvin Enterprises**, featuring real-time backend-computed business metrics, multi-step invoice creation with live side-by-side A4 invoice preview, payment tracking, PDF generation with Puppeteer, and comprehensive financial reports.

---

## 📸 Overview & Visual Design

- **Left Navigation Sidebar**: Deep navy (`#0B132B`) with stylized golden & blue "RE" monogram branding, navigation links, and active state blue pills.
- **Top Navigation Bar**: Bold red **RUDHVIN ENTERPRISES** heading, global search, notification badge, and current user profile chip.
- **Dashboard**: Displays **all 4 persistent statistics cards** computed live via backend aggregations:
  1. **Total Invoices**: Count of all non-deleted invoices (including drafts and cancelled).
  2. **Total Billed Amount**: Sum of grand totals of all valid issued invoices (excluding drafts and cancelled) formatted in Indian Rupees (`en-IN`).
  3. **Pending Amount**: Sum of outstanding balances (`balanceDue = max(0, grandTotal - amountPaid)`), excluding drafts, cancelled, and fully paid invoices.
  4. **Total Customers**: Count of active customer records.
- **Print-Ready A4 Invoice Document**: Reproduces the exact reference invoice layout with the red company heading, blue address and contact details, centered watermark, GST breakdown, bank account details, and authorized signatory.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, TanStack Query (React Query), Axios, React Hot Toast
- **Backend**: Node.js, Express.js, Mongoose, JWT Authentication, Bcrypt.js, Zod validation
- **PDF Generation**: HTML5/CSS3 print template rendered via Puppeteer / Puppeteer-Core
- **Database**: Dual-mode engine supporting standard MongoDB / MongoDB Atlas connections (`mongodb://...`) as well as an embedded persistent disk engine (`backend/data/rudhvin_store.json`) with zero external service dependencies.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (tested on v26.5.1)
- **npm**: v9+ (tested on v11.17.0)
- **Google Chrome** or **Microsoft Edge** installed on the host system for Puppeteer PDF rendering.

### 2. Environment Configuration
The backend comes pre-configured with a ready-to-run `.env` file:
```env
PORT=5000
MONGODB_URI=embedded
JWT_SECRET=rudhvin_enterprises_jwt_secret_key_2026_production
NODE_ENV=development
ADMIN_EMAIL=admin@rudhvin.com
ADMIN_PASSWORD=Admin@12345
```
*(To use an external MongoDB or MongoDB Atlas instance, simply replace `MONGODB_URI=embedded` with your connection string: `MONGODB_URI=mongodb://localhost:27017/rudhvin_invoices`)*

### 3. Installation & Running

#### Option A: Run Unified Full-Stack Application (Single Command)
The backend automatically serves both the REST API and the compiled React SPA:
```powershell
# From the root directory:
cd backend
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

#### Option B: Run in Development Mode with Vite HMR
```powershell
# Terminal 1 - Backend API:
cd "c:\Rudhvin enterprices\backend"
npm run dev

# Terminal 2 - Frontend with Vite Hot Module Replacement:
cd "c:\Rudhvin enterprices\frontend"
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Default Credentials

- **Email**: `admin@rudhvin.com`
- **Password**: `Admin@12345`
- **Role**: `Administrator`

---

## 📋 Features & Workflows

### 1. Dashboard
- 4 authoritative KPI cards with loading spinners, trend indicators, and error-state **Retry** action.
- Quick action shortcuts: Create Invoice, Add Customer, Add Product, View Reports.
- Recent Invoices table with quick actions: View, Download PDF, Record Payment, Cancel.
- Live recent activity feed tracking audit events.

### 2. Create Invoice Flow
- **Step 1: Customer Details** — Autocomplete dropdown with inline `+ Add New` customer modal.
- **Step 2: Add Items** — Dynamic line items with product catalog autofill, custom descriptions, HSN/SAC codes, quantity, rate, discount %, and GST rates (0%, 5%, 12%, 18%, 28%).
- **Step 3: Review & Final Details** — Sequential invoice number assignment (e.g. `RU001`, `RU002`), due date, payment terms, notes, and live side-by-side preview.
- **Step 4: Generate** — Direct A4 PDF download, browser printing, or return to dashboard.

### 3. Invoices Management
- Server-side filtering by status (`draft`, `issued`, `partially_paid`, `paid`, `cancelled`), payment status, and date range.
- Search by invoice number, customer name, and GSTIN.
- Export filtered records to **CSV**.

### 4. Payments
- Support for partial and full payments.
- Real-time balance recalculation (`balanceDue` decreases, `amountPaid` increases).
- Status changes automatically from `unpaid` -> `partially_paid` -> `paid`.
- Admin payment reversal with mandatory reason and audit logging.

### 5. Company Settings
- Update Rudhvin Enterprises business address, GSTIN, phone, and email.
- Configure Bank account details (Account number, IFSC code, Bank name, Branch).
- Configure invoice prefix (`RU`) and default payment terms.

---

## 🧪 Verification & Mandatory Testing Checklist

All 12 mandatory testing scenarios have been executed and verified:

| # | Test Scenario | Expected Result | Status |
|---|---|---|---|
| **1** | Empty database | Invoices: 0, Billed: ₹0.00, Pending: ₹0.00, Customers: 0. Cards visible. | ✅ Verified |
| **2** | Create customer | Total Customers increments to 1; persists across page reloads. | ✅ Verified |
| **3** | Create & issue invoice | RU001 (30 qty × ₹175 @ 0% tax) = ₹5,250. Billed & Pending increase by ₹5,250. | ✅ Verified |
| **4** | Partial payment | Payment of ₹2,000 recorded. Pending amount becomes ₹3,250.00. | ✅ Verified |
| **5** | Full payment | Remaining ₹3,250 recorded. Pending amount becomes ₹0.00; status = `paid`. | ✅ Verified |
| **6** | Draft invoice | Draft created. Invoices count +1, but Billed and Pending do not increase. | ✅ Verified |
| **7** | Cancelled invoice | Issued invoice cancelled. Billed & Pending excluded from stats; audit logged. | ✅ Verified |
| **8** | PDF generation | High-fidelity A4 PDF rendered via Puppeteer matching uploaded reference. | ✅ Verified |
| **9** | Persistence | Server restarted; all invoices, customers, and payments restored from disk. | ✅ Verified |
| **10**| Failure handling | If API unreachable, all 4 cards display clear error and Retry button. | ✅ Verified |
| **11**| Concurrent numbering | 5 simultaneous invoice creations produced unique sequential numbers (`RU004`-`RU008`). | ✅ Verified |
| **12**| Authorization | Unauthenticated blocked (401); staff forbidden from admin routes (403). | ✅ Verified |

---

## 🏛️ REST API Endpoints

### Authentication & Users
- `POST /api/auth/login` — Sign in and receive JWT token
- `POST /api/auth/logout` — Sign out
- `GET /api/auth/me` — Get current profile
- `GET /api/auth/users` — List users *(Admin only)*
- `POST /api/auth/users` — Create user *(Admin only)*
- `PATCH /api/auth/users/:id/toggle-status` — Toggle user active state *(Admin only)*

### Dashboard
- `GET /api/dashboard/stats` — Authoritative financial KPI stats
- `GET /api/dashboard/monthly-summary` — Monthly billing aggregations
- `GET /api/dashboard/recent-invoices` — Top 5 recent invoices
- `GET /api/dashboard/recent-activity` — Recent activity feed

### Invoices
- `GET /api/invoices` — List invoices with filtering, pagination, CSV export
- `GET /api/invoices/peek-number` — Preview next invoice number
- `GET /api/invoices/:id` — Get invoice details
- `POST /api/invoices` — Create invoice (draft or issued)
- `PATCH /api/invoices/:id` — Update invoice
- `POST /api/invoices/:id/issue` — Issue draft invoice
- `POST /api/invoices/:id/cancel` — Cancel invoice
- `GET /api/invoices/:id/pdf` — Generate and stream A4 PDF
- `POST /api/invoices/:id/payments` — Record payment for invoice

### Customers & Products
- `GET /api/customers`, `POST /api/customers`, `PATCH /api/customers/:id`, `DELETE /api/customers/:id`
- `GET /api/products`, `POST /api/products`, `PATCH /api/products/:id`, `DELETE /api/products/:id`

### Payments & Reports
- `GET /api/payments` — List payments
- `POST /api/payments` — Record payment
- `POST /api/payments/:id/reverse` — Reverse payment *(Admin only)*
- `GET /api/reports` — Monthly revenue, customer billing, and GST tax liability
- `GET /api/settings/company`, `PATCH /api/settings/company` — Manage company & bank profile
