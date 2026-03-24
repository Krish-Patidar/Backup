const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getCreditHistory, claimReward, getAllWorkers, createUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/credits', getCreditHistory);
router.post('/claim-reward', claimReward);
router.get('/workers', authorize('department_admin', 'cm_admin'), getAllWorkers);
router.post('/', authorize('cm_admin', 'department_admin'), createUser);

module.exports = router;
