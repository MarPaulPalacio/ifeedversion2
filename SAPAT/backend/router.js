import mongoose from 'mongoose';
import { getUserById, getUserByEmail } from './controller/user-controller.js';
import {
  createFormulation,
  getAllFormulations,
  getAllSpecialFormulations,
  getFormulation,
  getFormulationByFilters,
  updateFormulation,
  deleteFormulation,
  getFormulationOwner,
  addIngredients,
  addNutrients,
  removeIngredient,
  removeNutrient,
  validateCollaborator,
  updateCollaborator,
  removeCollaborator,
  getAllTemplateFormulations,
  cloneTemplateToFormulation,
  getCowFormulation,
  getCarabaoFormulation,
  getAllGroupFormulations,
  getGroupFormulationById,
  getGroupFormulationFormulations 
} from './controller/formulation-controller.js';
import {
  createIngredient, getAllIngredients, getIngredient, getIngredientsByFilters, updateIngredient, deleteIngredient, importIngredient, getIngredientsByIds
} from './controller/ingredient-controller.js'
import {
  createNutrient, getAllNutrients, getNutrient, getNutrientsByFilters, updateNutrient, deleteNutrient
} from './controller/nutrient-controller.js'
import { simplex, pso } from './controller/optimize-controller.js'
import {handleLiveblocksAuth, handleSyncMasterToChildren} from './config/liveblocks-auth.js';

const handleRoutes = (app) => {
  // Check if user is authenticated middleware
  const isAuthenticated = (req, res, next) => {
    console.log('===== AUTH CHECK =====');
    console.log('Session ID:', req.sessionID);
    console.log('User from request:', req.user);
    console.log('req.isAuthenticated():', req.isAuthenticated());
    console.log('=======================');
    
    if (req.isAuthenticated() && req.user) {
      console.log('✅ User is authenticated:', req.user.email);
      return next();
    }
    
    console.log('❌ User is not authenticated');
    console.log('   Session exists:', !!req.session);
    console.log('   Session data:', req.session?.passport);
    res.status(401).json({ error: 'Not authenticated', sessionID: req.sessionID });
  };

  // Get current user route - with multiple fallback methods
  app.get('/api/user', async (req, res) => {
    console.log('\n===== GET /api/user =====');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Session ID (from cookie):', req.sessionID);
    console.log('Query param sid (from URL):', req.query.sid);
    console.log('req.user:', req.user);
    console.log('isAuthenticated:', req.isAuthenticated());
    
    // Method 1: Standard passport authentication (cookie-based)
    if (req.isAuthenticated() && req.user) {
      console.log('✅ Method 1: Authenticated via session cookie');
      return res.json(req.user);
    }
    
    // Method 2: Session exists but req.user not set
    if (req.session?.passport?.user) {
      console.log('⚠️ Method 2: Session has passport data but req.user not set');
      return res.json(req.session.passport.user);
    }
    
    // Method 3: Use session ID from URL parameter (POST-OAuth fallback)
    const sessionIdToUse = req.query.sid || req.sessionID;
    if (sessionIdToUse) {
      console.log('🔵 Method 3: Attempting to deserialize session from ID:', sessionIdToUse);
      try {
        // Use the mongoStore to get the session directly from MongoDB
        // The session store has a "get" method we can use
        const session = await new Promise((resolve, reject) => {
          // Access the store from express-session middleware
          // This is a workaround - we fetch directly from MongoDB
          const sessionCollection = mongoose.connection.collection('sessions');
          if (!sessionCollection) {
            reject(new Error('Sessions collection not found'));
            return;
          }
          
          sessionCollection.findOne({ _id: sessionIdToUse }, (err, doc) => {
            if (err) reject(err);
            resolve(doc);
          });
        });
        
        if (session && session.session) {
          console.log('✅ Found session in MongoDB');
          const sessionData = JSON.parse(session.session);
          if (sessionData.passport?.user) {
            // Found user in passport data
            console.log('✅ Found user in session passport data:', sessionData.passport.user);
            // Try to populate the full user object
            try {
              const User = mongoose.model('User');
              const user = await User.findById(sessionData.passport.user);
              if (user) {
                console.log('✅ Loaded full user object from database');
                return res.json(user);
              }
            } catch (err) {
              console.log('⚠️ Could not load full user, returning session data');
              return res.json(sessionData.passport.user);
            }
          }
        }
        console.log('❌ Session not found or no user in session');
      } catch (err) {
        console.error('❌ Error in Method 3:', err.message);
      }
    }
    
    // Not authenticated
    console.log('❌ User not authenticated - no valid session found');
    console.log('========================\n');
    res.status(401).json({ error: 'Not authenticated' });
  });

  // Logout route
  app.get('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Error logging out' });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: 'Error destroying session' });
        }
        res.clearCookie('connect.sid');  // Clear the session cookie
        res.status(200).json({ message: 'Logged out successfully' });
      });
    });
  });

  app.get('/login/failed', (req, res) => {
    res.status(401).json({
      success: false,
      message: req.session?.messages?.[0] || "Authentication failed"
    });
  });

  app.get('/', (req, res) => {
    res.send('Hello World');
    console.log('MongoDB Connection State:', mongoose.connection.readyState);
  });

  // Session test endpoint
  app.get('/api/session/test', (req, res) => {
    if (!req.session) {
      return res.status(500).json({ error: 'Session not initialized' });
    }
    
    console.log('Session test - ID:', req.sessionID);
    console.log('Session test - Content:', JSON.stringify(req.session, null, 2));
    
    if (!req.session.views) {
      req.session.views = 0;
    }
    req.session.views++;
    
    // Force the session to save and include Set-Cookie header
    req.session.save(() => {
      res.json({
        sessionID: req.sessionID,
        views: req.session.views,
        user: req.user || null,
        isAuthenticated: req.isAuthenticated(),
        setCookieInfo: 'Check Response Headers for Set-Cookie header',
        message: 'If views increments, sessions are working'
      });
    });
  });

  // Cookie test endpoint - explicitly set test cookie
  app.get('/api/test/set-cookie', (req, res) => {
    res.cookie('test-cookie', 'test-value', {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 1000
    });
    
    res.json({
      message: 'Test cookie set',
      checkCookies: 'Check DevTools → Cookies for test-cookie'
    });
  });

  // Health check endpoint to verify MongoDB
  app.get('/api/health/db', (req, res) => {
    try {
      const mongoStatus = mongoose.connection.readyState;
      // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
      const stateName = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoStatus];
      res.json({ 
        mongodb: stateName,
        dbname: mongoose.connection.name || 'unknown'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // LIVEBLOCKS
  app.post('/api/liveblocks-auth', (req, res, next) => {
    return handleLiveblocksAuth(req, res, next);
  });

  app.post('/api/liveblocks/sync-formulations', (req, res, next) => {
    return handleSyncMasterToChildren(req, res, next);
  });


  // CONTROLLER API CALLS
  app.get('/user-check/id/:id', getUserById);
  app.get('/user-check/email/:email', getUserByEmail);

  app.post('/formulation', createFormulation);
  app.get('/formulation/filtered/:collaboratorId', getAllFormulations);
  app.get('/formulation/cow', getCowFormulation);
  app.get('/formulation/carabao', getCarabaoFormulation);

  
  app.get('/formulation/special/:animalgroup', getAllSpecialFormulations);
  app.get('/formulation/filtered/search/:userId', getFormulationByFilters);
  app.put('/formulation/:id', updateFormulation);
  app.delete('/formulation/:id', deleteFormulation);
  app.get('/formulation/owner/:id', getFormulationOwner)
  app.put('/formulation/ingredients/:id', addIngredients);
  app.put('/formulation/nutrients/:id', addNutrients);
  app.delete('/formulation/ingredients/:id/:ingredient_id', removeIngredient);
  app.delete('/formulation/nutrients/:id/:nutrient_id', removeNutrient);
  app.get('/formulation/collaborator/:formulationId/:collaboratorId', validateCollaborator);
  app.put('/formulation/collaborator/:id', updateCollaborator);
  app.delete('/formulation/collaborator/:formulationId/:collaboratorId', removeCollaborator);
  app.get('/formulation/templates', getAllTemplateFormulations);
  app.get('/formulation/:id', getFormulation);
  app.post('/formulation/:id/clone-template', cloneTemplateToFormulation);
  

  app.get('/groupformulations/all', getAllGroupFormulations);
  app.get('/groupformulations/:id', getGroupFormulationById);
  app.get('/groupformulations/:groupFormulationId/user/:userId/formulations', getGroupFormulationFormulations);

  app.post('/ingredient', createIngredient);
  app.get('/ingredient/filtered/:userId', getAllIngredients);
  app.get('/ingredient/:id/:userId', getIngredient);
  app.get('/ingredient/filtered/search/:userId', getIngredientsByFilters);
  app.put('/ingredient/:id/:userId', updateIngredient);
  app.delete('/ingredient/:id/:userId', deleteIngredient);
  app.post('/ingredient/import/:userId', importIngredient);
  app.post('/ingredient/idarray', getIngredientsByIds)

  app.post('/nutrient', createNutrient);
  app.get('/nutrient/filtered/:userId', getAllNutrients);
  app.get('/nutrient/:id/:userId', getNutrient);
  app.get('/nutrient/filtered/search/:userId', getNutrientsByFilters);
  app.put('/nutrient/:id/:userId', updateNutrient);
  app.delete('/nutrient/:id/:userId', deleteNutrient);


  app.post('/optimize/simplex', simplex);
  app.post('/optimize/pso', pso);

};

export default handleRoutes;
