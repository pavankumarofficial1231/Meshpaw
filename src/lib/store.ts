import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface MeshMessage {
  id: string;        // UUID of the packet
  sourceId: string;  // Original Sender's Public Key/ID
  destId: string;    // Target Recipient's Public Key/ID, or 'ALL' for unencrypted broadcast
  seqId: number;     // Sequence Number preventing replay errors
  ttl: number;       // Time-to-live counter (e.g., 7)
  payload: string;   // The Encrypted text payload using Receiver's PubKey (if not 'ALL')
  timestamp: number;
}

export interface FriendNode {
  id: string;        // Node ID (Public Key)
  name: string;      // Assigned or generated name
  addedAt: number;   // Timestamp
}

interface MeshDB extends DBSchema {
  seenMessages: {
    key: string;
    value: { id: string; timestamp: number };
  };
  queuedMessages: {
    key: string;
    value: MeshMessage;
  };
  friends: {
    key: string;
    value: FriendNode;
  };
}

let dbPromise: Promise<IDBPDatabase<MeshDB>> | null = null;
let useMemoryFallback = false;
const memoryStore: Record<string, any[]> = {
  seenMessages: [],
  queuedMessages: [],
  friends: []
};

export const initDB = async () => {
  if (useMemoryFallback) return null;
  if (!dbPromise) {
    try {
      dbPromise = openDB<MeshDB>('MeshPawDB', 2, {
        upgrade(db, oldVersion) {
          if (!db.objectStoreNames.contains('seenMessages')) {
            db.createObjectStore('seenMessages', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('queuedMessages')) {
            db.createObjectStore('queuedMessages', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('friends')) {
            db.createObjectStore('friends', { keyPath: 'id' });
          }
        },
      });
      await dbPromise; // Ensure it can open
    } catch (e) {
      console.warn('[Mesh DB] IndexedDB blocked. Using in-memory fallback.');
      useMemoryFallback = true;
      return null;
    }
  }
  return dbPromise;
};

// Check if we've seen this message before (to prevent infinite gossip loops)
export const hasSeenMessage = async (id: string): Promise<boolean> => {
  const db = await initDB();
  if (!db) return memoryStore.seenMessages.some(m => m.id === id);
  const msg = await db.get('seenMessages', id);
  return !!msg;
};

// Mark a message as seen
export const markMessageSeen = async (id: string) => {
  const db = await initDB();
  if (!db) {
     memoryStore.seenMessages.push({ id, timestamp: Date.now() });
     return;
  }
  await db.put('seenMessages', { id, timestamp: Date.now() });
};

// Store a message in the forward queue
export const queueMessage = async (msg: MeshMessage) => {
  const db = await initDB();
  if (!db) {
     memoryStore.queuedMessages.push(msg);
     return;
  }
  await db.put('queuedMessages', msg);
};

// Get all messages waiting to be sent (and remove them if sent)
export const getQueuedMessages = async (): Promise<MeshMessage[]> => {
  const db = await initDB();
  if (!db) return memoryStore.queuedMessages;
  return db.getAll('queuedMessages');
};

// Remove from queue once flushed successfully
export const removeQueuedMessage = async (id: string) => {
  const db = await initDB();
  if (!db) {
    memoryStore.queuedMessages = memoryStore.queuedMessages.filter(m => m.id !== id);
    return;
  }
  await db.delete('queuedMessages', id);
};

export const saveFriend = async (friend: FriendNode) => {
  const db = await initDB();
  if (!db) {
    memoryStore.friends.push(friend);
    return;
  }
  await db.put('friends', friend);
};

export const loadFriends = async (): Promise<FriendNode[]> => {
  const db = await initDB();
  if (!db) return memoryStore.friends;
  return db.getAll('friends');
};

export const removeFriend = async (id: string) => {
  const db = await initDB();
  if (!db) {
    memoryStore.friends = memoryStore.friends.filter(f => f.id !== id);
    return;
  }
  await db.delete('friends', id);
};
