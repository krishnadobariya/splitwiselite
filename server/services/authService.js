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

module.exports = {
    registerUser,
    loginUser
};
