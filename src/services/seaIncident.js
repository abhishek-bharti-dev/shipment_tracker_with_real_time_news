const mongoose = require('mongoose');

// Haversine formula to calculate distance between two points on Earth
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI/180);
}

// Test ship data (in a real application, this would come from a database)
const testShips = [
    {
        name: "Cargo Ship Alpha",
        coordinates: {
            latitude: 25.7617,  // Miami coordinates
            longitude: -80.1918
        },
        type: "Cargo",
        status: "Active"
    },
    {
        name: "Tanker Beta",
        coordinates: {
            latitude: 25.7617,  // Miami coordinates
            longitude: -80.1918
        },
        type: "Tanker",
        status: "Active"
    },
    {
        name: "Container Ship Gamma",
        coordinates: {
            latitude: 25.7617,  // Miami coordinates
            longitude: -80.1918
        },
        type: "Container",
        status: "Active"
    }
];

/**
 * Check if there are any ships within a specified radius of given coordinates
 * @param {number} centerLat - Latitude of the center point
 * @param {number} centerLon - Longitude of the center point
 * @param {number} radiusKm - Radius in kilometers to search for ships
 * @returns {Array} Array of ships found within the radius
 */
function findShipsInRadius(centerLat, centerLon, radiusKm) {
    const shipsInRadius = testShips.filter(ship => {
        const distance = calculateDistance(
            centerLat,
            centerLon,
            ship.coordinates.latitude,
            ship.coordinates.longitude
        );
        return distance <= radiusKm;
    });

    return shipsInRadius;
}

// Example usage:
// const ships = findShipsInRadius(25.7617, -80.1918, 10); // Find ships within 10km of Miami
// console.log(ships);

module.exports = {
    findShipsInRadius,
    calculateDistance
}; 