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
    console.log('Session:', req.session);
    console.log('User:', req.user);
    console.log('req.isAuthenticated():', req.isAuthenticated());
    console.log('=======================');
    
    // Check both req.isAuthenticated() and req.user for reliability
    if (req.isAuthenticated() && req.user) {
      console.log('✅ User is authenticated');
      return next();
    }
    
    if (req.user && !req.isAuthenticated()) {
      console.log('⚠️ User exists but isAuthenticated() is false - attempting fix');
      // Force set the user again
      req.login(req.user, (err) => {
        if (err) {
          console.error('❌ Error re-logging in user:', err);
          return res.status(401).json({ error: 'Authentication failed' });
        }
        return next();
      });
      return;
    }
    
    console.log('❌ User is not authenticated');
    res.status(401).json({ error: 'Not authenticated' });
  };

  // Get current user route
  app.get('/api/user', isAuthenticated, (req, res) => {
    console.log('User:', req.user);
    res.json(req.user);
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
    
    res.json({
      sessionID: req.sessionID,
      views: req.session.views,
      user: req.user || null,
      isAuthenticated: req.isAuthenticated(),
      message: 'Session test - if views increments, sessions are working'
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
