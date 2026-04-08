const expenseService = require('../services/expenseService');

const addExpense = async (req, res) => {
    try {
        const expense = await expenseService.addExpense(req.body);
        res.status(201).json(expense);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getExpensesByGroup = async (req, res) => {
    try {
        const expenses = await expenseService.getExpensesByGroup(req.params.groupId);
        res.json(expenses);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getGroupBalances = async (req, res) => {
    try {
        const balances = await expenseService.getGroupBalances(req.params.groupId);
        res.json(balances);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateExpense = async (req, res) => {
    try {
        const expense = await expenseService.updateExpense(req.params.id, req.body, req.user._id);
        res.json(expense);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteExpense = async (req, res) => {
    try {
        const result = await expenseService.deleteExpense(req.params.id, req.user._id);
        res.json(result);
    } catch (error) {
        res.status(403).json({ message: error.message });
    }
};

const getMonthlyStats = async (req, res) => {
    try {
        const stats = await expenseService.getMonthlyStats(req.params.groupId);
        res.json(stats);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const addComment = async (req, res) => {
    try {
        const { comment, groupId } = await expenseService.addComment(req.params.id, req.user._id, req.body.text);
        
        // Emit Socket Event
        const io = req.app.get('io');
        io.to(groupId.toString()).emit('new_comment', {
            expenseId: req.params.id,
            comment: comment
        });

        res.status(201).json(comment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteComment = async (req, res) => {
    try {
        const result = await expenseService.deleteComment(req.params.id, req.params.commentId, req.user._id);
        res.json(result);
    } catch (error) {
        res.status(403).json({ message: error.message });
    }
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
