import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import { createServer } from "http";
import { Server } from "socket.io";
import handleRoutes from './router.js';
import handleSocket from './config/socket.js';
import handleMongoDB from './config/mongodb.js';
import passport from './config/auth.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';

dotenv.config();
const app = express();
app.use(express.json());

const corsOptions = {
  // Ensure this is a string. Remove the [ ] brackets.
  origin: process.env.CLIENT_URL || "http://localhost:5173", 
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

const httpServer = createServer(app); // to be able to combine socket and express
const io = new Server(httpServer, {
  cors: corsOptions
});


handleMongoDB();

// auth
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

console.log('Initializing session store with MongoDB...');
console.log('MONGODB_URI set:', !!process.env.MONGODB_URI);
console.log('SESSION_SECRET set:', !!process.env.SESSION_SECRET);

// Session configuration with MongoDB store
let sessionStore;
try {
  sessionStore = new MongoStore({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600, // lazy session update (in seconds)
    autoRemove: 'interval',
    autoRemoveInterval: 10 // remove expired sessions every 10 minutes
  });

  // Log session store events
  sessionStore.on('error', (err) => {
    console.error('❌ MongoStore error:', err);
  });

  sessionStore.on('connected', () => {
    console.log('✅ MongoStore connected to MongoDB');
  });

  sessionStore.on('disconnected', () => {
    console.log('⚠️ MongoStore disconnected from MongoDB');
  });

  console.log('✅ MongoStore initialized');
} catch (err) {
  console.error('❌ Failed to initialize MongoStore:', err);
  process.exit(1);
}

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid',
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    path: '/',
  }
}));

// Log session middleware
app.use((req, res, next) => {
  if (req.path === '/') return next(); // Skip logging for root
  console.log(`[${new Date().toISOString()}] Session ID: ${req.sessionID} | Path: ${req.path}`);
  next();
});

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email']
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}`, // TODO: create a login failed page
    successRedirect: `${process.env.CLIENT_URL}/dashboard`,
    failureMessage: true
  }),
  (req, res) => {
    console.log('Google OAuth Callback - User authenticated:', req.user);
    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  }
);


handleRoutes(app);
io.on("connection", handleSocket);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
