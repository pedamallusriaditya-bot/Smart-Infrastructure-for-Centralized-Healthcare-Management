# CareHive: Unified Regional Healthcare Platform
## Functional, Technical, & Architectural System Documentation

---

## ⚡ Executive Summary (2-Minute Read)

**CareHive** is a centralized, digital healthcare coordination platform designed to bridge the operational gap between isolated hospital centers and regional health administrative offices. In typical state or municipal setups, logistics redistribution, beds occupancy monitoring, doctor attendance logs, and disease surveillance are handled via disjointed communication channels (calls, spreadsheets), resulting in delayed emergency responses, medicine stockpiling, and un-tracked disease spikes.

**CareHive solves these challenges** by providing:
1. **Interactive Real-Time Supervision**: Single-dashboard insights into beds capacity, doctor queues, and inventories for district supervisors.
2. **Dynamic Disease Surveillance**: Dynamic disease tracking (COVID, Malaria, Dengue, TB, Influenza, Typhoid) that automatically triggers alerts for District Administrators when anomalous case spikes are identified.
3. **Automated AI Resource Logistics**: Gemini-1.5-flash analysis that evaluates hospital deficits (blood shortage, ICU overload, nurse deficiency) and suggests peer-to-peer resource transfers.
4. **Multilingual AI Assistant**: A patient-facing floating chat assistant that translates summaries of appointments, reports, and prescriptions into English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, or Bengali.
5. **Robust Audit Logs & Emergency Dispatch**: High-fidelity logs recording every key clinician shift check-in, prescription transaction, and ambulance GPS telemetry update to ensure complete compliance.

---

# 1. Project Overview

### Concept
CareHive acts as a centralized "Central Health Command" that ties together clinical data (Electronic Medical Records), logistics management (Medicines & Blood Units), operational status (Beds & Shifts), and emergencies response coordination into a single, federated platform.

```
       +---------------------------------------------+
       |             CareHive Web App                |
       +---------------------------------------------+
          /                  |                    \
   [Patients]            [Doctors]            [Admins]
 - Self Profile        - Consultations      - Staff Registry
 - Records & QRs       - Lab Orders         - Auditing Trails
 - AI Assistant        - Prescriptions      - Performance metrics
```

### Problems Solved
* **Asymmetrical Resource Allocation**: Prevents inventory stockouts by executing automated peer-to-peer transfers.
* **Delayed Disease Identification**: Automates case scanning to identify surges early and warn health heads.
* **Complex Patient Portals**: Simplifies record checks by offering immediate localized chat summaries.
* **Oversight Gaps**: Enforces absolute integrity by registering a permanent audit log of clinical mutations.

---

# 2. Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React, Vite | compiled with TypeScript, optimized SPA build bundle. |
| **Backend** | Express.js, Node.js | Enforces middleware controls, modular MVC controllers. |
| **Database** | PostgreSQL | Relational transactional database. |
| **ORM** | Prisma | Enforces type-safe schema schemas and migrations. |
| **Authentication** | JWT, Bcrypt | Signed token storage inside local storage; hashed password security. |
| **Generative AI** | Google Gemini 1.5 Flash | Drives redistribution algorithms, CDSS, and translation. |
| **Styling & Icons** | Tailwind CSS, Lucide | Responsive glassmorphism styling, native interactive UI components. |

---

# 3. Folder Structure

```
GAIS/
├── Backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database definitions & models
│   │   └── seed.ts                # Initial database registries seeder
│   └── src/
│       ├── app.ts                 # Express initialization & route mounting
│       ├── server.ts              # Port listener setup
│       ├── middleware/            # JWT validation, role checking, error handlers
│       ├── services/              # AI generative connectors, hospital log checkers
│       ├── utils/                 # Standard responses helper utilities
│       └── modules/               # Modular features (Controller, Routes, Service)
│           ├── admin/             # Hospital-level administrative analytics
│           ├── appAdmin/          # District-wide command control and approvals
│           ├── diseaseSurveillance/# Diagnosis case scanning and alert triggers
│           ├── patient/           # Profile retrievals, clinical history, and AI chat
│           ├── attendance/        # Doctor check-in shift controllers
│           └── ... (other backend modules)
│
├── Frontend/
│   ├── src/
│   │   ├── App.tsx                # Main router index
│   │   ├── main.tsx               # Client bootstrap entrypoint
│   │   ├── api/                   # Axios instances and endpoint wrapper helpers
│   │   ├── context/               # Global Authentication context (AuthContext)
│   │   ├── layouts/               # AdminLayout, PatientLayout, NurseLayout wrappers
│   │   └── pages/                 # Portal views
│   │       ├── admin/             # Hospital Admin Overview and performance tabs
│   │       ├── appAdmin/          # District Command Center, maps, and rankings
│   │       ├── patient/           # Patient records cards, appointments, QR codes
│   │       └── ... (other pages)
```

---

# 4. Database Schema (Prisma Models)

### `User`
* **Purpose**: Primary identity record for credentials and system access.
* **Relations**: One-to-one link to optional profiles (`Admin`, `Doctor`, `Patient`, `Nurse`, `Pharmacist`, `LabTechnician`).
* **Fields**: `id` (UUID), `email`, `passwordHash`, `role` (`RoleType`), `status` (`UserStatus`), `district`.

### `Hospital`
* **Purpose**: Represents a healthcare facility registered on the platform.
* **Relations**: One-to-many links to `Doctor`, `Nurse`, `Pharmacist`, `LabTechnician`, `Department`, `Room`, `Ambulance`, `InventoryItem`.
* **Fields**: `id`, `name`, `district`, `state`, `latitude`, `longitude`, `status` (`HospitalStatus`: `PENDING_APPROVAL`/`ACTIVE`/`REJECTED`).

### `Doctor`
* **Purpose**: Profile containing clinician metadata and scheduling slots.
* **Relations**: Belongs to `Department`, has many `Appointment`, `Prescription`, `LabOrder`.

### `Patient`
* **Purpose**: Patient clinical registry profile.
* **Relations**: Links to `Appointment`, `Admission`, `Prescription`, `LabOrder`, `Emergency`.

### `Admission` & `Bed` & `Room`
* **Purpose**: Enforces ward capacity control. `Admission` tracks patient admission and discharge dates.
* **Relations**: `Admission` references `Patient` and `Bed`. `Bed` belongs to `Room`.

### `Prescription` & `LabOrder`
* **Purpose**: Clinical record transactions created by doctors during visits.
* **Relations**: Link patients, prescribing clinicians, and status indexes (`PrescriptionStatus`, `LabTestStatus`).

### `ResourceTransfer`
* **Purpose**: Logs peer-to-peer logistic resource transfers.
* **Relations**: Tracks `sourceHospital`, `destinationHospital`, type of resource (`TransferResourceType`), amount, and status (`TransferStatus`).

---

# 5. User Roles & Permissions

| Role | Allowed Actions | Restricted Actions |
| :--- | :--- | :--- |
| **Patient** | Review own health history, check prescriptions, view QR code, book appointment, chat with AI Assistant. | Cannot view other patient charts, modify diagnostics, or access stats. |
| **Doctor** | Manage appointment queues, write prescriptions, order lab tests, view patient QR charts, clock attendance. | Cannot approve other doctors, view logins audit trails, or edit hospital wards. |
| **Nurse** | Assign rooms, manage bed admissions, execute discharge checkouts, log shift check-ins. | Cannot write prescriptions or authorize peer logistic transfers. |
| **Pharmacist** | Access pharmacy inventory logs, verify prescriptions, dispense medications. | Cannot create patients records or log lab report entries. |
| **Lab Technician** | View lab order list, process tests samples, record diagnostic report data. | Cannot modify prescriptions or allocate beds. |
| **Hospital Admin** | Approve doctor approvals queue, manage department statistics, check audits log, view Performance Dashboard. | Cannot bypass district activation or resolve emergencies. |
| **District Admin** | Approve/Reject hospitals registration, trigger disease checks, authorize resource redistributions. | Cannot write prescriptions or directly allocate beds. |

---

# 6. Authentication & Scoping Flow

1. **Authorization Token**: Client requests are signed using a JSON Web Token (JWT) attached in the `Authorization: Bearer <token>` header.
2. **Access Control Verification**: `auth.middleware.ts` decodes the token. Route-level validation (`requireRole`) checks the token's role array to grant access.
3. **Context Security Isolation**: Sub-methods (e.g. audits lookup) resolve `hospitalId` directly from the authenticated session context, preventing parameter manipulation attacks.

---

# 7. Complete Feature List

* [x] **Secure Authentication & Identity**:
  * Role-based token assignment (JWT)
  * Signed profile session verification
* [x] **Hospital Lifecycle**:
  * Public registration request submission
  * District Command Center activation panel
* [x] **Clinical Supervision**:
  * Doctor approvals credentials queue
  * Real-time clinician shift checks
  * Automated admissions bed bookings
* [x] **Emergency SOS Telemetry**:
  * Real-time ambulance radar coordinates check
  * Active dispatch control cards
* [x] **Disease Surveillance**:
  * Case-insensitive diagnoses scanning
  * Outbreak alerts warning notifications
  * Interactive SVG district heatmap
  * 12-week outlook trend chart
* [x] **Multilingual AI Companion**:
  * Translations to English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali
  * Dynamic, scrollable chat panel
  * Real-time patient profile database indexing
* [x] **Hospital Performance Dashboard**:
  * Revenue, satisfaction, doc utilization comparison cards
  * Custom HSL performance variance badges comparing metrics to district averages
  * Inline 6-month historical trends

---

# 8. Dashboard Documentation

### Hospital Overview Dashboard
* **Purpose**: General operations management for Hospital Administrators.
* **Widgets**: KPI cards (Total patients, total staff count, occupancy rate).
* **Charts**: AI forecasting demand projections.
* **Actions**: Approve clinicians, update diagnostic test costs, trigger shifts report, download audit log.
* **APIs**: `/admin/metrics`, `/admin/bed-occupancy`, `/admin/doctors/pending`.

### District Command Center Dashboard
* **Purpose**: Health oversight panel for District Administrators.
* **Widgets**: Counts of registered hospitals, doctor attendance metrics, bed availability, active emergencies, low stock counts, active outbreaks.
* **Charts**: SVG GPS coordinates telemetry map plotting hospital locations, horizontal bar chart showing hospitals per district.
* **Actions**: Activate pending hospitals, verify in-app alerts, approve/reject logistics transfers.
* **APIs**: `/app-admin/dashboard/stats`, `/app-admin/performance`, `/app-admin/redistribution/status`.

---

# 9. Workflow Documentation

### Unified CareHive Flow Diagram

```
[Hospital Registration]
          ↓
[District Admin Approval] ──(Decline)──> [Notification to Admin]
          ↓
[Hospital Activated]
          ↓
[Staff Roster Registration]
          ↓
[Doctor Check-In (Clock Attendance)]
          ↓
[Patient Registration / Book Appointment]
          ↓
[Doctor Consult / Write Prescription / Lab Order]
    /                                   \
[Pharmacist Dispense]              [Lab Technician process]
          \                               /
           [Admission Bed Allocation (Nurse)]
                          ↓
               [Discharge Checkout Logs]
```

---

# 10. Emergency SOS Workflow

```
[Patient SOS Trigger] ──> [Fetch GPS coordinates]
                                 ↓
                     [Identify Nearest Hospital]
                                 ↓
                    [Dispatch Ambulance Telemetry]
                                 ↓
                     [Verify ETA & Fuel Health]
                                 ↓
                  [Notifications posted to ER Ward]
```

---

# 11. Inventory Logistics Workflow

1. **Item Log Entry**: Pharmacist registers medicine batches.
2. **Prescription Checkout**: Doctor writes prescription. Item is checked out as PENDING.
3. **Verification**: Pharmacist reviews and validates prescription.
4. **Reduction**: Item stock count is reduced dynamically. If stock goes below limit, a low-stock alert is created.

---

# 12. AI Capabilities Documentation

* **Logistics Redistribution**: Optimizes district inventory levels. Evaluates hospital resources (ICU beds, blood counts) and generates recommendation lists.
* **AI Demand Forecasting**: Analyzes clinical datasets to project bed demands and staff requirements.
* **Multilingual Translation Assistant**: Translates medical history records into Indian languages using semantic templates.

---

# 13. System Architecture Diagram

```
+-------------------------------------------------------------+
|                        FRONTEND VIEW                        |
|   [React AppAdmin]     [React HospitalAdmin]   [React Patient]|
+-------------------------------------------------------------+
                              │ (HTTP/HTTPS via Axios)
                              ▼
+-------------------------------------------------------------+
|                         API LAYER                           |
|       /api/v1/auth    /api/v1/admin    /api/v1/patients     |
+-------------------------------------------------------------+
                              │ (Enforces JWT / Role verification)
                              ▼
+-------------------------------------------------------------+
|                        CONTROLLERS                          |
|    [AppAdmin Controller]  [Admin Controller] [Patient AI]   |
+-------------------------------------------------------------+
                              │ (Delegates business logic)
                              ▼
+-------------------------------------------------------------+
|                        SERVICES                             |
|  [Performance Service]  [PatientAi Service] [Surveillance]  |
+-------------------------------------------------------------+
                              │ (Database transaction layer)
                              ▼
+-------------------------------------------------------------+
|                          PRISMA ORM                         |
|                 (Typesafe client queries)                   |
+-------------------------------------------------------------+
                              │
                              ▼
+-------------------------------------------------------------+
|                    POSTGRESQL DATABASE                      |
| (Tables: User, Hospital, Doctor, Bed, Invoice, Notification)|
+-------------------------------------------------------------+
```

---

# 14. Module Dependency Diagram

```
              +----------------------+
              |     diseaseSurveillance|
              +----------┬-----------+
                         │
                         ▼
+-------------+   +------┴------+   +-------------+
|    patient  |──>|    prisma   |<──|    admin    |
+-------------+   +------┬------+   +-------------+
                         ▲
                         │
              +----------┴-----------+
              |       appAdmin       |
              +----------------------+
```

---

# 15. Final Summary

CareHive provides a unified, central digital command center for state and municipal health systems. By linking medical records, bed occupancy, doctor check-ins, and inventory management with real-time telemetry maps and automated translation aids, the platform eliminates traditional coordination bottlenecks. CareHive ensures that resources are allocated efficiently, disease outbreaks are identified early, and emergency dispatches are optimized, improving health outcomes across the region.
