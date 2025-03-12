require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes')

const app = express();
app.use(express.json());

// Enable CORS
app.use(cors());

// Connect Database
connectDB();

// Routes
app.use("/api/users", userRoutes);
app.use('/api/payment', paymentRoutes);

// Start Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
