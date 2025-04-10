# 🚢 Shipment Tracker API Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-1)
  - [Shipment Statistics](#shipment-statistics)
  - [Incidents](#incidents)
  - [Map Visualization](#map-visualization)
  - [Vessel Tracking](#vessel-tracking)
  - [News Ingestion](#news-ingestion)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Security](#security)
- [Best Practices](#best-practices)

## Overview
The Shipment Tracker API provides endpoints for tracking shipments, managing incidents, visualizing vessel movements, and ingesting real-time news. This documentation describes all available endpoints and how to interact with them.

### Base URL
```
https://api.shipmenttracker.com/api
```

### API Version
```
v1
```

## Authentication
Most endpoints require authentication using JWT (JSON Web Tokens). Include the token in the Authorization header of your requests.

### Authorization Header
```http
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Authentication

#### Sign Up
```http
POST /api/auth/signup
```

Creates a new user account.

**Request Body:**
```json
{
    "username": "string",
    "email": "string",
    "password": "string"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "string",
        "username": "string",
        "email": "string",
        "createdAt": "ISO date string"
    }
}
```

#### Login
```http
POST /api/auth/login
```

Authenticates a user and returns a JWT token.

**Request Body:**
```json
{
    "email": "string",
    "password": "string"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "token": "string",
        "expiresIn": 86400
    }
}
```

### Shipment Statistics

#### Get Shipment Statistics
```http
GET /api/shipment-stats
```

Retrieves shipment statistics for the authenticated client.

**Response:**
```json
{
    "success": true,
    "data": {
        "totalShipments": "number",
        "activeShipments": "number",
        "delayedShipments": "number",
        "averageDelay": "number",
        "shipmentsByStatus": {
            "in_transit": "number",
            "delivered": "number",
            "delayed": "number"
        }
    }
}
```

### Incidents

#### Create Incident
```http
POST /api/incidents
```

Creates a new incident when news about an incident is received.

**Request Body:**
```json
{
    "title": "string",
    "description": "string",
    "severity": "low|medium|high|critical",
    "status": "open|investigating|resolved",
    "location": {
        "latitude": "number",
        "longitude": "number"
    },
    "affectedVessels": ["string"]
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "string",
        "title": "string",
        "description": "string",
        "severity": "string",
        "status": "string",
        "createdAt": "ISO date string",
        "updatedAt": "ISO date string"
    }
}
```

#### Get All Incidents
```http
GET /api/incidents
```

Retrieves all incidents with optional filtering.

**Query Parameters:**
- `status`: Filter by status
- `severity`: Filter by severity
- `startDate`: Filter by start date
- `endDate`: Filter by end date
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

#### Get Incident by ID
```http
GET /api/incidents/:id
```

Retrieves a specific incident by its ID.

#### Update Incident Status
```http
PATCH /api/incidents/:id/status
```

Updates the status of a specific incident.

**Request Body:**
```json
{
    "status": "open|investigating|resolved"
}
```

### Map Visualization

#### Get Map Data
```http
GET /api/map-data
```

Retrieves data for map visualization including vessel positions and incidents.

**Query Parameters:**
- `bounds`: Map bounds in format "lat1,lng1,lat2,lng2"
- `zoom`: Map zoom level

**Response:**
```json
{
    "success": true,
    "data": {
        "vessels": [
            {
                "id": "string",
                "name": "string",
                "position": {
                    "latitude": "number",
                    "longitude": "number"
                },
                "status": "string",
                "speed": "number"
            }
        ],
        "incidents": [
            {
                "id": "string",
                "position": {
                    "latitude": "number",
                    "longitude": "number"
                },
                "severity": "string"
            }
        ]
    }
}
```

### Vessel Tracking

#### Get All Vessels
```http
GET /api/vessels
```

Retrieves all vessels with their impact and delay information.

**Query Parameters:**
- `status`: Filter by vessel status
- `type`: Filter by vessel type
- `page`: Page number
- `limit`: Items per page

**Response:**
```json
{
    "success": true,
    "data": {
        "vessels": [
            {
                "id": "string",
                "name": "string",
                "type": "string",
                "status": "string",
                "currentLocation": {
                    "latitude": "number",
                    "longitude": "number"
                },
                "estimatedDelay": "number",
                "impact": "low|medium|high"
            }
        ],
        "pagination": {
            "total": "number",
            "page": "number",
            "limit": "number"
        }
    }
}
```

### News Ingestion

#### Create News Incident
```http
POST /api/new_incidents
```

Creates a new news incident.

**Request Body:**
```json
{
    "title": "string",
    "content": "string",
    "source": "string",
    "url": "string",
    "publishedAt": "ISO date string",
    "location": {
        "latitude": "number",
        "longitude": "number"
    }
}
```

#### Get All News
```http
GET /api/news
```

Retrieves all news items with optional filtering.

**Query Parameters:**
- `startDate`: Filter by start date
- `endDate`: Filter by end date
- `source`: Filter by news source
- `page`: Page number
- `limit`: Items per page

#### Get News by ID
```http
GET /api/news/:newsId
```

Retrieves a specific news item by its ID.

## Error Handling

### Error Response Format
```json
{
    "success": false,
    "message": "Error message",
    "error": "Detailed error information",
    "code": "ERROR_CODE"
}
```

### Common Error Codes
| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error |

## Rate Limiting
API requests are rate-limited to prevent abuse:

| User Type | Rate Limit |
|-----------|------------|
| Authenticated Users | 100 requests/minute |
| Unauthenticated Users | 20 requests/minute |

When rate limit is exceeded, the API returns a 429 status code with a `Retry-After` header indicating when to retry.

## Security

### Authentication
- JWT tokens expire after 24 hours
- Tokens must be included in the Authorization header
- Passwords are hashed using bcrypt

### Data Protection
- All data is transmitted over HTTPS
- Sensitive data is encrypted at rest
- API keys are required for certain endpoints

### Best Practices
1. **Authentication**
   - Always include the Authorization header for protected endpoints
   - Store tokens securely and refresh them before expiration
   - Implement proper error handling for authentication failures

2. **Rate Limiting**
   - Implement exponential backoff when hitting rate limits
   - Cache responses when appropriate
   - Monitor your API usage

3. **Data Handling**
   - Validate all input data
   - Sanitize user inputs
   - Handle errors gracefully
   - Use appropriate HTTP methods
   - Implement proper pagination for list endpoints

4. **Performance**
   - Cache responses when possible
   - Use compression for large responses
   - Implement proper pagination
   - Use appropriate query parameters for filtering

5. **Monitoring**
   - Monitor API usage and performance
   - Set up alerts for errors and rate limits
   - Log important events and errors 