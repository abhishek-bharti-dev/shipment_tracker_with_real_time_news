const mongoose = require("mongoose");

const gocometTrackingSchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.Buffer, required: true },
    carrier_code: { type: String, required: true },
    pol_id: { type: mongoose.Schema.Types.Buffer, required: true },
    pod_id: { type: mongoose.Schema.Types.Buffer, required: true },
    status: { type: Number, required: true },
    ops_status: { type: Number, required: true },
    tracking_number: { type: String, required: true },
    tracking_type: { type: Number, required: true },
    reference_no: { type: String, required: true },
    mode: { type: Number, required: true },
  },
  {
    collection: "gocomet_trackings",
  }
);

module.exports = mongoose.model("gocomet_trackings", gocometTrackingSchema);
