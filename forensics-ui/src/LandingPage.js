import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
    const [hoveredPointSeeker, setHoveredPointSeeker] = useState(null);
    const [hoveredPointInv, setHoveredPointInv] = useState(null);

    useEffect(() => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                } else {
                    entry.target.classList.remove('active');
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
            <header className="relative min-h-[85vh] flex items-center justify-center p-6 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[160px] glow-orb"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/10 rounded-full blur-[160px] glow-orb" style={{ animationDelay: '-4s' }}></div>
                </div>

                <div className="max-w-6xl mx-auto text-center relative z-10 px-4">
                    <div className="reveal">
                        <span className="text-[var(--accent-cyan)] font-mono text-xs tracking-[0.4em] uppercase mb-6 block font-bold">The Industry Standard for X Forensics</span>
                        <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter leading-tight text-[var(--text-primary)]">
                            RESTORE YOUR <br />
                            <span className="text-[var(--accent-cyan)]">DIGITAL RIGHTS</span>
                        </h1>
                        <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                            The only forensic tool combining <span className="text-[var(--text-primary)]">high-velocity X post extraction</span> with <span className="text-[var(--text-primary)]">cryptographic blockchain anchoring</span>. We turn fleeting online moments into permanent, court-ready evidence.
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

            <main>
                <section id="narrative" className="py-24 px-6 border-y border-[var(--border-color)] bg-[var(--bg-color)] relative">
                    <div className="max-w-4xl mx-auto text-center reveal">
                        <span className="text-[var(--accent-cyan)] font-mono text-xs tracking-[0.4em] uppercase mb-4 block font-bold">The Protocol</span>
                        <h2 className="text-3xl md:text-5xl font-extrabold mb-8 leading-tight">
                            Accountability for the <br />
                            <span className="text-[var(--text-secondary)]">Modern Digital Age.</span>
                        </h2>
                        <div className="space-y-6 text-base md:text-lg text-[var(--text-secondary)] leading-relaxed text-justify md:text-center">
                            <p>
                                In an interconnected world, your digital identity is an extension of yourself. When harassment or defamation occurs via X posts, it doesn't just affect your profile—it affects your life.
                            </p>
                            <p>
                                ChainForensix was founded to bridge the gap between digital action and real-world recourse. By combining deep forensic crawling of X (Twitter) with cryptographic blockchain anchoring, we ensure that malicious content is preserved permanently, making it impossible to delete or deny the truth.
                            </p>
                        </div>
                        <div className="mt-8">
                            <Link to="/methodology" className="text-[var(--accent-cyan)] font-bold uppercase tracking-widest text-sm hover:text-white transition-colors border-b border-[var(--accent-cyan)]/30 pb-1">
                                Read Full Methodology &rarr;
                            </Link>
                        </div>
                        <div className="mt-12 w-px h-16 bg-gradient-to-b from-[var(--accent-cyan)] to-transparent mx-auto"></div>
                    </div>
                </section>

                <section id="services" className="py-24 px-6 relative overflow-hidden">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-8">
                            <article className="glass-card p-10 rounded-2xl reveal group transition-all duration-500 hover:border-[var(--accent-cyan)]/50">
                                <h3 className="text-2xl font-black mb-4 text-[var(--text-primary)] uppercase tracking-tighter">FOR JUSTICE SEEKERS</h3>
                                <p className="text-[var(--text-secondary)] text-base mb-8 leading-relaxed">
                                    Empowerment through evidence. If you've been targeted by defamatory X posts or online harassment, our tool provides the technical proof to protect your reputation.
                                </p>
                                <div className="space-y-4 mb-10">
                                    {[
                                        { title: "Metadata capture", desc: "We capture the 'digital fingerprint' of every X post, including hidden headers and timestamps, ensuring the evidence is complete." },
                                        { title: "Harm categorization", desc: "Our smart AI automatically analyzes the harm caused by malicious X posts to help you build a strong legal case." },
                                        { title: "Proof of existence", desc: "Evidence from X (Twitter) is locked in a digital vault, proving exactly when it was captured before it can be deleted." },
                                        { title: "Defamation Dossiers", desc: "We generate comprehensive reports specifically designed for X (Twitter) defamation cases." }
                                    ].map((item, i) => (
                                        <div
                                            key={i}
                                            className="cursor-pointer"
                                            onMouseEnter={() => setHoveredPointSeeker(i)}
                                            onMouseLeave={() => setHoveredPointSeeker(null)}
                                        >
                                            <div className="flex gap-3 items-center mb-1">
                                                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${hoveredPointSeeker === i ? 'bg-[var(--accent-cyan)] scale-125' : 'bg-gray-600'}`}></div>
                                                <span className={`text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${hoveredPointSeeker === i ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-secondary)]'}`}>{item.title}</span>
                                            </div>
                                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${hoveredPointSeeker === i ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                                                <p className="pl-5 text-sm text-[var(--text-secondary)] leading-relaxed">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <a href="mailto:briannjoki619@gmail.com?subject=Forensic Support Request" className="inline-block text-[var(--accent-cyan)] font-bold border-b border-[var(--accent-cyan)]/30 pb-1 hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all uppercase tracking-wider text-sm">
                                    CONSULT WITH AN EXPERT &rarr;
                                </a>
                            </article>

                            <article className="glass-card p-10 rounded-2xl reveal group transition-all duration-500 hover:border-gray-500/50" style={{ transitionDelay: '0.2s' }}>
                                <h3 className="text-2xl font-black mb-4 text-[var(--text-secondary)] uppercase tracking-tighter">FOR INVESTIGATORS</h3>
                                <p className="text-[var(--text-secondary)] text-base mb-8 leading-relaxed">
                                    Professional X forensics. Anchor your investigation results into an immutable ledger for verified chain-of-custody.
                                </p>
                                <div className="space-y-4 mb-10">
                                    {[
                                        { title: "High-velocity X extraction", desc: "Advanced scraping protocols for capturing thousands of X posts while maintaining forensic integrity." },
                                        { title: "Automated defamation audits", desc: "ML-driven analysis using legal-grade NLP models to identify and score defamatory content in X (Twitter) threads." },
                                        { title: "Immutable blockchain logs", desc: "Cryptographic anchoring of X post hashes onto the blockchain for a verifiable chain-of-custody." },
                                        { title: "Forensic JSON/PDF Export", desc: "Standardized data exports integrated with cryptographic signatures for X (Twitter) investigations." }
                                    ].map((item, i) => (
                                        <div
                                            key={i}
                                            className="cursor-pointer"
                                            onMouseEnter={() => setHoveredPointInv(i)}
                                            onMouseLeave={() => setHoveredPointInv(null)}
                                        >
                                            <div className="flex gap-3 items-center mb-1">
                                                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${hoveredPointInv === i ? 'bg-gray-300 scale-125' : 'bg-gray-700'}`}></div>
                                                <span className={`text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${hoveredPointInv === i ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{item.title}</span>
                                            </div>
                                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${hoveredPointInv === i ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                                                <p className="pl-5 text-sm text-[var(--text-secondary)] leading-relaxed">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link to="/login" className="inline-block text-[var(--text-secondary)] font-bold border-b border-[var(--border-color)] pb-1 hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all uppercase tracking-wider text-sm">
                                    ANALYST CONSOLE &rarr;
                                </Link>
                            </article>
                        </div>
                    </div>
                </section>

                <section id="about" className="py-32 px-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/10">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-20 items-center mb-24">
                            <div className="reveal">
                                <span className="text-[var(--accent-cyan)] font-mono text-xs tracking-[0.4em] uppercase mb-6 block font-bold">The Mission</span>
                                <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight text-[var(--text-primary)]">
                                    WHY WE BUILT <br />
                                    <span className="text-[var(--accent-cyan)]">CHAINFORENSIX</span>
                                </h2>
                                <div className="space-y-6 text-lg text-[var(--text-secondary)] leading-relaxed">
                                    <p>
                                        In the digital age, X (Twitter) has become a primary field for public discourse, but also for targeted harm. The ability for malicious actors to delete X posts leaves victims without recourse.
                                    </p>
                                    <p>
                                        ChainForensix was designed as the ultimate shield. By merging high-velocity X post extraction with the "eternal memory" of the blockchain, we empower users to capture and prove the existence of digital harm before it disappears.
                                    </p>
                                </div>
                            </div>
                            <div className="reveal relative" style={{ transitionDelay: '0.2s' }}>
                                <div className="glass-card p-8 rounded-2xl relative z-10">
                                    <h4 className="text-xl font-bold mb-4 text-[var(--accent-cyan)]">Our Commitment</h4>
                                    <p className="text-[var(--text-secondary)] leading-relaxed italic">
                                        "We believe that everyone has the right to a safe digital environment. Our technology isn't just about data; it's about holding digital harm on X accountable."
                                    </p>
                                    <div className="mt-6 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600"></div>
                                        <div>
                                            <p className="text-[var(--text-primary)] font-bold">Brian Njoki</p>
                                            <p className="text-[var(--text-secondary)] text-xs uppercase tracking-widest">Founder & Lead Developer</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-[80px]"></div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                {
                                    title: "Digital Forensics",
                                    desc: "Deep forensic crawls of X (Twitter) posts to preserve metadata, headers, and session data required for legal standing."
                                },
                                {
                                    title: "Cyber Security",
                                    desc: "Built on zero-trust principles to ensure investigation privacy and the absolute integrity of captured X post evidence."
                                },
                                {
                                    title: "Blockchain",
                                    desc: "Anchoring X post hashes onto an immutable ledger, creating an undeniable and eternal record of investigative proofs."
                                },
                                {
                                    title: "AI & ML",
                                    desc: "Deploying high-grade NLP models to audit thousands of X posts for patterns of defamation and harrassment."
                                }
                            ].map((pillar, i) => (
                                <div key={i} className="glass-card p-8 rounded-2xl border-b-2 border-transparent hover:border-[var(--accent-cyan)] transition-all duration-300 reveal" style={{ transitionDelay: `${i * 0.15}s` }}>
                                    <h4 className="text-lg font-bold mb-4 text-[var(--text-primary)]">{pillar.title}</h4>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                        {pillar.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="faq" className="py-32 px-6 border-t border-[var(--border-color)] bg-[var(--bg-color)]">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16 reveal">
                            <span className="text-[var(--accent-cyan)] font-mono text-xs tracking-[0.4em] uppercase mb-4 block font-bold">Inquiry Protocol</span>
                            <h2 className="text-3xl md:text-5xl font-black text-[var(--text-primary)] uppercase tracking-tighter">FREQUENTLY ASKED</h2>
                        </div>
                        <div className="space-y-8">
                            {[
                                {
                                    q: "How do I prove a deleted X post existed?",
                                    a: "ChainForensix performs real-time forensic extraction that captures the full content, metadata, and server headers of an X post. This bundle is then cryptographically anchored to the blockchain, creating a permanent proof of state that remains even if the original post is deleted."
                                },
                                {
                                    q: "Why is blockchain necessary for digital evidence?",
                                    a: "Traditional screenshots are easily faked. Blockchain technology provides an immutable, decentralized timestamp and hash record. This ensures the evidence has not been altered since the moment of capture, meeting the 'Chain of Custody' requirements for legal professionals."
                                },
                                {
                                    q: "Are the reports from X forensics legally admissible?",
                                    a: "While admissibility depends on local jurisdictions, ChainForensix is built to forensic standards. We provide standardized JSON/PDF exports with cryptographic signatures, metadata bundles, and blockchain proofs that are designed to withstand technical scrutiny in court."
                                }
                            ].map((faq, i) => (
                                <div key={i} className="glass-card p-8 rounded-2xl reveal hover:border-[var(--accent-cyan)]/30 transition-all duration-300" style={{ transitionDelay: `${i * 0.1}s` }}>
                                    <h4 className="text-lg font-bold mb-3 text-[var(--text-primary)] flex gap-3">
                                        <span className="text-[var(--accent-cyan)]">Q.</span> {faq.q}
                                    </h4>
                                    <p className="text-[var(--text-secondary)] leading-relaxed pl-7">
                                        {faq.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

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
            </main>

            <footer className="py-24 px-6 bg-[var(--bg-color)]">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-end">
                    <div className="reveal">
                        <h2 className="text-4xl font-black mb-6 tracking-tighter italic text-[var(--text-primary)]">ChainForensix</h2>
                        <p className="text-[var(--text-secondary)] text-base mb-8 max-w-sm">
                            Built by Brian Njoki to ensure that digital freedom doesn't come at the cost of human dignity.
                        </p>
                        <div className="flex gap-8">
                            <a href="https://x.com/BRAYO_44" target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors uppercase font-bold text-[10px] tracking-widest">Twitter</a>
                            <a href="https://github.com/BRAYOgith" target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors uppercase font-bold text-[10px] tracking-widest">GitHub</a>
                            <a href="https://www.linkedin.com/in/brian-njoki-406793273" target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors uppercase font-bold text-[10px] tracking-widest">LinkedIn</a>
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
