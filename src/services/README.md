# Port Mapping Service

This service provides functions to fetch, store, and retrieve affected port IDs from the Incident database.

## Functions

### `fetchAndStoreAffectedPortIds()`

Fetches all affected port IDs from the Incident database and stores them in a JSON file.

**Returns:** Promise that resolves to an array of affected port IDs.

**Example:**
```javascript
const { fetchAndStoreAffectedPortIds } = require('./port_mapping');

async function example() {
  try {
    const portIds = await fetchAndStoreAffectedPortIds();
    console.log(`Fetched ${portIds.length} affected port IDs`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### `getAllAffectedPortIds()`

Gets all affected port IDs from the stored file.

**Returns:** Array of affected port IDs.

**Example:**
```javascript
const { getAllAffectedPortIds } = require('./port_mapping');

function example() {
  const portIds = getAllAffectedPortIds();
  console.log(`Retrieved ${portIds.length} affected port IDs`);
}
```

### `updateAffectedPortIds()`

Updates the affected port IDs by fetching fresh data from the database.

**Returns:** Promise that resolves to an array of updated affected port IDs.

**Example:**
```javascript
const { updateAffectedPortIds } = require('./port_mapping');

async function example() {
  try {
    const portIds = await updateAffectedPortIds();
    console.log(`Updated ${portIds.length} affected port IDs`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

## Configuration

The service uses the following environment variables:

- `DATABASE_URL`: The MongoDB connection URL. Defaults to `mongodb://localhost:27017/shipment_tracker`.

## Testing

To test the port mapping functions, you can use the provided test script:

```
node scripts/test-port-mapping.js
```

The test script will:
1. Connect to the MongoDB database
2. Create test incidents with affected port IDs
3. Test the port mapping functions
4. Clean up the test data
5. Close the database connection 