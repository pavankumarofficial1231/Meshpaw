<div align="center">
<img width="1200" height="475" alt="MeshPaw Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🐾 MeshPaw
### The Decentralized, Encrypted, P2P Mesh Messaging Protocol

[![Built with Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=flat&logo=react)](https://react.dev/)
[![PeerJS](https://img.shields.io/badge/Networking-PeerJS-DD4B39?style=flat)](https://peerjs.com/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

[**Try the Demo**](https://ai.studio/apps/e143d0cc-ff27-4d1f-823d-30d5fc629c40) | [**Deploy**](#deployment) | [**Contributing**](#improving-meshpaw)

</div>

---

## 🚀 Overview

MeshPaw is a zero-infrastructure, peer-to-peer messaging application designed for resilient communication. It bypasses traditional servers by establishing direct WebRTC connections between browsers, creating a "mesh" network where every node acts as both a client and a potential relay.

### ✨ Key Features

- **🔐 End-to-End Encryption**: Every identity is a Ed25519/Curve25519 keypair. Messages are signed and verified at every hop.
- **🕸️ Gossip Protocol Routing**: Messages spread through the network using a flood-routing mechanism with Time-to-Live (TTL) to prevent infinite loops.
- **🔄 Store-and-Forward**: If you're offline, messages are queued in IndexedDB and automatically pushed when you reconnect to a peer.
- **📱 PWA Ready**: Installable on iOS/Android for a native-like experience.
- **🍦 Zero Config**: No account required. Your identity is your private key, stored safely in your browser.
- **🎨 Modern UI**: Built with Framer Motion, Tailwind CSS 4.0, and Lucide icons for a premium dark-mode aesthetic.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4.0, Framer Motion
- **Networking**: PeerJS (WebRTC)
- **Cryptography**: tweetnacl (NaCl implementation)
- **Storage**: IndexedDB (via `idb` library)
- **Icons**: Lucide React

---

## 🏗️ Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pavankumarofficial1231/Meshpaw.git
   cd Meshpaw
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file and add your Gemini API key (optional, for future AI features):
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   *This starts both the React app (port 3000) and a local PeerJS signaling server (port 9000).*

---

## 📡 How it Works

1. **Identity**: On first launch, the app generates a Curve25519 keypair. Your `PeerID` is derived from your public key.
2. **Connectivity**: You connect to others via a QR code or PeerID.
3. **Multi-Hop Messaging**: If Node A is connected to Node B, and Node B is connected to Node C, Node A can send a message to Node C through Node B.
4. **Verification**: MeshPaw signs the payload. Even if a relay node tries to tamper with a message, the final recipient will reject it because the signature won't match.

---

## 🛠️ Improving MeshPaw (Roadmap & Ideas)

We're always looking to make MeshPaw more resilient and feature-rich. Here are some suggestions:

### 1. Group Chat & Rooms
- **Topic-based PubSub**: Allow users to join "Rooms" identified by a hash, where messages are broadcasted to all subscribers of that topic.
- **Conflict-free Replicated Data Types (CRDTs)**: Use CRDTs to manage shared state (like a shared document or group member list) across the mesh without a central server.

### 2. Enhanced Privacy
- **Onion Routing**: Implement a basic version of onion routing to hide the original sender's IP from relay nodes.
- **Perfect Forward Secrecy**: Switch from static long-term keys to session-based keys for message encryption.

### 3. Media & File Sharing
- **Chunked File Transfer**: Split files into small encrypted chunks and gossip them through the mesh.
- **P2P Video/Voice**: Leverage WebRTC's media capabilities for direct encrypted calls.

### 4. Network Performance
- **Connection Pruning**: Implement logic to automatically drop high-latency or unstable peers while maintaining a minimum "degrees of separation."
- **mDNS / Local Discovery**: Use Web Discovery APIs to find peers on the same local network without needing a signaling server at all.

### 5. AI Integration
- **Mesh-AI Relay**: Use the integrated Gemini API to provide local AI assistance (summarizing long mesh threads, translation, etc.) that works even when the global internet is restricted, as long as one node in the mesh has access.

---

## 📜 License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.

---

<div align="center">
Made with ❤️ by the MeshPaw Team
</div>
