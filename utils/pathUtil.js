const path = require('path');

// Root directory — everything is sandboxed to where the server was started
const ROOT_DIR = path.resolve(process.cwd());

// Path Sandboxing Helper
function sandboxPath(requestedPath) {
  const resolved = path.resolve(requestedPath);
  // Ensure the resolved path is within ROOT_DIR
  if (!resolved.startsWith(ROOT_DIR + path.sep) && resolved !== ROOT_DIR) {
    return null;
  }
  return resolved;
}

module.exports = {
  ROOT_DIR,
  sandboxPath
};
