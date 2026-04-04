const express = require('express');
const path = require('path');
const os = require('os');
const { ROOT_DIR } = require('./utils/pathUtil');
const auth = require('./middleware/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = 3000;

// Middleware
app.use(auth.basicAuth);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// General error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'localhost';
  for (const iface of Object.values(networkInterfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        localIP = addr.address;
        break;
      }
    }
  }

  console.log(`\n  🗂  WebFiles - File Explorer`);
  console.log(`  ───────────────────────────`);
  console.log(`  Root:    ${ROOT_DIR}`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${localIP}:${PORT}`);
  if (auth.isEnabled()) console.log(`  Auth:    Enabled (user: ${auth.getUsername()})`);
  console.log(`  Press Ctrl+C to stop\n`);
});
