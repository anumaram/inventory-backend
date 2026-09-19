const router = require('express').Router();
const locationService = require('../services/location.service');

// 1. Reverse Geocode: lat & lng -> address details
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng, provider } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ msg: 'Latitude and longitude are required.' });
    }
    const result = await locationService.reverseGeocode(lat, lng, provider);
    res.json(result);
  } catch (err) {
    console.error('Reverse geocode error:', err.message);
    res.status(500).json({ msg: err.message || 'Failed to reverse geocode location' });
  }
});

// 2. Search location / autocomplete
router.get('/search', async (req, res) => {
  try {
    const { q, provider } = req.query;
    if (!q) return res.json([]);
    const results = await locationService.searchLocation(q, provider);
    res.json(results);
  } catch (err) {
    console.error('Location search error:', err.message);
    res.status(500).json({ msg: err.message || 'Failed to search places' });
  }
});

// 3. Nearest Hub & Distance Calculation
router.get('/nearest-hub', async (req, res) => {
  try {
    const { lat, lng, area, city, maxRadiusKm, pincode, preferredHub } = req.query;
    const result = await locationService.getNearestHub(lat, lng, area, city, maxRadiusKm, pincode, preferredHub);
    res.json(result);
  } catch (err) {
    console.error('Nearest hub error:', err.message);
    res.status(500).json({ msg: err.message || 'Failed to compute nearest hub' });
  }
});

// 4. Regional Fulfillment Hubs
router.get('/hubs', async (req, res) => {
  try {
    const hubs = await locationService.getAllHubs();
    res.json(hubs);
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to get hubs' });
  }
});

module.exports = router;

