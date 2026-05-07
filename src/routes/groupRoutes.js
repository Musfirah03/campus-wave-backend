const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getMyGroups,
  discoverGroups,
  createGroup,
  findOrCreateDM,
  joinGroup,
  joinViaInvite,
  leaveGroup,
  getGroupById,
  getAllGroups,
} = require('../controllers/groupController');

const router = express.Router();

router.use(protect);

router.get('/my',                 getMyGroups);
router.get('/discover',           discoverGroups);
router.post('/dm',                findOrCreateDM);
router.get('/',                   getAllGroups);
router.post('/',                  createGroup);
router.get('/:groupId',           getGroupById);
router.post('/:groupId/join',            joinGroup);
router.post('/:groupId/join-via-invite', joinViaInvite);
router.post('/:groupId/leave',           leaveGroup);

module.exports = router;
