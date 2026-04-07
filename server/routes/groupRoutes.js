const express = require('express');
const router = express.Router();
const { createGroup, getGroups, getGroupById, addMember, updateGroup, deleteGroup, removeMember } = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
      .get(protect, getGroups)
      .post(protect, createGroup);

router.route('/:id')
      .get(protect, getGroupById)
      .put(protect, updateGroup)
      .delete(protect, deleteGroup);

router.route('/:id/members')
      .post(protect, addMember);

router.route('/:id/members/:memberId')
      .delete(protect, removeMember);

module.exports = router;
