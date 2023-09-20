const pgp = require('pg-promise')();
const connection = {
  host: 'localhost',
  port: 5432, // Change to your PostgreSQL port
  database: 'postgres', // Change to your database name
  user: 'postgres', // Change to your database user
  password: 'anna2001', // Change to your database password
};
const db = pgp(connection);

module.exports = db;

