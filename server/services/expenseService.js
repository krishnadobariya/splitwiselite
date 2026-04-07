const Expense = require('../models/Expense');
const Group = require('../models/Group');

const addExpense = async (expenseData) => {
    const { group, amount, splitType, splits } = expenseData;

    // Validate splits if custom
    if (splitType === 'custom') {
        const totalSplits = splits.reduce((acc, split) => acc + split.amount, 0);
        if (Math.abs(totalSplits - amount) > 0.01) {
            throw new Error('Total custom splits must equal the total amount');
        }
    }

    const expense = await Expense.create(expenseData);
    return expense.populate('payer', 'name email');
};

const getExpensesByGroup = async (groupId) => {
    return await Expense.find({ group: groupId })
        .populate('payer', 'name email')
        .populate('splits.user', 'name email');
};

const getGroupBalances = async (groupId) => {
    const expenses = await Expense.find({ group: groupId });
    const group = await Group.findById(groupId).populate('members', 'name email');

    if (!group) {
        throw new Error('Group not found');
    }

    // Initialize balances for each member
    const balances = {};
    group.members.forEach(member => {
        balances[member._id] = 0;
    });

    expenses.forEach(expense => {
        // Payer gets back the full amount
        balances[expense.payer] += expense.amount;

        // Subtract each person's share
        expense.splits.forEach(split => {
            balances[split.user] -= split.amount;
        });
    });

    // Convert to readable format
    const results = group.members.map(member => ({
        user: {
            _id: member._id,
            name: member.name,
            email: member.email
        },
        balance: balances[member._id]
    }));

    return results;
};

const deleteExpense = async (expenseId, userId) => {
    const expense = await Expense.findById(expenseId).populate('group');
    if (!expense) throw new Error('Expense not found');

    // Only payer or group creator can delete
    if (expense.payer.toString() !== userId.toString() && 
        expense.group.createdBy.toString() !== userId.toString()) {
        throw new Error('Not authorized to delete this expense');
    }

    await expense.deleteOne();
    return { message: 'Expense removed' };
};

const updateExpense = async (expenseId, updateData, userId) => {
    const expense = await Expense.findById(expenseId).populate('group');
    if (!expense) throw new Error('Expense not found');

    // Only payer or group creator can edit
    if (expense.payer.toString() !== userId.toString() && 
        expense.group.createdBy.toString() !== userId.toString()) {
        throw new Error('Not authorized to update this expense');
    }

    Object.assign(expense, updateData);
    await expense.save();
    return expense.populate('payer', 'name email');
};

module.exports = {
    addExpense,
    getExpensesByGroup,
    getGroupBalances,
    updateExpense,
    deleteExpense
};
