const Group = require('../models/Group');
const User = require('../models/User');

const createGroup = async (groupData, userId) => {
    const { name, members } = groupData;
    
    // Ensure the creator is in the members list
    const allMembers = [...new Set([...members, userId])];

    const group = await Group.create({
        name,
        members: allMembers,
        createdBy: userId
    });

    return group.populate('members', 'name email');
};

const getGroups = async (userId) => {
    return await Group.find({ members: userId }).populate('members', 'name email');
};

const getGroupById = async (groupId) => {
    return await Group.findById(groupId).populate('members', 'name email');
};

const addMember = async (groupId, email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }

    const group = await Group.findById(groupId);
    if (!group) {
        throw new Error('Group not found');
    }

    if (group.members.includes(user._id)) {
        throw new Error('User already in group');
    }

    group.members.push(user._id);
    await group.save();

    return group.populate('members', 'name email');
};

const deleteGroup = async (groupId, userId) => {
    const group = await Group.findById(groupId);
    if (!group) throw new Error('Group not found');
    if (group.createdBy.toString() !== userId.toString()) {
        throw new Error('Not authorized to delete this group');
    }

    // Delete all expenses in this group
    const Expense = require('../models/Expense');
    await Expense.deleteMany({ group: groupId });
    await group.deleteOne();
    return { message: 'Group removed' };
};

const updateGroup = async (groupId, updateData, userId) => {
    const group = await Group.findById(groupId);
    if (!group) throw new Error('Group not found');
    if (group.createdBy.toString() !== userId.toString()) {
        throw new Error('Not authorized to update this group');
    }

    group.name = updateData.name || group.name;
    await group.save();
    return group.populate('members', 'name email');
};

const removeMember = async (groupId, memberId, userId) => {
    const group = await Group.findById(groupId);
    if (!group) throw new Error('Group not found');
    if (group.createdBy.toString() !== userId.toString()) {
        throw new Error('Not authorized to manage group members');
    }

    if (memberId.toString() === group.createdBy.toString()) {
        throw new Error('Cannot remove the group creator');
    }

    group.members = group.members.filter(m => m.toString() !== memberId.toString());
    await group.save();

    // Also remove expenses involving this member? (Usually we keep history but balances will change)
    // For simplicity, we just keep past expenses as is.
    return group.populate('members', 'name email');
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
