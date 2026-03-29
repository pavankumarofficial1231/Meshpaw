# 🐾 MeshPaw v2.0
### The Unstoppable, Decentralized, P2P Mesh Messaging Protocol

<div align="center">
  <img src="/logo.png" width="128" height="128" alt="MeshPaw Logo" />
  <p>Zero Infrastructure. Zero Surveillance. Total Resilience.</p>
</div>

[![Built with Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Auth0](https://img.shields.io/badge/Auth-Auth0-eb5424?style=flat&logo=auth0)](https://auth0.com/)
[![PeerJS](https://img.shields.io/badge/Networking-PeerJS-DD4B39?style=flat)](https://peerjs.com/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## 🚀 Overview

MeshPaw is a zero-infrastructure, peer-to-peer messaging application designed for resilient communication in offline, censored, or disaster environments. It establishes direct WebRTC connections between browsers, creating a "mesh" network where every node acts as both a client and a potential relay.

**Version 2.0** introduces verified identity layers, premium interactive aesthetics, and advanced node management for professional-grade decentralized networking.

---

## ✨ Advanced Features (v2.0.0)

- **🔐 Auth0 Identity Protocol**: Integrated verified identity layer. Link your decentralized node to a secure Auth0 account (Optional).
- **👤 Node Profiles & Status**: First-class support for Custom Aliases and Live Status (Available, Ghost Mode, Zero Noise).
- **💬 Individual Peer Tunnels**: One-click "Private Room" escalation for 1-on-1 direct messaging (DM).
- **🎙️ Walkie-Talkie Mode**: Offline-first encrypted voice memos distributed via mesh gossip.
- **🏘️ Private Group Rooms**: Topic-based secure rooms identified by SHA-256 hashes.
- **📝 MeshPad (CRDT)**: Real-time, conflict-free collaborative editor built on Yjs. Zero central host required.
- **🛰️ Radar Scanning v2**: Improved discovery for local mesh nodes and "ping" mechanics for offline friends.
- **📦 Data Mule (Sneakernet)**: Physical bridging for airgapped networks via JSON state export/import.
- **⏳ Ephemeral Logic**: Self-destructing text/file payloads (30s/60s timers).
- **🧠 Mesh Brain (Local AI)**: Gemini 1.5 Flash summarization for room history.
- **📎 P2P File Torrents**: True peer-to-peer binary file transfer over encrypted WebRTC channels.
- **🎨 Premium UX**: High-end glassmorphic interactive design with 3D-perspective SVG protocol visualizations.

---

## 🏗️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, React Router 7
- **Aesthetics**: Glassmorphism, Vanilla CSS, Framer Motion
- **Authentication**: Auth0 (@auth0/auth0-react)
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
   *Note: PeerJS server facilitates signaling, Vite runs the local node dev-server.*

---

## 📡 Protocol Mechanics

1. **Gossip Routing**: Messages flood the network with a 7-hop TTL. Nodes act as "dumb" relays verify signatures before forwarding, ensuring data integrity without decrypting contents.
2. **Identity Sovereignty**: Your browser generates a unique cryptographic ID on first launch. Auth0 provides an optional verification layer on top of this.
3. **Resilience**: If signaling servers are blocked, existing mesh connections persist. Local Discovery (Radar) allows rebuilding the mesh entirely without internet access.

---

## 📜 License

Distributed under the Apache 2.0 License.

<div align="center">
Made with ❤️ by the MeshPaw Core Team
</div>
