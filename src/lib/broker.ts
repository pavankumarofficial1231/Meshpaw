/**
 * PeerJS Broker Resolution Logic
 * This module decides where to find the signaling server based on the environment.
 */

export interface BrokerConfig {
  host?: string;
  port?: number;
  path?: string;
  secure?: boolean;
  key?: string;
  debug?: number;
}

export const resolveBroker = (forceCloud: boolean): BrokerConfig => {
  const { hostname, port, protocol } = window.location;
  const isHttps = protocol === 'https:';
  
  // 1. Forced Cloud Mode (User Toggle)
  if (forceCloud) {
    return { key: 'peerjs', debug: 3 };
  }

  // 2. Vercel / Cloud Deployment Detection
  if (hostname.includes('vercel.app') || hostname.includes('netlify.app')) {
    return { key: 'peerjs', debug: 3 };
  }

  // 3. Localhost Development (Vite on 3000/5173, PeerJS on 9000)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const isVite = port === '3000' || port === '5173';
    return {
      host: hostname,
      port: isVite ? 9000 : Number(port),
      path: '/peerjs',
      secure: isHttps
    };
  }

  // 4. LAN / Hotspot Access (e.g. 192.168.1.5:9001)
  // If we are NOT on localhost and NOT on a cloud domain, we are likely on a LAN node.
  // We try to find the signaling server on the CURRENT host.
  if (port) {
    return {
      host: hostname,
      port: Number(port), // PeerJS server usually runs on the same port as the app in production
      path: '/peerjs',
      secure: isHttps
    };
  }

  // 5. Default Fallback
  return { key: 'peerjs', debug: 3 };
};
