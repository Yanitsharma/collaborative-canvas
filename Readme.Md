🎨 Real-Time Collaborative Drawing Canvas
A full-stack web application that allows multiple users to draw on a shared whiteboard simultaneously. Features real-time synchronization, user presence indicators (ghost cursors), and global undo/redo functionality. Built with React, Node.js, and Socket.io.

✨ Features
Real-Time Collaboration: Drawings appear on all connected screens instantly.

Multi-User Presence: See where other users are pointing with "Ghost Cursors" (Pencil Icon + Name Tag).

Drawing Tools:

🖌️ Brush: Smooth freehand drawing with custom colors.

🧼 Eraser: Remove parts of the drawing.

📏 Line Width: Adjustable stroke thickness.

Smart State Management:

Global Undo/Redo: Undo your last stroke without removing others' work.

History Sync: New users immediately receive the full drawing history upon joining.

User Management:

Auto-assigned unique User IDs and colors.

Sidebar showing a list of currently active users.

Responsive & Mobile Friendly: Works on desktops, tablets, and mobile phones over local Wi-Fi.

🛠️ Tech Stack
Frontend: React.js (Vite), HTML5 Canvas API, CSS3

Backend: Node.js, Express

Real-Time Communication: Socket.io (WebSockets)

🚀 Getting Started
Follow these instructions to set up the project on your local machine.

Prerequisites
Node.js (v14 or higher)

npm (Node Package Manager)

1. Installation
Clone the repository (or create the folder structure):

Bash
mkdir collab-canvas
cd collab-canvas
Set up the Backend (Server):

Bash
cd server
npm init -y
npm install express socket.io cors
Set up the Frontend (Client):

Bash
cd ../client
npm create vite@latest . -- --template react
npm install
npm install socket.io-client
2. Configuration
Enable Mobile/Network Access: Update client/package.json to allow network access:

JSON
"scripts": {
  "dev": "vite --host", 
  "build": "vite build",
  ...
}
🏃‍♂️ How to Run
You need to run the Backend and Frontend in two separate terminals.

Terminal 1: Start the Backend
Bash
cd server
node index.js
You should see: ✅ Server running on port 3001

Terminal 2: Start the Frontend
Bash
cd client
npm run dev
You should see:

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
📱 Testing on Mobile (Local Wi-Fi)
Ensure your computer and mobile phone are connected to the same Wi-Fi network.

Look at the Network URL shown in your Frontend terminal (e.g., http://192.168.1.5:5173).

Open that exact URL in your mobile browser.

Start drawing! You will see the strokes appear on your computer instantly.

📂 Project Structure
Plaintext
collaborative-canvas/
├── server/
│   ├── index.js         # Main server entry point (Socket.io logic)
│   └── package.json     # Backend dependencies
└── client/
    ├── src/
    │   ├── App.jsx      # Main React component (Canvas & UI logic)
    │   ├── App.css      # Styling for Toolbar, Sidebar, and Cursors
    │   └── main.jsx     # React entry point
    ├── index.html       # HTML template
    └── package.json     # Frontend dependencies
├── Readme.Md

🧠 Key Logic Explanation
1. Conflict-Free Undo
Instead of a simple array.pop(), the server tracks which user created which line. When you click Undo:

The server finds the last action matching your socket.id.

It removes that specific action from the history array.

It broadcasts a clear-canvas event followed by the updated initial-history to all users to re-render the board correctly.

2. Coordinate Normalization
To ensure drawings look correct on different screen sizes (Mobile vs Desktop):

Sending: Coordinates are divided by screen width/height (normalized to 0-1 range). x = mouseX / windowWidth

Receiving: Coordinates are multiplied by the local screen width/height. drawX = x * windowWidth