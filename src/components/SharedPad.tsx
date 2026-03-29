import React, { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { Wifi, Shield, X, Send } from 'lucide-react';

interface SharedPadProps {
  myId: string;
  roomHash: string;
  incomingUpdates: Uint8Array[]; 
  broadcastUpdate: (b64Update: string) => void;
  onClose?: () => void;
}

export const SharedPad: React.FC<SharedPadProps> = ({ roomHash, incomingUpdates, broadcastUpdate, onClose }) => {
  const [content, setContent] = useState('');
  const ydocRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Yjs Document with optimized sync logic
  useEffect(() => {
    ydocRef.current = new Y.Doc();
    ytextRef.current = ydocRef.current.getText(`pad-${roomHash}`);

    ydocRef.current.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== 'remote') {
        try {
          const b64 = btoa(String.fromCharCode.apply(null, update as any));
          broadcastUpdate(b64);
        } catch (e) {
          console.error("CRDT Broadcast Fail:", e);
        }
      }
    });

    ytextRef.current.observe(() => {
      if (ytextRef.current) {
         setContent(ytextRef.current.toString());
      }
    });

    return () => {
      ydocRef.current?.destroy();
    };
  }, [roomHash]);

  // Apply incoming remote updates from other nodes
  useEffect(() => {
    if (incomingUpdates.length > 0) {
      const latestUpdate = incomingUpdates[incomingUpdates.length - 1];
      if (latestUpdate && ydocRef.current) {
        Y.applyUpdate(ydocRef.current, latestUpdate, 'remote');
      }
    }
  }, [incomingUpdates]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!ytextRef.current || !ydocRef.current) return;
    
    const newText = e.target.value;
    const currentText = ytextRef.current.toString();
    
    ydocRef.current.transact(() => {
       if (ytextRef.current) {
         ytextRef.current.delete(0, currentText.length);
         ytextRef.current.insert(0, newText);
       }
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/20 backdrop-blur-3xl relative">
      {/* Educational Header Layer */}
      <div className="w-full bg-zinc-900 border-b border-white/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Live Workspace (CRDT)</h2>
          <p className="text-xs text-zinc-400 font-medium">
            Everything you type here is instantly synced peer-to-peer with everyone in the room. No central server stores this document.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-400">
              <Wifi className="w-3 h-3" /> P2P SYNCED
           </div>
           {onClose && (
             <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors">
               <X className="w-4 h-4" />
             </button>
           )}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative p-6">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          spellCheck={false}
          placeholder="// Start typing to collaborate... e.g. meeting notes, shared lists, or code snippets."
          className="flex-1 w-full h-full bg-transparent text-zinc-100 focus:outline-none resize-none font-mono text-lg leading-relaxed placeholder:text-zinc-600 selection:bg-emerald-500/30"
        />

        <div className="absolute bottom-4 right-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
           <span>Chars: {content.length}</span>
           <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
           <span>Room: {roomHash.substring(0,8)}</span>
        </div>
      </div>
    </div>
  );
};
