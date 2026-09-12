require('dotenv').config();
const app = require('./app');
const { initDatabase, getMode } = require('./config/db');

const PORT = Number(process.env.PORT || 5000);

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`[stackit] API listening on :${PORT} (db=${getMode()})`);
  });
});
