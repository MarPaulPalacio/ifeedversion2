import { Schema, model } from "mongoose";

const nutrientConstraintSchema = new Schema({
    nutrientid: { type: Schema.Types.ObjectId, ref: 'Nutrient' },
    name: { type: String },
    constraintvalue: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
});

const CowNutrientConstraintSchema = new Schema({
  weight: {type: Number, required: true},
  gain: { type: Number },
  nutrientrequirement : {
    type: [nutrientConstraintSchema],
    default: [],
  },
  lactating: { type: Boolean },
  intake: {type: Number },
});

export default model("Cow", CowNutrientConstraintSchema, "cow");