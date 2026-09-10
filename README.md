# Smart Chennai Integrated Command and Control Center (ICCC)

The Smart Chennai ICCC is a comprehensive, realtime, production-ready dashboard simulating a unified command center for a modern metropolitan city.

## Project Overview
This project consolidates Traffic Management, Emergency Response, Flood & Water Monitoring, Citizen Incident Reporting, and AI/Predictive insights into a single role-based operational dashboard.

## Architecture

```text
       [Citizen Portal]                         [Sensors & Worker]
              │                                          │
              ▼                                          ▼
   (POST /api/incidents)                         (Socket.io / HTTP)
              │                                          │
      [Redis + BullMQ]                                   │
              │                                          │
              ▼                                          ▼
    [Next.js API & UI]  ◄─────────────►  [PostgreSQL (Prisma)]
              │                                          │
              ▼                                          ▼
     [Executive/Admin]                        [FastAPI Predictive]
```

### Major Flows
1. **Sensors**: The standalone worker continuously generates realistic traffic/water sensor data, persisting it to PostgreSQL and streaming it via Socket.io.
2. **Citizen Reports**: The Citizen portal pushes incidents to a BullMQ queue backed by Redis, where it handles rate-limiting and deduplication before resolving as a reported incident.
3. **Emergency Dispatch**: Once an incident is verified, operators dispatch nearby emergency units (calculating routes dynamically), updating the system in realtime.

## Technology Stack
- **Frontend**: Next.js 14, React, Tailwind CSS, Framer Motion, React-Leaflet, React-Three-Fiber.
- **Backend**: Next.js App Router API, Prisma ORM, PostgreSQL.
- **Realtime**: Socket.io, Redis.
- **Queue**: BullMQ.
- **Predictive Layer**: FastAPI (Python).

## Setup & Execution

### 1. Prerequisites
- Node.js 18+
- PostgreSQL server
- Redis server
- Python 3.9+ (for FastAPI)

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/smart_chennai"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_SOCKET_URL="ws://localhost:4001"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### 3. Start the System

1. **Install and DB Push**:
   ```bash
   npm install
   npx prisma db push
   ```

2. **Start the Sensor Worker**:
   ```bash
   npm run worker
   ```

3. **Start the Next.js Dashboard**:
   ```bash
   npm run build
   npm run start
   ```

4. **Start the FastAPI Predictive Service**:
   *(Requires uvicorn and fastapi)*
   ```bash
   cd packages/fastapi
   uvicorn main:app --reload --port 8000
   ```

## 2-Minute Viva Demo Script

The system includes an accelerated **Demo Mode** designed specifically for a 2-minute presentation viva.
**Setup:** Enable Demo Mode by clicking the `Demo Mode` toggle in the Topbar. This compresses a 24-hour city cycle into ~2 minutes (12 simulated minutes per real second).

### 0:00–0:15 | Landing Page & Overview
- Start on the **Public Landing Page** (`/`).
- Highlight the 3D Chennai skyline and project KPI targets (35% less congestion).
- Click **"Launch Dashboard"**.

### 0:15–0:35 | Main Dashboard
- Arrive at the unified `/dashboard`.
- Point out the realtime map updating live with traffic flow.
- Note the Topbar connection indicator showing a healthy `Live` socket link.

### 0:35–0:55 | Traffic Module
- Navigate to the **Traffic** tab.
- Due to the accelerated Demo Mode, you will visibly see the "Morning Peak" form, congesting the map.
- Demonstrate opening a specific junction and applying a **Signal Override**.

### 0:55–1:15 | Emergency & Incidents
- Navigate to the **Emergency** tab.
- An incident will auto-generate (or simulate a citizen report).
- Show the incident priority queue, select it, and dispatch a Fire Truck/Ambulance.
- Highlight the map updating to show the dispatched unit route and ETA.

### 1:15–1:35 | Water & Flood Module
- Navigate to the **Water** tab.
- From the Admin configuration (or Topbar if exposed), enable **Monsoon Simulation**.
- Watch the water levels artificially rise, turning zones from blue to red (Flood Warning).

### 1:35–1:50 | Citizen Portal
- Open the `/citizen` route.
- Show the mobile-first UI for a citizen submitting an incident.
- Point out the BullMQ/Redis architecture processing this behind the scenes.

### 1:50–2:00 | Executive & Admin Governance
- Navigate to the **Executive** tab to show the top-level **City Health Score** algorithmic output.
- Switch your Role to **Super Admin** and open the **Admin** tab.
- Show the **Audit Logs** capturing every action you just took (Signal Override, Dispatch), proving full governance and security.

## Troubleshooting
- **No Map Data?** Ensure the `worker` is running and connected to Redis.
- **Incidents aren't appearing?** Check that BullMQ has successfully connected to Redis.
- **Red Offline Badge?** Socket.io connection is dropped. Check if `npm run worker` crashed.
