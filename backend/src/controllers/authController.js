const { db } = require('../config/db');

// 1. POST /api/auth/register - Register a new farmer
exports.register = async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'कृपया किसान का पूरा नाम दर्ज करें (Farmer name is required)'
      });
    }

    const cleanPhone = (phone || '').replace(/\D/g, '').trim();
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'कृपया एक वैध 10-अंकीय भारतीय मोबाइल नंबर दर्ज करें (Invalid phone number)'
      });
    }

    if (!password || password.trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए (Password must be at least 4 characters)'
      });
    }

    const newFarmer = await db.registerFarmer({
      name: name.trim(),
      phone: cleanPhone,
      password: password.trim()
    });

    return res.status(201).json({
      success: true,
      message: 'किसान पंजीकरण सफल हुआ (Registration successful)',
      data: {
        name: newFarmer.name,
        phone: newFarmer.phone,
        role: 'farmer'
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'पंजीकरण विफल रहा'
    });
  }
};

// 2. POST /api/auth/login - Farmer login with verification
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const cleanPhone = (phone || '').replace(/\D/g, '').trim();
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'कृपया एक वैध 10-अंकीय भारतीय मोबाइल नंबर दर्ज करें'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'कृपया पासवर्ड दर्ज करें'
      });
    }

    const farmer = await db.findFarmerByPhone(cleanPhone);
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: '❌ यह मोबाइल नंबर पंजीकृत नहीं है! कृपया पहले नया पंजीकरण करें।'
      });
    }

    if (farmer.password !== password.trim()) {
      return res.status(401).json({
        success: false,
        message: '❌ गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें।'
      });
    }

    return res.json({
      success: true,
      message: 'लॉगिन सफल (Login successful)',
      data: {
        name: farmer.name,
        phone: farmer.phone,
        role: 'farmer'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'लॉगिन में त्रुटि हुई',
      error: err.message
    });
  }
};

// 3. GET /api/auth/status - Check Database and Auth engine status
exports.getStatus = async (req, res) => {
  try {
    const dbInfo = db.getDbInfo();
    return res.json({
      success: true,
      database: dbInfo,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
