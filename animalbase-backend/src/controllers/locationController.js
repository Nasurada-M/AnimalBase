const { searchPangasinanLocations } = require('../utils/location');

const searchPangasinan = async (req, res) => {
  try {
    const query = String(req.query.query || '');

    if (query.trim().length < 2) {
      return res.json([]);
    }

    const suggestions = await searchPangasinanLocations(query);
    return res.json(suggestions);
  } catch (err) {
    console.error('searchPangasinan error:', err);
    return res.status(500).json({ error: 'Server error while loading Pangasinan locations.' });
  }
};

module.exports = { searchPangasinan };
