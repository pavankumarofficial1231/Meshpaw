import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { MousePointer2, Eraser, Pen, Download, RefreshCcw } from 'lucide-react';

interface Point { x: number; y: number }
interface Stroke {
  id: string;
  points: Point[];
  color: string;
  thickness: number;
}

interface MeshCanvasProps {
  roomHash: string;
  incomingUpdates: Uint8Array[];
  broadcastUpdate: (b64Update: string) => void;
  onClose?: () => void;
}

export const MeshCanvas: React.FC<MeshCanvasProps> = ({ roomHash, incomingUpdates, broadcastUpdate, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const ystrokesRef = useRef<Y.Map<Stroke> | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeId = useRef<string | null>(null);
  const [color, setColor] = useState('#10b981'); // Emerald 500
  const [thickness, setThickness] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  
  const localStrokesRef = useRef<Map<string, Stroke>>(new Map());

  // Init Yjs
  useEffect(() => {
    ydocRef.current = new Y.Doc();
    ystrokesRef.current = ydocRef.current.getMap<Stroke>(`canvas-${roomHash}`);

    ydocRef.current.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== 'remote') {
        const b64 = btoa(String.fromCharCode.apply(null, update as any));
        broadcastUpdate(b64);
      }
    });

    ystrokesRef.current.observe(() => {
      if (ystrokesRef.current) {
        // Sync local cache and redraw
        localStrokesRef.current = new Map(Object.entries(ystrokesRef.current.toJSON()));
        drawAll();
      }
    });

    return () => {
      ydocRef.current?.destroy();
    };
  }, [roomHash]);

  // Apply remote updates
  useEffect(() => {
    if (incomingUpdates.length > 0 && ydocRef.current) {
      const latestUpdate = incomingUpdates[incomingUpdates.length - 1];
      Y.applyUpdate(ydocRef.current, latestUpdate, 'remote');
    }
  }, [incomingUpdates]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setCanvasSize({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redraw when size changes
  useEffect(() => {
    drawAll();
  }, [canvasSize]);

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    localStrokesRef.current.forEach((stroke) => {
      if (stroke.points.length === 0) return;
      
      // If it's the eraser stroke, we draw it using destination-out to actually erase pixels visually
      // Or simply draw background color if we want basic eraser (since background is transparent, destination-out is better)
      if (stroke.color === 'erase') {
         ctx.globalCompositeOperation = 'destination-out';
         ctx.lineWidth = stroke.thickness * 3;
         ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
         ctx.globalCompositeOperation = 'source-over';
         ctx.lineWidth = stroke.thickness;
         ctx.strokeStyle = stroke.color;
      }

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
    
    ctx.globalCompositeOperation = 'source-over'; // reset
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent | React.MouseEvent).clientX;
      clientY = (e as MouseEvent | React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    // e.preventDefault();
    const pos = getPos(e);
    if (!pos || !ystrokesRef.current || !ydocRef.current) return;

    setIsDrawing(true);
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    currentStrokeId.current = id;

    const stroke: Stroke = {
      id,
      points: [pos],
      color: isEraser ? 'erase' : color,
      thickness
    };

    ydocRef.current.transact(() => {
      ystrokesRef.current?.set(id, stroke);
    });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentStrokeId.current || !ystrokesRef.current || !ydocRef.current) return;
    const pos = getPos(e);
    if (!pos) return;

    ydocRef.current.transact(() => {
      const existing = ystrokesRef.current?.get(currentStrokeId.current!);
      if (existing) {
        // Copy to mutate to trigger Yjs update correctly
        const newStroke = { ...existing };
        newStroke.points = [...newStroke.points, pos];
        ystrokesRef.current?.set(currentStrokeId.current!, newStroke);
      }
    });
  };

  const endDraw = () => {
    setIsDrawing(false);
    currentStrokeId.current = null;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/40 backdrop-blur-3xl relative">
      <div className="w-full bg-zinc-900 border-b border-white/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Mesh Canvas (CRDT)</h2>
          <p className="text-xs text-zinc-400 font-medium">
            Real-time peer-to-peer wireframing. Draw together without servers.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-xl border border-white/5 overflow-x-auto">
           <button onClick={() => setIsEraser(false)} className={`p-2 rounded-lg transition-colors ${!isEraser ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>
             <Pen className="w-4 h-4" />
           </button>
           <button onClick={() => setIsEraser(true)} className={`p-2 rounded-lg transition-colors ${isEraser ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>
             <Eraser className="w-4 h-4" />
           </button>
           
           <div className="w-px h-6 bg-zinc-800 mx-1"></div>
           
           {['#10b981', '#f43f5e', '#3b82f6', '#eab308', '#ffffff'].map(c => (
              <button 
                key={c}
                onClick={() => { setColor(c); setIsEraser(false); }}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c && !isEraser ? 'scale-110 border-white' : 'border-transparent hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
           ))}

           <div className="w-px h-6 bg-zinc-800 mx-1"></div>

           <button 
             onClick={() => {
               if (ydocRef.current && ystrokesRef.current) {
                 ydocRef.current.transact(() => {
                   const keys = Array.from(ystrokesRef.current!.keys());
                   keys.forEach(k => ystrokesRef.current!.delete(k));
                 });
               }
             }}
             className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
           >
             <RefreshCcw className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 w-full relative overflow-hidden touch-none" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(16,185,129,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
         <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h || 600}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            className={`w-full h-full bg-transparent cursor-${isEraser ? 'crosshair' : 'crosshair'} touch-none`}
         />
      </div>
    </div>
  );
};
