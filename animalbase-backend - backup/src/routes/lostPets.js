const router = require('express').Router();
const {
  getAllLostPets, getLostPetById, getSightings,
  reportMissingPet, reportSighting, markLostPetAsFound,
} = require('../controllers/lostPetController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get ('/',              getAllLostPets);
router.get ('/:id',           getLostPetById);
router.get ('/:id/sightings', getSightings);
router.post('/',              authenticate, upload.single('image'), reportMissingPet);
router.post('/:id/sightings', authenticate, reportSighting);
router.put ('/:id/found',     authenticate, markLostPetAsFound);

module.exports = router;
