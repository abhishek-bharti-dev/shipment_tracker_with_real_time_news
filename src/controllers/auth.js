const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Signup controller
const signup = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Make request to Xano API for signup
        const response = await axios.post('https://x8ki-letl-twmt.n7.xano.io/api:539QLzhw/auth/signup', {
            email,
            password,
            name
        });

        res.status(201).json({
            success: true,
            data:{
                token: response.data.authToken,
                user: response.data.user
            },
            message: 'User created successfully'
        });
    } catch (error) {
        console.error('Signup error:', error);
        // Handle Xano API errors
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                data: null,
                message: error.response.data.message || 'Error creating user'
            });
        }
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
