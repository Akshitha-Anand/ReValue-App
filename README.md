# ReValue ♻️

A smart waste valorization and recycling marketplace platform connecting Individuals, Waste Collectors, and Recycling Industries.

---

## 📁 Project Structure

```text
ReValue-App/
├── frontend/        # React + Vite application (UI, Tailwind/CSS, Socket.io client)
├── backend/         # Express + Node.js REST API + Socket.io Server + MongoDB
└── ml_service/      # Python ML classifier and recommendation engine
```

---

## 🚀 Live Deployment Guide

### 1. Backend (Render)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. In **Environment Variables**, add:
   - `PORT`: `5000`
   - `MONGO_URI`: `your_mongodb_atlas_connection_string`
   - `JWT_SECRET`: `your_jwt_secret_key`
5. Click **Deploy Web Service** and copy your backend URL (e.g. `https://revalue-backend.onrender.com`).

---

### 2. Frontend (Vercel)
1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New** > **Project**.
2. Import this GitHub repository.
3. Configure project settings:
   - **Root Directory**: Click *Edit* and select `frontend`.
   - **Framework Preset**: `Vite`
4. In **Environment Variables**, add:
   - `VITE_API_URL`: `https://your-backend-render-url.onrender.com`
5. Click **Deploy**. Your frontend is live with automatic SSL and SPA routing!

---

## 💻 Local Development Setup

### Backend
```bash
cd backend
npm install
# Create a .env file based on .env.example
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

