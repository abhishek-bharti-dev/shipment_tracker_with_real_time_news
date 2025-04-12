const mongoose = require('mongoose');
require('dotenv').config();
const VesselTracking = require('../models/VesselTracking');

const vesselData = [
  {
    "vessel_name": "Ocean Explorer",
    "vessel_code": "OE001",
    "status": "delivered",
    "lat_lon": [19.63, 37.27],
    "source": "Port Sudan",
    "destination": "Jeddah Islamic Port",
    "events": [
      {
        "port_code": "SDPSN",
        "port_name": "Port Sudan",
        "expected_time_of_arrival": "2025-04-01T10:00:00Z",
        "actual_time_of_arrival": "2025-04-01T09:45:00Z",
        "coordinates": [19.63, 37.27]
      },
      {
        "port_code": "SAJED",
        "port_name": "Jeddah Islamic Port",
        "expected_time_of_arrival": "2025-04-05T15:00:00Z",
        "actual_time_of_arrival": "2025-04-05T15:30:00Z",
        "coordinates": [21.54, 39.17]
      }
    ]
  },
  {
    "vessel_name": "Mediterranean Star",
    "vessel_code": "MS002",
    "status": "intransit",
    "lat_lon": [1.29, 103.85],
    "source": "Port of Singapore",
    "destination": "Port Klang",
    "events": [
      {
        "port_code": "SGSIN",
        "port_name": "Port of Singapore",
        "expected_time_of_arrival": "2025-04-08T08:00:00Z",
        "estimated_time_of_arrival": "2025-04-10T08:00:00Z",
        "coordinates": [1.29, 103.85]
      },
      {
        "port_code": "MYPKG",
        "port_name": "Port Klang",
        "expected_time_of_arrival": "2025-04-14T12:00:00Z",
        "coordinates": [3.0333, 101.45]
      }
    ]
  },
  {
    "vessel_name": "Asian Explorer",
    "vessel_code": "AE003",
    "status": "intransit",
    "lat_lon": [31.23, 121.5],
    "source": "Port of Shanghai",
    "destination": "Port of Ningbo",
    "events": [
      {
        "port_code": "CNSHG",
        "port_name": "Port of Shanghai",
        "expected_time_of_arrival": "2025-04-05T14:00:00Z",
        "actual_time_of_arrival": "2025-04-06T14:30:00Z",
        "coordinates": [31.23, 121.5]
      },
      {
        "port_code": "CNNGB",
        "port_name": "Port of Ningbo",
        "expected_time_of_arrival": "2025-04-10T18:00:00Z",
        "coordinates": [29.87, 121.57]
      }
    ]
  },
  {
    "vessel_name": "Red Sea Navigator",
    "vessel_code": "RS004",
    "status": "delivered",
    "lat_lon": [37.92, 23.64],
    "source": "Port of Piraeus",
    "destination": "Port of Valencia",
    "events": [
      {
        "port_code": "GRPIU",
        "port_name": "Port of Piraeus",
        "expected_time_of_arrival": "2025-04-01T09:00:00Z",
        "actual_time_of_arrival": "2025-04-01T09:10:00Z",
        "coordinates": [37.92, 23.64]
      },
      {
        "port_code": "ESVLC",
        "port_name": "Port of Valencia",
        "expected_time_of_arrival": "2025-04-06T13:00:00Z",
        "actual_time_of_arrival": "2025-04-06T13:20:00Z",
        "coordinates": [39.47, -0.34]
      }
    ]
  },
  {
    "vessel_name": "Singapore Express",
    "vessel_code": "SE005",
    "status": "intransit",
    "lat_lon": [15.62, 39.43],
    "source": "Port of Massawa",
    "destination": "Aqaba",
    "events": [
      {
        "port_code": "ERMSA",
        "port_name": "Port of Massawa",
        "expected_time_of_arrival": "2025-04-08T07:00:00Z",
        "coordinates": [15.62, 39.43]
      },
      {
        "port_code": "JOAQJ",
        "port_name": "Aqaba",
        "expected_time_of_arrival": "2025-04-15T11:00:00Z",
        "coordinates": [29.51, 35.0]
      }
    ]
  },
  {
    "vessel_name": "Global Trader",
    "vessel_code": "GT006",
    "status": "delivered",
    "lat_lon": [1.29, 103.85],
    "source": "Port of Singapore",
    "destination": "Port Klang",
    "events": [
      {
        "port_code": "SGSIN",
        "port_name": "Port of Singapore",
        "expected_time_of_arrival": "2025-04-01T06:00:00Z",
        "actual_time_of_arrival": "2025-04-01T06:05:00Z",
        "coordinates": [1.29, 103.85]
      },
      {
        "port_code": "MYPKG",
        "port_name": "Port Klang",
        "expected_time_of_arrival": "2025-04-06T10:00:00Z",
        "actual_time_of_arrival": "2025-04-06T10:30:00Z",
        "coordinates": [3.0333, 101.45]
      }
    ]
  },
  {
    "vessel_name": "Pacific Voyager",
    "vessel_code": "PV007",
    "status": "intransit",
    "lat_lon": [31.23, 121.5],
    "source": "Port of Shanghai",
    "destination": "Port of Ningbo",
    "events": [
      {
        "port_code": "CNSHG",
        "port_name": "Port of Shanghai",
        "expected_time_of_arrival": "2025-04-08T14:00:00Z",
        "estimated_time_of_arrival": "2025-04-09T14:00:00Z",
        "coordinates": [31.23, 121.5]
      },
      {
        "port_code": "CNNGB",
        "port_name": "Port of Ningbo",
        "expected_time_of_arrival": "2025-04-13T18:00:00Z",
        "coordinates": [29.87, 121.57]
      }
    ]
  },
  {
    "vessel_name": "Atlantic Carrier",
    "vessel_code": "AC008",
    "status": "delivered",
    "lat_lon": [37.92, 23.64],
    "source": "Port of Piraeus",
    "destination": "Port of Valencia",
    "events": [
      {
        "port_code": "GRPIU",
        "port_name": "Port of Piraeus",
        "expected_time_of_arrival": "2025-03-31T09:00:00Z",
        "actual_time_of_arrival": "2025-03-31T09:15:00Z",
        "coordinates": [37.92, 23.64]
      },
      {
        "port_code": "ESVLC",
        "port_name": "Port of Valencia",
        "expected_time_of_arrival": "2025-04-05T13:00:00Z",
        "actual_time_of_arrival": "2025-04-05T13:25:00Z",
        "coordinates": [39.47, -0.34]
      }
    ]
  },
  {
    "vessel_name": "Eastern Merchant",
    "vessel_code": "EM009",
    "status": "intransit",
    "lat_lon": [15.62, 39.43],
    "source": "Port of Massawa",
    "destination": "Aqaba",
    "events": [
      {
        "port_code": "ERMSA",
        "port_name": "Port of Massawa",
        "expected_time_of_arrival": "2025-04-09T07:00:00Z",
        "coordinates": [15.62, 39.43]
      },
      {
        "port_code": "JOAQJ",
        "port_name": "Aqaba",
        "expected_time_of_arrival": "2025-04-16T11:00:00Z",
        "coordinates": [29.51, 35.0]
      }
    ]
  },
  {
    "vessel_name": "Northern Explorer",
    "vessel_code": "NE010",
    "status": "delivered",
    "lat_lon": [1.29, 103.85],
    "source": "Port of Singapore",
    "destination": "Port Klang",
    "events": [
      {
        "port_code": "SGSIN",
        "port_name": "Port of Singapore",
        "expected_time_of_arrival": "2025-04-02T06:00:00Z",
        "actual_time_of_arrival": "2025-04-02T06:10:00Z",
        "coordinates": [1.29, 103.85]
      },
      {
        "port_code": "MYPKG",
        "port_name": "Port Klang",
        "expected_time_of_arrival": "2025-04-07T10:00:00Z",
        "actual_time_of_arrival": "2025-04-07T10:35:00Z",
        "coordinates": [3.0333, 101.45]
      }
    ]
  },
  {
    "vessel_name": "Southern Trader",
    "vessel_code": "ST011",
    "status": "intransit",
    "lat_lon": [40.7128, -74.0060],
    "source": "Port of New York",
    "destination": "Port of Halifax",
    "events": [
      {
        "port_code": "USNYC",
        "port_name": "Port of New York",
        "expected_time_of_arrival": "2025-04-08T14:00:00Z",
        "actual_time_of_arrival": "2025-04-08T14:10:00Z",
        "coordinates": [40.7128, -74.0060]
      },
      {
        "port_code": "CAHAL",
        "port_name": "Port of Halifax",
        "expected_time_of_arrival": "2025-04-13T18:00:00Z",
        "coordinates": [44.6488, -63.5752]
      }
    ]
  },
  {
    "vessel_name": "Western Voyager",
    "vessel_code": "WV012",
    "status": "delivered",
    "lat_lon": [37.92, 23.64],
    "source": "Port of Piraeus",
    "destination": "Port of Valencia",
    "events": [
      {
        "port_code": "GRPIU",
        "port_name": "Port of Piraeus",
        "expected_time_of_arrival": "2025-03-30T09:00:00Z",
        "actual_time_of_arrival": "2025-03-30T09:20:00Z",
        "coordinates": [37.92, 23.64]
      },
      {
        "port_code": "ESVLC",
        "port_name": "Port of Valencia",
        "expected_time_of_arrival": "2025-04-04T13:00:00Z",
        "actual_time_of_arrival": "2025-04-04T13:30:00Z",
        "coordinates": [39.47, -0.34]
      }
    ]
  },
  {
    "vessel_name": "Arctic Carrier",
    "vessel_code": "AC013",
    "status": "intransit",
    "lat_lon": [60.0, -45.0],
    "source": "Reykjavik",
    "destination": "Halifax",
    "events": [
      {
        "port_code": "ISREY",
        "port_name": "Port of Reykjavik",
        "expected_time_of_arrival": "2025-04-10T08:00:00Z",
        "actual_time_of_arrival": "2025-04-10T08:10:00Z",
        "coordinates": [64.1355, -21.8954]
      },
      {
        "port_code": "CAHAL",
        "port_name": "Port of Halifax",
        "expected_time_of_arrival": "2025-04-17T14:00:00Z",
        "coordinates": [44.6488, -63.5752]
      },
      {
        "port_code": "USNYC",
        "port_name": "Port of New York",
        "expected_time_of_arrival": "2025-04-20T18:00:00Z",
        "coordinates": [40.7128, -74.0060]
      }
    ]
  },
  {
    "vessel_name": "Baltic Trader",
    "vessel_code": "BT014",
    "status": "delivered",
    "lat_lon": [1.29, 103.85],
    "source": "Port of Singapore",
    "destination": "Port Klang",
    "events": [
      {
        "port_code": "SGSIN",
        "port_name": "Port of Singapore",
        "expected_time_of_arrival": "2025-04-03T06:00:00Z",
        "actual_time_of_arrival": "2025-04-03T06:15:00Z",
        "coordinates": [1.29, 103.85]
      },
      {
        "port_code": "MYPKG",
        "port_name": "Port Klang",
        "expected_time_of_arrival": "2025-04-08T10:00:00Z",
        "actual_time_of_arrival": "2025-04-08T10:40:00Z",
        "coordinates": [3.0333, 101.45]
      }
    ]
  },
  {
    "vessel_name": "Caribbean Explorer",
    "vessel_code": "CE015",
    "status": "intransit",
    "lat_lon": [31.23, 121.5],
    "source": "Port of Shanghai",
    "destination": "Port of Ningbo",
    "events": [
      {
        "port_code": "CNSHG",
        "port_name": "Port of Shanghai",
        "expected_time_of_arrival": "2025-04-10T14:00:00Z",
        "estimated_time_of_arrival": "2025-04-11T14:00:00Z",
        "coordinates": [31.23, 121.5]
      },
      {
        "port_code": "CNNGB",
        "port_name": "Port of Ningbo",
        "expected_time_of_arrival": "2025-04-15T18:00:00Z",
        "coordinates": [29.87, 121.57]
      }
    ]
  }
];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI2);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const insertVesselData = async () => {
  try {
    // Connect to the database
    await connectDB();

    // Insert the data
    const result = await VesselTracking.insertMany(vesselData);
    console.log(`${result.length} vessel records inserted successfully`);

    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error inserting vessel data:', error);
    process.exit(1);
  }
};

// Run the script
insertVesselData(); 