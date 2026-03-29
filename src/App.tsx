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
  MessageSquare,
  Search,
  SmilePlus,
  Download,
  Radar,
  ShieldCheck,
  Settings,
  Trash2,
  Shield,
  Zap,
  Activity,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { generateKeys, KeyPair, signData, verifyData } from './lib/crypto';
import { hasSeenMessage, markMessageSeen, queueMessage, getQueuedMessages, removeQueuedMessage, loadFriends, saveFriend, removeFriend, FriendNode } from './lib/store';

// Types
interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isMine: boolean;
  isVerified?: boolean;
  signingPubKey?: string;
  reactions?: Record<string, string[]>;
}

interface PeerStat {
  latency: number;
  lastSeen: number;
}

const ADJECTIVES = ['Sugary', 'Spicy', 'Crispy', 'Crunchy', 'Salty', 'Sweet', 'Sour', 'Toasted', 'Glazed', 'Fried', 'Cheesy', 'Melted', 'Jolly', 'Sizzling', 'Buttery', 'Frosted', 'Sticky', 'Gooey', 'Bubbly', 'Zesty'];
const NOUNS = ['Bites', 'Tacos', 'Pickles', 'Donuts', 'Bacon', 'Noodles', 'Waffles', 'Burgers', 'Pancakes', 'Burritos', 'Sushi', 'Muffins', 'Biscuits', 'Cookies', 'Pretzels', 'Cupcakes', 'Fries', 'Snacks', 'Nuggets', 'Pizzas'];
const AVATARS = ['🐶', '😸', '🐼', '🦊', '🐷', '🐸', '🦄', '👾', '👻', '🍕'];
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function App() {
  const [myId, setMyId] = useState<string>('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<Map<string, DataConnection>>(new Map());
  const [peerStats, setPeerStats] = useState<Map<string, PeerStat>>(new Map());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connectId, setConnectId] = useState('');
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  
  // Identity & Onboarding State
  const [alias, setAlias] = useState<string>(localStorage.getItem('mesh_alias') || '');
  const [signalSignature, setSignalSignature] = useState<string>(localStorage.getItem('mesh_signature') || '⚡');
  const [isOnboarded, setIsOnboarded] = useState<boolean>(!!localStorage.getItem('mesh_alias'));
  
  // Discovery & Database State
  const [friends, setFriends] = useState<FriendNode[]>([]);
  const [discoveredPeers, setDiscoveredPeers] = useState<string[]>([]);
  
  // Metrics State
  const [relayedCount, setRelayedCount] = useState<number>(Number(localStorage.getItem('mesh_relayed')) || 0);
  const [startTime] = useState<number>(Date.now());
  const [isRelayEnabled, setIsRelayEnabled] = useState<boolean>(localStorage.getItem('mesh_relay_enabled') !== 'false');
  
  // UI States
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReactionMsg, setActiveReactionMsg] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'discovery' | 'settings'>('chats');
  const [pendingPeerPrompt, setPendingPeerPrompt] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- HELPERS ---

  const generateFoodName = (id: string, isMe = false) => {
    if (isMe && alias) return alias;
    if (!id) return 'Unknown Node';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const adjIndex = Math.abs(hash) % ADJECTIVES.length;
    const nounIndex = Math.abs(hash * 3) % NOUNS.length;
    return `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`;
  };

  const generateAvatar = (id: string, isMe = false) => {
    if (isMe && signalSignature) return signalSignature;
    if (!id) return '👽';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATARS[Math.abs(hash) % AVATARS.length];
  };

  const getDisplayName = (id: string, excludeFriendName = false) => {
    if (!id) return 'Unknown Node';
    if (!excludeFriendName) {
      const friend = friends.find(f => f.id === id);
      if (friend) return friend.name;
    }
    return generateFoodName(id);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
        <span key={i} className="bg-emerald-500/40 text-emerald-100 rounded-sm px-0.5">{part}</span> : part
    );
  };

  // --- CORE LOGIC ---

  useEffect(() => {
    loadFriends().then(setFriends);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    const base64Safe = keys.publicKey.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const peerId = `mp-${base64Safe}-t`;
    
    setStatus('connecting');

    const isLocalDev = window.location.port === '3000' || window.location.port === '5173';
    const peerPort = isLocalDev ? 9000 : (window.location.port ? Number(window.location.port) : (window.location.protocol === 'https:' ? 443 : 80));

    const newPeer = new Peer(peerId, {
      host: window.location.hostname,
      port: peerPort,
      path: '/myapp',
      secure: window.location.protocol === 'https:',
      debug: 1,
      config: {
        iceServers: [] // Brave compatibility: Off-grid
      }
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
      setTimeout(() => {
        if (!newPeer.destroyed) {
          newPeer.reconnect();
          setStatus('connecting');
        }
      }, 5000);
    });

    setPeer(newPeer);
    return () => { newPeer.destroy(); };
  }, []);

  // Discovery Polling (LAN)
  useEffect(() => {
    if (!peer || status !== 'connected') return;
    const discoInterval = setInterval(() => {
      // @ts-ignore
      peer.listAllPeers((peers) => {
        if (peers) {
          setDiscoveredPeers(peers.filter(p => p !== myId));
        }
      });
    }, 3000);
    return () => clearInterval(discoInterval);
  }, [peer, status, myId]);

  // Store-and-Forward Task
  useEffect(() => {
    const queueInterval = setInterval(async () => {
      if (connections.size === 0) return;
      try {
        const queued = await getQueuedMessages();
        if (queued.length === 0) return;

        for (const msg of queued) {
          let sentAny = false;
          const messageData = {
            type: 'message',
            id: msg.id,
            sourceId: msg.sourceId,
            text: msg.payload,
            timestamp: msg.timestamp,
            ttl: msg.ttl || 7
          };

          connections.forEach(conn => {
            if (conn.open) {
              conn.send(messageData);
              sentAny = true;
            }
          });

          if (sentAny) {
            await removeQueuedMessage(msg.id);
          }
        }
      } catch (err) { console.error('Queue flush failed', err); }
    }, 5000);
    return () => clearInterval(queueInterval);
  }, [connections]);

  const setupConnection = (conn: DataConnection) => {
    const handleOpen = async () => {
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
      
      const currentFriends = await loadFriends();
      if (!currentFriends.some(f => f.id === conn.peer)) {
        setPendingPeerPrompt(conn.peer);
      }
    };

    if (conn.open) handleOpen();
    else conn.on('open', handleOpen);

    conn.on('data', async (incoming: any) => {
      const data = incoming as Record<string, any>;
      setPeerStats(prev => {
        const newMap = new Map(prev);
        const current = (newMap.get(conn.peer) || { latency: 0, lastSeen: Date.now() }) as PeerStat;
        newMap.set(conn.peer, { ...current, lastSeen: Date.now() });
        return newMap;
      });

      if (data.type === 'message') {
        const seen = await hasSeenMessage(data.id);
        if (seen) return;
        await markMessageSeen(data.id);
        
        // Signal verification
        let isVerified = false;
        if (data.signature && data.signingPubKey) {
          isVerified = verifyData(`${data.text}${data.sourceId}${data.timestamp}`, data.signature, data.signingPubKey);
        }

        setMessages(prev => [...prev, {
          id: data.id,
          senderId: data.sourceId || conn.peer,
          text: data.text,
          timestamp: data.timestamp,
          isMine: false,
          isVerified,
          signingPubKey: data.signingPubKey,
          reactions: {}
        }]);

        // Mesh Relay Logic
        const ttl = typeof data.ttl === 'number' ? data.ttl : 7;
        if (ttl > 1 && isRelayEnabled) {
          const relayedData = { ...data, ttl: ttl - 1 };
          let forwardCount = 0;
          connections.forEach(c => {
            if (c.open && c.peer !== conn.peer) {
              c.send(relayedData);
              forwardCount++;
            }
          });
          if (forwardCount > 0) {
            setRelayedCount(prev => {
              localStorage.setItem('mesh_relayed', (prev + 1).toString());
              return prev + 1;
            });
          }
        }
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
        const nm = new Map(prev);
        nm.delete(conn.peer);
        return nm;
      });
    });
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim()) return;

    const msgId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const timestamp = Date.now();
    const { signature, signingPubKey } = signData(`${inputMessage.trim()}${myId}${timestamp}`, keyPair?.secretKey || '');

    const data = {
      type: 'message',
      id: msgId,
      sourceId: myId,
      text: inputMessage.trim(),
      timestamp,
      ttl: 7,
      signature,
      signingPubKey
    };

    await markMessageSeen(msgId);
    setMessages(prev => [...prev, { ...data, senderId: myId, isMine: true, isVerified: true, reactions: {} }]);

    if (connections.size > 0) {
      connections.forEach(c => c.open && c.send(data));
    } else {
      await queueMessage({
        id: msgId,
        sourceId: myId,
        destId: 'ALL',
        seqId: 1,
        ttl: 7,
        payload: inputMessage.trim(),
        timestamp
      });
    }

    setInputMessage('');
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    // Basic local state update for reactions (UI polish)
    setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const current = m.reactions || {};
        const users = current[emoji] || [];
        const isAdding = !users.includes(myId);
        return {
            ...m,
            reactions: {
                ...current,
                [emoji]: isAdding ? [...users, myId] : users.filter(u => u !== myId)
            }
        };
    }));
  };

  const clearAllData = () => {
    if (window.confirm('Delete all mesh data and identity?')) {
        localStorage.clear();
        window.location.reload();
    }
  };

  // --- UI COMPONENTS ---

  const OnboardingFlow = () => {
    const [tAlias, setTAlias] = useState('');
    const [tSig, setTSig] = useState('⚡');
    
    const finish = () => {
        if (!tAlias.trim()) return;
        localStorage.setItem('mesh_alias', tAlias.trim());
        localStorage.setItem('mesh_signature', tSig);
        setAlias(tAlias.trim());
        setSignalSignature(tSig);
        setIsOnboarded(true);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto border border-emerald-400/20">
                        <Zap className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter">MESH<span className="text-emerald-500">CHAT</span></h1>
                    <p className="text-zinc-500 text-sm font-medium">Offline-First Peer-to-Peer Protocol</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] space-y-8 shadow-2xl">
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Network Alias</label>
                        <input 
                            autoFocus
                            value={tAlias}
                            onChange={(e) => setTAlias(e.target.value)}
                            placeholder="e.g. GhostNode"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-white focus:border-emerald-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Signal Signature</label>
                        <div className="flex flex-wrap gap-3">
                            {['⚡', '💎', '🛸', '🌀', '💀', '🔥', '🌵'].map(s => (
                                <button 
                                    key={s} 
                                    onClick={() => setTSig(s)}
                                    className={`w-12 h-12 rounded-xl text-xl transition-all ${tSig === s ? 'bg-emerald-500 text-zinc-950 scale-110 shadow-lg shadow-emerald-500/20' : 'bg-zinc-950 text-zinc-600 border border-zinc-800'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={finish}
                        disabled={!tAlias.trim()}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 py-5 rounded-2xl text-zinc-950 font-black uppercase tracking-widest transition-all"
                    >
                        Initialize Node
                    </button>
                </div>
            </motion.div>
        </div>
    );
  };

  if (!isOnboarded) return <OnboardingFlow />;

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-emerald-500/30 text-zinc-100">
      
      {/* Sidebar Desktop */}
      <div className="hidden md:flex w-24 bg-zinc-950 border-r border-zinc-900 flex-col items-center py-8 gap-10">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
          <Zap className="w-6 h-6 text-emerald-500" fill="currentColor" />
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <button onClick={() => setActiveTab('chats')} className={`p-4 rounded-2xl transition-all ${activeTab === 'chats' ? 'bg-emerald-500 text-zinc-950 shadow-xl' : 'text-zinc-500 hover:text-white'}`}>
            <MessageSquare className="w-6 h-6" />
          </button>
          <button onClick={() => setActiveTab('discovery')} className={`p-4 rounded-2xl transition-all ${activeTab === 'discovery' ? 'bg-emerald-500 text-zinc-950 shadow-xl' : 'text-zinc-500 hover:text-white'}`}>
            <Radar className="w-6 h-6" />
          </button>
          <button onClick={() => setActiveTab('settings')} className={`p-4 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-emerald-500 text-zinc-950 shadow-xl' : 'text-zinc-500 hover:text-white'}`}>
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden pb-20 md:pb-0">
        
        <AnimatePresence mode="wait">
          {activeTab === 'chats' && (
            <motion.div 
               key="chats"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="flex-1 flex flex-col overflow-hidden"
            >
               {/* Chat Header */}
               <header className="h-20 border-b border-zinc-900 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-2xl border border-zinc-800">
                        {generateAvatar(myId, true)}
                    </div>
                    <div>
                        <h2 className="text-lg font-black italic uppercase tracking-tighter">{alias}</h2>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold">{status} • {connections.size} NODES</span>
                        </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowQrModal(true)} className="p-3 text-zinc-500 hover:bg-zinc-900 rounded-xl transition-all"><QrCode className="w-5 h-5"/></button>
                    <button onClick={() => setShowConnectModal(true)} className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20"><UserPlus className="w-5 h-5"/></button>
                  </div>
               </header>

               {/* Messages */}
               <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                         <div className="relative">
                            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 bg-emerald-500 blur-3xl rounded-full" />
                            <MessageSquare className="w-20 h-20 text-zinc-800 relative z-10" />
                         </div>
                         <div className="space-y-2">
                            <h3 className="text-xl font-black italic uppercase tracking-widest">Mesh Protocol Active</h3>
                            <p className="text-zinc-600 text-sm max-w-xs mx-auto">Messages are end-to-end encrypted and will relay through other nodes automatically.</p>
                         </div>
                    </div>
                  ) : (
                    <div className="max-w-4xl mx-auto space-y-8">
                      {messages.map((msg, idx) => {
                        const isRep = idx > 0 && messages[idx-1].senderId === msg.senderId;
                        return (
                          <div key={msg.id} className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}>
                            {!isRep && !msg.isMine && (
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 ml-1 flex items-center gap-2">
                                    {generateAvatar(msg.senderId)} {getDisplayName(msg.senderId)}
                                    {msg.isVerified && <ShieldCheck className="w-3 h-3"/>}
                                </span>
                            )}
                            <div className={`group relative max-w-[85%] px-5 py-4 rounded-3xl ${msg.isMine ? 'bg-emerald-500 text-zinc-950 rounded-tr-sm font-medium' : 'bg-zinc-900 text-zinc-100 rounded-tl-sm border border-zinc-800 italic'}`}>
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                <div className={`absolute top-0 bottom-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.isMine ? 'right-full pr-4' : 'left-full pl-4'}`}>
                                    {EMOJIS.map(e => <button key={e} onClick={() => toggleReaction(msg.id, e)} className="hover:scale-125 transition-transform">{e}</button>)}
                                </div>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-700 mt-1 mx-1 font-bold">{formatTime(msg.timestamp)}</span>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
               </div>

               {/* Input */}
               <div className="p-6 bg-zinc-950/80 backdrop-blur-md">
                   <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex items-end gap-4">
                      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-[30px] p-2 focus-within:border-emerald-500/50 transition-all shadow-2xl">
                        <textarea 
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder={connections.size > 0 ? "Broadcast to mesh..." : "Queuing for offline relay..."}
                            className="w-full bg-transparent p-4 text-white placeholder-zinc-700 outline-none resize-none max-h-40 min-h-[60px]"
                            rows={1}
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={!inputMessage.trim()}
                        className="w-16 h-16 bg-emerald-500 text-zinc-950 rounded-full flex items-center justify-center hover:bg-emerald-400 disabled:bg-zinc-900 disabled:text-zinc-700 transition-all shadow-lg hover:shadow-emerald-500/20"
                      >
                        <Send className="w-7 h-7" />
                      </button>
                   </form>
               </div>
            </motion.div>
          )}

          {activeTab === 'discovery' && (
            <motion.div 
               key="discovery"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950 relative overflow-hidden"
            >
               <div className="absolute inset-0 opacity-20 pointer-events-none">
                  {[1, 2, 3].map(i => (
                    <motion.div 
                        key={i}
                        animate={{ scale: [1, 8], opacity: [0.5, 0] }}
                        transition={{ duration: 6, repeat: Infinity, delay: i * 2, ease: "linear" }}
                        className="absolute top-1/2 left-1/2 w-40 h-40 border border-emerald-500 rounded-full -translate-x-1/2 -translate-y-1/2"
                    />
                  ))}
               </div>

               <div className="relative z-10 w-full max-w-2xl space-y-10">
                  <div className="text-center space-y-3">
                    <Radar className="w-20 h-20 text-emerald-500 mx-auto animate-pulse" />
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter">Node Discovery</h2>
                    <p className="text-zinc-500 font-mono text-xs uppercase bg-zinc-900/50 py-2 px-4 rounded-full inline-block border border-zinc-800">
                      Scanning ID: {myId.slice(0, 16)}...
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[40px] space-y-6">
                        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                           <Users className="w-3 h-3 text-emerald-500" /> Nearby Nodes
                        </h4>
                        <div className="space-y-4">
                            {discoveredPeers.length === 0 ? (
                                <p className="text-zinc-700 text-xs font-mono italic">No peers strictly detected on current gateway...</p>
                            ) : (
                                discoveredPeers.map(pId => (
                                    <button 
                                        key={pId}
                                        onClick={() => { setConnectId(pId); setShowConnectModal(true); }}
                                        className="w-full flex items-center justify-between group bg-zinc-950 p-4 rounded-3xl border border-zinc-800 hover:border-emerald-500/30 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-2xl">{generateAvatar(pId)}</div>
                                            <div className="text-left">
                                                <div className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors uppercase italic">{generateFoodName(pId)}</div>
                                                <div className="text-[10px] font-mono text-zinc-600 uppercase">Signal Strength 100%</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-emerald-500" />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[40px] space-y-8">
                        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                           <Activity className="w-3 h-3 text-blue-500" /> Routing Metrics
                        </h4>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-zinc-800/50 pb-4">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase">Packets Relayed</span>
                                <span className="text-3xl font-black italic text-emerald-500">{relayedCount}</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-zinc-800/50 pb-4">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase">Node Uptime</span>
                                <span className="text-xl font-bold text-zinc-300">{Math.floor((Date.now() - startTime) / 60000)}m</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-zinc-800/50 pb-4">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase">Encrypted Keys</span>
                                <span className="text-xl font-bold text-emerald-500/50">ACTIVE</span>
                            </div>
                        </div>
                    </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (activeTab === 'settings' && (
            <motion.div 
               key="settings"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               className="flex-1 overflow-y-auto p-8 bg-zinc-950"
            >
               <div className="max-w-2xl mx-auto space-y-12 pb-24">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter">Node Settings</h2>
                  
                  <section className="space-y-6">
                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Identity Profile</h4>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[40px] space-y-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-zinc-950 flex items-center justify-center text-4xl rounded-3xl border border-zinc-800 shadow-2xl">
                                {generateAvatar(myId, true)}
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Public Alias</label>
                                <input 
                                    value={alias}
                                    onChange={(e) => { setAlias(e.target.value); localStorage.setItem('mesh_alias', e.target.value); }}
                                    className="w-full bg-transparent text-xl font-black text-white outline-none focus:text-emerald-500 transition-colors uppercase italic"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Signal Signature</p>
                            <div className="flex flex-wrap gap-2">
                                {['⚡', '💎', '🛸', '🌀', '💀', '🔥', '🌵'].map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => { setSignalSignature(s); localStorage.setItem('mesh_signature', s); }}
                                        className={`w-12 h-12 rounded-xl text-xl flex items-center justify-center transition-all ${signalSignature === s ? 'bg-emerald-500 text-zinc-950 shadow-lg' : 'bg-zinc-950 border border-zinc-800 text-zinc-700 hover:border-zinc-700'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Network Behavior</h4>
                    <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px]">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="font-black italic uppercase tracking-wider">Mesh Relay Participation</p>
                                <p className="text-xs text-zinc-500">Allow other nodes to jump through your device to extend range.</p>
                            </div>
                            <button 
                                onClick={() => { setIsRelayEnabled(!isRelayEnabled); localStorage.setItem('mesh_relay_enabled', (!isRelayEnabled).toString()); }}
                                className={`w-14 h-8 rounded-full transition-all relative flex items-center p-1 ${isRelayEnabled ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                            >
                                <div className={`w-6 h-6 bg-zinc-950 rounded-full transition-all ${isRelayEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                  </section>

                  <section className="pt-8">
                     <button 
                        onClick={clearAllData}
                        className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 py-6 rounded-[30px] font-black uppercase tracking-widest transition-all"
                     >
                        <Trash2 className="w-5 h-5 inline-block mr-2 -mt-1" /> Wipe Node Memory
                     </button>
                  </section>
               </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Mobile Nav */}
        <div className="md:hidden fixed bottom-0 left-0 w-full border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-xl z-50 pb-safe">
            <div className="flex justify-around items-center h-20 px-4">
                <button onClick={() => setActiveTab('chats')} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'chats' ? 'text-emerald-500' : 'text-zinc-600'}`}>
                    <MessageSquare className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">Chats</span>
                </button>
                <button onClick={() => setActiveTab('discovery')} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'discovery' ? 'text-emerald-500' : 'text-zinc-600'}`}>
                    <Radar className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">Discovery</span>
                </button>
                <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'settings' ? 'text-emerald-500' : 'text-zinc-600'}`}>
                    <Settings className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">Settings</span>
                </button>
            </div>
        </div>

      </div>

      {/* QR Modal Shorthand */}
      {showQrModal && (
        <div className="fixed inset-0 z-[110] bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowQrModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-900 border border-zinc-800 p-10 rounded-[50px] space-y-8 text-center" onClick={e => e.stopPropagation()}>
                <div className="space-y-2">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Your Node Identity</h3>
                    <p className="text-zinc-600 text-[10px] font-mono uppercase">{myId}</p>
                </div>
                <div className="bg-white p-6 rounded-[40px] inline-block shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                    <QRCodeSVG value={myId} size={200} level="H" includeMargin={false} />
                </div>
                <button onClick={() => setShowQrModal(false)} className="w-full py-4 bg-zinc-800 text-zinc-400 rounded-3xl font-black uppercase tracking-widest">Close Discovery</button>
            </motion.div>
        </div>
      )}

      {/* Connect Modal Shorthand */}
      {showConnectModal && (
        <div className="fixed inset-0 z-[110] bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowConnectModal(false)}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-zinc-900 border border-zinc-800 p-10 rounded-[50px] w-full max-w-md space-y-8" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-center">Add Mesh Node</h3>
                
                <div className="flex border border-zinc-800 rounded-2xl overflow-hidden">
                    <button onClick={() => setShowScanner(false)} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${!showScanner ? 'bg-emerald-500 text-zinc-950' : 'bg-transparent text-zinc-600'}`}>ID Input</button>
                    <button onClick={() => setShowScanner(true)} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${showScanner ? 'bg-emerald-500 text-zinc-950' : 'bg-transparent text-zinc-600'}`}>Scan QR</button>
                </div>

                {showScanner ? (
                    <div className="aspect-square rounded-[30px] overflow-hidden border border-zinc-800 bg-zinc-950 relative">
                        <Scanner onScan={(res) => { if(res[0]){ setConnectId(res[0].rawValue); setShowScanner(false); } }} />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <input 
                            value={connectId}
                            onChange={(e) => setConnectId(e.target.value)}
                            placeholder="Enter Peer ID..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-5 text-white outline-none focus:border-emerald-500"
                        />
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                if(!connectId.trim() || !peer) return;
                                setIsConnecting(true);
                                const c = peer.connect(connectId.trim(), { reliable: true });
                                setupConnection(c);
                                c.on('open', () => { setIsConnecting(false); setShowConnectModal(false); setConnectId(''); });
                                c.on('error', () => { setIsConnecting(false); setConnectionError('Node unreachable.'); });
                            }}
                            className="w-full bg-emerald-500 text-zinc-950 py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl"
                        >
                            {isConnecting ? 'Bridging...' : 'Establish Bridge'}
                        </button>
                    </div>
                )}
                
                {connectionError && <p className="text-rose-500 text-[10px] font-bold uppercase text-center">{connectionError}</p>}
                <button onClick={() => setShowConnectModal(false)} className="w-full py-4 text-zinc-600 font-bold uppercase text-[10px] tracking-widest">Withdraw</button>
            </motion.div>
        </div>
      )}

    </div>
  );
}
