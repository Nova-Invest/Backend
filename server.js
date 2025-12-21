const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const investmentPackageRoutes = require('./routes/investmentPackageRoutes'); 
const cooperativeRoutes = require('./routes/cooperativeRoutes');
const foodPackageRoutes = require('./routes/FoodPackageRoutes'); // Add this line
const housingRoutes = require('./routes/housingRoutes');
const householdRoutes = require('./routes/householdRoutes');
const rentRoutes = require('./routes/rentRoutes');
const kycRoutes = require('./routes/kycRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();
app.use(express.json());

// Enable CORS
app.use(cors());

// Connect Database
connectDB();

// Routes
app.use('/api/users', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/investment-packages', investmentPackageRoutes); 
app.use('/api/cooperative', cooperativeRoutes);
app.use('/api/food-packages', foodPackageRoutes); // Add this line
app.use('/api/housing', housingRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/rent-packages', rentRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/transactions', transactionRoutes);

// Start Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));