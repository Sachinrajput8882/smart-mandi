const { initDb } = require('../backend/src/config/db');
const app = require('../backend/src/server');

let isInitialized = false;

module.exports = async (req, res) => {
  if (!isInitialized) {
    try {
      await initDb();
      isInitialized = true;
    } catch (err) {
      console.error('Failed to initialize DB in Vercel function:', err);
    }
  }
  return app(req, res);
};
