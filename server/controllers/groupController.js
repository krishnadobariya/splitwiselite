const groupService = require('../services/groupService');

const createGroup = async (req, res) => {
    try {
        const group = await groupService.createGroup(req.body, req.user._id);
        res.status(201).json(group);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getGroups = async (req, res) => {
    try {
        const groups = await groupService.getGroups(req.user._id);
        res.json(groups);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getGroupById = async (req, res) => {
    try {
        const group = await groupService.getGroupById(req.params.id);
        res.json(group);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const addMember = async (req, res) => {
    try {
        const group = await groupService.addMember(req.params.id, req.body.email);
        res.json(group);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateGroup = async (req, res) => {
    try {
        const group = await groupService.updateGroup(req.params.id, req.body, req.user._id);
        res.json(group);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const result = await groupService.deleteGroup(req.params.id, req.user._id);
        res.json(result);
    } catch (error) {
        res.status(403).json({ message: error.message });
    }
};

const removeMember = async (req, res) => {
    try {
        const group = await groupService.removeMember(req.params.id, req.params.memberId, req.user._id);
        res.json(group);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    createGroup,
    getGroups,
    getGroupById,
    addMember,
    updateGroup,
    deleteGroup,
    removeMember
};
