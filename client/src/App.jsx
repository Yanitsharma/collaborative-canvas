import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './App.css';

// Initialize Socket outside component
const socket = io(`https://collaborative-canvas-uhle.onrender.com/`);

function App() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  
  // Local history to handle window resizing without losing drawings
  const historyRef = useRef([]);

  const [tool, setTool] = useState('brush'); 
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [users, setUsers] = useState([]);
  const [cursors, setCursors] = useState({});

  const isDrawing = useRef(false);
  const currentPath = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;

    // --- Resize Logic ---
    const redrawCanvas = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        historyRef.current.forEach(item => {
             drawLine(
                 item.x0 * canvas.width, 
                 item.y0 * canvas.height, 
                 item.x1 * canvas.width, 
                 item.y1 * canvas.height, 
                 item.color, 
                 item.width, 
                 false
             );
        });
    };

    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        redrawCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // --- Socket Listeners ---
    
    socket.on('connect', () => {
        console.log("🟢 Connected to Server with ID:", socket.id);
    });

    socket.on('draw-line', (data) => {
      // DEBUG: Check console if this prints when other user draws
      // console.log("Incoming drawing:", data); 
      
      historyRef.current.push(data);
      if (ctxRef.current) {
          drawLine(
              data.x0 * canvas.width, 
              data.y0 * canvas.height, 
              data.x1 * canvas.width, 
              data.y1 * canvas.height, 
              data.color, 
              data.width, 
              false
          );
      }
    });

    socket.on('initial-history', (history) => {
      historyRef.current = history;
      redrawCanvas();
    });

    socket.on('clear-canvas', () => {
      historyRef.current = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    socket.on('update-users', setUsers);
    
    socket.on('cursor-update', (data) => {
      setCursors(prev => ({ ...prev, [data.id]: data }));
    });

    socket.on('user-disconnected', (id) => {
      setCursors(prev => {
          const newCursors = { ...prev };
          delete newCursors[id];
          return newCursors;
      });
    });

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      socket.off('connect');
      socket.off('draw-line');
      socket.off('initial-history');
      socket.off('clear-canvas');
      socket.off('update-users');
      socket.off('cursor-update');
      socket.off('user-disconnected');
    };
  }, []);

  // --- Helper Functions ---

  const drawLine = (x0, y0, x1, y1, color, width, emit) => {
    if (!ctxRef.current) return;
    
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x0, y0);
    ctxRef.current.lineTo(x1, y1);
    ctxRef.current.strokeStyle = color;
    ctxRef.current.lineWidth = width;
    ctxRef.current.stroke();
    ctxRef.current.closePath();

    if (!emit) return;

    const canvas = canvasRef.current;
    
    // Normalize coordinates (0-1) so it works on all screen sizes
    const data = {
      x0: x0 / canvas.width,
      y0: y0 / canvas.height,
      x1: x1 / canvas.width,
      y1: y1 / canvas.height,
      color: color,
      width: width
    };
    
    historyRef.current.push(data);
    socket.emit('draw-line', data);
  };

  const startDrawing = (e) => {
    isDrawing.current = true;
    currentPath.current = { x: e.clientX, y: e.clientY };
  };

  const draw = (e) => {
    socket.emit('cursor-move', { x: e.clientX, y: e.clientY });

    if (!isDrawing.current) return;

    // Use background color for Eraser
    const activeColor = tool === 'eraser' ? '#f9f9f9' : color;

    drawLine(
        currentPath.current.x, 
        currentPath.current.y, 
        e.clientX, 
        e.clientY, 
        activeColor, 
        lineWidth, 
        true
    );
    
    currentPath.current = { x: e.clientX, y: e.clientY };
  };

  const stopDrawing = () => {
      isDrawing.current = false;
  };

  return (
    <div className="App">
      {/* Sidebar */}
      <div className="sidebar">
        <h3>Online Users</h3>
        <ul>
            {users.map((u) => (
                <li key={u.id} style={{color: u.color}}>
                    <span className="dot" style={{backgroundColor: u.color}}></span> 
                    {u.name} {u.id === socket.id ? '(You)' : ''}
                </li>
            ))}
        </ul>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="tool-group">
            <button className={tool === 'brush' ? 'active' : ''} onClick={() => setTool('brush')}>🖌️ Brush</button>
            <button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')}>🧼 Eraser</button>
        </div>
        
        {tool === 'brush' && (
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        )}
        
        <input type="range" min="1" max="20" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} />
        
        <div className="actions">
            <button onClick={() => socket.emit('undo')}>Undo</button>
            <button onClick={() => socket.emit('redo')}>Redo</button>
        </div>
      </div>

      {/* Ghost Cursors */}
      {Object.keys(cursors).map(userId => (
           <div key={userId} className="cursor-container" style={{ transform: `translate(${cursors[userId].x}px, ${cursors[userId].y}px)` }}>
             <div className="cursor-icon">✏️</div>
             <div className="cursor-label" style={{ backgroundColor: cursors[userId].color }}>
                {cursors[userId].name}
             </div>
           </div>
      ))}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className={tool === 'eraser' ? 'cursor-eraser' : 'cursor-brush'}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        onMouseOut={stopDrawing}
      />
    </div>
  );
}

export default App;