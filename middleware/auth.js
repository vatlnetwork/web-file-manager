const path = require('path');
const fs = require('fs');

let authCredentials = null;
let authEnabled = false;

function initAuth() {
  const authArgIndex = process.argv.indexOf('--auth');
  if (authArgIndex !== -1) {
    const authFilePath = process.argv[authArgIndex + 1];
    if (!authFilePath) {
      console.error('Error: --auth flag requires a file path argument.');
      process.exit(1);
    }
    const resolvedAuthPath = path.resolve(authFilePath);
    try {
      const authContent = fs.readFileSync(resolvedAuthPath, 'utf8');
      const lines = authContent.split(/\r?\n/);
      const username = (lines[0] || '').trim();
      const password = (lines[1] || '').trim();
      if (!username || !password) {
        console.error(`Error: Auth file '${resolvedAuthPath}' must have content on the first 2 lines (username on line 1, password on line 2).`);
        process.exit(1);
      }
      authCredentials = { username, password };
      authEnabled = true;
    } catch (err) {
      console.error(`Error: Cannot read auth file '${resolvedAuthPath}': ${err.message}`);
      process.exit(1);
    }
  }
}

// Ensure auth is parsed immediately when module loads
initAuth();

function basicAuth(req, res, next) {
  if (!authEnabled) return next();
  
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const encoded = authHeader.split(' ')[1];
    if (encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const [user, pass] = decoded.split(':');
      if (user === authCredentials.username && pass === authCredentials.password) {
        return next();
      }
    }
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="WebFiles"');
  return res.status(401).send('Authentication required.');
}

module.exports = {
  basicAuth,
  getUsername: () => authEnabled ? authCredentials.username : null,
  isEnabled: () => authEnabled
};
