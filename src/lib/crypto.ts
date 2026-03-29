import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

export const generateKeys = (): KeyPair => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey)
  };
};

/**
 * Authenticated Encryption (End-to-End)
 */
export const encryptMessage = (
  text: string, 
  receiverPublicKeyBase64: string, 
  senderSecretKeyBase64: string
): string => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = decodeUTF8(text);
  const receiverPublicKey = decodeBase64(receiverPublicKeyBase64);
  const senderSecretKey = decodeBase64(senderSecretKeyBase64);
  
  const encrypted = nacl.box(messageUint8, nonce, receiverPublicKey, senderSecretKey);
  
  const fullMessage = new Uint8Array(nonce.length + encrypted.length);
  fullMessage.set(nonce);
  fullMessage.set(encrypted, nonce.length);
  return encodeBase64(fullMessage);
};

export const decryptMessage = (
  encryptedBase64: string, 
  senderPublicKeyBase64: string, 
  receiverSecretKeyBase64: string
): string | null => {
  try {
    const fullMessage = decodeBase64(encryptedBase64);
    const nonce = fullMessage.slice(0, nacl.box.nonceLength);
    const encrypted = fullMessage.slice(nacl.box.nonceLength);
    
    const senderPublicKey = decodeBase64(senderPublicKeyBase64);
    const receiverSecretKey = decodeBase64(receiverSecretKeyBase64);
    
    const decrypted = nacl.box.open(encrypted, nonce, senderPublicKey, receiverSecretKey);
    if (!decrypted) return null;
    
    return encodeUTF8(decrypted);
  } catch (err) {
    console.error('Failed to decrypt message:', err);
    return null;
  }
};

/**
 * Digital Signatures (For Mesh Authentication)
 * We derive an Ed25519 signing key from the Curve25519 box secret key.
 */
export const getSigningKeyPair = (boxSecretKeyBase64: string) => {
  const seed = decodeBase64(boxSecretKeyBase64).slice(0, 32);
  return nacl.sign.keyPair.fromSeed(seed);
};

export const signData = (text: string, boxSecretKeyBase64: string): { signature: string; signingPubKey: string } => {
  const messageUint8 = decodeUTF8(text);
  const signKeys = getSigningKeyPair(boxSecretKeyBase64);
  const signed = nacl.sign.detached(messageUint8, signKeys.secretKey);
  return {
    signature: encodeBase64(signed),
    signingPubKey: encodeBase64(signKeys.publicKey)
  };
};

export const verifyData = (text: string, signatureBase64: string, signingPubKeyBase64: string): boolean => {
  try {
    const messageUint8 = decodeUTF8(text);
    const signature = decodeBase64(signatureBase64);
    const signingPubKey = decodeBase64(signingPubKeyBase64);
    return nacl.sign.detached.verify(messageUint8, signature, signingPubKey);
  } catch (err) {
    console.error('Signature verification failed:', err);
    return false;
  }
};
