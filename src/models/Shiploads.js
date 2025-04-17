const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const VesselDetailsSchema = new mongoose.Schema({
  vessel_num: { type: String, default: "" },
  voyage_num: { type: mongoose.Schema.Types.Mixed, default: null },
  vessel_name: { type: String, default: "" }
}, { _id: false });

const PortSchema = new mongoose.Schema({
  id: { type: String, required: true },
  display_name: { type: String, required: true }
}, { _id: false });

const EventSchema = new mongoose.Schema({
  mode: { type: Number, required: true },
  port: { type: PortSchema, required: true },
  location: { type: String, required: true },
  event_type: { type: Number, required: true },
  actual_date: { type: Date, required: true },
  planned_date: { type: Date, required: true },
  original_planned_date: { type: Date, required: true },
  vessel_details: { type: VesselDetailsSchema, required: true }
}, { _id: false });

const StatsSchema = new mongoose.Schema({
  early: { type: Boolean, required: true },
  delay: { type: Boolean, required: true },
  delayed_by: { type: Number, required: true },
  on_port: { type: Boolean, required: true },
  delayed_at: { type: String, required: true }
}, { _id: false });

const ContainerInfoDetailsSchema = new mongoose.Schema({
  size: { type: String, required: true },
  type: { type: String, required: true }
}, { _id: false });

const ShiploadsSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => uuidv4(),
    unique: true
  },
  is_approved: {
    type: Boolean,
    default: false
  },
  tracking_id: {
    type: String,
    required: true,
    unique: true
  },
  container_number: {
    type: String,
    required: true,
    unique: true
  },
  events: {
    type: Map,
    of: EventSchema,
    required: true,
    default: new Map()
  },
  stats: {
    type: StatsSchema,
    required: true
  },
  container_info: {
    type: Map,
    of: ContainerInfoDetailsSchema,
    required: true,
    default: new Map()
  },
  status: {
    type: Number,
    required: true,
    default: 0
  },
  tracking_mode: {
    type: Number,
    required: true,
    default: 0
  }
}, { 
  timestamps: true,
  versionKey: false 
});

// Add indexes for better query performance
ShiploadsSchema.index({ tracking_id: 1 });
ShiploadsSchema.index({ container_number: 1 });
ShiploadsSchema.index({ status: 1 });

module.exports = mongoose.model('gocomet_shiploads', ShiploadsSchema); 