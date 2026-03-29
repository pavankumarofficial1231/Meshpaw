# 🐾 MeshPaw v2.0: The Off-Grid Syndicate

**MeshPaw** is a zero-infrastructure, peer-to-peer (P2P) communication protocol that transforms your browser into a self-sovereign node. No servers, no central authority, no surveillance. Communicate through firewalls, outages, and state-level blocks with military-grade resilience.

![MeshPaw v2.0 Premium Interface](file:///d:/Projects%20for%20Github/Meshpaw/src/assets/meshpaw_banner.png) *(Note: Placeholder for your branding)*

---

## 💎 Premium Features (v2.0 Overhaul)

### 🕹️ Immersive Console & Radar
Experience a high-end, glassmorphic UI with a 3D-perspective **Node Radar**. Visualize your local mesh connections in real-time as they discover each other via WebRTC.

### 🔐 Auth0 Fusion Identity
While remaining decentralized, MeshPaw v2.0 introduces **Auth0 Integration**. Link your sovereign Curve25519 Node ID to verified Web2 credentials (Google, GitHub) to establish trust without compromising your private P2P tunnels.

### 🧠 Mesh Brain (Local AI)
Powered by **Gemini 1.5 Flash**, MeshPaw summarizes high-volume room history locally. Get caught up on deep-thread conversations instantly without sending a single keystroke to the cloud.

### 📝 Collaborative MeshPad (CRDT)
A real-time, unstructured shared workspace powered by **Yjs**. Multiple nodes can collaborate on documents synchronously with automatic conflict resolution and zero server authoritative logic.

### 🥷 Hardened Privacy & DMs
- **7-Hop Gossip Routing:** Messages wave through the mesh, hopping up to 7 times to reach their target—metadata remains ephemeral.
- **Direct Messaging:** Click any peer to escalate to a private, cryptographic tunnel away from the global mesh.
- **Node Profiles:** Customize your alias and status (Available, In Work, Ghost Mode, etc.).

### 📦 Physical Data Muling
Operating in a total air-gap? Export your entire encrypted mesh state to a **Data Mule JSON** file and move it physically between networks. 

---

## 🚀 Technical Architecture

- **Core:** React 18 + Vite + TypeScript
- **Networking:** PeerJS (WebRTC) + Gossip Protocol (Flood Routing)
- **Sync:** Yjs (CRDT) for conflict-free shared states
- **Auth:** Auth0 React SDK (OIDC/OAuth2)
- **AI:** Google Generative AI SDK (Gemini 1.5 Flash)
- **Security:** Curve25519 Signing + Symmetric Encryption
- **Persistence:** IndexedDB (LocalBrowser Storage)
- **UX:** Framer Motion 3D + TailwindCSS + Lucide Icons

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js (v18+)
- A Google Gemini API Key (for Mesh Brain features)
- Auth0 Tenant Credentials (for Identity features)

### 2. Environment Setup
Create a `.env.local` file in the root:
```env
VITE_GEMINI_API_KEY=your_gemini_key_here
VITE_AUTH0_DOMAIN=dev-kznfvra8orsyvn3n.us.auth0.com
VITE_AUTH0_CLIENT_ID=maUaN39GMRNgOUZkeFuhJ7eSLcplqO2u
```

### 3. Installation
```bash
npm install
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 📜 Manifesto
MeshPaw is built on the belief that **Privacy is Non-Negotiable**. By removing the middleman (the server), we return the power of communication to the edges of the network—to the people.

**NO LOGS. NO METRICS. NO BACKDOORS.**

---

*© 2026 Decentralized Grid Syndicate. Built for the open mesh.*
