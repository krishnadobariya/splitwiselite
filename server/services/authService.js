const User = require('../models/User');
const jwt = require('jsonwebtoken');

const registerUser = async (userData) => {
    const { name, email, password } = userData;
    const normalizedEmail = email.toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email: normalizedEmail,
        password
    });

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        token: generateToken(user._id)
    };
};

const loginUser = async (email, password) => {
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (user && (await user.matchPassword(password))) {
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            token: generateToken(user._id)
        };
    } else {
        if (!user) {
            console.log(`Login failed: User with email ${normalizedEmail} not found.`);
        } else {
            console.log(`Login failed: Password mismatch for user ${normalizedEmail}.`);
        }
        throw new Error('Invalid email or password');
    }
};

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

const getProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
    };
};

const updateProfile = async (userId, updateData) => {
    const { name, avatar, currentPassword, newPassword } = updateData;
    
    const user = await User.findById(userId).select('+password');
    if (!user) throw new Error('User not found');

    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;

    if (newPassword) {
        if (!currentPassword) throw new Error('Please provide your current password');
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) throw new Error('Current password is incorrect');
        user.password = newPassword;
    }

    await user.save();

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        token: generateToken(user._id)
    };
};

module.exports = {
    registerUser,
    loginUser,
    getProfile,
    updateProfile
};
