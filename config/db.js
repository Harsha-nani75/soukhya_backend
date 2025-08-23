const mysql = require('mysql2');

require('dotenv').config();
const SECRET = process.env.SECRET 

const db = mysql.createConnection({
host:  'localhost',
  user: 'root' ,
  password: '' ,
  database: 'soukya_system'
});

module.exports = db;