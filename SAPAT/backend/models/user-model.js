import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  displayName: String,
  firstName: String,
  lastName: String,
  profilePicture: String,
  userType: {
    type: String,
    default: 'regular'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  type: String
});

export default model('User', userSchema);