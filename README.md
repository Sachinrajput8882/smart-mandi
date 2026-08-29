# 🌾 Smart Mandi Queue Management System
> Solving farmer overcrowding, truck congestion, and long waiting times at MSP procurement centers and APMC mandis.

---

## 📌 Project Overview
During peak harvest seasons, Minimum Support Price (MSP) procurement centers often experience heavy vehicular congestion, long queues of tractors/trolleys, and frustration due to zero queue visibility.

**Smart Mandi** provides a complete digital token allocation and real-time queue management solution:
1. **Farmer Slot Booking**: Farmers register beforehand with crop type and quantity, receiving an instant digital token (`TKNxxxx`) with a scannable QR code.
2. **Dynamic Queue & Wait Estimator**: Computes live position and dynamic wait time (`position × 10 minutes`).
3. **Live Public Board**: TV-style display for Mandi arrival yards with instant Server-Sent Events (SSE) updates and 4-second auto-polling fallback.
4. **Officer Admin Panel**: Procurement officers click **"Call Next Farmer"**, **"Mark as Processing"**, and **"Mark as Done"** to dispatch and manage flow.
5. **Gate Alerts & Audio Announcements**: Alerts farmers when their turn is near (`position < 3`) and speaks audible gate announcements through the Mandi loudspeaker system using the Web Speech API.

---

## 🏗️ Tech Stack
- **Frontend**: React.js (Vite), Tailwind CSS, Lucide Icons, QRCode.react, Canvas Confetti
- **Backend**: Node.js, Express.js REST API with Server-Sent Events (SSE) real-time streaming
- **Database**: Dual Architecture:
  - **Zero-Config Persistent File Store / SQLite**: Runs immediately out-of-the-box with zero setup required.
  - **PostgreSQL / Supabase**: Connect by setting `DATABASE_URL` in `backend/.env` (schema file provided at `backend/schema.sql`).

---

## 📁 Folder Structure
```
smart-mandi-queue/
├── backend/
│   ├── src/
│   │   ├── config/db.js            # Dual DB adapter (PostgreSQL/Supabase + Local persistent store)
│   │   ├── controllers/queueController.js # Queue calculations, status transitions, SSE broadcaster
│   │   ├── routes/queueRoutes.js   # API Endpoints (/book, /queue, /next, /update-status, /queue/stream)
│   │   └── server.js               # Express application setup & CORS
│   ├── data/mandi_queue.json       # Persistent queue storage
│   ├── schema.sql                  # PostgreSQL & Supabase DDL schema with seed data
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Mandi header, live clock, status counters
│   │   │   ├── BookingForm.jsx     # Farmer slot booking with crop & quintals
│   │   │   ├── TokenReceipt.jsx    # Printable token slip with QR code
│   │   │   ├── QueueCard.jsx       # Color-coded queue cards (Yellow, Blue, Orange, Green)
│   │   │   ├── LiveQueue.jsx       # Public dashboard with TV display board
│   │   │   ├── TokenTracker.jsx    # Search single token with simulated gate alerts
│   │   │   ├── AdminPanel.jsx      # Call Next, Processing, Done buttons & operations
│   │   │   └── AnalyticsModal.jsx  # Daily stats (total quintals, crop distribution)
│   │   ├── services/api.js         # Centralized API service
│   │   ├── App.jsx                 # Real-time SSE listener & state coordinator
│   │   ├── index.css               # Tailwind styles
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── run-all.js                      # Node concurrent launcher
├── start-all.bat                   # 1-Click Windows Launcher (Starts everything & opens browser)
├── package.json                    # Root package.json
└── README.md
```

---

## 🚀 How to Run

### Method 1: Double-Click Launcher (Windows)
Double-click **`start-all.bat`** in the project folder. It will start both backend and frontend servers and open `http://localhost:3000` automatically in your browser.

### Method 2: Single Command (Root)
From the project root:
```bash
npm run dev
```

### Method 3: Separate Terminals
**Terminal 1 (Backend API):**
```bash
cd backend
npm run dev
# Running on http://localhost:5000
```

**Terminal 2 (Frontend App):**
```bash
cd frontend
npm run dev
# Running on http://localhost:3000
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/queue/stream` or `/api/queue/stream` | Real-time Server-Sent Events (SSE) live queue update stream |
| `POST` | `/book` or `/api/book` | Book slot (farmer name, crop type, quantity, preferred date) |
| `GET` | `/queue` or `/api/queue` | Retrieve all slots with calculated positions & wait times |
| `PUT` | `/next` or `/api/next` | Call next waiting farmer (transitions first waiting -> `called`) |
| `PUT` | `/update-status` or `/api/update-status` | Update slot status (`waiting`, `called`, `processing`, `done`, `cancelled`) |
| `GET` | `/queue/:tokenId` or `/api/queue/:tokenId` | Fetch status and position for a specific token |
| `GET` | `/analytics` or `/api/analytics` | Summary of today's farmers, total quintals, and crop breakdown |
| `POST` | `/reset-seed` or `/api/reset-seed` | Reset with sample seed data for quick testing |

---

## 🗄️ Connecting to PostgreSQL or Supabase
1. Run the SQL script from `backend/schema.sql` in your PostgreSQL or Supabase SQL Editor.
2. In `backend/.env` (or copy from `.env.example`), set:
   ```env
   DATABASE_URL=postgresql://postgres.youruser:yourpassword@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
3. Restart the backend server. The app will automatically connect to PostgreSQL and query your cloud database.

---

## 🎨 Color-Coded Statuses
- 🟡 **Waiting** (`Yellow`): In line, dynamic estimated wait time displayed (`position × 10 mins`)
- 🔵 **Called** (`Blue`): Called to Mandi weighbridge gate
- 🟠 **Processing** (`Orange`): On weighbridge, moisture inspection in progress
- 🟢 **Done** (`Green`): Procurement complete, MSP payment advice slip issued
