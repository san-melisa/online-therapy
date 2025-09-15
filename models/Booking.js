const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BookingSchema = new mongoose.Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User" },
  therapist_id: { type: Schema.Types.ObjectId, ref: "Therapist" },
  meetingType: { type: String, enum: ["text", "voice", "video"], required: true },
  platform: { type: String, enum: ["zoom", "skype", "whatsapp"], required: true },
  platformDetails: { type: String, required: true },
  appointmentDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["approved", "cancelled"], default: "approved" },
  cancelledBy: { type: Schema.Types.ObjectId, ref: "User"},

});

module.exports = mongoose.model("Booking", BookingSchema);


