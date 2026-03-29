
# 🐾 MeshPaw
### The Decentralized, Encrypted, P2P Mesh Messaging Protocol

<div align="center">
  <img src="/logo.png" width="128" height="128" alt="MeshPaw Logo" />
  <p>Zero Infrastructure. Zero Surveillance. Total Resilience.</p>
</div>

[![Built with Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=flat&logo=react)](https://react.dev/)
[![PeerJS](https://img.shields.io/badge/Networking-PeerJS-DD4B39?style=flat)](https://peerjs.com/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## 🚀 Overview

MeshPaw is a zero-infrastructure, peer-to-peer messaging application designed for resilient communication in offline, censored, or disaster environments. It establishes direct WebRTC connections between browsers, creating a "mesh" network where every node acts as both a client and a potential relay.

### ✨ Advanced Features (v1.9.0)

- **🎙️ Walkie-Talkie Mode**: Offline-first encrypted voice memos distributed via gossip.
- **🔐 End-to-End Encryption**: Every identity is a Ed25519/Curve25519 keypair. Your private key never leaves your device.
- **🏘️ Group Chat & Rooms**: Topic-based private rooms identified by SHA-256 hashes.
- **📝 MeshPad (CRDT)**: Real-time conflict-free collaborative text editing over the mesh.
- **🛰️ Radar Scanning**: Zero-config mDNS-style discovery of local peers on your network.
- **📦 Data Mule (Sneakernet)**: Export/Import your entire node state to a file to physically bridge airgapped networks.
- **⏳ Ephemeral Messages**: Self-destructing text payloads (30s/60s timers).
- **🧠 Mesh Brain (Local AI)**: Integrated Gemini AI for summarizing long mesh conversations locally.
- **📎 P2P File Torrents**: Send arbitrary files directly over encrypted WebRTC data channels.
- **✨ Premium UI**: High-end glassmorphic aesthetic with animated SVG privacy visualizations.

---

## 🏗️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, React Router 7
- **Aesthetics**: Glassmorphism, Tailwind CSS 4.0, Framer Motion
- **Networking**: PeerJS (WebRTC) + Gossip Protocol (7-hop TTL)
- **AI**: Google Generative AI (Gemini 1.5 Flash)
- **State/CRDT**: Yjs, IndexedDB (via `idb`)
- **Cryptography**: TweetNaCl (Curve25519)

---

## 🛠️ Installation & Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/pavankumarofficial1231/Meshpaw.git
   cd Meshpaw
   npm install
   ```

2. **Environment**
   Create a `.env.local` file for AI features:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_key
   ```

3. **Development**
   ```bash
   npm run dev
   ```
   *Note: PeerJS server runs on port 9000, Vite on port 3000.*

---

## 📡 Protocol Mechanics

1. **Gossip Routing**: Messages flood the network with a 7-hop TTL. Nodes act as "dumb" relays that verify signatures before forwarding, ensuring data integrity without decrypting contents.
2. **Identity**: Your browser generates a unique cryptographic ID on first launch. No email or phone number required.
3. **Resilience**: If the signaling server is down, existing mesh connections persist. Local nodes discovery via Radar allows rebuilding the mesh without the internet.

---

## 📜 License

Distributed under the Apache 2.0 License.

<div align="center">
Made with ❤️ by the MeshPaw Team
</div>
