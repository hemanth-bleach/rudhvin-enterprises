# 🚀 Rudhvin Enterprises — Production Deployment Guide

This document provides complete instructions for deploying the **Rudhvin Enterprises Invoice Management System** to production servers.

---

## 🏗️ Architecture Overview

- **Unified Single-Port Deployment**: The Node.js Express backend serves both the REST API (`/api/*`) and the compiled React SPA static files (`frontend/dist`) on a single port (default: `5000` or `80`).
- **Zero-Dependency Database**: Comes with persistent embedded JSON storage (`backend/data/rudhvin_store.json`) or connects to any MongoDB / MongoDB Atlas instance via `MONGODB_URI`.
- **A4 PDF Generation**: Built with Puppeteer-core. Supports Chrome, Edge, and Linux Chromium out of the box with zero code changes.

---

## 📋 Pre-Deployment Checklist

1. [x] React Modal Hook bug resolved across all dialogs.
2. [x] Cross-platform Linux/Mac/Windows Chromium detection configured.
3. [x] Single-command root execution configured.
4. [x] All 70 automated audit tests passing.

---

## 🐳 Option 1: Docker & Docker Compose (Recommended)

Docker provides an isolated environment with Node 20, Chromium, and all system fonts pre-installed.

### 1. Requirements
- Docker and Docker Compose installed on your server.

### 2. Steps to Deploy
```bash
# Clone or upload project to server
git clone <your-repo-url> rudhvin-enterprises
cd rudhvin-enterprises

# Start the application
docker compose up -d --build
```

### 3. Verify
- Open `http://your-server-ip:5000` in your browser.
- Data is automatically persisted in `./backend/data` on the host machine.

---

## 🐧 Option 2: Linux VPS / Cloud VM (Ubuntu / Debian / AWS / DigitalOcean)

Using **PM2** and **Nginx Reverse Proxy**.

### 1. Connect to your VPS
```bash
ssh user@your-server-ip
cd /var/www
git clone <your-repo-url> rudhvin-enterprises
cd rudhvin-enterprises
```

### 2. Run Automated Deployment Script
```bash
chmod +x deploy.sh
./deploy.sh
```

*(Alternatively, run manually:)*
```bash
# Install Chromium and font packages for PDF printing
sudo apt-get update
sudo apt-get install -y chromium-browser fonts-liberation fontconfig

# Install PM2 globally
sudo npm install -g pm2

# Install and build
npm run install:all
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

### 3. Setup Nginx Reverse Proxy (Optional for Port 80/443 & Domain)
```bash
sudo cp nginx.conf /etc/nginx/sites-available/rudhvin
sudo ln -s /etc/nginx/sites-available/rudhvin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Enable Free HTTPS / SSL (Certbot)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## ☁️ Option 3: Cloud PaaS (Render, Railway, or Fly.io)

### Render.com Setup:
1. Create a **Web Service** on Render connected to your Git repository.
2. Configure settings:
   - **Environment**: Node
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
3. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `JWT_SECRET`: `<generate-a-strong-random-key>`
   - `PUPPETEER_EXECUTABLE_PATH`: `/usr/bin/google-chrome-stable` (or use Docker runtime)

---

## 🪟 Option 4: Windows Server

1. Open PowerShell as Administrator.
2. Install dependencies and build:
   ```powershell
   cd "C:\path\to\rudhvin-enterprises"
   npm run install:all
   npm run build
   ```
3. Run with PM2 or as a Windows Service (NSSM):
   ```powershell
   npm install -g pm2
   pm2 start ecosystem.config.cjs --env production
   pm2 save
   ```

---

## 🔑 Default Credentials & Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Web server listening port | `5000` |
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | Database (`embedded` or MongoDB connection string) | `embedded` |
| `JWT_SECRET` | Secret key for JWT session tokens | *Replace with strong key* |
| `ADMIN_EMAIL` | Default administrator login | `admin@rudhvin.com` |
| `ADMIN_PASSWORD` | Default administrator password | `Admin@12345` |
