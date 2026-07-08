# 🏥 CareHive OS

> **CareHive OS** is an AI-powered centralized healthcare infrastructure platform that connects hospitals, district health administrators, laboratories, pharmacies, and medical staff through a unified digital ecosystem.

It eliminates fragmented communication by providing real-time hospital resource monitoring, centralized administration, intelligent logistics, laboratory workflows, disease surveillance, and secure clinical record management.

---

# 🌐 Live Demo

**Frontend**

https://smart-infrastructure-for-centralize.vercel.app

**Backend API**

https://smart-infrastructure-for-centralized.onrender.com

---

# 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| 🏛️ District Administrator | `appadmin@carehive.med` | `Password@123` |
| 🏥 Hospital Administrator | `admin.1@carehive.med` | `Admin@123` |
| 👨‍⚕️ Doctor | `doctor.1.1@carehive.med` | `Password@123` |
| 🧪 Lab Technician | `lab.1.1@carehive.med` | `Password@123` |
| 💊 Pharmacist | `pharma.1.1@carehive.med` | `Password@123` |
| 👩‍⚕️ Nurse | `nurse.1.1@carehive.med` | `Password@123` |

---

# 🏛️ System Architecture

```
                                 +-------------------------+
                                 |     React + Vite UI     |
                                 +------------┬------------+
                                              │
                                        REST API (HTTPS)
                                              │
                                              ▼
                                 +-------------------------+
                                 |   Express.js Backend    |
                                 | Authentication • RBAC   |
                                 | Business Logic          |
                                 +------------┬------------+
                                              │
                                       Prisma ORM
                                              │
                                              ▼
                                 +-------------------------+
                                 |     PostgreSQL DB       |
                                 +-------------------------+
```

---

# 🚀 Features

## 🏥 Hospital Management

- Hospital onboarding and approval workflow
- District-level hospital monitoring
- Bed availability tracking
- Department management
- Staff management
- Role Based Access Control (RBAC)

---

## 👨‍⚕️ Clinical Management

- Doctor dashboard
- Appointment scheduling
- Patient timeline
- Prescription management
- Medical records
- Admission workflow

---

## 🔬 Laboratory Information System (LIS)

- Laboratory order management
- Sample collection
- Sample processing
- Result verification
- Doctor review
- Laboratory dashboard

---

## 💊 Pharmacy & Inventory

- Medicine inventory
- Stock monitoring
- Prescription dispensing
- Drug availability tracking
- Inventory analytics

---

## 🤖 AI Intelligence

- AI-powered inventory recommendations
- Clinical decision support
- Resource redistribution suggestions
- Predictive demand analysis

---

## 📊 Disease Surveillance

- Outbreak monitoring
- Regional disease statistics
- Trend visualization
- Public health analytics

---

## 📈 Administration

- District Administration Dashboard
- Hospital Administration Dashboard
- Attendance Management
- Analytics Dashboard
- Audit Logs
- Referral Management

---

# ⚡ Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT |
| AI | Google Gemini 1.5 Flash |
| Deployment | Vercel + Render |

---

# 📁 Project Structure

```
GAIS
│
├── Backend
│   ├── prisma
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   └── src
│       ├── modules
│       ├── middleware
│       ├── routes
│       ├── services
│       ├── app.ts
│       └── server.ts
│
├── Frontend
│   └── src
│       ├── api
│       ├── components
│       ├── context
│       ├── pages
│       ├── hooks
│       ├── utils
│       └── App.tsx
│
└── docs
```

---

# ⚙️ Backend Setup

```bash
cd Backend

npm install
```

Create `.env`

```env
DATABASE_URL=postgresql://<username>:<password>@<host>:5432/<database>

JWT_SECRET=your-secret

PORT=5000

GEMINI_API_KEY=your-api-key
```

Run database migrations

```bash
npx prisma migrate dev
```

Seed demo data

```bash
npm run prisma:seed
```

Start backend

```bash
npm run dev
```

---

# ⚙️ Frontend Setup

```bash
cd Frontend

npm install
```

Create `.env`

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Run

```bash
npm run dev
```

---

# 🔒 Security

- JWT Authentication
- Role Based Access Control
- Password Hashing
- Request Validation
- Audit Logging
- Rate Limiting
- Secure REST APIs

---

# 🎯 Future Enhancements

- AI-assisted diagnosis
- Telemedicine
- Ambulance live tracking
- Mobile application
- Electronic Health Record integration
- Multi-state healthcare federation
- IoT medical device integration

---

# 👨‍💻 Developed For

**Google Healthcare Hackathon**

A centralized healthcare management platform focused on improving operational efficiency, resource utilization, and patient care through real-time digital coordination.

---

# 📄 License

This project is developed for educational and hackathon purposes.
