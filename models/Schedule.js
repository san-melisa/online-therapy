const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  slots: [{
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    isReserved: {
      type: Boolean,
      default: false
    },
  }]
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
