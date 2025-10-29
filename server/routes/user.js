const express = require('express');
const router = express.Router();
const User = require('../models/User');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

/**
 * @route   POST /api/user/customize
 * @desc    Save user avatar and color preferences
 * @access  Public (will be protected when login is implemented)
 */
router.post('/customize', upload.single('avatar'), async (req, res) => {
    try {
        const { avatarColor } = req.body;
        const username = req.body.username || req.query.username; // For testing without auth
        
        if (!avatarColor) {
            return res.status(400).json({ 
                error: 'Avatar color is required' 
            });
        }

        // Validate color (basic hex validation)
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexColorRegex.test(avatarColor)) {
            return res.status(400).json({ 
                error: 'Invalid color format' 
            });
        }

        // Find user (for now by username, later by token)
        let user;
        if (username) {
            user = await User.findOne({ username: username.toLowerCase() });
            if (!user) {
                return res.status(404).json({ 
                    error: 'User not found' 
                });
            }
        } else {
            // If no username provided, create a temporary user or use default
            // This is for testing before login is implemented
            return res.status(400).json({ 
                error: 'Username required' 
            });
        }

        // Handle avatar upload
        let avatarPath = null;
        if (req.file) {
            // Save file path relative to uploads directory
            avatarPath = `/uploads/avatars/${req.file.filename}`;
            
            // Delete old avatar if exists
            if (user.avatar && user.avatar.startsWith('/uploads/')) {
                const oldAvatarPath = path.join(__dirname, '../..', 'uploads', user.avatar.replace('/uploads/', ''));
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                }
            }
        }

        // Update user preferences
        user.avatarColor = avatarColor;
        if (avatarPath) {
            user.avatar = avatarPath;
        } else if (req.body.removeAvatar === 'true') {
            // Remove avatar if explicitly requested
            if (user.avatar && user.avatar.startsWith('/uploads/')) {
                const oldAvatarPath = path.join(__dirname, '../..', 'uploads', user.avatar.replace('/uploads/', ''));
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                }
            }
            user.avatar = null;
        }

        await user.save();

        res.json({
            message: 'Preferences saved successfully',
            user: {
                id: user._id,
                username: user.username,
                avatarColor: user.avatarColor,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('Customization error:', error);
        
        // Clean up uploaded file if error occurred
        if (req.file) {
            const filePath = path.join(__dirname, '../uploads/avatars', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.status(500).json({ 
            error: 'Failed to save preferences' 
        });
    }
});

/**
 * @route   GET /api/user/preferences
 * @desc    Get user preferences
 * @access  Public (will be protected when login is implemented)
 */
router.get('/preferences', async (req, res) => {
    try {
        const username = req.query.username;
        
        if (!username) {
            return res.status(400).json({ 
                error: 'Username required' 
            });
        }

        const user = await User.findOne({ username: username.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ 
                error: 'User not found' 
            });
        }

        res.json({
            avatarColor: user.avatarColor || '#6366f1',
            avatar: user.avatar || null
        });

    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({ 
            error: 'Failed to get preferences' 
        });
    }
});

module.exports = router;

