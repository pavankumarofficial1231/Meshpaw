import React, { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';

interface SharedPadProps {
  myId: string;
  roomHash: string;
  incomingUpdates: Uint8Array[]; // Pushed updates from App.tsx
  broadcastUpdate: (b64Update: string) => void;
}

export const SharedPad: React.FC<SharedPadProps> = ({ myId, roomHash, incomingUpdates, broadcastUpdate }) => {
  const [content, setContent] = useState('');
  const ydocRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);

  // Initialize Yjs Document
  useEffect(() => {
    ydocRef.current = new Y.Doc();
    ytextRef.current = ydocRef.current.getText(roomHash);

    ydocRef.current.on('update', (update: Uint8Array, origin: any) => {
      // If we made the change locally, broadcast it
      if (origin !== 'remote') {
        const b64 = btoa(String.fromCharCode.apply(null, update as any));
        broadcastUpdate(b64);
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

  // Apply incoming remote updates
  useEffect(() => {
    if (incomingUpdates.length > 0) {
      const latestUpdate = incomingUpdates[incomingUpdates.length - 1];
      if (ydocRef.current && latestUpdate) {
        Y.applyUpdate(ydocRef.current, latestUpdate, 'remote');
      }
    }
  }, [incomingUpdates]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!ytextRef.current || !ydocRef.current) return;
    const newText = e.target.value;
    const currentText = ytextRef.current.toString();
    const currentLength = currentText.length;
    
    // Very naive sync for simple text editor POC
    ydocRef.current.transact(() => {
       if (ytextRef.current) {
         ytextRef.current.delete(0, currentLength);
         ytextRef.current.insert(0, newText);
       }
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
           MeshPad {roomHash === 'GLOBAL' ? '(Global)' : `(#${roomHash.substring(0, 8)})`}
        </h2>
        <p className="text-zinc-500 text-xs mt-1">Conflict-Free Replicated Data Type (CRDT) document synced over P2P mesh.</p>
      </div>
      
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Start typing... everyone in the mesh sees this live."
        className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:outline-none focus:ring-1 focus:border-emerald-500/50 resize-none font-mono text-sm leading-relaxed"
      />
    </div>
  );
};
