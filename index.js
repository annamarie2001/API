const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db'); 
const Joi = require('joi');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

const JWT_SECRET_KEY = 'your_secret_key';


// Middleware
app.use(bodyParser.json());

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token is missing.' });
  }

  jwt.verify(token.replace('Bearer ', ''), JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    // Store the decoded user information in the request object
    req.user = decoded;
    next();
  });
};


app.get('/testToken', async (req, res) => {
  try {
    const driverId = req.query.driverId; // Extract driverId from query parameters

    if (!driverId) {
      return res.status(400).json({ error: 'driverId parameter is required.' });
    }

    // Fetch user data from the database using the provided driverId
    const userData = await getUserFromDatabase(driverId);

    if (!userData) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Use the user data to generate a token
    const token = jwt.sign(userData, JWT_SECRET_KEY, { expiresIn: '1h' });
    res.json({ success: true, token });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function getUserFromDatabase(driverId) {
  try {
    const userData = await db.oneOrNone('SELECT * FROM drivers WHERE driver_id = $1', [driverId]); // Pass driverId as an array

    if (!userData) {
      throw new Error('User not found.');
    }

    return userData;
  } catch (error) {
    throw new Error('Error fetching user data: ' + error.message);
  }
}


// Create a new driver
app.post('/api/drivers', verifyToken, async (req, res) => {
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
app.get('/drivers', verifyToken, async (req, res) => {
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
app.put('/drivers/:driverId', verifyToken, async (req, res) => {
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
app.delete('/drivers/:driverId', verifyToken, async (req, res) => {
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

