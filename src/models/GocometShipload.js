const mongoose = require('mongoose');

// Sub-schemas
const PortSchema = new mongoose.Schema({
    id: String,
    display_name: String
});

const VesselDetailsSchema = new mongoose.Schema({
    vessel_num: String,
    voyage_num: String,
    vessel_name: String
});

const PlannedDateLogSchema = new mongoose.Schema({
    updated_on: String,
    planned_date: String
});

const EventSchema = new mongoose.Schema({
    mode: Number,
    port: PortSchema,
    remarks: mongoose.Schema.Types.Mixed,
    location: String,
    lower_eta: mongoose.Schema.Types.Mixed,
    upper_eta: mongoose.Schema.Types.Mixed,
    eta_source: mongoose.Schema.Types.Mixed,
    event_type: Number,
    actual_date: Date,
    date_source: String,
    loading_date: Date,
    planned_date: Date,
    carrier_event: String,
    geofence_date: mongoose.Schema.Types.Mixed,
    discharge_date: Date,
    vessel_details: VesselDetailsSchema,
    confidence_score: mongoose.Schema.Types.Mixed,
    custom_event_type: mongoose.Schema.Types.Mixed,
    planned_date_logs: [PlannedDateLogSchema],
    predicted_eta_logs: [mongoose.Schema.Types.Mixed],
    original_planned_date: Date
});

const StatsSchema = new mongoose.Schema({
    early: Boolean,
    delayed: Boolean,
    on_port: Boolean,
    delayed_at: String,
    delayed_by: Number,
    next_event: mongoose.Schema.Types.Mixed,
    dnd_currency: mongoose.Schema.Types.Mixed,
    previous_eta: mongoose.Schema.Types.Mixed,
    current_event: EventSchema,
    demurrage_days: mongoose.Schema.Types.Mixed,
    detention_days: mongoose.Schema.Types.Mixed,
    last_ocean_event: EventSchema,
    probable_delayed: Boolean,
    first_ocean_event: EventSchema,
    probable_delay_at: mongoose.Schema.Types.Mixed,
    probable_delay_by: Number,
    actual_transit_time: Number,
    planned_transit_time: Number,
    origin_demurrage_days: mongoose.Schema.Types.Mixed,
    origin_detention_days: mongoose.Schema.Types.Mixed,
    demurrage_cost_incurred: mongoose.Schema.Types.Mixed,
    detention_cost_incurred: mongoose.Schema.Types.Mixed,
    combined_d_d_days_at_origin: mongoose.Schema.Types.Mixed,
    max_delay_till_current_event: Number,
    origin_demurrage_cost_incurred: mongoose.Schema.Types.Mixed,
    origin_detention_cost_incurred: mongoose.Schema.Types.Mixed,
    percent_remaining_for_demurrage: mongoose.Schema.Types.Mixed,
    percent_remaining_for_detention: mongoose.Schema.Types.Mixed,
    combined_d_d_days_at_destination: mongoose.Schema.Types.Mixed,
    combined_d_d_cost_incurred_at_origin: mongoose.Schema.Types.Mixed,
    percent_remaining_for_origin_demurrage: mongoose.Schema.Types.Mixed,
    percent_remaining_for_origin_detention: mongoose.Schema.Types.Mixed,
    combined_d_d_cost_incurred_at_destination: mongoose.Schema.Types.Mixed,
    percent_remaining_for_combined_d_d_at_origin: mongoose.Schema.Types.Mixed,
    percent_remaining_for_combined_d_d_at_destination: mongoose.Schema.Types.Mixed
});

const ContainerInfoSchema = new mongoose.Schema({
    size: String,
    type: String,
    terminal_id: mongoose.Schema.Types.Mixed,
    cargo_weight: mongoose.Schema.Types.Mixed,
    co2_emission: {
        unit: mongoose.Schema.Types.Mixed,
        amount: mongoose.Schema.Types.Mixed
    },
    pieces_count: mongoose.Schema.Types.Mixed,
    weight_units: mongoose.Schema.Types.Mixed,
    terminal_code: mongoose.Schema.Types.Mixed,
    pod_terminal_events: {
        hold: mongoose.Schema.Types.Mixed,
        holds: mongoose.Schema.Types.Mixed,
        demurrage: mongoose.Schema.Types.Mixed,
        vessel_eta: mongoose.Schema.Types.Mixed,
        pickup_date: mongoose.Schema.Types.Mixed,
        gate_out_date: mongoose.Schema.Types.Mixed,
        notified_date: mongoose.Schema.Types.Mixed,
        discharge_date: mongoose.Schema.Types.Mixed,
        last_free_date: mongoose.Schema.Types.Mixed,
        appointment_date: mongoose.Schema.Types.Mixed,
        gate_out_readiness: mongoose.Schema.Types.Mixed
    },
    origin_demurrage_cost: mongoose.Schema.Types.Mixed,
    origin_detention_cost: mongoose.Schema.Types.Mixed,
    origin_combined_d_d_cost: mongoose.Schema.Types.Mixed,
    carrier_pod_terminal_name: String,
    destination_demurrage_cost: mongoose.Schema.Types.Mixed,
    destination_detention_cost: mongoose.Schema.Types.Mixed,
    destination_combined_d_d_cost: mongoose.Schema.Types.Mixed
});

const GocometShiploadSchema = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.Buffer,
        required: true
    },
    is_approved: Boolean,
    tracking_id: {
        type: mongoose.Schema.Types.Buffer,
        required: true
    },
    container_number: String,
    events: {
        type: Map,
        of: EventSchema
    },
    stats: StatsSchema,
    other_containers: mongoose.Schema.Types.Mixed,
    deleted: Boolean,
    created_at: Date,
    updated_at: Date,
    other_data: {
        incoming_data: {
            port_id: mongoose.Schema.Types.Mixed,
            location: mongoose.Schema.Types.Mixed
        },
        outgoing_data: {
            port_id: mongoose.Schema.Types.Mixed,
            location: mongoose.Schema.Types.Mixed
        },
        terminal_name: String
    },
    containers_info: {
        type: Map,
        of: ContainerInfoSchema
    },
    status: Number,
    rolled_over_vessel_stats: mongoose.Schema.Types.Mixed,
    tracking_mode: Number,
    completed_incoming_port_transit_times: mongoose.Schema.Types.Mixed,
    custom_events: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

// Create indexes
GocometShiploadSchema.index({ container_number: 1 });
GocometShiploadSchema.index({ status: 1 });
GocometShiploadSchema.index({ tracking_id: 1 });

// Check if model exists before creating it
const GocometShipload = mongoose.models.gocomet_shiploads || mongoose.model('gocomet_shiploads', GocometShiploadSchema);

module.exports = GocometShipload; 