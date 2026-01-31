# 🏗️ System Architecture: Real-Time Collaborative Canvas

This document outlines the high-level architecture, data flows, and design decisions behind the Collaborative Drawing Canvas.

## 1. High-Level Overview

The system follows a **Client-Server Architecture** using **WebSockets** for persistent, bidirectional communication.

* **The Client (Frontend):** A React application that handles user input (mouse/touch), renders graphics on an HTML5 Canvas, and optimistically updates the UI for zero-latency drawing.
* **The Server (Backend):** A Node.js server acting as the "Single Source of Truth." It broadcasts actions to all connected clients and maintains the global drawing history to support new users and synchronization.

---

## 2. Tech Stack & Decision Rationale

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React + Vite | Fast development, efficient DOM updates for the UI (Toolbar/Sidebar), and easy state management. |
| **Graphics** | HTML5 Canvas API | Native browser API for high-performance raster graphics. Chosen over SVG for better performance with thousands of strokes. |
| **Backend** | Node.js + Express | Non-blocking I/O is ideal for handling concurrent WebSocket connections. |
| **Real-Time** | Socket.io | Provides robust fallback (if WebSockets fail), automatic reconnection logic, and "Room/Broadcast" primitives that simplify coding. |

---

## 3. Data Flow Architecture

### The "Draw" Lifecycle
1.  **Input:** User A clicks and drags the mouse.
2.  **Local Render:** The frontend immediately draws the line on User A's canvas (Zero Latency).
3.  **Normalization:** Coordinates are converted from pixels to a relative percentage (0.0 to 1.0) based on screen size.
4.  **Transmission:** Client emits `draw-line` event with payload `{ x0, y0, x1, y1, color, width }` to the server.
5.  **Storage:** Server pushes this action into the global `drawingHistory` array.
6.  **Broadcast:** Server sends the data to User B, User C, etc.
7.  **Remote Render:** User B receives the event, denormalizes coordinates (multiplies by their screen size), and draws the line.

---

## 4. Key Algorithms & Logic

### A. Coordinate Normalization (Responsive Canvas)
To ensure the drawing looks the same on a Phone and a Desktop, we do not send raw pixel coordinates.

* **Sending (Client A):**
    $$x_{server} = \frac{x_{mouse}}{width_{canvas}}$$
* **Receiving (Client B):**
    $$x_{render} = x_{server} \times width_{canvas}$$

### B. Conflict-Free Undo
We implement a "User-Specific" global undo. A simple `pop()` would destroy other users' work.

* **Logic:**
    1.  Server iterates backwards through `drawingHistory`.
    2.  Finds the first action where `action.id === requestingUser.id`.
    3.  Removes that action.
    4.  Broadcasts `clear-canvas` + `initial-history` to all clients to force a re-render.

### C. Ghost Cursors (Presence)
* **Logic:** Mouse movement events (`mousemove`) are throttled (naturally by network speed) and sent to the server.
* **Rendering:** The frontend maintains a dictionary of cursors `{ [userId]: {x, y, color} }`. These are rendered as HTML DOM elements (`<div>`) floating *above* the canvas, not drawn *on* the canvas, to avoid clearing/redrawing the entire canvas just for cursor movement.

---

## 5. API Reference (Socket Events)

### Client $\to$ Server

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `draw-line` | `{ x0, y0, x1, y1, color, width }` | A stroke segment was drawn. |
| `cursor-move` | `{ x, y }` | Current mouse/touch position. |
| `undo` | `null` | Request to undo the last action. |
| `redo` | `null` | Request to redo the last undone action. |

### Server $\to$ Client

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `initial-history` | `Array<LineObject>` | Sent immediately upon connection to sync state. |
| `draw-line` | `{ ...LineObject, id }` | A new line drawn by another user. |
| `cursor-update` | `{ id, x, y, name, color }` | Updates position of a remote user. |
| `update-users` | `Array<User>` | List of currently connected users. |
| `clear-canvas` | `null` | Command to wipe the canvas (usually before a history sync). |

---

## 6. Frontend State Management Strategy

We utilize a hybrid approach to manage state in React:

1.  **React State (`useState`):** Used for **UI elements only**.
    * Current Color, Line Width, Tool (Brush/Eraser), User List.
    * *Why?* Changing these should trigger a UI re-render.

2.  **React Refs (`useRef`):** Used for **Canvas & Drawing Logic**.
    * `isDrawing`, `currentPath`, `historyRef`.
    * *Why?* Mouse movement happens 60 times a second. Triggering a React State update 60 times a second would cause massive lag. Refs allow us to mutate data without triggering a component re-render.

---

## 7. Future Scalability Considerations

* **Rooms:** Currently, all users share one "Global" room. To scale, we would use `socket.join('roomID')` to separate groups.
* **Redis Adapter:** To scale the backend across multiple Node.js processes, we would need Redis to pass messages between different server instances.
* **Canvas Optimization:** For extremely long sessions, re-rendering the whole history array on Undo becomes slow. Implementation of "Chunking" or saving the canvas as a static image (bitmap) periodically would solve this.