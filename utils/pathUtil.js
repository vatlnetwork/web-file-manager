const path = require('path');

// Root directory from environment variable or current working directory
const ROOT_DIR = process.env.ROOT_DIR ? path.resolve(process.env.ROOT_DIR) : path.resolve(process.cwd());

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
