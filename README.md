# 🚚 TransitOps

<div align="center">

### Intelligent Fleet & Logistics Management Platform

A modern Fleet Management System built to streamline transportation operations through centralized fleet monitoring, trip management, maintenance tracking, and operational analytics.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-38BDF8?logo=tailwindcss)

</div>

---

# 📖 Overview

TransitOps is a full-stack Fleet Management Platform designed to simplify day-to-day transportation operations.

The platform provides a centralized interface for managing vehicles, drivers, trips, maintenance schedules, fuel expenses, and operational analytics while ensuring smooth coordination between different departments.

---

# ✨ Features

## 🚚 Fleet Management

- Vehicle Registration
- Vehicle Availability Monitoring
- Capacity Tracking
- Odometer Management
- Regional Fleet Allocation
- Vehicle Status Management

---

## 👨‍✈️ Driver Management

- Driver Profiles
- License Management
- Safety Score Tracking
- Driver Availability
- Trip Performance
- License Expiry Monitoring

---

## 📍 Trip Management

- Trip Creation
- Vehicle Assignment
- Driver Assignment
- Dispatch Workflow
- Trip Completion
- Trip Cancellation
- Cargo Capacity Validation

---

## 🛠 Maintenance

- Maintenance Scheduling
- Service Records
- Cost Tracking
- Vehicle Availability
- Service History

---

## ⛽ Fuel Management

- Fuel Expense Recording
- Fuel Cost Tracking
- Mileage Analysis

---

## 📊 Analytics

- Fleet Utilization
- Operational Cost
- Revenue Analysis
- Vehicle ROI
- Performance Reports
- KPI Dashboard

---

## 🔐 Authentication & Security

- JWT Authentication
- Role-Based Access Control
- Protected API Routes
- Permission Management

---

# 🏗 System Architecture

```text
                    React + Vite
                         │
                         ▼
                 Express REST API
                         │
                         ▼
                    PostgreSQL
```

---

# 📂 Project Structure

```text
TransitOps
│
├── backend
│   ├── db
│   ├── src
│   │   ├── middleware
│   │   ├── routes
│   │   ├── db.js
│   │   └── index.js
│   │
│   ├── Dockerfile
│   └── package.json
│
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── context
│   │   ├── layouts
│   │   ├── lib
│   │   ├── pages
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── Dockerfile
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── docker-compose.yml
└── README.md
```

---

# 🖥 Modules

| Module | Description |
|---------|-------------|
| Dashboard | Fleet overview and operational KPIs |
| Fleet | Vehicle registry and monitoring |
| Drivers | Driver information and safety tracking |
| Trips | Trip planning and dispatch |
| Maintenance | Service records and maintenance history |
| Fuel Expenses | Fuel cost management |
| Analytics | Reports and performance insights |
| Settings | Application configuration |

---

# 🛠 Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Recharts

### Backend

- Node.js
- Express.js

### Database

- PostgreSQL

### Authentication

- JWT
- Role-Based Access Control

### DevOps

- Docker
- Docker Compose

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/your-username/transitops.git

cd transitops
```

---

## Backend

```bash
cd backend

npm install

npm run dev
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## Using Docker

```bash
docker compose up --build
```

---

# 📸 the Architecture

<img width="2354" height="379" alt="image" src="https://github.com/user-attachments/assets/52c714cf-3276-4640-b606-d13ab7178fe1" />

---

# 📈 Future Enhancements

- Live Vehicle Tracking
- Route Optimization
- Predictive Maintenance
- Push Notifications
- Mobile Application
- AI-based Fleet Insights

---

# 👨‍💻 Team

Developed for the **Odoo Hackathon**.

---

# 📄 License

This project is intended for educational and hackathon purposes.
