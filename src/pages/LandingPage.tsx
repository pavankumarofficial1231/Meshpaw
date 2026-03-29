import React from 'react';
import { Link } from 'react-router-dom';
import { Network, Shield, Cpu, Zap, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 relative overflow-hidden font-sans selection:bg-emerald-500/30">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-zinc-800/30 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
             <Network className="w-full h-full text-zinc-200" />
          </div>
          <span className="font-bold text-xl tracking-tight">MeshPaw</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <Link to="#features" className="hover:text-zinc-100 transition-colors">Features</Link>
          <Link to="/privacy" className="hover:text-zinc-100 transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-zinc-100 transition-colors">Terms</Link>
        </div>
        <Link 
          to="/mesh" 
          className="px-5 py-2.5 rounded-full bg-white text-zinc-950 text-sm font-bold hover:bg-zinc-200 transition-all active:scale-95 shadow-lg"
        >
          Launch Mesh
        </Link>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-emerald-400 mb-8 backdrop-blur-md">
           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
           Mesh Protocol v1.9 Live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight mb-6">
          The Unstoppable <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500">
             Communication Network.
          </span>
        </h1>
        
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
          Zero servers. Zero accounts. MeshPaw uses your browser to create a decentralized, encrypted, resilient communication grid that survives internet outages and surveillance.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
           <Link 
             to="/mesh" 
             className="px-8 py-4 rounded-full bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-all active:scale-95 flex items-center gap-2 group shadow-[0_0_30px_rgba(255,255,255,0.15)]"
           >
             Connect to Mesh
             <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
           </Link>
           <Link 
             to="/privacy" 
             className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-semibold hover:bg-white/10 backdrop-blur-md transition-all active:scale-95"
           >
             Read Privacy Manifesto
           </Link>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="grid md:grid-cols-3 gap-6">
           <FeatureCard 
             icon={<Shield />}
             title="Military-Grade Encryption"
             description="Curve25519 e2e encryption ensures your packets drop the middleman. Only the exact recipient can decode your messages."
           />
           <FeatureCard 
             icon={<Network />}
             title="Gossip Protocol"
             description="Nodes interconnect locally via mDNS. Packets flood-route over up to 7 hops with built-in time-to-live restrictions."
           />
           <FeatureCard 
             icon={<Cpu />}
             title="Conflict-Free Data"
             description="Built-in distributed CRDT notepads and multi-modal walkie-talkie audio, all synchronized entirely off-grid."
           />
        </div>
      </section>
      
      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 text-center text-zinc-500 text-sm">
        <p>© {new Date().getFullYear()} MeshPaw Decentralized Protocols.</p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <Link to="/privacy" className="hover:text-zinc-300">Privacy</Link>
          <Link to="/terms" className="hover:text-zinc-300">Terms</Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md hover:bg-white/[0.07] transition-all">
       <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-zinc-200 mb-6 shadow-inner">
         {icon}
       </div>
       <h3 className="text-xl font-bold mb-3">{title}</h3>
       <p className="text-zinc-400 leading-relaxed text-sm">{description}</p>
    </div>
  );
}
