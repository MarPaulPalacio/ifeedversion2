# Authentication Session Persistence Fix

## Problem Summary
Users are getting 401 errors on `/api/user` endpoint when logging in from different browsers or devices in production because session cookies are not persisting across requests.

## Root Causes

### 1. **In-Memory Session Store** (CRITICAL)
- Your current setup uses the default in-memory session store
- This doesn't persist across server restarts/redeployments
- Each Railway deployment creates a new server instance, losing all sessions
- **Fix:** Use MongoDB or Redis for persistent session storage

### 2. **Missing Cookie Domain Configuration**
- Session cookies don't have explicit domain settings
- Cross-domain requests (Vercel frontend → Railway backend) fail
- **Fix:** Add proper domain configuration

### 3. **Missing httpOnly Flag**
- ✅ Already fixed: Added `httpOnly: true` to prevent XSS attacks

## Implementation Steps

### Step 1: Install Express Session Store for MongoDB

```bash
cd backend
npm install connect-mongo
```

### Step 2: Update server.js with MongoDB Session Store

Replace the session middleware configuration with:

```javascript
import session from 'express-session';
import MongoStore from 'connect-mongo';
import dotenv from 'dotenv';

// ... other imports ...

dotenv.config();

// ... app setup ...

// Session configuration with MongoDB store
const sessionStore = new MongoStore({
  mongoUrl: process.env.MONGODB_URI,
  touchAfter: 24 * 3600 // lazy session update (in seconds)
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // MUST be true for sameSite: 'none'
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  }
}));
```

### Step 3: Verify Environment Variables

Ensure your `.env` (Railway) has:
```
NODE_ENV=production
SESSION_SECRET=your_strong_secret_here
MONGODB_URI=your_mongodb_connection_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
API_URL=https://ifeedversion2-production.up.railway.app
CLIENT_URL=https://your-vercel-domain.vercel.app
```

**IMPORTANT**: `API_URL` must use HTTPS for production (Rails provides this)

### Step 4: Update CORS Configuration

Ensure CORS allows credentials from your Vercel domain:

```javascript
const corsOptions = {
  origin: process.env.CLIENT_URL, // Should point to your Vercel frontend
  credentials: true, // Allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
```

### Step 5: Verify Frontend Sends Credentials

Check that all fetch requests include `credentials: 'include'`:

✅ Already correct in `AuthContext.jsx`:
```javascript
fetch(`${API_URL}/api/user`, {
  credentials: 'include', // ✅ This is required for cookies
})
```

## Troubleshooting Checklist

- [ ] Install `connect-mongo` package in backend
- [ ] Update session middleware to use MongoStore
- [ ] Verify `MONGODB_URI` is set in Railway environment
- [ ] Verify `SESSION_SECRET` is set in Railway environment
- [ ] Verify `CLIENT_URL` points to your Vercel domain (e.g., https://your-app.vercel.app)
- [ ] Verify `API_URL` points to Railway backend (https://ifeedversion2-production.up.railway.app)
- [ ] Ensure backend has `trust proxy` setting (already present)
- [ ] Check MongoDB Atlas network access includes Railway's IP range
- [ ] Test OAuth flow: Login → Check browser cookies → Navigate to different page

## Testing

1. **Local Testing**: 
   ```bash
   npm run dev
   # Login and verify session persists
   ```

2. **Production Testing**:
   - Clear browser cookies
   - Visit your app, log in with Google
   - Open DevTools → Application → Cookies → Check for `connect.sid`
   - Refresh page - should stay logged in
   - Open in incognito/new device - should redirect to login

## Why This Was Failing

| Scenario | Without MongoDB Store | With MongoDB Store |
|----------|---------------------|-------------------|
| Server restart | ❌ Session lost | ✅ Session persists |
| Different browser | ❌ No session found | ✅ Session found |
| Different device | ❌ New instance can't find session | ✅ Shares MongoDB session |
| Railway redeployment | ❌ New server, sessions gone | ✅ Sessions in MongoDB |

## Additional Recommendations

1. **Session Timeout**: Currently set to 24 hours. Adjust `maxAge` if needed.
2. **Session Garbage Collection**: MongoDB auto-cleaner removes expired sessions (use `touchAfter` option)
3. **Security**: 
   - Use a strong `SESSION_SECRET` (minimum 32 characters)
   - Rotate `SESSION_SECRET` periodically
   - Use HTTPS only (production)

