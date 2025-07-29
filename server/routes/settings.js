const express = require('express');
const Settings = require('../models/Settings');

const router = express.Router();

// Get all settings or settings by category
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let whereClause = {};
    
    if (category) {
      whereClause.category = category;
    }

    const settings = await Settings.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['key', 'ASC']]
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific setting by key
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Settings.findOne({
      where: { key }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(setting);
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update setting
router.post('/', async (req, res) => {
  try {
    const { key, value, description, category, type } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const [setting, created] = await Settings.upsert({
      key,
      value,
      description,
      category: category || 'general',
      type: type || 'text'
    }, {
      returning: true
    });

    console.log(`⚙️ Setting ${created ? 'created' : 'updated'}:`, key);
    res.json(setting);
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update specific setting
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description, category, type } = req.body;

    const setting = await Settings.findOne({ where: { key } });
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    const updateData = {};
    if (value !== undefined) updateData.value = value;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (type !== undefined) updateData.type = type;

    await setting.update(updateData);
    
    console.log(`⚙️ Setting updated:`, key);
    res.json(setting);
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete setting
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const deleted = await Settings.destroy({
      where: { key }
    });

    if (deleted === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    console.log(`⚙️ Setting deleted:`, key);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
