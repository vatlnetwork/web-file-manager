const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const multer = require('multer');
const { sandboxPath, ROOT_DIR } = require('../utils/pathUtil');

// Helper to determine if a file is text or binary
function isBinaryFile(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);
    
    for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0) return true;
    }
    return false;
  } catch(e) {
    return false;
  }
}

// API: List directory contents
router.get('/files', (req, res) => {
  let dirPath = req.query.path || ROOT_DIR;

  // Resolve and sandbox path
  dirPath = sandboxPath(dirPath);
  if (!dirPath) {
    return res.status(403).json({ error: 'Access denied: path is outside the allowed directory' });
  }

  fs.stat(dirPath, (err, stats) => {
    if (err) {
      return res.status(404).json({ error: 'Path not found', path: dirPath });
    }

    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Not a directory', path: dirPath });
    }

    fs.readdir(dirPath, { withFileTypes: true }, (err, entries) => {
      if (err) {
        return res.status(403).json({ error: 'Permission denied', path: dirPath });
      }

      const files = [];
      let pending = entries.length;

      // Compute parent — clamp to ROOT_DIR
      let parent = path.dirname(dirPath);
      if (!parent.startsWith(ROOT_DIR)) parent = ROOT_DIR;

      if (pending === 0) {
        return res.json({
          path: dirPath,
          parent,
          separator: path.sep,
          files: []
        });
      }

      entries.forEach(entry => {
        const fullPath = path.join(dirPath, entry.name);
        fs.stat(fullPath, (err, stat) => {
          if (err) {
            files.push({
              name: entry.name,
              path: fullPath,
              isDirectory: entry.isDirectory(),
              isSymlink: entry.isSymbolicLink(),
              size: 0,
              modified: null,
              created: null,
              permissions: null,
              mimeType: null,
              isHidden: entry.name.startsWith('.'),
              error: true
            });
          } else {
            const isDir = stat.isDirectory();
            const mimeType = isDir ? 'inode/directory' : (mime.lookup(entry.name) || 'application/octet-stream');
            
            files.push({
              name: entry.name,
              path: fullPath,
              isDirectory: isDir,
              isSymlink: entry.isSymbolicLink(),
              size: stat.size,
              modified: stat.mtime,
              created: stat.birthtime,
              permissions: '0' + (stat.mode & parseInt('777', 8)).toString(8),
              mimeType,
              isText: !isDir && (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/javascript' || !isBinaryFile(fullPath)),
              isHidden: entry.name.startsWith('.'),
              error: false
            });
          }

          pending--;
          if (pending === 0) {
            // Sort: directories first, then alphabetical (case-insensitive)
            files.sort((a, b) => {
              if (a.isDirectory && !b.isDirectory) return -1;
              if (!a.isDirectory && b.isDirectory) return 1;
              return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
            });

            res.json({
              path: dirPath,
              parent,
              separator: path.sep,
              files
            });
          }
        });
      });
    });
  });
});

// API: Get file info
router.get('/fileinfo', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'Path required' });
  }

  const resolved = sandboxPath(filePath);
  if (!resolved) {
    return res.status(403).json({ error: 'Access denied: path is outside the allowed directory' });
  }

  fs.stat(resolved, (err, stat) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }

    const mimeType = stat.isDirectory() ? 'inode/directory' : (mime.lookup(resolved) || 'application/octet-stream');
    res.json({
      name: path.basename(resolved),
      path: resolved,
      isDirectory: stat.isDirectory(),
      size: stat.size,
      modified: stat.mtime,
      created: stat.birthtime,
      accessed: stat.atime,
      permissions: '0' + (stat.mode & parseInt('777', 8)).toString(8),
      mimeType,
      isText: !stat.isDirectory() && (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/javascript' || !isBinaryFile(resolved)),
      isHidden: path.basename(resolved).startsWith('.')
    });
  });
});

// API: Read file content (for preview - text files only, limited size)
router.get('/preview', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'Path required' });
  }

  const resolved = sandboxPath(filePath);
  if (!resolved) {
    return res.status(403).json({ error: 'Access denied: path is outside the allowed directory' });
  }

  const mimeType = mime.lookup(resolved) || 'application/octet-stream';
  const isText = mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/javascript' || mimeType === 'application/xml' || !isBinaryFile(resolved);

  // Only preview text files and images
  if (isText) {
    fs.stat(resolved, (err, stat) => {
      if (err) return res.status(404).json({ error: 'File not found' });
      // Limit preview to 1MB
      if (stat.size > 1024 * 1024) {
        return res.json({ type: 'text', content: null, truncated: true, size: stat.size });
      }
      fs.readFile(resolved, 'utf8', (err, data) => {
        if (err) return res.status(403).json({ error: 'Cannot read file' });
        res.json({ type: 'text', content: data, truncated: false, size: stat.size, mimeType });
      });
    });
  } else if (mimeType.startsWith('image/')) {
    // Serve image directly
    res.sendFile(resolved);
  } else {
    res.json({ type: 'binary', content: null, mimeType, message: 'Preview not available for this file type' });
  }
});

// API: Get sidebar info — top-level folders in ROOT_DIR
router.get('/sidebar', (req, res) => {
  try {
    const entries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });
    const folders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: path.join(ROOT_DIR, entry.name),
        icon: 'folder',
        isHidden: entry.name.startsWith('.')
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    res.json({
      rootDir: ROOT_DIR,
      rootName: path.basename(ROOT_DIR) || ROOT_DIR,
      folders
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read root directory' });
  }
});

// API: Search files
router.get('/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase();
  const searchPath = req.query.path || ROOT_DIR;
  const results = [];
  const maxResults = 50;
  const maxDepth = 4;

  if (!query) {
    return res.json({ results: [] });
  }

  // Sandbox the search path
  const resolvedSearchPath = sandboxPath(searchPath);
  if (!resolvedSearchPath) {
    return res.status(403).json({ error: 'Access denied: path is outside the allowed directory' });
  }

  function searchDir(dir, depth) {
    if (depth > maxDepth || results.length >= maxResults) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxResults) break;
        // Don't skip hidden files for search anymore

        const fullPath = path.join(dir, entry.name);
        if (entry.name.toLowerCase().includes(query)) {
          try {
            const stat = fs.statSync(fullPath);
            results.push({
              name: entry.name,
              path: fullPath,
              isDirectory: stat.isDirectory(),
              size: stat.size,
              modified: stat.mtime,
              mimeType: stat.isDirectory() ? 'inode/directory' : (mime.lookup(entry.name) || 'application/octet-stream'),
              isHidden: entry.name.startsWith('.')
            });
          } catch (e) { /* skip */ }
        }

        if (entry.isDirectory()) {
          try { searchDir(fullPath, depth + 1); } catch (e) { /* skip */ }
        }
      }
    } catch (e) { /* skip */ }
  }

  searchDir(resolvedSearchPath, 0);
  res.json({ results, query, searchPath: resolvedSearchPath });
});

// API: Download a file
router.get('/download', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: 'Path required' });
  }

  const resolved = sandboxPath(filePath);
  if (!resolved) {
    return res.status(403).json({ error: 'Access denied: path is outside the allowed directory' });
  }

  fs.stat(resolved, (err, stat) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (stat.isDirectory()) {
      return res.status(400).json({ error: 'Cannot download a directory' });
    }

    const filename = path.basename(resolved);
    const mimeType = mime.lookup(resolved) || 'application/octet-stream';

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(resolved);
    stream.on('error', (err) => {
      res.status(500).json({ error: 'Failed to read file' });
    });
    stream.pipe(res);
  });
});

// API: Create new folder
router.post('/mkdir', (req, res) => {
  const targetPath = req.body.path || req.query.path || ROOT_DIR;
  const folderName = req.body.name || req.query.name;

  if (!folderName) {
    return res.status(400).json({ error: 'Folder name required' });
  }

  const resolved = sandboxPath(targetPath);
  if (!resolved) {
    return res.status(403).json({ error: 'Access denied: path is outside the allowed directory' });
  }

  const newDirPath = path.join(resolved, folderName);
  
  if (!sandboxPath(newDirPath)) {
     return res.status(403).json({ error: 'Invalid folder name' });
  }

  fs.mkdir(newDirPath, { recursive: false }, (err) => {
    if (err) {
      if (err.code === 'EEXIST') {
        return res.status(409).json({ error: 'Folder already exists' });
      }
      return res.status(500).json({ error: 'Failed to create folder: ' + err.message });
    }
    res.json({ success: true, name: folderName, path: newDirPath });
  });
});

// API: Upload files to a directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = req.body.path || req.query.path || ROOT_DIR;
    const resolved = sandboxPath(uploadPath);
    if (!resolved) {
      return cb(new Error('Access denied: upload path is outside the allowed directory'));
    }

    // Ensure directory exists
    fs.access(resolved, fs.constants.W_OK, (err) => {
      if (err) {
        cb(new Error('Cannot write to directory: ' + resolved));
      } else {
        cb(null, resolved);
      }
    });
  },
  filename: (req, file, cb) => {
    // Use original filename; if it already exists, add a suffix
    const resolved = sandboxPath(req.body.path || req.query.path || ROOT_DIR) || ROOT_DIR;
    const originalName = file.originalname;
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    let finalName = originalName;
    let counter = 1;

    // Check if file exists and auto-rename if needed
    while (fs.existsSync(path.join(resolved, finalName))) {
      finalName = `${base} (${counter})${ext}`;
      counter++;
    }
    cb(null, finalName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB max per file
  }
});

router.post('/upload', upload.array('files', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const uploaded = req.files.map(f => ({
    name: f.filename,
    originalName: f.originalname,
    size: f.size,
    path: f.path,
    mimeType: f.mimetype
  }));

  res.json({
    success: true,
    count: uploaded.length,
    files: uploaded,
    directory: req.body.path || req.query.path || ROOT_DIR
  });
});

// Handle multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large (max 10GB)' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

// API: Rename a file or folder
router.post('/rename', (req, res) => {
  const { oldPath, newName } = req.body;

  if (!oldPath || !newName) {
    return res.status(400).json({ error: 'Source path and new name required' });
  }

  const resolvedOld = sandboxPath(oldPath);
  if (!resolvedOld) {
    return res.status(403).json({ error: 'Access denied: source path is outside the allowed directory' });
  }

  const parentDir = path.dirname(resolvedOld);
  const resolvedNew = sandboxPath(path.join(parentDir, newName));

  if (!resolvedNew) {
    return res.status(403).json({ error: 'Access denied: invalid new name' });
  }

  fs.rename(resolvedOld, resolvedNew, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to rename: ' + err.message });
    }
    res.json({ success: true, oldPath: resolvedOld, newPath: resolvedNew });
  });
});

// API: Delete a file or folder
router.post('/delete', (req, res) => {
  const { path: targetPath } = req.body;

  if (!targetPath) {
    return res.status(400).json({ error: 'Path required' });
  }

  const resolved = sandboxPath(targetPath);
  if (!resolved) {
    return res.status(403).json({ error: 'Access denied: path is outside the allowed directory' });
  }

  if (resolved === ROOT_DIR) {
    return res.status(403).json({ error: 'Cannot delete the root directory' });
  }

  fs.rm(resolved, { recursive: true, force: true }, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete: ' + err.message });
    }
    res.json({ success: true, path: resolved });
  });
});

// API: Create a new empty file
router.post('/create-file', (req, res) => {
  const { path: targetPath, name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'File name required' });
  }

  const resolved = sandboxPath(targetPath || ROOT_DIR);
  if (!resolved) {
    return res.status(403).json({ error: 'Access denied: path is outside the allowed directory' });
  }

  const newFilePath = path.join(resolved, name);
  
  if (!sandboxPath(newFilePath)) {
    return res.status(403).json({ error: 'Invalid file name' });
  }

  if (fs.existsSync(newFilePath)) {
    return res.status(409).json({ error: 'File already exists' });
  }

  fs.writeFile(newFilePath, '', (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to create file: ' + err.message });
    }
    res.json({ success: true, name, path: newFilePath });
  });
});

// API: Save file content
router.post('/save', (req, res) => {
  const { path: filePath, content } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'Path required' });
  }

  const resolved = sandboxPath(filePath);
  if (!resolved) {
    return res.status(403).json({ error: 'Access denied: path is outside the allowed directory' });
  }

  // Double check it's a file
  fs.stat(resolved, (err, stats) => {
    if (err) return res.status(404).json({ error: 'File not found' });
    if (stats.isDirectory()) return res.status(400).json({ error: 'Cannot save to a directory' });

    fs.writeFile(resolved, content, 'utf8', (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to save file: ' + err.message });
      }
      res.json({ success: true, path: resolved });
    });
  });
});

module.exports = router;
