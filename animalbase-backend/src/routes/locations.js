const router = require('express').Router();
const { searchPangasinan } = require('../controllers/locationController');

router.get('/pangasinan', searchPangasinan);

module.exports = router;
