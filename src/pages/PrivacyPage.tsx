import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, FileKey2, Network, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30 pb-32">
      
      {/* Navbar */}
      <nav className="border-b border-white/10 sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-50">
         <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
           <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
             <ArrowLeft className="w-4 h-4" /> Back to Protocol
           </Link>
           <span className="font-bold tracking-tight text-zinc-100 flex items-center gap-2">
             <Shield className="w-5 h-5 text-emerald-400" />
             Privacy Manifesto
           </span>
         </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-20">
        
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Zero-Knowledge Architecture.</h1>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
            We don't collect your data because we mathematically cannot. MeshPaw is not an application; it is a protocol running entirely within your browser's cryptography engine.
          </p>
        </div>

        {/* Animated SVG Visualization of E2E Encryption */}
        <div className="w-full aspect-video bg-zinc-900 border border-white/10 rounded-3xl mb-16 overflow-hidden relative flex flex-col items-center justify-center shadow-2xl">
           <div className="absolute top-4 left-6 text-xs font-mono text-zinc-500 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Protocol Diagram
           </div>
           
           <svg className="w-full max-w-2xl h-64" viewBox="0 0 800 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Nodes */}
              <circle cx="150" cy="150" r="40" className="fill-zinc-800 stroke-zinc-700 stroke-2" />
              <text x="150" y="215" fill="#a1a1aa" fontSize="14" textAnchor="middle" fontWeight="bold">SENDER</text>
              
              <circle cx="400" cy="80" r="30" className="fill-zinc-900 stroke-zinc-800 stroke-2 stroke-dashed" />
              <text x="400" y="40" fill="#71717a" fontSize="12" textAnchor="middle">RELAY (BLIND)</text>

              <circle cx="400" cy="220" r="30" className="fill-zinc-900 stroke-zinc-800 stroke-2 stroke-dashed" />
              <text x="400" y="270" fill="#71717a" fontSize="12" textAnchor="middle">RELAY (BLIND)</text>

              <circle cx="650" cy="150" r="40" className="fill-emerald-950 stroke-emerald-800 stroke-2" />
              <text x="650" y="215" fill="#34d399" fontSize="14" textAnchor="middle" fontWeight="bold">RECIPIENT</text>

              {/* Connections */}
              <path d="M 185 130 Q 292.5 105 370 85" className="stroke-zinc-800 stroke-[3px]" />
              <path d="M 185 170 Q 292.5 195 370 215" className="stroke-zinc-800 stroke-[3px]" />
              <path d="M 430 85 Q 540 105 615 130" className="stroke-zinc-800 stroke-[3px]" />
              <path d="M 430 215 Q 540 195 615 170" className="stroke-zinc-800 stroke-[3px]" />

              {/* Animated Message Packets */}
              <g className="animate-[slide-right_3s_linear_infinite]">
                 {/* Raw Text at Sender */}
                 <rect x="135" y="135" width="30" height="30" rx="8" className="fill-white" />
                 <text x="150" y="155" fill="#000" fontSize="12" textAnchor="middle" fontWeight="bold">HI</text>
                 {/* Lock icon representing encryption applied mid-flight */}
                 <path d="M 230 110 h 20 v 15 h -20 z M 235 110 v -5 a 5 5 0 0 1 10 0 v 5" className="fill-none stroke-emerald-500 stroke-2" />
              </g>

              {/* Encrypted packets through relays */}
              <g className="animate-[fade-in-out_2s_linear_infinite_0.5s]">
                 <rect x="385" y="65" width="30" height="30" rx="4" className="fill-zinc-700" />
                 <text x="400" y="85" fill="#fff" fontSize="14" textAnchor="middle">***</text>
              </g>

              <g className="animate-[fade-in-out_2s_linear_infinite_1s]">
                 <rect x="385" y="205" width="30" height="30" rx="4" className="fill-zinc-700" />
                 <text x="400" y="225" fill="#fff" fontSize="14" textAnchor="middle">***</text>
              </g>

              {/* Decryption at Recipient */}
              <g className="animate-[slide-right-end_3s_linear_infinite_1.5s]">
                 <path d="M 560 140 h 20 v 15 h -20 z M 565 140 v -5 a 5 5 0 0 1 10 0 v 5" className="fill-none stroke-zinc-500 stroke-2 animate-pulse" />
                 <rect x="635" y="135" width="30" height="30" rx="8" className="fill-emerald-500" />
                 <text x="650" y="155" fill="#000" fontSize="12" textAnchor="middle" fontWeight="bold">HI</text>
              </g>

              <style>{`
                @keyframes slide-right {
                  0% { transform: translateX(0); opacity: 1; }
                  40% { transform: translateX(230px); opacity: 0; }
                  100% { transform: translateX(230px); opacity: 0; }
                }
                @keyframes slide-right-end {
                  0% { transform: translateX(-150px); opacity: 0; }
                  50% { transform: translateX(-150px); opacity: 0; }
                  70% { transform: translateX(-50px); opacity: 1; }
                  100% { transform: translateX(0); opacity: 1; }
                }
                @keyframes fade-in-out {
                  0%, 100% { opacity: 0; }
                  50% { opacity: 1; }
                }
              `}</style>
           </svg>
        </div>

        <section className="space-y-12 text-zinc-300">
           <div className="flex gap-6 items-start">
             <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center text-zinc-100">
               <FileKey2 className="w-6 h-6" />
             </div>
             <div>
               <h3 className="text-xl font-bold text-white mb-2">1. Your Keys, Your Identity</h3>
               <p className="leading-relaxed">
                 There are no usernames, passwords, or emails. Your identity is a Curve25519 cryptographic keypair generated entirely inside your browser's local sandbox. The private key never leaves your device under any circumstances.
               </p>
             </div>
           </div>

           <div className="flex gap-6 items-start">
             <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center text-emerald-400">
               <Lock className="w-6 h-6" />
             </div>
             <div>
               <h3 className="text-xl font-bold text-white mb-2">2. End-to-End Encryption</h3>
               <p className="leading-relaxed">
                 Every byte of information sent over the mesh is symmetrically encrypted using TweetNaCl. Even if a message passes through 5 different relay peers to reach its target, none of those middleman nodes can decipher the content. They are mathematically blind.
               </p>
             </div>
           </div>

           <div className="flex gap-6 items-start">
             <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center text-zinc-100">
               <Network className="w-6 h-6" />
             </div>
             <div>
               <h3 className="text-xl font-bold text-white mb-2">3. No Central Servers</h3>
               <p className="leading-relaxed">
                 We only use a lightweight WebRTC signaling server (PeerJS) to help browsers discover each other. Once a WebRTC `RTCDataChannel` is established, traffic flows directly point-to-point via UDP/TCP. We log nothing.
               </p>
             </div>
           </div>
        </section>

      </main>
    </div>
  );
}
