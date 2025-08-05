// Modified map.js to return a map image
/*const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

router.get('/', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude and Longitude are required." });
  }

  try {
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=600x400&markers=color:red%7C${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const response = await axios.get(mapUrl, { responseType: 'arraybuffer' });
    res.set('Content-Type', 'image/png');
    res.send(response.data);
  } catch (err) {
    console.error('Error fetching map image:', err.message);
    res.status(500).json({ error: 'Error fetching map image.' });
  }
});

module.exports = router;
*/