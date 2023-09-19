const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, Model, DataTypes } = require('sequelize');

const app = express();
const port = process.env.PORT || 3000;

// Database setup
const sequelize = new Sequelize('postgres', 'postgres', 'anna2001', {
  host: 'localhost',
  dialect: 'postgres',
});

// Define the Driver model
class Driver extends Model {}
Driver.init({
  driver_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  driver_name: DataTypes.STRING,
  fleet_id: { type: DataTypes.STRING, allowNull: false },
  location: DataTypes.JSONB,
  vehicle_groups: DataTypes.ARRAY(DataTypes.STRING),
}, {
  sequelize,
  modelName: 'Driver', 
  tableName: 'drivers', 
  timestamps: false, 
});

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

    // Create a new driver record
    const driver = await Driver.create({
      driver_name: driverName, 
      fleet_id: fleetId, 
      location,
      vehicle_groups: vehicleGroups, 
    });

    // Send a success response with the created driver
    res.status(201).json(driver);
  } catch (error) {
    // Handle any errors and send an error response
    console.error('Error creating driver:', error);
    res.status(500).json({ error: 'Unable to create driver' });
  }
});

// Routes
//app.get('/drivers', async (req, res) => {
//  try {
//    const drivers = await Driver.findAll({ order: [['driver_id', 'ASC']] });
//    res.json(drivers);
//  } catch (error) {
//    console.error(error);
//    res.status(500).json({ error: 'Internal Server Error' });
//  }
//});

app.get('/drivers', async (req, res) => {
  try {
    let order = [['driver_name', 'ASC']]; 

    const sortBy = req.query.sort_by;
    const sortOrder = req.query.sort_order;

    if (sortBy && sortOrder) {
      order = [[sortBy, sortOrder.toUpperCase()]]; 
    }

    const drivers = await Driver.findAll({
      order,
    });
    
    res.json(drivers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.put('/drivers/:driverId', async (req, res) => {
  const driverId = req.params.driverId;
  console.log('Received PUT request for driver ID:', driverId);

  try {
    // Extract all the fields from the request body
    const { driverName, fleetId, location, vehicleGroups } = req.body;

    // Define an object with the fields to update
    const updatedFields = {
      driver_name: driverName,
      fleet_id: fleetId,
      location: location,
      vehicle_groups: vehicleGroups,
    };

    // Update the driver record with the specified fields
    const [numUpdatedRows, updatedDrivers] = await Driver.update(updatedFields, {
      where: { driver_id: driverId },
      returning: true, // Return the updated record(s)
    });

    if (numUpdatedRows === 0) {
      res.status(404).json({ error: 'Driver not found' });
    } else {
      res.json({ message: 'Driver updated successfully', updatedDriver: updatedDrivers[0] });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/drivers/:driverId', async (req, res) => {
  const driverId = req.params.driverId;
  try {
    const deletedDriver = await Driver.destroy({ where: { driver_id: driverId } });
    if (deletedDriver === 0) {
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

