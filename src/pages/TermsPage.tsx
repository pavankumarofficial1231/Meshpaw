import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30 pb-32">
      <nav className="border-b border-white/10 sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-50">
         <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
           <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
             <ArrowLeft className="w-4 h-4" /> Back to Home
           </Link>
           <span className="font-bold tracking-tight text-zinc-100 flex items-center gap-2">
             <Scale className="w-5 h-5 text-emerald-400" />
             Terms of Service
           </span>
         </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-20">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Terms & Conditions</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            By accessing and interacting with the decentralized MeshPaw protocol, you agree to these mathematically binding conditions of acceptable use.
          </p>
        </div>

        <article className="prose prose-invert prose-zinc max-w-none prose-h2:text-2xl prose-h2:mb-4 prose-p:text-zinc-400 prose-p:leading-relaxed space-y-12">
           <section>
             <h2>1. Free & Open Infrastructure</h2>
             <p>MeshPaw is provided as a free, open-source experiment in decentralized resilience. We do not charge fees, require accounts, or operate centralized databases.</p>
           </section>

           <section>
             <h2>2. Protocol Responsibility</h2>
             <p>Because the network is purely peer-to-peer, you are solely responsible for the content you send and relay. MeshPaw acts as a dumb cryptographic pipe. Your browser automatically enforces end-to-end encryption, but you must ensure you are adhering to local software laws.</p>
           </section>

           <section>
             <h2>3. No Warranty Guarantee</h2>
             <p>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. Because you are connecting via WebRTC and local networking hardware, connection stability relies entirely on your local infrastructure and network routing conditions.</p>
           </section>

           <section>
             <h2>4. Experimental Software</h2>
             <p>The MeshPaw protocol implements features like Gossip Routing, Offline Store-and-Forward, and CRDT synchronization. Bugs, instability, or data loss can occur. Do not use this for critical, life-saving communications where guaranteed 100% uptime delivery is mandatory.</p>
           </section>
        </article>
      </main>
    </div>
  );
}
