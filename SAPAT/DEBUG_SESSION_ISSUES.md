# Session Authentication Debug Guide

## Changes Made

✅ Added error logging to MongoStore  
✅ Added session name configuration (`connect.sid`)  
✅ Added session store error event handler  
✅ Enhanced deserializeUser with logging  
✅ Enhanced serializeUser to use `_id` instead of `.id`  
✅ Added comprehensive auth middleware debugging  
✅ Added Google OAuth callback logging

## Critical Checklist - DO THIS FIRST

### 1. **Verify Environment Variables in Railway**
Go to Railway Dashboard → Your Project → Variables and confirm ALL are set:

```
✅ MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
✅ SESSION_SECRET=your_very_strong_secret_min_32_characters
✅ NODE_ENV=production
✅ GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
✅ GOOGLE_CLIENT_SECRET=xxx
✅ API_URL=https://ifeedversion2-production.up.railway.app
✅ CLIENT_URL=https://your-vercel-domain.vercel.app
```

**Critical Issues to Check:**
- Is `MONGODB_URI` set? Session store NEEDS this
- Is it a valid connection string with correct username/password?
- Does it include the database name?

### 2. **Test MongoDB Connection**
Create a test endpoint to verify MongoDB is accessible:

In `router.js`, add:
```javascript
app.get('/api/health/db', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState;
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    const stateName = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoStatus];
    res.json({ 
      mongodb: stateName,
      dbname: mongoose.connection.name 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

Visit: `https://ifeedversion2-production.up.railway.app/api/health/db`
**Expected response:** `{"mongodb": "connected", "dbname": "your_db_name"}`

### 3. **Check MongoDB Sessions Collection**
In MongoDB Atlas:
1. Go to Collections
2. Check if `sessions` collection exists in your database
3. If it exists, check if it has any documents after you log in

If collection doesn't exist - that's the problem! MongoStore should create it, but might need manual creation.

### 4. **Test OAuth Flow and Watch Logs**
1. Clear browser cookies completely
2. Visit your app
3. Click "Login with Google"
4. Check Railway logs for this output:

```
Serializing user: [user_id_here]
Google Strategy: User created or found
Google OAuth Callback - User authenticated: {user object}
```

If no logs appear → OAuth not completing  
If logs appear → Session might not be saving

### 5. **Check Browser Cookies After Login**
After logging in:
1. DevTools → Application → Cookies
2. Look for `connect.sid` cookie from your domain
3. Check the `SameSite` value:
   - Should be `None` for production (if different domain)
   - Should be `Lax` for localhost

If no `connect.sid` cookie → Session not being set!

### 6. **Review the 401 Error**
After login, when you get the 401 on `/api/user`, you should see in logs:

```
===== AUTH CHECK =====
Session ID: [some_session_id]
Session: {cookie: {...}, passport: {user: [user_id]}}
User: {email: '...', displayName: '...'}
isAuthenticated(): false  <-- THIS MIGHT SAY FALSE
=======================
isAuthenticated: User is not authenticated
```

**If `isAuthenticated()` returns false but User is set:** Passport middleware issue  
**If User is null/undefined:** Session not being deserialized from MongoDB

## Common Causes & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| `connect.sid` not in cookies | Session not being set on response | Check MongoStore error logs |
| Session created but User null | Deserialization failing | Check `User.findById()` returns data |
| Different device gets 401 | Session not in MongoDB | MONGODB_URI not set or invalid |
| Always logged out after refresh | Session not persisting | check if sessions collection exists |
| Google login fails silently | Missing GOOGLE credentials | Set in Railway variables |

## Next Steps

1. **Push the debugging code**
   ```bash
   git add .
   git commit -m "Add session debugging logs"
   git push origin main
   ```

2. **Wait for Railway to redeploy**

3. **Test the flow and check logs**
   - Go to Railway Dashboard → Logs
   - Watch for the debug output

4. **Report findings:**
   - What do the logs show?
   - What's the response from `/api/health/db`?
   - Is `connect.sid` cookie present?
   - What's in the MongoDB sessions collection?

