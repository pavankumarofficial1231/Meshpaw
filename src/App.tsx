/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Send, 
  Wifi, 
  WifiOff, 
  Users, 
  QrCode, 
  Plus, 
  X,
  PawPrint,
  Menu,
  MessageSquare,
  Search,
  SmilePlus,
  Download,
  ScanLine,
  Radar,
  Star
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { generateKeys, KeyPair } from './lib/crypto';
import { hasSeenMessage, markMessageSeen, queueMessage, getQueuedMessages, removeQueuedMessage, loadFriends, saveFriend, removeFriend, FriendNode } from './lib/store';

// Types
interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isMine: boolean;
  reactions?: Record<string, string[]>;
}

interface PeerStat {
  latency: number;
  lastSeen: number;
}

const ADJECTIVES = ['Sugary', 'Spicy', 'Crispy', 'Crunchy', 'Salty', 'Sweet', 'Sour', 'Toasted', 'Glazed', 'Fried', 'Cheesy', 'Melted', 'Jolly', 'Sizzling', 'Buttery', 'Frosted', 'Sticky', 'Gooey', 'Bubbly', 'Zesty'];
const NOUNS = ['Bites', 'Tacos', 'Pickles', 'Donuts', 'Bacon', 'Noodles', 'Waffles', 'Burgers', 'Pancakes', 'Burritos', 'Sushi', 'Muffins', 'Biscuits', 'Cookies', 'Pretzels', 'Cupcakes', 'Fries', 'Snacks', 'Nuggets', 'Pizzas'];
const AVATARS = ['🐶', '😸', '🐼', '🦊', '🐷', '🐸', '🦄', '👾', '👻', '🍕'];

const generateFoodName = (id: string) => {
  if (!id) return 'Unknown Food';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const adjIndex = Math.abs(hash) % ADJECTIVES.length;
  const nounIndex = Math.abs(hash * 3) % NOUNS.length;
  
  return `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`;
};

const generateAvatar = (id: string) => {
  if (!id) return '👽';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
};

const MeshLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="opacity-20" />
    <path d="M50 35C45.5817 35 42 38.5817 42 43C42 47.4183 45.5817 51 50 51C54.4183 51 58 47.4183 58 43C58 38.5817 54.4183 35 50 35Z" fill="currentColor" />
    <path d="M30 50C25.5817 50 22 53.5817 22 58C22 62.4183 25.5817 66 30 66C34.4183 66 38 62.4183 38 58C38 54.4183 34.4183 50 30 50Z" fill="currentColor" />
    <path d="M70 50C65.5817 50 62 53.5817 62 58C62 62.4183 65.5817 66 70 66C74.4183 66 78 62.4183 78 58C78 54.4183 74.4183 50 70 50Z" fill="currentColor" />
    <path d="M50 65C40 65 30 72 30 80C30 84.4183 33.5817 88 38 88H62C66.4183 88 70 84.4183 70 80C70 72 60 65 50 65Z" fill="currentColor" />
    <path d="M50 15L50 30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
    <path d="M20 30L35 45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
    <path d="M80 30L65 45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
  </svg>
);

export default function App() {
  const [myId, setMyId] = useState<string>('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<Map<string, DataConnection>>(new Map());
  const [peerStats, setPeerStats] = useState<Map<string, PeerStat>>(new Map());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connectId, setConnectId] = useState('');
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  
  // UI States
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReactionMsg, setActiveReactionMsg] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [hasDismissedInstall, setHasDismissedInstall] = useState(false);
  
  // Update state if window size changes
  useEffect(() => {
    const checkSize = () => {
      if (window.innerWidth >= 768) setShowSidebar(true);
    };
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  const [showScanner, setShowScanner] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [pendingPeerPrompt, setPendingPeerPrompt] = useState<string | null>(null);
  const [viewPeerInfo, setViewPeerInfo] = useState<string | null>(null);
  
  // Database State
  const [friends, setFriends] = useState<FriendNode[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Friends from DB
  useEffect(() => {
    loadFriends().then(setFriends);
  }, []);

  const toggleFriend = async (peerId: string) => {
    const isFriend = friends.find(f => f.id === peerId);
    if (isFriend) {
      await removeFriend(peerId);
      setFriends(prev => prev.filter(f => f.id !== peerId));
    } else {
      const newFriend: FriendNode = {
        id: peerId,
        name: generateFoodName(peerId),
        addedAt: Date.now()
      };
      await saveFriend(newFriend);
      setFriends(prev => [...prev, newFriend]);
    }
  };

  const getDisplayName = (id: string, excludeFriendName = false) => {
    if (!id) return 'Unknown Node';
    if (!excludeFriendName) {
      const friend = friends.find(f => f.id === id);
      if (friend) return friend.name;
    }
    return generateFoodName(id);
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const dismissInstall = () => {
    setShowInstallPrompt(false);
    setHasDismissedInstall(true);
  };

  // Request Notification Permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Peer and Crypto Identity
  useEffect(() => {
    // 1. Identity Layer: Cryptographic Key Generation
    const savedKeys = localStorage.getItem('meshpaw_keys');
    let keys: KeyPair;
    if (savedKeys) {
      keys = JSON.parse(savedKeys);
    } else {
      keys = generateKeys();
      localStorage.setItem('meshpaw_keys', JSON.stringify(keys));
    }
    setKeyPair(keys);

    // Your Address is derived from your Public Key
    // Make it URL safe for PeerJS ID requirements and force Alphanumeric bounds!
    const base64Safe = keys.publicKey.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const peerId = `mp-${base64Safe}-t`;

    // ✅ Set myId IMMEDIATELY from the local crypto key — don't wait for PeerJS.
    // This ensures the QR code renders right away, even fully offline.
    setMyId(peerId);
    
    setStatus('connecting');
    const newPeer = new Peer(peerId, {
      debug: 2
    });

    newPeer.on('open', (_id) => {
      // ID confirmed by server — already set locally, just update status
      setStatus('connected');
    });

    newPeer.on('connection', (conn) => {
      setupConnection(conn);
    });

    newPeer.on('error', (err) => {
      console.error('PeerJS error:', err);
      if (err.type === 'network' || err.type === 'server-error') {
        setStatus('disconnected');
      }
    });

    newPeer.on('disconnected', () => {
      setStatus('disconnected');
      // Try to reconnect
      setTimeout(() => {
        if (!newPeer.destroyed) {
          newPeer.reconnect();
        }
      }, 3000);
    });

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, []);

  // Store-and-Forward Flusher
  useEffect(() => {
    const queueInterval = setInterval(async () => {
      // If we have active connections, check if there are any offline messages waiting in the database
      if (connections.size === 0) return;
      
      try {
        const queued = await getQueuedMessages();
        if (queued.length === 0) return;

        console.log(`Flushing ${queued.length} queued messages to mesh...`);
        for (const msg of queued) {
          let sentAny = false;
          const messageData = {
            type: 'message',
            id: msg.id,
            sourceId: msg.sourceId,
            text: msg.payload,
            timestamp: msg.timestamp,
            ttl: msg.ttl
          };

          connections.forEach(conn => {
            if (conn.open) {
              conn.send(messageData);
              sentAny = true;
            }
          });

          // Remove from local queue once it's out in the wild
          if (sentAny) {
            await removeQueuedMessage(msg.id);
          }
        }
      } catch (err) {
        console.error('Queue flush failed:', err);
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(queueInterval);
  }, [connections]);

  // Ping interval
  useEffect(() => {
    const interval = setInterval(() => {
      connections.forEach(conn => {
        if (conn.open) {
          conn.send({ type: 'ping', timestamp: Date.now() });
        }
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [connections]);

  const setupConnection = (conn: DataConnection) => {
    conn.on('open', async () => {
      setConnections(prev => {
        const newMap = new Map(prev);
        newMap.set(conn.peer, conn);
        return newMap;
      });
      setPeerStats(prev => {
        const newMap = new Map(prev);
        newMap.set(conn.peer, { latency: 0, lastSeen: Date.now() });
        return newMap;
      });
      
      // Verify if new connection relies on permanent trust
      const currentFriends = await loadFriends();
      if (!currentFriends.some(f => f.id === conn.peer)) {
        setPendingPeerPrompt(conn.peer);
      }
    });

    conn.on('data', async (data: any) => {
      setPeerStats(prev => {
        const newMap = new Map(prev);
        const current = (newMap.get(conn.peer) || { latency: 0, lastSeen: Date.now() }) as PeerStat;
        newMap.set(conn.peer, { ...current, lastSeen: Date.now() });
        return newMap;
      });

      if (data.type === 'message') {
        // --- ROUTING LAYER: Flood Routing (Gossip) & TTL ---
        
        // 1. Prevent infinite loops by checking database if seen
        const seen = await hasSeenMessage(data.id);
        if (seen) return; // Drop packet

        // Mark as seen immediately
        await markMessageSeen(data.id);
        
        // Notify if app is in background
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          try {
            const allFriends = await loadFriends();
            const senderObj = allFriends.find(f => f.id === (data.sourceId || conn.peer));
            const pName = senderObj ? senderObj.name : generateFoodName(data.sourceId || conn.peer);
            new Notification(`Mesh: ${generateAvatar(data.sourceId || conn.peer)} ${pName}`, {
              body: data.text
            });
          } catch (e) { console.error('Silent notification fail', e); }
        }

        // Render to UI
        setMessages(prev => [...prev, {
          id: data.id,
          senderId: data.sourceId || conn.peer,
          text: data.text,
          timestamp: data.timestamp,
          isMine: false,
          reactions: {}
        }]);

        // 2. Decrement TTL and Rebroadcast to everyone else
        const ttl = typeof data.ttl === 'number' ? data.ttl : 7; // Default 7 hops
        if (ttl > 1) {
          const forwardedData = { ...data, ttl: ttl - 1 };
          connections.forEach(forwardConn => {
            if (forwardConn.open && forwardConn.peer !== conn.peer) {
              forwardConn.send(forwardedData);
            }
          });
        }
      } else if (data.type === 'reaction') {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            const currentReactions = msg.reactions || {};
            const users = currentReactions[data.emoji] || [];
            const newUsers = data.isAdding
              ? (users.includes(data.senderId) ? users : [...users, data.senderId])
              : users.filter(id => id !== data.senderId);

            return {
              ...msg,
              reactions: {
                ...currentReactions,
                [data.emoji]: newUsers
              }
            };
          }
          return msg;
        }));
      } else if (data.type === 'ping') {
        conn.send({ type: 'pong', timestamp: data.timestamp });
      } else if (data.type === 'pong') {
        const latency = Date.now() - data.timestamp;
        setPeerStats(prev => {
          const newMap = new Map(prev);
          const current = (newMap.get(conn.peer) || { latency: 0, lastSeen: Date.now() }) as PeerStat;
          newMap.set(conn.peer, { ...current, latency });
          return newMap;
        });
      }
    });

    conn.on('close', () => {
      setConnections(prev => {
        const newMap = new Map(prev);
        newMap.delete(conn.peer);
        return newMap;
      });
      setPeerStats(prev => {
        const newMap = new Map(prev);
        newMap.delete(conn.peer);
        return newMap;
      });
    });
    
    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  };

  const connectToPeer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!peer || !connectId.trim() || connectId === myId) return;
    
    const targetId = connectId.trim();
    
    if (connections.has(targetId)) {
      setShowConnectModal(false);
      setConnectId('');
      return;
    }

    const conn = peer.connect(targetId);
    setupConnection(conn);
    
    setShowConnectModal(false);
    setConnectId('');
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // The UUID of the packet
    const messageId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    
    // Packet Structure
    const messageData = {
      type: 'message',
      id: messageId,
      sourceId: myId,  // Source ID
      destId: 'ALL',   // Target ID
      ttl: 7,          // Time to Live (7 hops)
      text: inputMessage.trim(),
      timestamp: Date.now()
    };

    // Mark as seen so we don't echo our own messages
    await markMessageSeen(messageId);

    // Render locally immediately
    setMessages(prev => [...prev, {
      id: messageId,
      senderId: myId,
      text: inputMessage.trim(),
      timestamp: messageData.timestamp,
      isMine: true,
      reactions: {}
    }]);

    // Send to all connected peers
    if (connections.size > 0) {
      connections.forEach(conn => {
        if (conn.open) {
          conn.send(messageData);
        }
      });
    } else {
      // Store-and-Forward SQLite/IndexedDB approach
      // If no one is around, store it!
      await queueMessage({
        id: messageData.id,
        sourceId: messageData.sourceId,
        destId: messageData.destId,
        seqId: 1,
        ttl: messageData.ttl,
        payload: messageData.text,
        timestamp: messageData.timestamp
      });
    }

    setInputMessage('');
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeWithSeconds = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
        <span key={i} className="bg-emerald-500/40 text-emerald-100 rounded-sm px-0.5">{part}</span> : part
    );
  };

  const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const toggleReaction = (messageId: string, emoji: string) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const msgIndex = newMessages.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return prev;

      const msg = newMessages[msgIndex];
      const currentReactions = msg.reactions || {};
      const users = currentReactions[emoji] || [];
      const isAdding = !users.includes(myId);

      const newUsers = isAdding
        ? [...users, myId]
        : users.filter(id => id !== myId);

      newMessages[msgIndex] = {
        ...msg,
        reactions: {
          ...currentReactions,
          [emoji]: newUsers
        }
      };

      // Broadcast
      connections.forEach(conn => {
        if (conn.open) {
          conn.send({
            type: 'reaction',
            messageId,
            emoji,
            senderId: myId,
            isAdding
          });
        }
      });

      return newMessages;
    });
    setActiveReactionMsg(null);
  };

  const filteredMessages = messages.filter(msg => 
    msg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgLatency = connections.size > 0 && peerStats.size > 0
    ? Math.round(Array.from(peerStats.values() as Iterable<PeerStat>).reduce((acc: number, stat: PeerStat) => acc + (stat.latency || 0), 0) / connections.size)
    : 0;

  return (
    <div style={{display:'flex', height:'100dvh', overflow:'hidden', background:'#09090b', color:'#f4f4f5'}}>
      
      {/* ── MOBILE OVERLAY BACKDROP ── */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setShowSidebar(false)}
          aria-hidden="true"
        />
      )}

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="desktop-sidebar">
        {/* Brand */}
        <div className="p-5 border-b border-zinc-800/50 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
            <MeshLogo className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase italic leading-none">MeshPaw</h1>
            <p className="text-[8px] font-mono text-emerald-500/70 uppercase tracking-[0.2em] mt-0.5">Off-Grid Protocol v2.2</p>
          </div>
        </div>

        {/* Identity */}
        <div className="px-4 pt-4 flex-shrink-0">
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] flex-shrink-0" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Offline Secure Vault Active</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Cloud Node ID</p>
          <div className="flex items-center gap-2 bg-black/40 rounded-xl p-3 border border-zinc-800/50 mb-4">
            <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-2xl flex-shrink-0 border border-zinc-800">
              {myId ? generateAvatar(myId) : '⏳'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-sm text-zinc-100 truncate">{myId ? generateFoodName(myId) : '---'}</p>
              <p className="font-mono text-[9px] text-emerald-500/60 uppercase">#MP-MESH-SAFE</p>
            </div>
            <button onClick={() => setShowQrModal(true)} className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 rounded-lg transition-all border border-emerald-500/20 flex-shrink-0">
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Peers & Address Book */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Peers ({connections.size})</p>
            <button onClick={() => setShowConnectModal(true)} className="p-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {connections.size === 0 ? (
            <div className="text-center py-6 text-zinc-600 text-xs mb-4">
              <Users className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p>No peers connected.</p>
            </div>
          ) : (
            <ul className="space-y-1.5 mb-6">
              {Array.from(connections.keys()).map((peerId: string) => {
                const stats = peerStats.get(peerId);
                const isFriend = friends.some(f => f.id === peerId);
                return (
                  <li key={peerId} className={`flex items-center gap-2 p-2.5 rounded-lg border ${isFriend ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-800/50 border-zinc-800'}`}>
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-sm flex-shrink-0">{generateAvatar(peerId)}</div>
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-xs font-bold truncate ${isFriend ? 'text-amber-300' : 'text-zinc-200'}`}>{getDisplayName(peerId)}</p>
                      {stats && <p className="text-[9px] font-mono text-emerald-400">{stats.latency}ms</p>}
                    </div>
                    <button onClick={() => toggleFriend(peerId)} className={`p-1 rounded flex-shrink-0 ${isFriend ? 'text-amber-400' : 'text-zinc-600 hover:text-amber-400'}`}>
                      <Star className="w-3.5 h-3.5" fill={isFriend ? 'currentColor' : 'none'} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center gap-2 mb-3 pt-3 border-t border-zinc-800">
            <Star className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Address Book ({friends.filter(f => f.id !== myId).length})</p>
          </div>
          {friends.filter(f => f.id !== myId).length === 0 ? (
            <p className="text-center py-3 text-zinc-600 text-[10px] italic border border-zinc-800/40 rounded-lg">No trusted friends yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {friends.filter(f => f.id !== myId).map(friend => {
                const isConnected = connections.has(friend.id);
                return (
                  <li key={friend.id}
                    onClick={() => { if (!isConnected && peer) { setupConnection(peer.connect(friend.id)); } }}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${isConnected ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900/40 border-zinc-800/30 hover:bg-zinc-800/60'}`}>
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-sm">{generateAvatar(friend.id)}</div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${isConnected ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-xs font-bold truncate ${isConnected ? 'text-amber-300' : 'text-zinc-300'}`}>{friend.name}</p>
                      <p className="text-[9px] text-zinc-500 uppercase">{isConnected ? 'Online' : 'Tap to Ping'}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setViewPeerInfo(friend.id); }} className="p-1 text-zinc-600 hover:text-emerald-400 flex-shrink-0">
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── MOBILE DRAWER (fixed overlay, only rendered when open) ── */}
      {showSidebar && (
        <div className="fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] flex flex-col bg-zinc-950 border-r border-zinc-800/50 shadow-2xl md:hidden overflow-y-auto">
          <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/30">
                <MeshLogo className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">MeshPaw</h2>
                <p className="text-[8px] font-mono text-emerald-500/70 uppercase tracking-[0.2em]">Off-Grid Protocol v2.2</p>
              </div>
            </div>
            <button onClick={() => setShowSidebar(false)} className="p-2 text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-4 pt-4 flex-shrink-0">
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Offline Secure Vault Active</span>
            </div>
            <div className="flex items-center gap-2 bg-black/40 rounded-xl p-3 border border-zinc-800/50 mb-4">
              <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-2xl flex-shrink-0 border border-zinc-800">{myId ? generateAvatar(myId) : '⏳'}</div>
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-sm text-zinc-100 truncate">{myId ? generateFoodName(myId) : '---'}</p>
                <p className="font-mono text-[9px] text-emerald-500/60 uppercase">#MP-MESH-SAFE</p>
              </div>
              <button onClick={() => { setShowQrModal(true); setShowSidebar(false); }} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 flex-shrink-0">
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 px-4 pb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Peers ({connections.size})</p>
              <button onClick={() => { setShowConnectModal(true); setShowSidebar(false); }} className="p-1 bg-emerald-500/10 text-emerald-400 rounded">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {connections.size === 0 ? (
              <div className="text-center py-6 text-zinc-600 text-xs mb-4"><Users className="w-6 h-6 mx-auto mb-2 opacity-30" /><p>No peers connected.</p></div>
            ) : (
              <ul className="space-y-1.5 mb-4">
                {Array.from(connections.keys()).map((peerId: string) => {
                  const stats = peerStats.get(peerId); const isFriend = friends.some(f => f.id === peerId);
                  return (
                    <li key={peerId} className={`flex items-center gap-3 p-3 rounded-lg border ${isFriend ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-800/50 border-zinc-800'}`}>
                      <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-lg flex-shrink-0">{generateAvatar(peerId)}</div>
                      <div className="flex-1 overflow-hidden"><p className={`font-bold text-sm truncate ${isFriend ? 'text-amber-300' : 'text-zinc-200'}`}>{getDisplayName(peerId)}</p>{stats && <p className="text-[10px] text-emerald-400 font-mono">{stats.latency}ms</p>}</div>
                      <button onClick={() => toggleFriend(peerId)} className={`p-1.5 rounded flex-shrink-0 ${isFriend ? 'text-amber-400' : 'text-zinc-600'}`}><Star className="w-4 h-4" fill={isFriend ? 'currentColor' : 'none'} /></button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex items-center gap-2 mb-3 pt-3 border-t border-zinc-800">
              <Star className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Address Book ({friends.filter(f => f.id !== myId).length})</p>
            </div>
            {friends.filter(f => f.id !== myId).length === 0 ? (
              <p className="text-center py-3 text-zinc-600 text-[10px] italic">No trusted friends yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {friends.filter(f => f.id !== myId).map(friend => {
                  const isConnected = connections.has(friend.id);
                  return (
                    <li key={friend.id} onClick={() => { if (!isConnected && peer) { setupConnection(peer.connect(friend.id)); } setShowSidebar(false); }}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${isConnected ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900/40 border-zinc-800/30'}`}>
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-lg">{generateAvatar(friend.id)}</div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${isConnected ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className={`font-bold text-sm truncate ${isConnected ? 'text-amber-300' : 'text-zinc-300'}`}>{friend.name}</p>
                        <p className="text-[9px] text-zinc-500 uppercase">{isConnected ? 'Online' : 'Tap to Ping'}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Modern PWA Install Prompt (Overlay) */}
      {showInstallPrompt && !hasDismissedInstall && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1rem)] max-w-sm bg-emerald-600 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-500 border border-emerald-400/30 shadow-emerald-500/20">
          <div className="bg-white/20 p-2.5 rounded-xl flex-shrink-0">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm leading-tight truncate">Install MeshPaw</h3>
            <p className="text-emerald-50 text-[10px] opacity-90 leading-tight">Get the full off-grid PWA experience.</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button 
              onClick={dismissInstall}
              className="px-2 py-2 text-white/80 hover:text-white text-[10px] font-bold uppercase tracking-tighter"
            >
              Later
            </button>
            <button 
              onClick={handleInstallClick}
              className="px-3 py-2 bg-white text-emerald-700 font-bold rounded-lg shadow-lg hover:bg-emerald-50 active:scale-95 transition-all text-[11px]"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="main-content flex flex-col bg-zinc-950 relative">
        
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white" onClick={() => setShowSidebar(true)}>
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-2">
              {status === 'connected' ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full text-xs font-medium">
                    <Wifi className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Online</span>
                  </div>
                  {connections.size > 0 && (
                    <div className="hidden sm:flex items-center gap-1.5 text-zinc-400 bg-zinc-800/50 px-2.5 py-1 rounded-full text-xs font-medium border border-zinc-800">
                      <Users className="w-3.5 h-3.5" />
                      <span>{connections.size}</span>
                      <span className="text-zinc-600 mx-0.5">•</span>
                      <span className={avgLatency < 100 ? 'text-emerald-400' : avgLatency < 300 ? 'text-amber-400' : 'text-rose-400'}>
                        {avgLatency}ms avg
                      </span>
                    </div>
                  )}
                </div>
              ) : status === 'connecting' ? (
                <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full text-xs font-medium">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
                  <span className="hidden sm:inline">Connecting...</span>
                </div>
              ) : (
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${connections.size > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
                  {connections.size > 0 ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{connections.size > 0 ? 'Local Mesh' : 'Offline'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showInstallPrompt && (
              <button 
                onClick={handleInstallClick}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-full text-xs font-medium transition-colors border border-emerald-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            )}
            <button 
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }} 
              className={`p-2 rounded-full transition-colors flex items-center gap-2 ${showSearch ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
              title="Search Messages"
            >
              <Search className="w-5 h-5" />
              <span className="text-xs font-medium hidden lg:inline">Search</span>
            </button>
            <button 
              onClick={() => setShowRadar(!showRadar)}
              className={`p-2 rounded-full transition-colors flex items-center gap-2 ${showRadar ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
              title="Mesh Radar"
            >
              <Radar className="w-5 h-5" />
              <span className="text-xs font-medium hidden lg:inline">Radar</span>
            </button>
            <div className="hidden md:flex items-center gap-3">
              <button 
                onClick={() => setShowQrModal(true)} 
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-full transition-colors flex items-center gap-2"
                title="My QR Code"
              >
                <QrCode className="w-5 h-5" />
                <span className="text-xs font-medium hidden lg:inline">My QR</span>
              </button>
            </div>
            <div className="flex items-center gap-3 md:hidden">
              <div className="font-mono text-xs font-bold bg-zinc-800 px-2 py-1 rounded max-w-[120px] truncate">{myId ? `${myId.substring(0, 10)}...` : '---'}</div>
              <button 
                onClick={() => setShowQrModal(true)} 
                className="p-2 text-zinc-400 hover:text-white"
                title="My QR Code"
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Search Bar */}
        {showSearch && (
          <div className="bg-zinc-900 border-b border-zinc-800 p-3 animate-in slide-in-from-top-2 duration-200">
            <div className="relative max-w-3xl mx-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-10 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Radar View */}
        {showRadar ? (
          <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-6 bg-zinc-950">
            <div className="text-center z-10 mb-8 absolute top-8 w-full px-4">
              <h2 className="text-2xl font-bold text-emerald-400 tracking-wider uppercase mb-2">Local Mesh Radar</h2>
              <p className="text-zinc-400 max-w-md mx-auto text-sm">Visualizing active P2P connections. Operates independently of the global Internet once connected.</p>
              {connections.size === 0 && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/20 text-amber-400/90 text-xs px-4 py-2 rounded-lg max-w-xs mx-auto animate-pulse">
                  ⚠️ Scan a QR Code to detect a nearby device and jumpstart the mesh!
                </div>
              )}
            </div>
            
            <div className="relative w-72 h-72 sm:w-96 sm:h-96 md:w-[500px] md:h-[500px] rounded-full border border-emerald-500/20 bg-emerald-950/20 shadow-[0_0_100px_rgba(16,185,129,0.15)] flex items-center justify-center overflow-hidden mt-12 sm:mt-0">
              {/* Radar Circles */}
              <div className="absolute inset-0 rounded-full border border-emerald-500/10 scale-75 animate-pulse-slow"></div>
              <div className="absolute inset-0 rounded-full border border-emerald-500/10 scale-50"></div>
              <div className="absolute inset-0 rounded-full border border-emerald-500/10 scale-25"></div>
              <div className="absolute w-full h-[1px] bg-emerald-500/10"></div>
              <div className="absolute h-full w-[1px] bg-emerald-500/10"></div>
              
              {/* Sweeping Scanner */}
              <div className="absolute top-1/2 left-1/2 w-1/2 h-1/2 bg-gradient-to-br from-emerald-500/30 to-transparent origin-top-left animate-[spin_4s_linear_infinite] rounded-tr-full shadow-[0_0_20px_rgba(16,185,129,0.5)] z-0">
                <div className="absolute left-0 bottom-0 w-full h-[2px] bg-emerald-400 blur-[1px]"></div>
              </div>

              {/* Center You with Pulsing Effect */}
              <div className="absolute z-20 flex flex-col items-center">
                <div className="relative">
                  <div className="absolute -inset-4 bg-emerald-500/20 rounded-full animate-ping opacity-75"></div>
                  <div className="w-5 h-5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)] border-2 border-zinc-900 relative z-10"></div>
                </div>
                <div className="bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black text-white mt-3 border border-emerald-500/50 shadow-lg tracking-widest">YOU</div>
              </div>

              {/* Peers */}
              {Array.from(connections.keys()).map((peerId: string, index: number) => {
                const isFriend = friends.some(f => f.id === peerId);
                const angle = (index * (360 / Math.max(1, connections.size))) * (Math.PI / 180);
                
                // Keep bounding radius between 10% and 42% so it stays perfectly inside the radar dial!
                const distance = 10 + (Math.abs(peerId.charCodeAt(0) % 32)); 
                
                const xVal = 50 + (Math.cos(angle) * distance);
                const yVal = 50 + (Math.sin(angle) * distance);
                const x = `${xVal}%`;
                const y = `${yVal}%`;
                
                return (
                  <div 
                    key={peerId} 
                    onClick={() => setViewPeerInfo(peerId)}
                    className="absolute z-10 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 cursor-pointer shadow-lg hover:scale-110 hover:z-20 group" 
                    style={{ left: x, top: y }}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-500 bg-zinc-900 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                      {generateAvatar(peerId)}
                    </div>
                    <div className={`mt-1.5 px-2 py-0.5 rounded-full backdrop-blur-md text-[10px] font-bold border transition-colors ${isFriend ? 'bg-amber-500/80 text-white border-amber-300' : 'bg-zinc-900/80 text-white border-white/20'}`}>
                      {getDisplayName(peerId)}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="absolute bottom-8 flex gap-4 text-xs font-mono">
              <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <span className="text-zinc-400">Temporary Node</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
                <span className="text-zinc-400">Permanent Friend</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="w-20 h-20 rounded-3xl bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-2xl mb-6 group hover:border-emerald-500/30 transition-all duration-500">
                <PawPrint className="w-10 h-10 text-zinc-700 group-hover:text-emerald-500 transition-colors" />
              </div>
              <div className="text-center max-w-sm mb-8">
                <h3 className="text-white text-xl font-bold tracking-tight mb-2">No messages yet</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">Connect to a peer and start broadcasting to the local mesh network.</p>
                
                <div className="flex flex-col gap-3 mt-8">
                  <div className="bg-emerald-500/5 transition-all p-4 rounded-2xl border border-emerald-500/10 text-emerald-100/90 flex items-start gap-4 text-left">
                    <div className="bg-emerald-500/20 p-2 rounded-lg"><Wifi className="w-5 h-5 text-emerald-400" /></div>
                    <div className="text-xs leading-relaxed">
                      <strong className="text-emerald-400 block mb-0.5">End-to-End Encrypted</strong>
                      Your keys stay in local storage—never sent over the mesh or web.
                    </div>
                  </div>
                  <div className="bg-amber-500/5 transition-all p-4 rounded-2xl border border-amber-500/10 text-amber-100/90 flex items-start gap-4 text-left">
                    <div className="bg-amber-500/20 p-2 rounded-lg"><Radar className="w-5 h-5 text-amber-400" /></div>
                    <div className="text-xs leading-relaxed">
                      <strong className="text-amber-400 block mb-0.5">Gossip Mesh</strong>
                      Messages hop through peers to reach targets outside your direct range.
                    </div>
                  </div>
                  <div className="bg-indigo-500/5 transition-all p-4 rounded-2xl border border-indigo-500/10 text-indigo-100/90 flex items-start gap-4 text-left">
                    <div className="bg-indigo-500/20 p-2 rounded-lg"><WifiOff className="w-5 h-5 text-indigo-400" /></div>
                    <div className="text-xs leading-relaxed">
                      <strong className="text-indigo-400 block mb-0.5">Zero Internet Native</strong>
                      Assets are cached for offline airplane-mode support. Works on Local LAN.
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowConnectModal(true)}
                className="px-10 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-emerald-500/40 active:scale-95 uppercase tracking-widest text-xs"
              >
                Add Peer
              </button>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
              <Search className="w-12 h-12 opacity-20 mb-2" />
              <p>No messages match "{searchQuery}"</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {filteredMessages.map((msg, idx) => {
                const showSender = idx === 0 || filteredMessages[idx - 1].senderId !== msg.senderId;
                
                return (
                  <div key={msg.id} className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}>
                    {showSender && !msg.isMine && (
                      <div className="mb-1 ml-1 flex items-baseline gap-1.5">
                    <span className="text-xs font-bold text-emerald-300 gap-1 flex items-baseline">
                          <span className="text-[10px]">{generateAvatar(msg.senderId)}</span>
                          {getDisplayName(msg.senderId)}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-600">#{msg.senderId.substring(0, 10)}</span>
                      </div>
                    )}
                    
                    <div className={`flex items-center gap-2 ${msg.isMine ? 'flex-row-reverse' : 'flex-row'} relative group`}>
                      <div className={`
                        max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl
                        ${msg.isMine 
                          ? 'bg-emerald-600 text-white rounded-br-sm' 
                          : 'bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700'}
                      `}>
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                          {highlightText(msg.text, searchQuery)}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => setActiveReactionMsg(activeReactionMsg === msg.id ? null : msg.id)}
                        className={`md:opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full ${activeReactionMsg === msg.id ? 'opacity-100 bg-zinc-800 text-zinc-200' : ''}`}
                      >
                        <SmilePlus className="w-4 h-4" />
                      </button>

                      {activeReactionMsg === msg.id && (
                        <div className={`absolute top-full mt-1 z-10 bg-zinc-800 rounded-full px-2 py-1.5 flex gap-2 shadow-lg border border-zinc-700 ${msg.isMine ? 'right-0' : 'left-0'}`}>
                          {EMOJIS.map(e => (
                            <button key={e} onClick={() => toggleReaction(msg.id, e)} className="hover:scale-125 transition-transform text-base">
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {msg.reactions && Object.values(msg.reactions as Record<string, string[]>).some((users: string[]) => users.length > 0) && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(msg.reactions as Record<string, string[]>).map(([emoji, users]: [string, string[]]) => {
                          if (users.length === 0) return null;
                          const iReacted = users.includes(myId);
                          return (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className={`text-[11px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${iReacted ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}
                            >
                              <span>{emoji}</span>
                              <span className="font-medium">{users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <span className="text-[10px] text-zinc-600 mt-1 mx-1 font-medium">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        )}

        {/* Input Area */}
        {!showRadar && (
        <div className="p-3 sm:p-4 bg-zinc-950 border-t border-zinc-800/50">
          <form onSubmit={sendMessage} className="max-w-3xl mx-auto relative flex items-end gap-2">
            <div className="relative flex-1 bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                placeholder={connections.size > 0 ? "Broadcast message..." : "Disconnected. Messages will queue."}
                className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 p-3 sm:p-4 max-h-32 min-h-[48px] resize-none focus:outline-none disabled:opacity-50 text-[15px]"
                rows={1}
              />
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim()}
                  className="p-3 sm:p-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-xl transition-all active:scale-95 flex-shrink-0 shadow-lg shadow-emerald-500/10"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
        )}
      </div>

      {/* Modals Overlay */}
      {(showQrModal || showConnectModal || pendingPeerPrompt || viewPeerInfo) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="flex items-center justify-center min-h-full w-full py-8">
          
          {/* QR Modal */}
          {showQrModal && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Your Node ID</h2>
                <p className="text-zinc-400 text-sm mt-1">Scan to connect directly</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl flex justify-center mb-6 relative min-h-[232px] items-center">
                {myId ? (
                  <>
                    <QRCodeSVG value={myId} size={200} level="M" aria-hidden="true" title="" />
                    <div className="absolute inset-0 z-10"></div>
                  </>
                ) : (
                  <div className="text-zinc-400 font-mono text-xs animate-pulse">Initializing Crypto Node...</div>
                )}
              </div>
              
              <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Crypto Address</div>
                <div className="font-mono text-xs font-bold text-emerald-400 break-all">{myId}</div>
              </div>
            </div>
          )}

          {/* Connect Modal */}
          {showConnectModal && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <button 
                onClick={() => setShowConnectModal(false)}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-zinc-800 rounded-full z-10"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="mb-6 flex items-center justify-between relative z-10">
                <div className="pr-8">
                  <h2 className="text-xl font-bold text-white tracking-tight">Add Peer</h2>
                  <p className="text-zinc-500 text-[11px] mt-1 uppercase tracking-wider font-bold">Local Mesh Discovery</p>
                </div>
                <button 
                  onClick={() => setShowScanner(!showScanner)}
                  className={`p-2.5 rounded-xl transition-all shadow-lg active:scale-90 flex-shrink-0 ${showScanner ? 'bg-emerald-500 text-zinc-950 shadow-emerald-500/20' : 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700'}`}
                  title="Scan QR Code"
                >
                  <ScanLine className="w-5 h-5" />
                </button>
              </div>

              {showScanner && (
                <div className="mb-6 rounded-xl overflow-hidden border border-zinc-800 bg-black max-h-[250px] relative">
                  <Scanner onScan={(result) => {
                    const scannedId = result?.[0]?.rawValue;
                    if (scannedId && scannedId.length > 20) {
                      setConnectId(scannedId);
                      setShowScanner(false);
                    }
                  }} />
                  <div className="absolute font-mono text-center w-full bottom-2 left-0 text-emerald-400 text-xs bg-black/50 py-1">Scanning Crypto ID...</div>
                </div>
              )}
              
              <form onSubmit={connectToPeer}>
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Node ID
                  </label>
                  <input
                    type="text"
                    value={connectId}
                    onChange={(e) => setConnectId(e.target.value)}
                    placeholder="e.g. 7A9B..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-text"
                    autoFocus
                  />
                </div>
                
                  
                  <div className="relative flex items-center mb-6">
                    <div className="flex-1 h-px bg-zinc-800"></div>
                    <span className="px-3 text-[10px] text-zinc-600 uppercase font-black tracking-widest">OR USE OFFLINE PIN</span>
                    <div className="flex-1 h-px bg-zinc-800"></div>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6">
                    <p className="text-[10px] text-amber-500 font-bold uppercase mb-2 tracking-wider">Discovery Hub (No Scan Required)</p>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="4-digit Mesh PIN"
                        maxLength={4}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-center tracking-[0.5em] focus:border-amber-500 outline-none transition-colors"
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          if (val.length === 4 && peer) {
                             // This is a "well-known" discovery ID for a local group
                             setConnectId(`mp-mesh-HUB-${val}`);
                          }
                        }}
                      />
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-2">Enter the same 4-digit code as your partner to automatically link up on the same local mesh.</p>
                  </div>

                <button
                  type="submit"
                  disabled={!connectId.trim() || connectId.length < 4}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold rounded-lg transition-colors"
                >
                  Connect to Node
                </button>
              </form>
            </div>
          )}

          {/* New Peer Security Prompt Modal */}
          {pendingPeerPrompt && (
            <div className="bg-zinc-900 border border-emerald-500/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in slide-in-from-bottom-5 duration-300">
              <div className="mb-6 text-center">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <Star className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white leading-tight mb-2">New Node Connected!</h2>
                <p className="text-zinc-400 text-sm">
                  Would you like to save this device permanently to your Address Book?
                </p>
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 mt-4 overflow-hidden flex flex-col items-center">
                  <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center text-3xl shadow-inner border border-zinc-700 mb-3">
                    {generateAvatar(pendingPeerPrompt)}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Crypto ID</div>
                  <div className="font-mono text-xs text-emerald-400 truncate w-full text-center">{pendingPeerPrompt}</div>
                  <div className="text-sm font-bold text-emerald-100 mt-2">
                    {generateFoodName(pendingPeerPrompt)}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    if (pendingPeerPrompt) {
                      await toggleFriend(pendingPeerPrompt);
                    }
                    setPendingPeerPrompt(null);
                  }}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <Star className="w-4 h-4" fill="currentColor" />
                  Save as Permanent Friend
                </button>
                <button
                  onClick={() => setPendingPeerPrompt(null)}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Keep Temporary
                </button>
              </div>
            </div>
          )}

          {/* Node Info & Profile Viewer */}
          {viewPeerInfo && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200">
               <button 
                  onClick={() => setViewPeerInfo(null)}
                  className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="text-center mb-6 mt-2">
                  <div className="w-20 h-20 bg-zinc-950 border border-zinc-800 rounded-full mx-auto flex items-center justify-center text-4xl shadow-inner mb-4 relative">
                    {generateAvatar(viewPeerInfo)}
                    <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-zinc-900 ${connections.has(viewPeerInfo) ? 'bg-emerald-500' : 'bg-zinc-600'}`}></div>
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                    {getDisplayName(viewPeerInfo)}
                  </h3>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    {friends.some(f => f.id === viewPeerInfo) ? (
                      <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Star className="w-3 h-3" fill="currentColor" /> Trusted Friend</span>
                    ) : (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Temporary Node</span>
                    )}
                  </div>
                </div>
                
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 mb-6 font-mono text-center">
                   <div className="text-[10px] uppercase text-zinc-500 tracking-widest mb-2">Cryptographic Hash ID</div>
                   <div className="text-xs text-emerald-300 break-all">{viewPeerInfo}</div>
                </div>
                
                <div className="flex flex-col gap-3">
                   {connections.has(viewPeerInfo) ? (
                     <button
                       onClick={() => {
                          const conn = connections.get(viewPeerInfo);
                          if (conn) conn.close();
                          setViewPeerInfo(null);
                       }}
                       className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-lg transition-colors border border-red-500/20"
                     >
                       Disconnect Node
                     </button>
                   ) : (
                     <button
                       onClick={() => {
                          if (peer) {
                             setStatus('connecting');
                             const conn = peer.connect(viewPeerInfo);
                             setupConnection(conn);
                          }
                          setViewPeerInfo(null);
                       }}
                       className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg transition-colors"
                     >
                       Ping Offline Node
                     </button>
                   )}
                   
                   <button
                     onClick={async () => {
                        if (viewPeerInfo) {
                          await toggleFriend(viewPeerInfo);
                        }
                     }}
                     className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                   >
                     <Star className="w-4 h-4" />
                     {friends.some(f => f.id === viewPeerInfo) ? 'Remove from Address Book' : 'Save to Address Book'}
                   </button>
                </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

