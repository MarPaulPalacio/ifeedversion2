import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth2';
import dotenv from 'dotenv';
import User from '../models/user-model.js';

dotenv.config();

passport.serializeUser((user, done) => {
    console.log('Serializing user:', user._id);
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        console.log('Deserializing user with id:', id);
        const user = await User.findById(id);
        console.log('User found:', user ? user.email : 'not found');
        done(null, user);
    } catch (err) {
        console.error('Deserialize User Error:', err);
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.API_URL}/auth/google/callback`,
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    passReqToCallback: true,
  },
  async function(request, accessToken, refreshToken, profile, done) {
    try {
      // Find or create user
      let user = await User.findOne({ googleId: profile.id });
      
      if (!user) {
        // Create new user if doesn't exist
        user = await User.create({
          googleId: profile.id,
          email: profile.email,
          displayName: profile.displayName,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          profilePicture: profile.photos[0].value,
          userType: 'regular'
        });
      }
      console.log('Google Strategy: User created or found');
      return done(null, user);
    } catch (err) {
      console.error('Google Strategy: Error creating or finding user', err);
      return done(err, null);
    }
  }
));

export default passport;
