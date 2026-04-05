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
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] // Add OPTIONS for pre-flight
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
    secure: process.env.NODE_ENV === 'production', // set to true if using https
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true, // Prevent client-side JS from accessing the cookie
    path: '/',
  }
}));
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
  })
);


handleRoutes(app);
io.on("connection", handleSocket);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
