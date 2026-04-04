# 🗂️ WebFiles — macOS-Style File Explorer

WebFiles is a premium, web-based file management system inspired by the macOS Finder interface. It provides a seamless, responsive, and aesthetically pleasing way to browse, manage, and edit files on your server directly from any web browser.

![WebFiles Preview](https://raw.githubusercontent.com/vatlnetwork/web-file-manager/refs/heads/main/assets/preview.png)

## ✨ Features

- ** macOS Experience**: A beautiful, fluid interface featuring glassmorphism, dynamic animations, and authentic macOS-style icons.
- **📂 Full File Management**: Create, rename, move, and delete files and folders with ease.
- **📤 Batch Uploads**: Supports drag-and-drop and batch processing for uploading large files (up to 10GB).
- **📝 Built-in Editor**: Edit text-based files (HTML, JS, CSS, JSON, etc.) directly in the browser with an integrated code editor.
- **🔍 Quick Search**: Powerful recursive search to find files across your entire project instantly.
- **🖼️ Media Preview**: Integrated image viewer and text file previews.
- **🔒 Secure by Design**:
  - **Directory Sandboxing**: Restricts access to a specific root directory (cannot escape via `../`).
  - **Basic Authentication**: Optional password protection for your file server.
- **🌓 Responsive Design**: Works perfectly on desktops, tablets, and mobile devices.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14.0.0 or higher)
- npm (usually comes with Node.js)

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/vatlnetwork/web-file-manager.git
   cd web-file-manager
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure Authentication (Optional)**:
   Create a text file (e.g., `auth.txt`) with the username on the first line and the password on the second line.

4. **Start the server**:
   ```bash
   npm start -- --auth auth.txt
   ```

The server will start on `http://localhost:3000` by default.

## ⚙️ Configuration

WebFiles can be configured via environment variables or command-line arguments:

- `PORT`: The port the server will listen on (default: `3000`).
- `ROOT_DIR`: The directory you want to explore (default: current directory).
- `--auth <file>`: (CLI Argument) Path to a file containing username (line 1) and password (line 2).

Example starting on a custom directory with authentication:

```bash
ROOT_DIR=/home/user/documents npm start -- --auth /path/to/my_auth.txt
```

## 🛠️ Project Structure

- `server.js`: Main Express server entry point.
- `public/`: Frontend assets (HTML, CSS, JS).
  - `js/`: Modular JavaScript components (API, UI, State management).
  - `styles/`: CSS modules for layout and aesthetics.
- `routes/`: Backend API endpoints for file operations.
- `middleware/`: Auth and safety middleware.
- `utils/`: Path utilities and sandboxing logic.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Bugs

- **Sidebar Refresh**: Creating a new folder at the root level of the hosted directory doesn't automatically update the sidebar tree.
- **Backspace Navigation**: Attempting to use the backspace key within the "New File" or "New Folder" modals triggers the back navigation, moving the interface one directory back instead of deleting a character.

---

_Built with ❤️ to bring the desktop experience to the web._
