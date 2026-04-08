const authService = require('../services/authService');

const registerUser = async (req, res) => {
    try {
        const user = await authService.registerUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await authService.loginUser(email, password);
        res.json(user);
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await authService.getProfile(req.user._id);
        res.json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const user = await authService.updateProfile(req.user._id, req.body);
        res.json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getProfile,
    updateProfile
};
