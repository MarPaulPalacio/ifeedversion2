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
    collaborators: {
        type: [userAccessSchema],
        default: []
    },
    isTemplate: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default model('Formulation', formulationSchema);
