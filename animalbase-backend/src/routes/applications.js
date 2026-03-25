const router = require('express').Router();
const { submitApplication, getMyApplications } = require('../controllers/applicationController');
const { authenticate } = require('../middleware/auth');

router.post('/',   authenticate, submitApplication);
router.get ('/my', authenticate, getMyApplications);

module.exports = router;