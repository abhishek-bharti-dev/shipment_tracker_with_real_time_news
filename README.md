# Shipment Tracker with Real-time News

A Node.js application that tracks shipments and provides real-time news updates related to shipping and logistics. This application combines shipment tracking functionality with news aggregation to provide a comprehensive shipping information platform.

## Features

- Shipment tracking with detailed status updates
- Real-time news integration related to shipping and logistics
- RESTful API endpoints for shipment management
- MongoDB database for data persistence
- Natural language processing for news relevance
- Automated news updates using web scraping

## Tech Stack

- **Backend Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **News Processing**: Natural.js for NLP
- **Web Scraping**: Puppeteer
- **AI Integration**: Google Generative AI
- **Task Scheduling**: node-cron
- **Authentication**: JWT (JSON Web Tokens)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Google AI API Key (for news analysis)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/shipment_tracker_with_real_time_news.git
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
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   └── index.js        # Application entry point
├── config/             # Configuration files
├── data/              # Data files
├── docs/              # Documentation
├── public/            # Static files
├── tests/             # Test files
└── package.json       # Project dependencies
```

## API Endpoints

- `GET /api/shipments` - Get all shipments
- `GET /api/shipments/:id` - Get a single shipment
- `POST /api/shipments` - Create a new shipment
- `PUT /api/shipments/:id` - Update a shipment
- `DELETE /api/shipments/:id` - Delete a shipment

## Shipment Model

The shipment model includes the following fields:
- `trackingNumber` (String, required, unique)
- `status` (Enum: pending, in_transit, delivered, delayed)
- `origin` (Object with address, city, country, postalCode)
- `destination` (Object with address, city, country, postalCode)
- `estimatedDeliveryDate` (Date)
- `actualDeliveryDate` (Date)
- `carrier` (String)
- `weight` (Number)
- `relatedNews` (Array of news objects)
- `createdAt` (Date)
- `updatedAt` (Date)

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

## Author

[Your Name]

## Acknowledgments

- Google AI for providing the Generative AI capabilities
- MongoDB for the database solution
- Express.js team for the web framework
