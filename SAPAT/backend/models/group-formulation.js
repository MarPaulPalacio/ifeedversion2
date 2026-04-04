import { Schema, model } from 'mongoose';

// --- Subschemas from normal Formulation ---

const ingredientConstraintSchema = new Schema({
    ingredient_id: { type: Schema.Types.ObjectId, ref: 'Ingredient' },
    name: { type: String },
    minimum: { type: Number, default: 0 },
    maximum: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
    group: { type: String, default: '' },
});

const nutrientConstraintSchema = new Schema({
    nutrient_id: { type: Schema.Types.ObjectId, ref: 'Nutrient' },
    name: { type: String },
    minimum: { type: Number, default: 0 },
    maximum: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
    unit: { type: String, default: '' },
});

const nutrientRatioConstraintSchema = new Schema({
    firstIngredient: { type: String },
    firstIngredientId: { type: Schema.Types.ObjectId, ref: 'Nutrient' },
    secondIngredient: { type: String },
    secondIngredientId: { type: Schema.Types.ObjectId, ref: 'Nutrient' },
    operator: { type: String },
    firstIngredientRatio: { type: Number },
    secondIngredientRatio: { type: Number },
});

const userAccessSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    access: { type: String, enum: ['view', 'edit', 'owner'] },
    displayName: { type: String, default: '' },
});

// --- Nested FormulationDetails Schema (includes ingredients, nutrients, etc.) ---

const formulationDetailsSchema = new Schema({
    code: { type: String, default: '' },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    animal_group: { type: String, default: '' },
    weight: { type: Number, default: 100 },
    body_weight: { type: Number, default: 0 },
    dmintake: { type: Number, default: 0 },
    fat_content: { type: String, default: '' },
    lactating_phase: { type: String, default: '' },
    pregnant_phase: { type: String, default: '' },

    // NEW: ingredients, nutrients, nutrient ratio constraints, collaborators
    ingredients: { type: [ingredientConstraintSchema], default: [] },
    nutrients: { type: [nutrientConstraintSchema], default: [] },
    nutrientRatioConstraints: { type: [nutrientRatioConstraintSchema], default: [] },
    collaborators: { type: [userAccessSchema], default: [] },

    // Progress tracking
    weightProgress: { type: [Number], default: [] },
    milkYieldProgress: { type: [Number], default: [] },
    typeProgress: { type: [String], default: [] },
    dateProgress: { type: [Date], default: [] },
});

// --- GroupFormulation Schema ---

const groupFormulationSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },

    // Can optionally reference other formulations
    formulations: [{ type: Schema.Types.ObjectId, ref: 'Formulation' }],

    // Nested formulation details with full ingredient/nutrient info
    formulationDetails: { type: [formulationDetailsSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
});

export default model('GroupFormulation', groupFormulationSchema);