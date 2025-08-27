const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const registerRoutes = require('./routes/register');
const enquiryRoutes = require('./routes/enquiry');
const packageRoutes = require('./routes/package');
const patientRoutes = require('./routes/patient');
const patientUpdateRoutes = require('./routes/patient_update');
const diseasesRoutes = require('./routes/diseases');
const app = express();
const path = require("path");

const dotenv = require('dotenv');
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/enquiry', enquiryRoutes);
app.use('/api/package', packageRoutes);
app.use('/api/diseases', diseasesRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/patient-update', patientUpdateRoutes);
port=process.env.PORT || 4865;
dotenv.config();

app.listen(port, () => {
  console.log('Server running on port http://localhost:' + port);
});

