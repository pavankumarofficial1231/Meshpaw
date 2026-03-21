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
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReactionMsg, setActiveReactionMsg] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [hasDismissedInstall, setHasDismissedInstall] = useState(false);
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
    
    setStatus('connecting');
    const newPeer = new Peer(peerId, {
      debug: 2
    });

    newPeer.on('open', (id) => {
      setMyId(id);
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

  const avgLatency = connections.size > 0 
    ? Math.round(Array.from(peerStats.values() as Iterable<PeerStat>).reduce((acc: number, stat: PeerStat) => acc + stat.latency, 0) / connections.size)
    : 0;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      
      {/* Sidebar (Desktop) / Drawer (Mobile) */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-emerald-400">
              <PawPrint className="w-5 h-5" />
              <span>MeshPaw</span>
            </div>
            <button className="md:hidden p-2 text-zinc-400 hover:text-white" onClick={() => setShowSidebar(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 border-b border-zinc-800">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">My Node</div>
            <div className="flex items-center justify-between bg-zinc-950 rounded-lg p-3 border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-xl shadow-inner border border-zinc-800">
                  {myId ? generateAvatar(myId) : '⏳'}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-emerald-400 leading-tight">{myId ? generateFoodName(myId) : '------'}</span>
                  <span className="font-mono text-[10px] text-zinc-500 uppercase mt-0.5">My Local Node</span>
                </div>
              </div>
              <button 
                onClick={() => setShowQrModal(true)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                title="Show QR Code"
              >
                <QrCode className="w-4 h-4 text-zinc-300" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Connected Peers ({connections.size})
              </div>
              <button 
                onClick={() => setShowConnectModal(true)}
                className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {connections.size === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No peers connected.</p>
                <p className="mt-1">Add a peer to start meshing.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {Array.from(connections.keys()).map((peerId: string) => {
                  const stats = peerStats.get(peerId);
                  const isStale = stats && (Date.now() - stats.lastSeen > 15000);
                  const isFriend = friends.some(f => f.id === peerId);
                  
                  return (
                    <li key={peerId} className={`flex flex-col p-3 rounded-lg border transition-all ${isFriend ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-800/50 border-zinc-800/50'}`}>
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-start gap-3 max-w-[70%]">
                          <div className="relative">
                            <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-sm shadow-inner border border-zinc-700">
                              {generateAvatar(peerId)}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-900 ${isStale ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse-slow'}`}></div>
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className={`font-medium text-sm leading-tight truncate ${isFriend ? 'text-amber-400 font-bold' : 'text-emerald-100'}`}>
                              {getDisplayName(peerId)}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-500 mt-0.5 max-w-full truncate">#{peerId.substring(0, 16)}...</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <button 
                            onClick={() => toggleFriend(peerId)}
                            className={`p-1 rounded transition-colors ${isFriend ? 'text-amber-400 hover:bg-amber-500/20' : 'text-zinc-600 hover:text-amber-400 hover:bg-zinc-800'}`}
                            title={isFriend ? "Remove Friend" : "Save as Permanent Friend"}
                          >
                            <Star className="w-4 h-4" fill={isFriend ? "currentColor" : "none"} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${isFriend ? 'text-amber-500/70' : 'text-zinc-600'}`}>
                          {isFriend ? 'Permanent' : 'Temporary'}
                        </span>
                        {stats && (
                          <span className={`text-[10px] font-mono ${stats.latency < 100 ? 'text-emerald-400' : stats.latency < 300 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {stats.latency}ms ping
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            
            {/* Address Book / Offline Friends */}
            <div className="mt-8 mb-4 border-t border-zinc-800 pt-6 flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-500" />
                My Address Book ({friends.length})
              </div>
            </div>
            {friends.length === 0 ? (
              <div className="text-center py-4 bg-zinc-900/40 rounded-lg border border-zinc-800/30 text-zinc-600 text-[11px] italic">No trusted friends saved.</div>
            ) : (
              <ul className="space-y-2">
                {friends.map(friend => {
                  const isConnected = connections.has(friend.id);
                  return (
                    <li 
                      key={friend.id} 
                      onClick={() => {
                        if (!isConnected && peer) {
                          const c = peer.connect(friend.id);
                          setupConnection(c);
                        }
                      }}
                      className={`flex flex-col p-3 rounded-lg border transition-all cursor-pointer ${isConnected ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900/40 border-zinc-800/30 hover:bg-zinc-800/60'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 bg-zinc-950 rounded-full flex items-center justify-center text-sm shadow-inner border border-zinc-800">
                              {generateAvatar(friend.id)}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-950 ${isConnected ? 'bg-emerald-500' : 'bg-zinc-600'}`}></div>
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-bold text-sm leading-tight truncate ${isConnected ? 'text-amber-400' : 'text-zinc-300'}`}>
                              {friend.name}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">
                              {isConnected ? 'Online Mesh' : 'Tap to Ping'}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewPeerInfo(friend.id);
                          }}
                          className="p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modern PWA Install Prompt (Overlay) */}
      {showInstallPrompt && !hasDismissedInstall && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md bg-emerald-600 rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row items-center gap-4 animate-in slide-in-from-bottom-10 duration-500 border border-emerald-500/30">
          <div className="bg-white/20 p-3 rounded-xl">
            <Download className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-bold text-white text-lg leading-tight">Install MeshPaw</h3>
            <p className="text-emerald-50 text-sm opacity-90">Install this web app for a better, off-grid experience.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={dismissInstall}
              className="px-4 py-2 text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              Later
            </button>
            <button 
              onClick={handleInstallClick}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-white text-emerald-700 font-bold rounded-xl shadow-lg hover:bg-emerald-50 active:scale-95 transition-all text-sm"
            >
              Install Now
            </button>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
        
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
              <div className="font-mono text-sm font-bold bg-zinc-800 px-2 py-1 rounded">{myId || '---'}</div>
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
            <div className="text-center z-10 mb-8 absolute top-8">
              <h2 className="text-2xl font-bold text-emerald-400 tracking-wider uppercase mb-2">Local Mesh Radar</h2>
              <p className="text-zinc-400 max-w-md mx-auto text-sm">Visualizing active P2P connections over local network/QR limits. Operates independently of the global Internet.</p>
            </div>
            
            <div className="relative w-72 h-72 sm:w-96 sm:h-96 md:w-[500px] md:h-[500px] rounded-full border border-emerald-500/20 bg-emerald-950/20 shadow-[0_0_100px_rgba(16,185,129,0.1)] flex items-center justify-center overflow-hidden">
              {/* Radar Circles */}
              <div className="absolute inset-0 rounded-full border border-emerald-500/10 scale-75"></div>
              <div className="absolute inset-0 rounded-full border border-emerald-500/10 scale-50"></div>
              <div className="absolute inset-0 rounded-full border border-emerald-500/10 scale-25"></div>
              <div className="absolute w-full h-[1px] bg-emerald-500/10"></div>
              <div className="absolute h-full w-[1px] bg-emerald-500/10"></div>
              
              {/* Sweeping Scanner */}
              <div className="absolute top-1/2 left-1/2 w-1/2 h-1/2 bg-gradient-to-br from-emerald-500/30 to-transparent origin-top-left animate-[spin_4s_linear_infinite] rounded-tr-full shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                <div className="absolute left-0 bottom-0 w-full h-[2px] bg-emerald-400 blur-[1px]"></div>
              </div>

              {/* Center You */}
              <div className="absolute z-20 flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)] border-2 border-zinc-900"></div>
                <div className="bg-zinc-900/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-white mt-2 border border-emerald-500/30">YOU</div>
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <PawPrint className="w-8 h-8 opacity-50" />
              </div>
              <div className="text-center max-w-xs">
                <h3 className="text-zinc-300 font-medium mb-1">No messages yet</h3>
                <p className="text-sm">Connect to a peer and start broadcasting to the local mesh.</p>
                <div className="flex flex-col gap-2 mt-4 text-xs text-left">
                  <div className="bg-emerald-500/10 p-2.5 rounded border border-emerald-500/20 text-emerald-400">
                    <strong>Crypto Keys:</strong> Your identity is a Curve25519 PubKey.
                  </div>
                  <div className="bg-amber-500/10 p-2.5 rounded border border-amber-500/20 text-amber-500/90">
                    <strong>Gossip Protocol:</strong> Messages hop up to 7 times (TTL) avoiding endless loops.
                  </div>
                  <div className="bg-blue-500/10 p-2.5 rounded border border-blue-500/20 text-blue-400">
                    <strong>Off-grid Ready:</strong> Sending offline? Messages queue locally & forward when connected!
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowConnectModal(true)}
                className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold rounded-lg transition-colors"
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
        <div className="p-4 bg-zinc-950 border-t border-zinc-800">
          <form onSubmit={sendMessage} className="max-w-3xl mx-auto relative flex items-end gap-2">
            <div className="relative flex-1 bg-zinc-900 rounded-xl border border-zinc-800 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                placeholder={connections.size > 0 ? "Broadcast to mesh..." : "Offline mode: Messages will queue up..."}
                className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 p-3 sm:p-4 max-h-32 min-h-[52px] resize-none focus:outline-none disabled:opacity-50"
                rows={1}
              />
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim()}
                  className="p-3 sm:p-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-xl transition-colors flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
        )}
      </div>

      {/* Modals Overlay */}
      {(showQrModal || showConnectModal || pendingPeerPrompt || viewPeerInfo) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          
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
              
              <div className="bg-white p-4 rounded-xl flex justify-center mb-6 relative">
                <QRCodeSVG value={myId} size={200} level="M" aria-hidden="true" title="" />
                {/* Overlay to block browser long-press tooltips on mobile SVG titles */}
                <div className="absolute inset-0 z-10"></div>
              </div>
              
              <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Crypto Address</div>
                <div className="font-mono text-xs font-bold text-emerald-400 break-all">{myId}</div>
              </div>
            </div>
          )}

          {/* Connect Modal */}
          {showConnectModal && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowConnectModal(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Add Peer</h2>
                  <p className="text-zinc-400 text-sm mt-1">Enter a node ID to establish connection</p>
                </div>
                <button 
                  onClick={() => setShowScanner(!showScanner)}
                  className={`p-2 rounded-xl transition-colors ${showScanner ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700'}`}
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
                
                <button
                  type="submit"
                  disabled={!connectId.trim() || connectId.length < 20}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold rounded-lg transition-colors"
                >
                  Connect
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
                    await toggleFriend(pendingPeerPrompt);
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
                   <div className="text-xs text- emerald-300 break-all">{viewPeerInfo}</div>
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
                        await toggleFriend(viewPeerInfo);
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
      )}
    </div>
  );
}

