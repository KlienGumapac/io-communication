const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Username and password are required' 
            });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ 
                error: 'Username must be between 3 and 20 characters' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters' 
            });
        }

        // Check if username already exists
        const existingUser = await User.findOne({ username: username.trim().toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ 
                error: 'Username already exists. Please choose another one.' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const newUser = new User({
            username: username.trim().toLowerCase(),
            password: hashedPassword,
            avatar: null
        });

        await newUser.save();

        // Don't send password back
        const userResponse = {
            id: newUser._id,
            username: newUser.username,
            createdAt: newUser.createdAt
        };

        res.status(201).json({
            message: 'Account created successfully',
            user: userResponse
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({ 
                error: 'Username already exists. Please choose another one.' 
            });
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ 
                error: errors[0] 
            });
        }

        res.status(500).json({ 
            error: 'Registration failed. Please try again later.' 
        });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Username and password are required' 
            });
        }

        // Find user by username (case insensitive)
        const user = await User.findOne({ username: username.trim().toLowerCase() });
        
        if (!user) {
            // Don't reveal if username exists for security
            return res.status(401).json({ 
                error: 'Invalid username or password' 
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ 
                error: 'Invalid username or password' 
            });
        }

        // Update last login timestamp
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id,
                username: user.username 
            },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
            { expiresIn: '7d' } // Token expires in 7 days
        );

        // Return user data (without password) and token
        res.json({
            message: 'Login successful',
            token: token,
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar,
                avatarColor: user.avatarColor,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Login failed. Please try again later.' 
        });
    }
});

module.exports = router;

