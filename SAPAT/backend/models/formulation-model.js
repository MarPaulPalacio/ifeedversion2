import { Schema, model } from 'mongoose';

const ingredientConstraintSchema = new Schema({
    ingredient_id: { type: Schema.Types.ObjectId, ref: 'Ingredient' },
    name: { type: String },
    minimum: { type: Number, default: 0 },
    maximum: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
    group: {type: String, default: ''},
});

const nutrientConstraintSchema = new Schema({
    nutrient_id: { type: Schema.Types.ObjectId, ref: 'Nutrient' },
    name: { type: String },
    minimum: { type: Number, default: 0 },
    maximum: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
    unit: { type: String, default: '' },
})



const nutrientRatioConstraintSchema = new Schema({
    firstIngredient: { type: String },
    firstIngredientId: { type: Schema.Types.ObjectId, ref: 'Nutrient' },
    secondIngredient: { type: String },
    secondIngredientId: { type: Schema.Types.ObjectId, ref: 'Nutrient' },
    operator: { type: String },
    firstIngredientRatio: { type: Number },
    secondIngredientRatio: { type: Number }
});

const userAccessSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    access: { type: String, enum: ['view', 'edit', 'owner'] },
    displayName: {type: String, default: ''},
});

const formulationSchema = new Schema({
    code: { type: String, default: '' },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    animal_group: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    weight: { type: Number, default: 100 },
    body_weight: {type: Number, default: 0},
    dmintake: { type: Number, default: 0 },
    // Tags used to identify the formulation, e.g. lactating, maintenance, etc.
    tags: { type: [String], default: [] },

    pregnant_phase: {type: String, default: '' },

    lactating_phase: {type: String, default: ''},

    fat_content: {type: String, default: ''},

    
    ingredients: {
        type: [ingredientConstraintSchema],
        default: []
    },
    nutrients: {
        type: [nutrientConstraintSchema],
        default: []
    },
    nutrientRatioConstraints: {
        type: [nutrientRatioConstraintSchema],
        default: []
    },

    origNutrientTargets: {
        type: [nutrientConstraintSchema],
        default: []
    },
    collaborators: {
        type: [userAccessSchema],
        default: []
    },
    isTemplate: {
        type: Boolean,
        default: false
    },
    weightProgress: {
        type: [Number],
        default: []
    },
    milkYieldProgress: {
        type: [Number],
        default: []
    },
    typeProgress: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    dateProgress: {
        type: [Date],
        default: []
    },
});

export default model('Formulation', formulationSchema);
