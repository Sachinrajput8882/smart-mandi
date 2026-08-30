const mongoose = require('mongoose');

const queueSlotSchema = new mongoose.Schema(
  {
    token_id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    farmer_name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    crop_type: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    preferred_date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'called', 'processing', 'payment_processing', 'done', 'cancelled'],
      default: 'waiting',
      index: true,
    },
    gate_assigned: {
      type: String,
      default: 'Gate 1',
    },
    vehicle_no: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    shift: {
      type: String,
      default: 'shift_1_day',
    },
    cancellation_reason: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Prevent mongoose OverwriteModelError in serverless / hot-reload environments
const QueueSlot = mongoose.models.QueueSlot || mongoose.model('QueueSlot', queueSlotSchema);

module.exports = QueueSlot;
