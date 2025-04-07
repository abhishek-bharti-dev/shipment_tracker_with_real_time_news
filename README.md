# Shipment Tracker with Real-time News

A Node.js application that tracks shipments and provides real-time news updates related to shipping and logistics. This application combines shipment tracking functionality with news aggregation to provide a comprehensive shipping information platform.

## Features

- Real-time shipment tracking with vessel location monitoring
- Port and sea incident tracking and reporting
- Automated news collection and analysis using Google's Generative AI
- Impact assessment and delay calculation for shipments
- User-specific shipment monitoring
- RESTful API endpoints for shipment and incident management
- MongoDB database for data persistence
- Image extraction from news articles
- Severity-based incident classification

## Tech Stack

- **Backend Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **AI Integration**: Google's Generative AI (Gemini)
- **Image Processing**: Custom image extraction service
- **Authentication**: JWT (JSON Web Tokens)
- **API Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Google AI API Key (for Gemini AI)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/abhishek-bharti-dev/shipment_tracker_with_real_time_news.git
cd shipment_tracker_with_real_time_news
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

## Project Structure

```
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/         # Database models (Shipment, Incident, News, etc.)
│   ├── routes/         # API routes
│   ├── services/       # Business logic (incidentService, imageExtractionService, etc.)
│   └── index.js        # Application entry point
├── data/              # Data files and configurations
├── scripts/           # Utility scripts
└── package.json       # Project dependencies
```

## Key Models

### Shipment Model
- `shipment_id` (String, required, unique)
- `client_id` (ObjectId, reference to User)
- `POL` (Port of Loading)
- `POD` (Port of Discharge)
- `tracking_id` (ObjectId, reference to VesselTracking)
- `createdAt` (Date)
- `updatedAt` (Date)

### Incident Model
- `source_news` (ObjectId, reference to News)
- `location_type` (Enum: 'port' or 'sea')
- `lat_lon` (Array of coordinates)
- `start_time` (Date)
- `estimated_duration_days` (Number)
- `severity` (Number)
- `status` (String)

### News Model
- `news_hash` (String, unique)
- `title` (String)
- `url` (String)
- `news_details` (String)
- `published_date` (Date)
- `news_location` (String)

## API Endpoints

### Shipments
- `GET /api/shipments` - Get all shipments for authenticated user
- `GET /api/shipments/:id` - Get a single shipment
- `POST /api/shipments` - Create a new shipment
- `PUT /api/shipments/:id` - Update a shipment
- `DELETE /api/shipments/:id` - Delete a shipment

### Incidents
- `GET /api/incidents` - Get all incidents affecting user's shipments
- `GET /api/incidents/:id` - Get a single incident
- `POST /api/incidents` - Create a new incident
- `PUT /api/incidents/:id` - Update incident status

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Acknowledgments

- Google AI for providing the Gemini AI capabilities
- MongoDB for the database solution
- Express.js team for the web framework
