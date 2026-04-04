# Deployment Guide for SAPAT

## Overview
This project has a **React frontend** (Vite) and **Node.js/Express backend** with Socket.io. The recommended approach is to deploy them separately.

## Deployment Strategy

### **Frontend - Vercel (Recommended)**
- Static React app builds perfectly on Vercel
- Supports Vite natively
- Zero configuration needed

### **Backend - Railway/Render/Heroku (Required)**
- **Why not Vercel for backend?** Your app uses Socket.io, which needs persistent WebSocket connections. Vercel serverless functions are stateless and will disconnect after ~10 seconds of inactivity
- **Recommended services**: Railway, Render, Heroku, or similar Node.js hosting
- These support long-lived connections needed for Socket.io

---

## Step 1: Deploy Frontend to Vercel

### Prerequisites
- Vercel account (free)
- GitHub account with your code pushed

### Steps
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New Project"**
3. Import your GitHub repository
4. **Framework**: Select "Vite"
5. **Root Directory**: Set to `frontend/SAPAT`
6. **Add Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-url.com
   ```
7. Click **Deploy**

### Environment Variables
Set in Vercel dashboard under Project → Settings → Environment Variables:
- `VITE_API_URL`: Your backend URL (e.g., `https://sapat-api.railway.app`)

---

## Step 2: Deploy Backend (Choose One)

### Option A: Railway (Easiest)

1. Go to [railway.app](https://railway.app)
2. Click **"Create New Project"**
3. Select **"GitHub Repo"**
4. Choose your repository
5. **Create 2 services**: Backend and MongoDB
6. Set environment variables in Railway dashboard:
   ```
   NODE_ENV=production
   PORT=8080
   MONGODB_URI=mongodb+srv://...
   CLIENT_URL=https://your-vercel-frontend.vercel.app
   SESSION_SECRET=your-secure-random-string
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```
7. Deploy

### Option B: Render

1. Go to [render.com](https://render.com)
2. Create **"New Web Service"**
3. Connect your GitHub repo
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. Set environment variables (same as above)
7. Deploy

### Option C: Heroku (Legacy but works)

1. Install Heroku CLI
2. Run:
   ```bash
   heroku login
   heroku create your-app-name
   heroku addons:create mongolab:sandbox
   git push heroku main
   ```

---

## Step 3: Update Configuration

### Frontend Environment File
Create `frontend/SAPAT/.env.production`:
```
VITE_API_URL=https://your-backend-url.com
```

### Backend CORS Configuration
Update `backend/server.js` to accept your Vercel frontend:
```javascript
const corsOptions = {
  origin: [
    process.env.CLIENT_URL,
    'https://your-app.vercel.app'
  ],
  credentials: true,
};
```

---

## Vercel Configuration Files

### vercel.json (Root)
```json
{
  "buildCommand": "cd frontend/SAPAT && npm install && npm run build",
  "outputDirectory": "frontend/SAPAT/dist",
  "framework": "vite"
}
```

### backend/vercel.json (If deploying backend to Vercel - NOT recommended for Socket.io)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

⚠️ **Note**: This won't work properly with Socket.io. Use Railway/Render instead.

---

## Do I Need Docker?

**No.** Docker is optional:
- **Vercel**: No Docker needed (Vercel handles builds)
- **Railway/Render**: No Docker needed (they build from source)
- **Docker**: Only needed if deploying to services like AWS ECS, Docker Hub, or running locally in containers

---

## MongoDB Setup

### Option 1: MongoDB Atlas (Cloud - Recommended)
1. Visit [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Use in `MONGODB_URI` environment variable

### Option 2: Docker + MongoDB
```bash
docker run -d -p 27017:27017 --name mongodb mongo
```

---

## Environment Variables Checklist

| Variable | Where to Set | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Vercel Dashboard | `https://sapat-api.railway.app` |
| `CLIENT_URL` | Backend service | `https://sapat.vercel.app` |
| `NODE_ENV` | Backend service | `production` |
| `MONGODB_URI` | Backend service | `mongodb+srv://user:pass@...` |
| `SESSION_SECRET` | Backend service | Generate random string |
| `GOOGLE_CLIENT_ID` | Backend service (OAuth) | From Google Console |
| `GOOGLE_CLIENT_SECRET` | Backend service (OAuth) | From Google Console |

---

## Troubleshooting

### CORS Errors?
- Frontend and backend URLs don't match in CORS config
- Update `backend/server.js` with Vercel frontend URL

### Socket.io Disconnecting?
- Using Vercel serverless for backend
- **Solution**: Move backend to Railway/Render

### Build Fails on Vercel?
- Root directory might be wrong
- Check that you're deploying from correct folder
- Ensure `package.json` exists in `frontend/SAPAT/`

---

## Summary

| Component | Best Service | WebSocket Support |
|-----------|-------------|-------------------|
| React Frontend | **Vercel** ✅ | N/A |
| Express Backend | **Railway/Render** ✅ | ✅ Yes |
| MongoDB | **Atlas** ✅ | ✅ Yes |
