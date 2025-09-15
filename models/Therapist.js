  const mongoose = require('mongoose');
  const Schema = mongoose.Schema

  const TherapistSchema = new mongoose.Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    phone: { type: String, required: true },
    title: { type: String, required: true },
    licenceNumber: { type: String, required: true },
    university: [{
      uniName: { type: String, required: true },
      degree: { type: String, required: true },
      department: { type: String, required: true },
      graduationYear: { type: String, required: true }
    }],
    cv: { type: String },
    motivationLetter: { type: String },
    referenceLetter: { type: String },
    expertiseAreas: [{type: Schema.Types.ObjectId,ref: 'Expertise',}],
    categoryAreas: [{type: Schema.Types.ObjectId,ref: 'Category',}],
    certificates: { type: String },
    about: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    photoUrl: { type: String },
    isVisible: { type: Boolean, default: false }

  }, { minimize: false });

  module.exports = mongoose.model('Therapist', TherapistSchema);
