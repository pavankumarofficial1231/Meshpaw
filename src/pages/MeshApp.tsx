/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Star,
  ShieldCheck,
  Settings,
  Check,
  CheckCheck,
  Mic,
  Square,
  FileText,
  Brain,
  Timer,
  Paperclip,
  Trash2,
  Hash,
  LogOut,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAuth0 } from '@auth0/auth0-react';
import { generateKeys, KeyPair, signData, verifyData } from '../lib/crypto';
import { startRecording, stopRecording } from '../lib/audio';
import { hasSeenMessage, markMessageSeen, queueMessage, getQueuedMessages, removeQueuedMessage, loadFriends, saveFriend, removeFriend, FriendNode, exportDataMule, importDataMule } from '../lib/store';
import { resolveBroker } from '../lib/broker';
import { SharedPad } from '../components/SharedPad';

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
  status: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'audio' | 'file';
  roomId?: string;
  expiresAt?: number;
  fileName?: string;
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

export default function MeshApp() {
  const { user: authUser, isAuthenticated: authIsAuthenticated, logout, loginWithRedirect } = useAuth0();

  // Custom Identity & Status States (RESTORATION)
  const [myAlias, setMyAlias] = useState(localStorage.getItem('meshpaw_alias') || '');
  const [myStatus, setMyStatus] = useState(localStorage.getItem('meshpaw_status') || 'Available');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [dmTarget, setDmTarget] = useState<string | null>(null);

  const [myId, setMyId] = useState<string>('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<Map<string, DataConnection>>(new Map());
  const [peerStats, setPeerStats] = useState<Map<string, PeerStat>>(new Map());
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const statsRef = useRef<Map<string, PeerStat>>(new Map());

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connectId, setConnectId] = useState('');
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const keyPairRef = useRef<KeyPair | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const myIdRef = useRef<string>('');

  // UI States
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReactionMsg, setActiveReactionMsg] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [hasDismissedInstall, setHasDismissedInstall] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'radar' | 'peers' | 'pad'>('chat');
  const [incomingCRDT, setIncomingCRDT] = useState<Uint8Array[]>([]);
  const [pendingPeerPrompt, setPendingPeerPrompt] = useState<string | null>(null);
  const [viewPeerInfo, setViewPeerInfo] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [scannedIdentity, setScannedIdentity] = useState<{ id: string; alias: string; pub: string; ver: number } | null>(null);
  const [forceCloud, setForceCloud] = useState(false);
  const [nonce, setNonce] = useState(0); // For forced re-initialization
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [activeRoom, setActiveRoom] = useState<string>('GLOBAL');
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomInput, setRoomInput] = useState('');

  const [ephemeralSeconds, setEphemeralSeconds] = useState<number>(0);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Ephemeral Garbage Collector
  useEffect(() => {
    const gc = setInterval(() => {
      const now = Date.now();
      setMessages(prev => {
        let dirty = false;
        const next = prev.filter(m => {
          if (m.expiresAt && now > m.expiresAt) {
            dirty = true;
            return false;
          }
          return true;
        });
        return dirty ? next : prev;
      });
    }, 1000);
    return () => clearInterval(gc);
  }, []);

  const hashRoomName = async (name: string) => {
    if (!name || name.trim().toUpperCase() === 'GLOBAL') return 'GLOBAL';
    const msgUint8 = new TextEncoder().encode(name.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  };



  const [friends, setFriends] = useState<FriendNode[]>([]);
  const [discoveredPeers, setDiscoveredPeers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Local Discovery Polling
  useEffect(() => {
    let interval: any;
    const fetchLocalPeers = async () => {
      if (activeTab !== 'radar' || !peer || forceCloud) return;
      try {
        const isSecure = peer.options.secure ? 'https' : 'http';
        const hostname = peer.options.host;
        const port = peer.options.port ? `:${peer.options.port}` : '';
        const path = peer.options.path || '/peerjs';

        // PeerJS default discovery endpoint when allow_discovery: true
        const res = await fetch(`${isSecure}://${hostname}${port}${path}/peerjs/peers`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setDiscoveredPeers(data.filter((id: string) => id !== myIdRef.current && !connectionsRef.current.has(id)));
        }
      } catch (e) {
        // Discovery endpoint probably not enabled on remote brokers
      }
    };

    if (activeTab === 'radar') {
      fetchLocalPeers();
      interval = setInterval(fetchLocalPeers, 4000);
    }
    return () => clearInterval(interval);
  }, [activeTab, forceCloud, peer]);

  // Load Friends from DB
  useEffect(() => {
    loadFriends()
      .then(f => {
        setFriends(f);
        console.log(`DB Connected: ${f.length} peers saved.`);
      })
      .catch(err => {
        console.log(`ERR: Database Blocked. Check browser shields.`);
      });
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
    if (id === myId) return myAlias || (authIsAuthenticated && authUser?.name) || generateFoodName(id);
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

  const initPeer = useCallback(() => {
    // 1. Identity Layer: Cryptographic Key Generation
    const savedKeys = localStorage.getItem('meshpaw_keys');
    let keys: KeyPair;
    try {
      if (savedKeys) {
        keys = JSON.parse(savedKeys);
        console.log(`Keys Loaded: ${keys.publicKey.substring(0, 10)}...`);
      } else {
        keys = generateKeys();
        localStorage.setItem('meshpaw_keys', JSON.stringify(keys));
        console.log(`New Identity Forged.`);
      }
    } catch (e) {
      console.log(`ERR: Cryptography fail. Browser blocks window.crypto?`);
      return;
    }

    setKeyPair(keys);
    keyPairRef.current = keys;

    const rawBase64 = keys.publicKey.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const baseId = `mp-${rawBase64.replace(/[^a-zA-Z0-9\-_]/g, '')}`;
    const peerId = nonce > 0 ? `${baseId}-${nonce}` : baseId;

    setStatus('connecting');

    const peerConfig = resolveBroker(forceCloud);
    const isCloud = !!peerConfig.key;

    if (peerRef.current) {
      peerRef.current.destroy();
    }

    const newPeer = new Peer(peerId, {
      ...peerConfig,
      pingInterval: 3000,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          { urls: 'stun:stun.services.mozilla.com' },
          { urls: 'stun:stun.node.com:3478' }
        ]
      }
    });

    peerRef.current = newPeer;

    newPeer.on('open', (id) => {
      myIdRef.current = id;
      setMyId(id);
      setStatus('connected');
      console.log(`Signaling OK. ID: ${id}`);
    });

    newPeer.on('connection', (conn) => {
      console.log(`Incoming link: ${conn.peer}`);
      setupConnection(conn);
    });

    newPeer.on('error', (err: any) => {
      const type = err.type || 'unknown';
      console.log(`ERR: ${type} - ${err.message}`);

      if (type === 'invalid-id' || type === 'unavailable-id') {
        setStatus('disconnected');
        setConnectionError('Repairing identity...');
        setTimeout(() => setNonce(prev => prev + 1), 2000);
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
  }, [nonce, forceCloud]);

  // Initial Boot
  useEffect(() => {
    initPeer();
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [initPeer]);

  // Read Receipts Sync on Focus
  useEffect(() => {
    const markAllRead = () => {
      if (document.hidden) return;

      const unreadIds = messages
        .filter(m => !m.isMine && m.status !== 'read')
        .map(m => m.id);

      if (unreadIds.length > 0) {
        setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, status: 'read' } : m));

        // Notify the mesh we've read them
        unreadIds.forEach(id => {
          connectionsRef.current.forEach(conn => {
            if (conn.open) {
              conn.send({ type: 'ack', messageId: id, status: 'read', senderId: myIdRef.current });
            }
          });
        });
      }
    };

    window.addEventListener('focus', markAllRead);
    document.addEventListener('visibilitychange', markAllRead);
    markAllRead(); // Check immediately

    return () => {
      window.removeEventListener('focus', markAllRead);
      document.removeEventListener('visibilitychange', markAllRead);
    };
  }, [messages.length]);

  // Store-and-Forward Flusher
  useEffect(() => {
    const queueInterval = setInterval(async () => {
      const activeConns = connectionsRef.current;
      if (activeConns.size === 0) return;

      try {
        const queued = await getQueuedMessages();
        if (queued.length === 0) return;

        console.log(`[Mesh] Flushing ${queued.length} items...`);
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

          activeConns.forEach(conn => {
            if (conn.open) {
              conn.send(messageData);
              sentAny = true;
            }
          });

          if (sentAny) {
            await removeQueuedMessage(msg.id);
          }
        }
      } catch (err) {
        console.error('Queue flush failed:', err);
      }
    }, 5000);

    return () => clearInterval(queueInterval);
  }, []);

  // Ping interval
  useEffect(() => {
    const interval = setInterval(() => {
      connectionsRef.current.forEach(conn => {
        if (conn.open) {
          conn.send({ type: 'ping', timestamp: Date.now() });
        }
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const setupConnection = (conn: DataConnection) => {
    const handleOpen = async () => {
      statsRef.current.set(conn.peer, { latency: 0, lastSeen: Date.now() });
      connectionsRef.current.set(conn.peer, conn);

      setConnections(new Map(connectionsRef.current));
      setPeerStats(new Map(statsRef.current));

      const currentFriends = await loadFriends();
      if (!currentFriends.some(f => f.id === conn.peer)) {
        setPendingPeerPrompt(conn.peer);
      }
    };

    if (conn.open) {
      handleOpen();
    } else {
      conn.on('open', handleOpen);
    }

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

        // 3. Verify Signature
        const signature = data.signature;
        const signingPubKey = data.signingPubKey;
        let isVerified = false;
        if (signature && signingPubKey) {
          isVerified = verifyData(`${data.text}${data.sourceId}${data.timestamp}`, signature, signingPubKey);
        }

        // Render to UI
        setMessages(prev => [...prev, {
          id: data.id,
          roomId: data.roomId || 'GLOBAL',
          senderId: data.sourceId || conn.peer,
          text: data.text,
          timestamp: data.timestamp,
          isMine: false,
          isVerified,
          signingPubKey,
          reactions: {},
          status: 'read', // If I see it, I've at least 'received' it
          type: data.payloadType || 'text'
        }]);

        // Send 'Delivered' Ack back to source immediately
        if (data.sourceId) {
          connectionsRef.current.forEach(fConn => {
            if (fConn.open) {
              // Status Flow: 
              // 1. Immediately send DELIVERED (Gray Double Tick)
              fConn.send({ type: 'ack', messageId: data.id, status: 'delivered', senderId: myIdRef.current });

              // 2. If browser is focused, OR when focus returns, send READ (Emerald Double Tick)
              if (!document.hidden) {
                fConn.send({ type: 'ack', messageId: data.id, status: 'read', senderId: myIdRef.current });
              }
            }
          });
        }

        // 2. Decrement TTL and Rebroadcast to everyone else
        const ttl = typeof data.ttl === 'number' ? data.ttl : 7; // Default 7 hops
        if (ttl > 1) {
          const forwardedData = { ...data, ttl: ttl - 1 };
          connectionsRef.current.forEach(forwardConn => {
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
      } else if (data.type === 'crdt') {
        if (data.roomId === activeRoom) {
          const decoded = Uint8Array.from(atob(data.update), c => c.charCodeAt(0));
          setIncomingCRDT(prev => [...prev, decoded]);
        }
        // Rebroadcast CRDT (Gossip)
        const ttl = typeof data.ttl === 'number' ? data.ttl : 7;
        if (ttl > 1) {
          const forwardedData = { ...data, ttl: ttl - 1 };
          connectionsRef.current.forEach(forwardConn => {
            if (forwardConn.open && forwardConn.peer !== conn.peer) {
              forwardConn.send(forwardedData);
            }
          });
        }
      } else if (data.type === 'ack') {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId && msg.isMine) {
            // Status Priority: read (3) > delivered (2) > sent (1)
            const statusLevels: Record<string, number> = { 'sent': 1, 'delivered': 2, 'read': 3 };
            const currentLevel = statusLevels[msg.status] || 0;
            const newLevel = statusLevels[data.status] || 0;
            if (newLevel > currentLevel) {
              return { ...msg, status: data.status as 'sent' | 'delivered' | 'read' };
            }
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
      setConnectionError(null);
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    doConnect(peer, targetId, () => {
      setShowConnectModal(false);
      setConnectId('');
    });
  };

  // Single reusable connect helper — used by both manual entry and QR scan.
  // All actual connection events are handled inside setupConnection.
  // This only handles the UI side-effects (modal close, error display, spinner).
  const doConnect = (p: typeof peer, targetId: string, onSuccess?: () => void) => {
    if (!p) return;
    const conn = p.connect(targetId, {
      reliable: true,
      metadata: { sourceId: myId }
    });
    setupConnection(conn);

    const t = setTimeout(() => {
      setIsConnecting(false);
      if (!conn.open) {
        setConnectionError('Timed out — make sure both devices are on the same Wi-Fi/hotspot.');
      }
    }, 20000);

    conn.on('open', () => {
      clearTimeout(t);
      setIsConnecting(false);
      setConnectionError(null);
      onSuccess?.();
    });

    conn.on('error', (err: any) => {
      clearTimeout(t);
      setIsConnecting(false);
      setConnectionError(`Could not connect: ${err.type || err.message || 'check peer ID'}`);
    });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Packet Structure
    const text = inputMessage.trim();
    const messageId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now();

    // Sign the message (using the exact same values as the packet)
    const { signature, signingPubKey } = signData(`${text}${myIdRef.current}${timestamp}`, keyPairRef.current?.secretKey || '');

    const sendData = {
      type: 'message',
      id: messageId,
      roomId: activeRoom,
      sourceId: myIdRef.current,
      destId: 'ALL',
      ttl: 7,
      text: text,
      timestamp: timestamp,
      signature,
      signingPubKey,
      expiresAt: ephemeralSeconds > 0 ? timestamp + (ephemeralSeconds * 1000) : undefined
    };

    // Mark as seen so we don't echo our own messages
    await markMessageSeen(messageId);

    // Render locally immediately
    setMessages(prev => [...prev, {
      id: messageId,
      roomId: activeRoom,
      senderId: myId,
      text: inputMessage.trim(),
      timestamp: sendData.timestamp,
      isMine: true,
      isVerified: true,
      signingPubKey,
      reactions: {},
      status: 'sent',
      expiresAt: sendData.expiresAt
    }]);

    // Send to all connected peers
    const activeConns = connectionsRef.current;
    if (activeConns.size > 0) {
      activeConns.forEach(conn => {
        if (conn.open) {
          conn.send(sendData);
        }
      });
    } else {
      // Offline mode: Queue for the future forward
      await queueMessage({
        id: messageId,
        roomId: activeRoom,
        sourceId: myIdRef.current,
        destId: 'ALL',
        seqId: 0,
        ttl: 7,
        payload: inputMessage.trim(),
        timestamp: timestamp
      });
    }

    setInputMessage('');
  };

  const sendAudioMessage = async (base64Audio: string) => {
    const text = base64Audio;
    const messageId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now();
    const { signature, signingPubKey } = signData(`${text}${myIdRef.current}${timestamp}`, keyPairRef.current?.secretKey || '');

    const messageData = {
      type: 'message',
      payloadType: 'audio',
      id: messageId,
      roomId: activeRoom,
      sourceId: myIdRef.current,
      destId: 'ALL',
      ttl: 7,
      text: text,
      timestamp: timestamp,
      signature,
      signingPubKey
    };

    await markMessageSeen(messageId);

    setMessages(prev => [...prev, {
      id: messageId,
      roomId: activeRoom,
      senderId: myIdRef.current || myId,
      text: text,
      timestamp: timestamp,
      isMine: true,
      isVerified: true,
      signingPubKey,
      reactions: {},
      status: 'sent',
      type: 'audio'
    }]);

    const activeConns = connectionsRef.current;
    if (activeConns.size > 0) {
      activeConns.forEach(conn => {
        if (conn.open) {
          conn.send(messageData);
        }
      });
    } else {
      await queueMessage({
        id: messageId,
        roomId: activeRoom,
        sourceId: myIdRef.current,
        destId: 'ALL',
        seqId: 0,
        ttl: 7,
        payload: text,
        timestamp: timestamp,
        type: 'audio'
      });
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        try {
          const base64Audio = await stopRecording(mediaRecorderRef.current);
          setIsRecording(false);
          mediaRecorderRef.current = null;
          sendAudioMessage(base64Audio);
        } catch (e) {
          console.error(e);
          setIsRecording(false);
        }
      }
    } else {
      try {
        mediaRecorderRef.current = await startRecording();
        setIsRecording(true);
      } catch (e) {
        console.error("Mic access denied", e);
      }
    }
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
      connectionsRef.current.forEach(conn => {
        if (conn.open) {
          conn.send({
            type: 'reaction',
            messageId,
            emoji,
            senderId: myIdRef.current,
            isAdding
          });
        }
      });

      return newMessages;
    });
    setActiveReactionMsg(null);
  };

  const filteredMessages = messages.filter(msg => {
    const matchRoom = (msg.roomId || 'GLOBAL') === activeRoom;
    const matchSearch = msg.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRoom && matchSearch;
  });

  const avgLatency = connectionsRef.current.size > 0
    ? Math.round(Array.from(statsRef.current.values() as Iterable<PeerStat>).reduce((acc: number, stat: PeerStat) => acc + stat.latency, 0) / connectionsRef.current.size)
    : 0;

  return (
    <div className="flex flex-col md:flex-row h-screen h-[100dvh] bg-zinc-950 text-zinc-100 font-sans overflow-hidden">

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (Desktop) / Drawer (Mobile) */}
        <div className={`
          ${activeTab === 'peers' ? 'flex w-full absolute inset-0 z-20 bg-zinc-950' : 'hidden'}
          md:flex md:relative md:w-80 md:bg-zinc-900 border-r border-zinc-800 flex-col h-full overflow-hidden
        `}>
          <div className="flex flex-col h-full pb-16 md:pb-0">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-emerald-400">
                <PawPrint className="w-5 h-5" />
                <span>MeshPaw Base</span>
              </div>
            </div>

            {/* Mesh Sidebar Navigation (Desktop) */}
            <div className="p-2 space-y-1 mt-2">
              <button
                onClick={() => setActiveTab('chat')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'chat' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-semibold">Messages</span>
              </button>
              <button
                onClick={() => setActiveTab('pad')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'pad' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm font-semibold">MeshPad CRDT</span>
              </button>
              <button
                onClick={() => setActiveTab('radar')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'radar' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
              >
                <Radar className="w-4 h-4" />
                <span className="text-sm font-semibold">Mesh Radar</span>
              </button>
              <button
                onClick={() => setActiveTab('peers')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'peers' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-semibold">Address Book</span>
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

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 bg-black ${activeTab === 'peers' ? 'hidden md:flex' : 'flex'} pb-16 md:pb-0`}>
          {/* Header */}
          <header className="h-16 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {status === 'connected' ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full text-xs font-medium">
                      <Wifi className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Online</span>
                    </div>
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
              {activeRoom !== 'GLOBAL' && (
                <div className="items-center bg-zinc-800/80 px-4 py-1.5 rounded-full border border-zinc-700 mx-2 text-xs hidden sm:flex">
                  <span className="text-emerald-400 font-bold mr-1">#</span>
                  <span className="text-zinc-200 font-mono">{activeRoom.substring(0, 10)}</span>
                  <button onClick={() => setActiveRoom('GLOBAL')} className="ml-2 text-zinc-500 hover:text-rose-400 transition-colors"><X className="w-3 h-3" /></button>
                </div>
              )}
              <button
                onClick={() => setShowRoomModal(true)}
                className={`p-2 rounded-full transition-colors flex items-center gap-2 ${activeRoom !== 'GLOBAL' ? 'text-emerald-400 bg-emerald-400/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                title="Join Room"
              >
                <Hash className="w-5 h-5" />
              </button>
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
                onClick={async () => {
                  if (isSummarizing) return;
                  setIsSummarizing(true);
                  try {
                    // @ts-ignore
                    const api = import.meta.env.VITE_GEMINI_API_KEY;
                    if (!api) { alert('VITE_GEMINI_API_KEY is not set in .env.local'); setIsSummarizing(false); return; }
                    const genAI = new GoogleGenerativeAI(api);
                    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                    const history = messages.filter(m => m.roomId === activeRoom).slice(-50).map(m => `${getDisplayName(m.senderId)}: ${m.text}`).join('\n');
                    if (!history) { alert('No messages to summarize.'); setIsSummarizing(false); return; }
                    const prompt = `Summarize the following chat room conversation in a short paragraph:\n\n${history}`;
                    const result = await model.generateContent(prompt);
                    alert(`🤖 Mesh Brain Summary:\n\n${result.response.text()}`);
                  } catch (e) {
                    alert('AI Summarization failed: ' + String(e));
                  }
                  setIsSummarizing(false);
                }}
                className={`p-2 rounded-full transition-colors flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 ${isSummarizing ? 'animate-pulse text-emerald-400' : ''}`}
                title="Summarize Room (Mesh Brain)"
              >
                <Brain className="w-5 h-5" />
              </button>

               <div className="flex items-center gap-4">
               <button onClick={() => setShowRoomModal(true)} className="p-2.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-full border border-white/5 hover:border-emerald-500/50 transition-all">
                  <Plus className="w-5 h-5" />
               </button>
               <button onClick={() => setShowProfileModal(true)} className="p-2.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-full border border-white/5 transition-all">
                  <User className="w-5 h-5" />
               </button>
               <button onClick={() => setShowSettings(true)} className="p-2.5 text-zinc-400 hover:text-white bg-zinc-900 rounded-full border border-white/5 transition-all">
                  <Settings className="w-5 h-5" />
               </button>
               
               {/* Auth0 Login/Identity Hook */}
               {authIsAuthenticated ? (
                  <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                     <img src={authUser?.picture} className="w-8 h-8 rounded-full border border-emerald-500/50" />
                     <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} className="text-zinc-500 hover:text-red-400 transition-colors">
                        <LogOut className="w-4 h-4" />
                     </button>
                  </div>
               ) : (
                  <button onClick={() => loginWithRedirect()} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-white hover:text-black rounded-xl text-xs font-black transition-all border border-white/5 uppercase tracking-widest">
                     <ShieldCheck className="w-4 h-4" /> Sign In
                  </button>
               )}
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

          {/* Radar View OR Chat */}
          {activeTab === 'radar' ? (
            <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-6 bg-zinc-950">
              <div className="text-center z-10 mb-8 absolute top-6 md:top-8">
                <h2 className="text-xl md:text-2xl font-bold text-emerald-400 tracking-wider uppercase mb-2">Local Mesh Radar</h2>
                <p className="text-zinc-400 max-w-md mx-auto text-xs md:text-sm">Visualizing active P2P connections.</p>
              </div>

              <div className="relative w-72 h-72 sm:w-96 sm:h-96 md:w-[500px] md:h-[500px] aspect-square rounded-full border border-emerald-500/20 bg-emerald-950/20 shadow-[0_0_100px_rgba(16,185,129,0.1)] flex items-center justify-center overflow-hidden">
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
                  const totalNodes = Math.max(1, connections.size + discoveredPeers.length);
                  const isFriend = friends.some(f => f.id === peerId);
                  const angle = (index * (360 / totalNodes)) * (Math.PI / 180);

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

                {/* Local Discovered Peers (Not Connected) */}
                {discoveredPeers.map((peerId, index) => {
                  const totalNodes = Math.max(1, connections.size + discoveredPeers.length);
                  const angle = ((index + connections.size) * (360 / totalNodes)) * (Math.PI / 180);
                  const distance = 30 + (Math.abs(peerId.charCodeAt(0) % 20)); // Keep outer ring

                  const xVal = 50 + (Math.cos(angle) * distance);
                  const yVal = 50 + (Math.sin(angle) * distance);

                  return (
                    <div
                      key={`disc-${peerId}`}
                      onClick={() => {
                        setConnectId(peerId);
                        setShowConnectModal(true);
                      }}
                      className="absolute z-10 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 cursor-pointer hover:scale-110 hover:z-20 group"
                      style={{ left: `${xVal}%`, top: `${yVal}%` }}
                    >
                      <div className="w-8 h-8 rounded-full border border-zinc-600 bg-zinc-900 border-dashed flex items-center justify-center text-sm opacity-60 group-hover:opacity-100 group-hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        {generateAvatar(peerId)}
                      </div>
                      <div className="mt-1.5 px-2 py-0.5 rounded-full backdrop-blur-md text-[9px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 opacity-60 group-hover:opacity-100 group-hover:text-emerald-400">
                        {generateFoodName(peerId)} (Tap to Mesh)
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
                            <span 
                              onClick={async () => {
                                const dmId = [myId, msg.senderId].sort().join('-');
                                const hashed = await hashRoomName(dmId);
                                setActiveRoom(hashed);
                              }}
                              className="text-xs font-bold text-emerald-300 gap-1 flex items-baseline cursor-pointer hover:underline"
                              title="Start Direct Message"
                            >
                              <span className="text-[10px]">{generateAvatar(msg.senderId)}</span>
                              {getDisplayName(msg.senderId)}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-mono text-zinc-600">#{msg.senderId.substring(0, 10)}</span>
                              {msg.isVerified && (
                                <ShieldCheck className="w-3 h-3 text-emerald-500" title="Verified Mesh Identity" />
                              )}
                            </div>
                          </div>
                        )}

                        <div className={`flex items-center gap-2 ${msg.isMine ? 'flex-row-reverse' : 'flex-row'} relative group`}>
                          <div className={`
                        max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl
                        ${msg.isMine
                              ? 'bg-emerald-600 text-white rounded-br-sm'
                              : 'bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700'}
                      `}>
                            {msg.type === 'audio' ? (
                              <audio controls src={msg.text} className={`h-8 w-48 max-w-full ${msg.isMine ? '' : 'filter invert mix-blend-screen'}`} />
                            ) : msg.type === 'file' ? (
                              <div className="flex items-center gap-3 py-1">
                                <div className="p-3 bg-zinc-950/30 rounded-lg"><FileText className="w-6 h-6" /></div>
                                <div className="overflow-hidden">
                                  <div className="text-sm font-bold truncate max-w-[200px]">{msg.fileName || 'Unknown File'}</div>
                                  <a
                                    href={msg.text}
                                    download={msg.fileName || 'download'}
                                    className={`text-[11px] font-bold ${msg.isMine ? 'text-emerald-200 hover:text-white' : 'text-emerald-400 hover:text-emerald-300'} underline`}
                                  >
                                    Download Payload
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="relative">
                                {msg.expiresAt && (
                                  <div className="absolute -top-4 -right-1 text-[9px] font-mono text-zinc-500 bg-black/40 px-1 rounded backdrop-blur-sm flex items-center gap-1">
                                    <Timer className="w-2 h-2" /> {(Math.max(0, msg.expiresAt - Date.now()) / 1000).toFixed(0)}s
                                  </div>
                                )}
                                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                  {highlightText(msg.text, searchQuery)}
                                </p>
                              </div>
                            )}
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

                        <div className="flex items-center gap-1 mt-1 mx-1">
                          <span className="text-[10px] text-zinc-600 font-medium">
                            {formatTime(msg.timestamp)}
                          </span>
                          {msg.isMine && (
                            <div className="flex text-[10px]">
                              {msg.status === 'sent' && <Check className="w-3 h-3 text-zinc-600" />}
                              {msg.status === 'delivered' && <CheckCheck className="w-3 h-3 text-zinc-600" />}
                              {msg.status === 'read' && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}

          {/* Input Area (Only visible in Chat Tab) */}
          {activeTab === 'chat' && (
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
                {!inputMessage.trim() ? (
                  <div className="flex gap-2">
                    <div className="relative flex items-center">
                      <button
                        type="button"
                        onClick={() => setEphemeralSeconds(s => s === 0 ? 30 : s === 30 ? 60 : 0)}
                        className={`p-3 sm:p-4 rounded-xl transition-colors flex bg-zinc-800 hover:bg-zinc-700 ${ephemeralSeconds > 0 ? 'text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'text-zinc-400'}`}
                        title="Self-Destruct Timer"
                      >
                        <Timer className="w-5 h-5" />
                        {ephemeralSeconds > 0 && <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full pointer-events-none">{ephemeralSeconds}</span>}
                      </button>
                    </div>

                    <label className="p-3 sm:p-4 rounded-xl transition-colors bg-zinc-800 hover:bg-zinc-700 text-zinc-400 cursor-pointer" title="Send P2P File">
                      <Paperclip className="w-5 h-5" />
                      <input type="file" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (re) => {
                          const base64 = re.target?.result as string;
                          const messageId = (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).substring(2, 9);
                          const timestamp = Date.now();
                          const { signature, signingPubKey } = signData(`${base64}${myIdRef.current}${timestamp}`, keyPairRef.current?.secretKey || '');

                          const messageData = {
                            type: 'message',
                            payloadType: 'file',
                            id: messageId,
                            roomId: activeRoom,
                            sourceId: myIdRef.current,
                            destId: 'ALL',
                            ttl: 7,
                            text: base64,
                            fileName: file.name,
                            timestamp: timestamp,
                            signature,
                            signingPubKey,
                            expiresAt: ephemeralSeconds > 0 ? timestamp + (ephemeralSeconds * 1000) : undefined
                          };

                          setMessages(pv => [...pv, {
                            id: messageId, roomId: activeRoom, senderId: myId, text: base64, timestamp,
                            isMine: true, isVerified: true, signingPubKey, reactions: {}, status: 'sent',
                            type: 'file', fileName: file.name, expiresAt: messageData.expiresAt
                          }]);

                          connectionsRef.current.forEach(c => { if (c.open) c.send(messageData); });
                        };
                        reader.readAsDataURL(file);
                      }} />
                    </label>

                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`p-3 sm:p-4 rounded-xl transition-colors flex-shrink-0 ${isRecording ? 'bg-rose-500 hover:bg-rose-400 text-white animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400'}`}
                    >
                      {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className="p-3 sm:p-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-xl transition-colors flex-shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </form>
            </div>
          )}

          {/* Pad Area */}
          {activeTab === 'pad' && (
            <div className="flex-1 w-full bg-zinc-950 overflow-hidden flex flex-col">
              <SharedPad
                myId={myId}
                roomHash={activeRoom}
                incomingUpdates={incomingCRDT}
                broadcastUpdate={(b64) => {
                  const data = {
                    type: 'crdt',
                    update: b64,
                    roomId: activeRoom,
                    ttl: 7
                  };
                  connectionsRef.current.forEach(conn => {
                    if (conn.open) conn.send(data);
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 w-full border-t border-zinc-800 bg-zinc-950/90 [backdrop-filter:blur(8px)] backdrop-blur-lg z-50 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 flex-1 py-2 ${activeTab === 'chat' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-400'}`}>
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wider">MESSAGES</span>
          </button>
          <button onClick={() => setActiveTab('pad')} className={`flex flex-col items-center gap-1 flex-1 py-2 ${activeTab === 'pad' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-400'}`}>
            <FileText className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wider">PAD</span>
          </button>
          <button onClick={() => setActiveTab('radar')} className={`hidden md:flex flex-col items-center gap-1 flex-1 py-2 ${activeTab === 'radar' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-400'}`}>
            <Radar className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wider">RADAR</span>
          </button>
          <button onClick={() => setActiveTab('peers')} className={`flex flex-col items-center gap-1 flex-1 py-2 ${activeTab === 'peers' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-400'}`}>
            <Users className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wider">PEERS</span>
          </button>
        </div>
      </div>

      {/* Modals Overlay */}
      {(showQrModal || showConnectModal || pendingPeerPrompt || viewPeerInfo || scannedIdentity) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">

          {/* Trust Confirmation Screen (from QR Scan) */}
          {scannedIdentity && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 feedback-ripple">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full mx-auto flex items-center justify-center mb-4">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Trust Identity?</h3>
                <p className="text-zinc-400 text-sm">Verify the alias and fingerprint verbally to prevent spoofing.</p>
              </div>

              <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 mb-8 space-y-4">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Mesh Name</div>
                  <div className="text-xl font-bold text-emerald-400">{scannedIdentity.alias}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Key Fingerprint</div>
                  <div className="font-mono text-[11px] text-zinc-300 break-all leading-relaxed">
                    {scannedIdentity.pub.substring(0, 4)}:{scannedIdentity.pub.substring(4, 8)}:...:{scannedIdentity.pub.slice(-4)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    const node = {
                      id: scannedIdentity.id,
                      alias: scannedIdentity.alias,
                      pub: scannedIdentity.pub,
                      addedAt: Date.now(),
                      type: 'permanent'
                    };
                    // Step 5: On Accept
                    await saveFriend({
                      id: node.id,
                      name: node.alias,
                      addedAt: node.addedAt
                    });
                    setFriends(await loadFriends());
                    setScannedIdentity(null);
                    console.log(`Identity Saved: ${node.alias}`);

                    // Auto-connect
                    if (peer) {
                      doConnect(peer, node.id, () => {
                        setActiveTab('chat');
                      });
                    }
                  }}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-2xl transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] transform hover:scale-[1.02] active:scale-95"
                >
                  TRUST & ADD
                </button>
                <button
                  onClick={() => setScannedIdentity(null)}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all"
                >
                  REJECT
                </button>
              </div>
            </div>
          )}

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
                {myId && (
                  <QRCodeSVG
                    value={JSON.stringify({
                      id: myId,
                      alias: generateFoodName(myId),
                      pub: keyPair?.publicKey
                    })}
                    size={250}
                    level="L"
                    includeMargin={true}
                  />
                )}
                {/* Overlay to block browser long-press tooltips on mobile SVG titles */}
                <div className="absolute inset-0 z-10"></div>
              </div>

              <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800 text-center mb-6">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Crypto Address</div>
                <div className="font-mono text-xs font-bold text-emerald-400 break-all">{myId}</div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(myId);
                    alert('Crypto ID copied! Send it via any channel to mesh.');
                  }}
                  className="w-full py-3 px-6 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold rounded-xl transition-all border border-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Copy My Global ID
                </button>

                {navigator.share && (
                  <button
                    onClick={() => {
                      navigator.share({
                        title: 'MeshPaw Node ID',
                        text: `Join my mesh! ID: ${myId}`
                      }).catch(() => { });
                    }}
                    className="w-full py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_4px_10px_rgba(16,185,129,0.3)]"
                  >
                    <Plus className="w-4 h-4" />
                    Share My Node
                  </button>
                )}
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
                  {window.isSecureContext ? (
                    <Scanner
                      onScan={(result) => {
                        const raw = result?.[0]?.rawValue;
                        if (!raw) return;

                        try {
                          const data = JSON.parse(raw);
                          if (data.id && data.pub && data.id !== myId) {
                            setScannedIdentity(data);
                            setShowScanner(false);
                          }
                        } catch (e) {
                          if (raw.length > 20 && raw !== myId) {
                            setConnectId(raw);
                            setShowScanner(false);
                          }
                        }
                      }}
                      constraints={{ facingMode: 'environment' }}
                      onError={(e) => console.error('[Mesh] Scanner Error:', e)}
                    />
                  ) : (
                    <div className="p-8 text-center bg-zinc-950 flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center border border-rose-500/20"><WifiOff className="w-6 h-6" /></div>
                      <div className="text-zinc-200 text-xs font-bold uppercase tracking-widest">Insecure Origin</div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">Browser blocks cameras on local HTTP IPs. Please use the Vercel HTTPS link or paste the ID manually.</p>
                    </div>
                  )}
                  <div className="absolute font-mono text-center w-full bottom-2 left-0 text-emerald-400 text-[10px] bg-black/50 py-1">Scanning Crypto ID...</div>
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

                {connectionError && (
                  <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                    <X className="w-4 h-4 flex-shrink-0" />
                    {connectionError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!connectId.trim() || connectId.length < 20 || isConnecting}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin"></div>
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
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
      {/* Connectivity Help Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-full">
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full mx-auto flex items-center justify-center mb-4 border border-emerald-500/20">
                <Settings className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white">Mesh Settings</h2>
              <p className="text-zinc-500 text-sm mt-1">Cross-device connectivity tools</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div>
                  <div className="text-sm font-bold text-zinc-200">Force Cloud Mesh</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Recommended for LTE/4G</div>
                </div>
                <button
                  onClick={() => setForceCloud(!forceCloud)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${forceCloud ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${forceCloud ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>

              <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <div className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-2">
                  <Wifi className="w-4 h-4" /> System-to-Phone Tip
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                  For fastest P2P, ensure both devices are on the same 2.4/5GHz Wi-Fi band. Some routers block local talk.
                </p>
                <button
                  onClick={() => { setNonce(n => n + 1); setShowSettings(false); }}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-bold rounded-xl transition-all border border-emerald-500/10"
                >
                  Refresh Mesh Pulse
                </button>
              </div>

              <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10 mt-4">
                <div className="text-xs font-bold text-purple-400 mb-2 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Data Mule Transfer
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                  Export your offline queue and friend list to a JSON file. Import it on another device to physical "mule" your mesh state.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const data = await exportDataMule();
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = 'mesh-mule.json'; a.click();
                    }}
                    className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-purple-400 text-xs font-bold rounded-xl transition-all border border-purple-500/20 active:scale-95"
                  >
                    Export File
                  </button>
                  <label className="flex-1 py-2 bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold rounded-xl transition-all text-center cursor-pointer active:scale-95 shadow-[0_4px_10px_rgba(168,85,247,0.3)]">
                    Import File
                    <input type="file" className="hidden" accept=".json" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const text = await f.text();
                      const ok = await importDataMule(text);
                      if (ok) { alert('Data Mule Imported successfully!'); setNonce(n => n + 1); }
                    }} />
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-6 py-3 bg-zinc-100 hover:bg-white text-black font-black rounded-2xl transition-all active:scale-95"
            >
              DONE
            </button>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowRoomModal(false)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-full">
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full mx-auto flex items-center justify-center mb-4 border border-emerald-500/20">
                <Hash className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white">Create / Join Room</h2>
              <p className="text-zinc-500 text-sm mt-1">Enter a secure topic hash. If it doesn't exist, it will be created.</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const hashed = await hashRoomName(roomInput);
              setActiveRoom(hashed);
              setShowRoomModal(false);
              setRoomInput('');
            }} className="space-y-4">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="e.g. ProjectAlpha"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                autoFocus
              />
              <button
                type="submit"
                disabled={!roomInput.trim()}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl transition-all disabled:opacity-50"
              >
                JOIN & HASH
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-full">
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full mx-auto flex items-center justify-center mb-4 border border-emerald-500/20 text-4xl">
                {authIsAuthenticated && authUser?.picture ? <img src={authUser.picture} className="w-full h-full rounded-full" /> : generateAvatar(myId)}
              </div>
              <h2 className="text-2xl font-black text-white">Node Identity</h2>
              <p className="text-zinc-500 text-sm mt-1">Customize your mesh presence</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Display Alias</label>
                <input
                  type="text"
                  value={myAlias}
                  onChange={(e) => {
                    setMyAlias(e.target.value);
                    localStorage.setItem('meshpaw_alias', e.target.value);
                  }}
                  placeholder={generateFoodName(myId)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Current Status</label>
                <select
                  value={myStatus}
                  onChange={(e) => {
                    setMyStatus(e.target.value);
                    localStorage.setItem('meshpaw_status', e.target.value);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                >
                  <option value="Available">🟢 Available</option>
                  <option value="In Work">🟡 In Work</option>
                  <option value="School">🟣 School</option>
                  <option value="Ghost Mode">🥷 Ghost Mode</option>
                  <option value="Not Available">🔴 Not Available</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowProfileModal(false)}
              className="w-full mt-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl transition-all"
            >
              SAVE UPDATES
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

