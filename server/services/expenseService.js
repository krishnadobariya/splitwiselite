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
    return expense.populate('payer', 'name email avatar');
};

const getExpensesByGroup = async (groupId) => {
    return await Expense.find({ group: groupId })
        .populate('payer', 'name email avatar')
        .populate('splits.user', 'name email avatar')
        .populate('comments.user', 'name email avatar');
};

const getGroupBalances = async (groupId) => {
    const expenses = await Expense.find({ group: groupId });
    const group = await Group.findById(groupId).populate('members', 'name email avatar');

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
            email: member.email,
            avatar: member.avatar
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
    return expense.populate('payer', 'name email avatar');
};

const getMonthlyStats = async (groupId) => {
    const expenses = await Expense.find({ group: groupId, isSettlement: false });
    
    const stats = {
        Food: 0,
        Travel: 0,
        Shopping: 0,
        Entertainment: 0,
        Others: 0
    };

    expenses.forEach(exp => {
        if (stats[exp.category] !== undefined) {
            stats[exp.category] += exp.amount;
        } else {
            stats.Others += exp.amount;
        }
    });

    return Object.keys(stats).map(name => ({ name, value: stats[name] }));
};

const addComment = async (expenseId, userId, text) => {
    const expense = await Expense.findById(expenseId);
    if (!expense) throw new Error('Expense not found');

    expense.comments.push({ user: userId, text });
    await expense.save();
    
    const updatedExpense = await Expense.findById(expenseId)
        .populate('comments.user', 'name avatar');
    
    return {
        comment: updatedExpense.comments[updatedExpense.comments.length - 1],
        groupId: updatedExpense.group
    };
};

const deleteComment = async (expenseId, commentId, userId) => {
    const expense = await Expense.findById(expenseId);
    if (!expense) throw new Error('Expense not found');

    const comment = expense.comments.id(commentId);
    if (!comment) throw new Error('Comment not found');

    if (comment.user.toString() !== userId.toString()) {
        throw new Error('Not authorized to delete this comment');
    }

    comment.remove();
    await expense.save();
    return { message: 'Comment removed' };
};

module.exports = {
    addExpense,
    getExpensesByGroup,
    getGroupBalances,
    updateExpense,
    deleteExpense,
    getMonthlyStats,
    addComment,
    deleteComment
};
