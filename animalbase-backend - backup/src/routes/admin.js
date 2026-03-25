const router = require('express').Router();
const {
  getDashboardStats,
  getAllUsers, getUserById, updateUser, deleteUser, resetUserPassword,
  adminGetAllPets, createPet, updatePet, deletePet,
  adminGetAllApplications, updateApplicationStatus,
  adminGetAllLostPets, updateLostPetStatus, deleteLostPet,
  adminGetAllSightings, deleteSighting,
} = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users
router.get   ('/users',                    getAllUsers);
router.get   ('/users/:id',                getUserById);
router.put   ('/users/:id',                updateUser);
router.delete('/users/:id',                deleteUser);
router.put   ('/users/:id/reset-password', resetUserPassword);

// Pets
router.get   ('/pets',     adminGetAllPets);
router.post  ('/pets',     createPet);
router.put   ('/pets/:id', updatePet);
router.delete('/pets/:id', deletePet);

// Applications
router.get('/applications',     adminGetAllApplications);
router.put('/applications/:id', updateApplicationStatus);

// Lost Pets
router.get   ('/lost-pets',     adminGetAllLostPets);
router.put   ('/lost-pets/:id', updateLostPetStatus);
router.delete('/lost-pets/:id', deleteLostPet);

// Sightings
router.get   ('/sightings',     adminGetAllSightings);
router.delete('/sightings/:id', deleteSighting);

module.exports = router;