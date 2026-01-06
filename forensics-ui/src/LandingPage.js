import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
    useEffect(() => {
        const observerOptions = {
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, observerOptions);

        const revealElements = document.querySelectorAll('.reveal');
        revealElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    const reviews = [
        { text: "ChainForensix transformed a difficult situation into a legal reality. I finally had the proof to secure my rights.", author: "Digital Rights Holder" },
        { text: "As an investigator, the precision of this tool's scraping and AI audit is unmatched globally.", author: "OSINT Professional" },
        { text: "Immutable evidence on the blockchain is a game-changer for digital rights litigation.", author: "Human Rights Attorney" },
        { text: "Finally, a way to hold anonymous actors accountable for the damage they do online.", author: "Reputation Manager" }
    ];

    const partners = [
        "Digital Justice Group", "Web3 Legal Alliance", "Cyber Ethics Institute", "Global OSINT Network", "Blockchain Verification Lab"
    ];

    return (
        <div className="bg-[var(--bg-color)] text-[var(--text-primary)] min-h-screen font-sans selection:bg-[var(--selection-color)] transition-colors duration-300">
            {/* Cinematic Hero */}
            <header className="relative min-h-[85vh] flex items-center justify-center p-6 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[160px] glow-orb"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/10 rounded-full blur-[160px] glow-orb" style={{ animationDelay: '-4s' }}></div>
                </div>

                <div className="max-w-6xl mx-auto text-center relative z-10 px-4">
                    <div className="reveal">
                        <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter leading-tight text-[var(--text-primary)]">
                            RESTORE YOUR <br />
                            <span className="text-[var(--accent-cyan)]">DIGITAL RIGHTS</span>
                        </h1>
                        <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                            Online anonymity is not a license for harm. We turn digital traces into <span className="text-[var(--text-primary)] font-bold italic underline decoration-[var(--accent-cyan)]/30">permanent accountability</span>.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-6">
                            <a href="mailto:briannjoki619@gmail.com?subject=Inquiry: Forensic Session Booking" className="px-10 py-4 bg-[var(--accent-cyan)] text-white font-black rounded-lg text-base hover:opacity-90 transition-all shadow-xl shadow-cyan-500/10 uppercase tracking-widest">
                                Book a Consultation
                            </a>
                            <Link to="/login" className="px-10 py-4 border border-[var(--border-color)] text-[var(--text-primary)] font-bold rounded-lg text-base hover:bg-[var(--bg-secondary)] transition-all uppercase tracking-widest">
                                Analyst Access
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* The Narrative Section */}
            <section id="narrative" className="py-24 px-6 border-y border-[var(--border-color)] bg-[var(--bg-color)] relative">
                <div className="max-w-4xl mx-auto text-center reveal">
                    <span className="text-[var(--accent-cyan)] font-mono text-xs tracking-[0.4em] uppercase mb-4 block font-bold">The Protocol</span>
                    <h2 className="text-3xl md:text-5xl font-extrabold mb-8 leading-tight">
                        Accountability for the <br />
                        <span className="text-[var(--text-secondary)]">Modern Digital Age.</span>
                    </h2>
                    <div className="space-y-6 text-base md:text-lg text-[var(--text-secondary)] leading-relaxed text-justify md:text-center">
                        <p>
                            In an interconnected world, your digital identity is an extension of yourself. When harassment or defamation occurs, it doesn't just affect your profile—it affects your life.
                        </p>
                        <p>
                            ChainForensix was founded to bridge the gap between digital action and real-world recourse. By combining forensic scraping with cryptographic blockchain anchoring, we ensure that malicious content is preserved permanently, making it impossible to erase the truth.
                        </p>
                    </div>
                    <div className="mt-12 w-px h-16 bg-gradient-to-b from-[var(--accent-cyan)] to-transparent mx-auto"></div>
                </div>
            </section>

            {/* Service Paths */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Rights Holder Path */}
                        <div className="glass-card p-10 rounded-2xl reveal">
                            <h3 className="text-2xl font-black mb-4 text-[var(--text-primary)] uppercase tracking-tighter">FOR JUSTICE SEEKERS</h3>
                            <p className="text-[var(--text-secondary)] text-base mb-8 leading-relaxed">
                                Empowerment through evidence. If you've been targeted by defamatory campaigns, we provide the technical foundation to protect your reputation.
                            </p>
                            <div className="space-y-4 mb-10">
                                {[
                                    "Comprehensive metadata capture",
                                    "AI-powered harm categorization",
                                    "Cryptographic proof of existence",
                                    "Professional dossiers for legal support"
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <div className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-[var(--text-secondary)] font-medium">{item}</span>
                                    </div>
                                ))}
                            </div>
                            <a href="mailto:briannjoki619@gmail.com?subject=Forensic Support Request" className="inline-block text-[var(--accent-cyan)] font-bold border-b border-[var(--accent-cyan)]/30 pb-1 hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all">
                                CONSULT WITH AN EXPERT &rarr;
                            </a>
                        </div>

                        {/* Professional Path */}
                        <div className="glass-card p-10 rounded-2xl reveal" style={{ transitionDelay: '0.2s' }}>
                            <h3 className="text-2xl font-black mb-4 text-[var(--text-secondary)] uppercase tracking-tighter">FOR INVESTIGATORS</h3>
                            <p className="text-[var(--text-secondary)] text-base mb-8 leading-relaxed">
                                Reliability at scale. Anchor your investigation results into an immutable ledger for verified chain-of-custody.
                            </p>
                            <div className="space-y-4 mb-10">
                                {[
                                    "High-velocity X (Twitter) extraction",
                                    "Automated defamation audits",
                                    "Immutable blockchain evidence logs",
                                    "Scalable export for legal firms"
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-[var(--text-secondary)] font-medium">{item}</span>
                                    </div>
                                ))}
                            </div>
                            <Link to="/login" className="inline-block text-[var(--text-secondary)] font-bold border-b border-[var(--border-color)] pb-1 hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all">
                                ANALYST CONSOLE &rarr;
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="py-20 border-y border-[var(--border-color)] bg-[var(--bg-secondary)]/30 overflow-hidden">
                <div className="mb-10 text-center reveal">
                    <span className="text-[var(--text-secondary)] font-mono text-[10px] uppercase tracking-widest block mb-1">Authenticated Pulse</span>
                    <h4 className="text-lg font-bold text-[var(--text-secondary)] opacity-50">TRUSTED BY THE FRONTLINES OF DIGITAL RIGHTS</h4>
                </div>

                <div className="relative">
                    <div className="infinite-slider">
                        {[...partners, ...partners].map((p, i) => (
                            <div key={i} className="px-10 text-xl font-black text-[var(--text-primary)] whitespace-nowrap uppercase tracking-widest italic" style={{ opacity: 'var(--partner-opacity)' }}>
                                {p}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-16 relative px-6">
                    <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {reviews.map((rev, i) => (
                            <div key={i} className="glass-card p-6 rounded-xl reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                                <p className="text-[var(--text-secondary)] text-sm mb-4 leading-relaxed italic">"{rev.text}"</p>
                                <p className="text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-widest">— {rev.author}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Personal Footer */}
            <footer className="py-24 px-6 bg-[var(--bg-color)]">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-end">
                    <div className="reveal">
                        <h2 className="text-4xl font-black mb-6 tracking-tighter italic text-[var(--text-primary)]">ChainForensix</h2>
                        <p className="text-[var(--text-secondary)] text-base mb-8 max-w-sm">
                            Built by Brian Njoki to ensure that digital freedom doesn't come at the cost of human dignity.
                        </p>
                        <div className="flex gap-8">
                            <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors uppercase font-bold text-[10px] tracking-widest">Twitter</a>
                            <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors uppercase font-bold text-[10px] tracking-widest">GitHub</a>
                            <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors uppercase font-bold text-[10px] tracking-widest">LinkedIn</a>
                        </div>
                    </div>

                    <div className="reveal text-right" style={{ transitionDelay: '0.2s' }}>
                        <h3 className="text-xl font-bold mb-3 text-[var(--text-primary)]">Professional Support</h3>
                        <a href="mailto:briannjoki619@gmail.com" className="text-2xl md:text-3xl font-black text-[var(--accent-cyan)] hover:text-[var(--text-primary)] transition-all">
                            briannjoki619@gmail.com
                        </a>
                        <p className="mt-8 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest font-mono opacity-50">
                            Version 2.1.0 &bull; Brian Njoki &bull; © 2026
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
