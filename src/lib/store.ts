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

interface MeshDB extends DBSchema {
  seenMessages: {
    key: string;
    value: { id: string; timestamp: number };
  };
  queuedMessages: {
    key: string;
    value: MeshMessage;
  };
}

let dbPromise: Promise<IDBPDatabase<MeshDB>> | null = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MeshDB>('MeshPawDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('seenMessages')) {
          db.createObjectStore('seenMessages', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('queuedMessages')) {
          db.createObjectStore('queuedMessages', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

// Check if we've seen this message before (to prevent infinite gossip loops)
export const hasSeenMessage = async (id: string): Promise<boolean> => {
  const db = await initDB();
  const msg = await db.get('seenMessages', id);
  return !!msg;
};

// Mark a message as seen
export const markMessageSeen = async (id: string) => {
  const db = await initDB();
  await db.put('seenMessages', { id, timestamp: Date.now() });
};

// Store a message in the forward queue
export const queueMessage = async (msg: MeshMessage) => {
  const db = await initDB();
  await db.put('queuedMessages', msg);
};

// Get all messages waiting to be sent (and remove them if sent)
export const getQueuedMessages = async (): Promise<MeshMessage[]> => {
  const db = await initDB();
  return db.getAll('queuedMessages');
};

// Remove from queue once flushed successfully
export const removeQueuedMessage = async (id: string) => {
  const db = await initDB();
  await db.delete('queuedMessages', id);
};
