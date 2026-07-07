# 🏥 CareHive OS

> **CareHive** is a centralized, digital healthcare coordination platform designed to bridge the operational gap between isolated hospital centers and regional health administrative offices.

In typical municipal or state healthcare frameworks, resource allocation, bed capacity, shift attendance, and disease outbreaks are monitored across disjointed communication channels (calls, spreadsheets). This leads to ambulance dispatch delays, drug stockouts, and undetected outbreak surges. 

**CareHive solves these challenges** by providing real-time data integration, LIS workflows, and AI-driven clinical logistics.

---

## 🏛️ Project Architecture

```
                                  +-----------------------+
                                  |     CareHive Client   |
                                  +-----------┬-----------+
                                              │ (REST APIs)
                                              ▼
                                  +-----------------------+
                                  |     Express Backend   |
                                  +-----------┬-----------+
                                              │ (Prisma Client)
                                              ▼
                                  +-----------------------+
                                  |  PostgreSQL Database  |
                                  +-----------------------+
```

---

## 🚀 Key Features

* **🏥 Hospital Lifecycle & Command Center**: Activate pending hospital registrations, check dynamic regional coordinates, and monitor beds occupancy statistics.
* **🔬 LIS (Laboratory Information System)**: End-to-end laboratory test workflow from Doctor Order ➔ Technician Sample Collection ➔ Centrifuge Processing ➔ Result Fulfillment ➔ Physician Sign-off Verification.
* **🤖 AI Resource Logistics**: Gemini-1.5-flash CDSS that scans hospital metrics (ICU beds, blood counts) to suggest peer-to-peer logistic redistributions.
* **📊 Disease Surveillance**: Outbreak detection algorithms with responsive SVG trend graphics monitoring TB, COVID, Dengue, Malaria, and Influenza.
* **💬 Multilingual AI Assistant**: Floats on the patient console, translating records, appointments, and prescriptions into English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, or Bengali.
* **📋 Secure Audit Trails**: Absolute verification logs documenting clinician check-ins, medication administrations, and resource transfers.

---

## ⚡ Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React, Vite, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | Express.js, Node.js, TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Gen AI** | Google Gemini 1.5 Flash (via `@google/generative-ai`) |

---

## ⚙️ Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.x or higher)
* [PostgreSQL](https://www.postgresql.org/) (Ensure your local/remote server is active)

---

### 1. Backend Setup

1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables inside `.env`:
   ```properties
   DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db_name>?schema=public"
   JWT_SECRET="your-jwt-secure-secret-key"
   PORT=5000
   GEMINI_API_KEY="your-google-gemini-api-key"
   ```
4. Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Seed the database with initial registries:
   ```bash
   npm run prisma:seed
   ```
6. Spin up the local API development server:
   ```bash
   npm run dev
   ```

---

### 2. Frontend Setup

1. Navigate to the `Frontend` directory:
   ```bash
   cd ../Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure target endpoints in `.env`:
   ```properties
   VITE_API_URL="http://localhost:5000/api/v1"
   ```
4. Start the Vite bundler dev server:
   ```bash
   npm run dev
   ```

---

## 📁 Folder Structure

```
GAIS/
├── Backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Database model definitions
│   │   └── seed.ts              # Seeder scripts
│   └── src/
│       ├── app.ts               # Express configuration
│       ├── server.ts            # Server entrypoint
│       └── modules/             # Modular LIS, Admin, Triage, and Attendance controllers
├── Frontend/
│   └── src/
│       ├── api/                 # Axios endpoints instances
│       ├── context/             # Global states (AuthContext)
│       └── pages/               # Interactive portals (Lab LIS, Clinician Dashboard)
└── docs/                        # Project Functional & Operational Audit manuals
```
