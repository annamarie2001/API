const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db'); 
const Joi = require('joi');

const app = express();
const port = process.env.PORT || 3000;


// Middleware
app.use(bodyParser.json());


const validApiKeys = ['abcd1234', 'efgh5678']; 

app.use((req, res, next) => {
  const apiKey = req.headers['api-key'];

  if (!apiKey || !validApiKeys.includes(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key.' });
  }

  next();
});

// Create a new driver
app.post('/api/drivers', async (req, res) => {
  try {
    const { driverName, fleetId, location, vehicleGroups } = req.body;

	  // Define a schema for validating the request body
    const schema = Joi.object({
      driverName: Joi.string().max(255).required(),
      fleetId: Joi.string().max(255).required(),
      location: Joi.object().keys({
         City: Joi.string().max(255).required(),
         'Pincode': Joi.string().max(10).required(),
  }),
      vehicleGroups: Joi.array().items(Joi.string()),
});	    
    

    // Validate the request body
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const query = `
      INSERT INTO drivers (driver_name, fleet_id, location, vehicle_groups)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [driverName, fleetId, location, vehicleGroups];

    const driver = await db.one(query, values);

    res.status(201).json(driver);
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ error: 'Unable to create driver' });
  }
});

// GET request to retrieve drivers
app.get('/drivers', async (req, res) => {
  try {
    let order = 'driver_name ASC'; // Default sorting order

    const sortBy = req.query.sort_by;
    const sortOrder = req.query.sort_order;
// Define a schema for validating query parameters
    const querySchema = Joi.object({
      sort_by: Joi.string().valid('driver_name', 'fleet_id', 'location', 'vehicle_groups'),
      sort_order: Joi.string().valid('asc', 'desc'),
    });

    // Validate the query parameters
    const { error } = querySchema.validate(req.query);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    } 
    if (sortBy && sortOrder) {
      order = `${sortBy} ${sortOrder.toUpperCase()}`;
    }

    const query = `
      SELECT * FROM drivers
      ORDER BY ${order};
    `;

    const drivers = await db.any(query);

    res.json(drivers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT request to update a driver
app.put('/drivers/:driverId', async (req, res) => {
  const driverId = req.params.driverId;
  console.log('Received PUT request for driver ID:', driverId);

  try {
    const { driverName, fleetId, location, vehicleGroups } = req.body;
 // Define a schema for validating the request body
    const bodySchema = Joi.object({
      driverName: Joi.string().max(255).required(),
      fleetId: Joi.string().max(255).required(),
      location: Joi.object().keys({
         City: Joi.string().max(255).required(),
         'Pincode': Joi.string().max(10).required(),
  }),
      vehicleGroups: Joi.array().items(Joi.string()),
});
    

    // Validate the request body
    const { error } = bodySchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const query = `
      UPDATE drivers
      SET driver_name = $1, fleet_id = $2, location = $3, vehicle_groups = $4
      WHERE driver_id = $5
      RETURNING *;
    `;

    const values = [driverName, fleetId, location, vehicleGroups, driverId];

    const updatedDriver = await db.oneOrNone(query, values);

    if (!updatedDriver) {
      res.status(404).json({ error: 'Driver not found' });
    } else {
      res.json({ message: 'Driver updated successfully', updatedDriver });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE request to delete a driver
app.delete('/drivers/:driverId', async (req, res) => {
  const driverId = req.params.driverId;
const pathParamSchema = Joi.number().integer().positive().required();

  // Validate the path parameter
  const { error } = pathParamSchema.validate(driverId);

  if (error) {
    return res.status(400).json({ error: 'Invalid driverId' });
  }

  try {
    const query = `
      DELETE FROM drivers
      WHERE driver_id = $1
      RETURNING *;
    `;

    const deletedDriver = await db.oneOrNone(query, driverId);

    if (!deletedDriver) {
      res.status(404).json({ error: 'Driver not found' });
    } else {
      res.json({ message: 'Driver deleted successfully' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

