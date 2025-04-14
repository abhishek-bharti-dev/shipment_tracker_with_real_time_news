const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Signup controller
const signup = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                data: null,
                message: 'User already exists'
            });
        }

        // Create new user
        const user = new User({
            email,
            password,
            name
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name
                }
            },
            message: 'User created successfully'
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error creating user'
        });
    }
};

// Login controller
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Make request to Xano API for login
        const loginResponse = await axios.post('https://x8ki-letl-twmt.n7.xano.io/api:539QLzhw/auth/login', {
            email,
            password
        });

        // Get the token from login response
        const token = loginResponse.data.authToken;

        // Return both login and user details
        res.status(200).json({
            success: true,
            data: {
                token: token,
                user: loginResponse.data.user
            },
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Login error:', error);
        // Handle Xano API errors
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                data: null,
                message: error.response.data.message || 'Invalid credentials'
            });
        }
        res.status(500).json({
            success: false,
            data: null,
            message: 'Error logging in'
        });
    }
};

module.exports = {
    signup,
    login
};
