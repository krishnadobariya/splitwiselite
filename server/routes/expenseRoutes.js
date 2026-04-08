const express = require('express');
const router = express.Router();
const { addExpense, getExpensesByGroup, getGroupBalances, updateExpense, deleteExpense, getMonthlyStats, addComment, deleteComment } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
      .post(protect, addExpense);

router.route('/:id')
      .put(protect, updateExpense)
      .delete(protect, deleteExpense);

router.route('/:id/comments')
      .post(protect, addComment);

router.route('/:id/comments/:commentId')
      .delete(protect, deleteComment);

router.route('/:groupId')
      .get(protect, getExpensesByGroup);

router.route('/:groupId/balances')
      .get(protect, getGroupBalances);

router.route('/:groupId/stats')
      .get(protect, getMonthlyStats);

module.exports = router;
