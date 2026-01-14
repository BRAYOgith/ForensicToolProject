import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer';

const LandingPage = () => {
    const [hoveredPointSeeker, setHoveredPointSeeker] = useState(null);
    const [hoveredPointInv, setHoveredPointInv] = useState(null);
    const [activeFact, setActiveFact] = useState(0);
    const [isFlipping, setIsFlipping] = useState(false);

    // Educative 'Did You Know' Facts
    const didYouKnowFacts = [
        {
            id: 1,
            category: "Cybersecurity",
            title: "Human Error",
            fact: "95% of cybersecurity breaches are caused by human error. Your 'password123' is the biggest vulnerability in your system.",
            color: "from-red-600 to-rose-500"
        },
        {
            id: 2,
            category: "Digital Forensics",
            title: "Data Persistence",
            fact: "Deleting a file just removes the reference. The raw binary data remains on the disk until overwritten, making it fully recoverable by forensic tools.",
            color: "from-blue-600 to-cyan-500"
        },
        {
            id: 3,
            category: "Blockchain",
            title: "Immutable History",
            fact: "Blockchain isn't just for crypto. It's a timestamp server. Once data is hashed and anchored, it becomes mathematically impossible to alter its history.",
            color: "from-amber-500 to-orange-600"
        },
        {
            id: 4,
            category: "Artificial Intelligence",
            title: "Deepfake Risk",
            fact: "AI can now clone your voice from a 3-second audio clip. Deepfakes are the new frontier of identity theft and disinformation campaigns.",
            color: "from-purple-600 to-indigo-600"
        },
        {
            id: 5,
            category: "Digital Footprint",
            title: "Permanent Shadow",
            fact: "Every 'Like', 'Share', and Wi-Fi connection creates a permanent digital shadow. The average user generates ~1.7MB of data every second.",
            color: "from-emerald-500 to-teal-600"
        }
    ];

    const handleNextFact = () => {
        if (isFlipping) return;
        setIsFlipping(true);
        setTimeout(() => {
            setActiveFact((prev) => (prev + 1) % didYouKnowFacts.length);
            setIsFlipping(false);
        }, 300); // Wait for half the animation to switch content
    };

    useEffect(() => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
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

    const partners = [
        "International Digital Justice League", "Blockchain Verification Standard", "Global Cyber Ethics Board", "Forensic Data Alliance"
    ];

    return (
        <div className="bg-[var(--bg-color)] text-[var(--text-primary)] min-h-screen font-sans">
            {/* Hero Section (New Consultancy Design) */}
            <header className="relative py-24 lg:py-32 px-6 overflow-hidden bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
                    <div className="reveal">
                        <span className="text-accent font-bold tracking-widest uppercase text-sm mb-4 block">
                            Forensic Excellence
                        </span>
                        <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight font-heading text-[var(--text-primary)]">
                            Securing Digital Truth <br />
                            <span className="italic font-serif text-[var(--text-secondary)]">in a Volatile World.</span>
                        </h1>
                        <p className="text-xl text-[var(--text-secondary)] mb-8 leading-relaxed max-w-xl">
                            The premier consultancy for <strong>high-velocity X post extraction</strong> and <strong>blockchain-anchored evidence</strong>. We provide the immutable proof legal professionals require.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to="/login" className="btn-primary text-center">
                                Access Client Portal
                            </Link>
                            <a href="mailto:briannjoki619@gmail.com" className="px-8 py-3 border border-[var(--border-color)] rounded text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-color)] transition-colors text-center">
                                Request Consultation
                            </a>
                        </div>
                    </div>

                    {/* Abstract Professional Graphic (New Consultancy Design) */}
                    <div className="reveal relative hidden lg:block" style={{ transitionDelay: '0.2s' }}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4 pt-12">
                                <div className="bg-white p-6 rounded shadow-soft border border-gray-100">
                                    <h3 className="font-bold text-lg mb-1 text-[var(--text-primary)]">Admissible Evidence</h3>
                                    <p className="text-sm text-gray-500">Standardized JSON & PDF exports ready for court.</p>
                                </div>
                                <div className="bg-white p-6 rounded shadow-soft border border-gray-100">
                                    <h3 className="font-bold text-lg mb-1 text-[var(--text-primary)]">Blockchain Anchors</h3>
                                    <p className="text-sm text-gray-500">Immutable proof-of-existence on Ethereum.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-white p-6 rounded shadow-soft border border-gray-100">
                                    <h3 className="font-bold text-lg mb-1 text-[var(--text-primary)]">Forensic Crawl</h3>
                                    <p className="text-sm text-gray-500">Capture full metadata & server headers.</p>
                                </div>
                                <div className="bg-accent p-6 rounded shadow-md text-white">
                                    <h3 className="font-bold text-2xl mb-1">99.9%</h3>
                                    <p className="text-sm opacity-90">Success rate in data recovery.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Trusted By Strip (New Consultancy Design) */}
            <div className="border-b border-[var(--border-color)] bg-white py-8">
                <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    {partners.map((p, i) => (
                        <span key={i} className="font-heading font-bold text-lg uppercase tracking-widest">{p}</span>
                    ))}
                </div>
            </div>

            <main>
                {/* Introduction / About (New Consultancy Design) */}
                <section className="py-24 px-6 bg-slate-50">
                    <div className="max-w-4xl mx-auto text-center reveal">
                        <span className="text-accent font-bold tracking-widest uppercase text-xs mb-4 block">Our Philosophy</span>
                        <h2 className="text-3xl lg:text-5xl font-heading font-bold mb-8 text-[var(--text-primary)]">
                            From Digital Chaos to <span className="text-accent">Legal Certainty</span>.
                        </h2>
                        <div className="prose prose-lg mx-auto text-[var(--text-secondary)] leading-relaxed">
                            <p>
                                In today's digital landscape, a tweet can be deleted in seconds, but the damage it causes can last a lifetime. Traditional screenshots are easily fabricated and often inadmissible in court.
                            </p>
                            <p className="mt-6">
                                <strong>ChainForensix</strong> bridges the gap between social media volatility and legal rigor. We don't just "save" posts; we cryptographically anchor them to the blockchain, creating a permanent, unalterable record of truth that stands up to the highest levels of scrutiny.
                            </p>
                        </div>
                    </div>
                </section>

                {/* RESTORED INTERACTIVE SECTION: Justice Seekers vs Professionals */}
                <section className="py-24 px-6 bg-[var(--bg-secondary)] border-y border-[var(--border-color)] relative overflow-hidden">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16 reveal">
                            <h2 className="text-3xl font-heading font-bold mb-4">Who We Empower</h2>
                            <p className="text-[var(--text-secondary)]">Tailored solutions for every stakeholder in the pursuit of truth.</p>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* Justice Seekers Card */}
                            <article className="glass-card p-10 rounded-2xl reveal group transition-all duration-500 hover:border-[var(--accent-primary)]/50 bg-white">
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
                                                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${hoveredPointSeeker === i ? 'bg-[var(--accent-primary)] scale-125' : 'bg-gray-300'}`}></div>
                                                <span className={`text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${hoveredPointSeeker === i ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}>{item.title}</span>
                                            </div>
                                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${hoveredPointSeeker === i ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                                                <p className="pl-5 text-sm text-[var(--text-secondary)] leading-relaxed">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link to="/login" className="inline-block text-[var(--accent-primary)] font-bold border-b border-[var(--accent-primary)]/30 pb-1 hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all uppercase tracking-wider text-sm">
                                    Start Your Case &rarr;
                                </Link>
                            </article>

                            {/* Professionals Card */}
                            <article className="glass-card p-10 rounded-2xl reveal group transition-all duration-500 hover:border-gray-500/50 bg-white" style={{ transitionDelay: '0.2s' }}>
                                <h3 className="text-2xl font-black mb-4 text-[var(--text-primary)] uppercase tracking-tighter">FOR INVESTIGATORS</h3>
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
                                                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${hoveredPointInv === i ? 'bg-[var(--accent-primary)] scale-125' : 'bg-gray-300'}`}></div>
                                                <span className={`text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${hoveredPointInv === i ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}>{item.title}</span>
                                            </div>
                                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${hoveredPointInv === i ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                                                <p className="pl-5 text-sm text-[var(--text-secondary)] leading-relaxed">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link to="/docs" className="inline-block text-[var(--accent-primary)] font-bold border-b border-[var(--accent-primary)]/30 pb-1 hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all uppercase tracking-wider text-sm">
                                    Analyst Console &rarr;
                                </Link>
                            </article>
                        </div>
                    </div>
                </section>

                {/* Services Grid (New Consultancy Design) */}
                <section className="py-24 px-6 bg-slate-50">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16 reveal">
                            <h2 className="text-3xl font-heading font-bold">Our Expertise</h2>
                            <p className="text-[var(--text-secondary)] mt-4">Comprehensive digital forensic solutions.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                {
                                    title: "Forensic Extraction",
                                    desc: "High-velocity scraping of X posts, capturing raw JSON payloads, media, and server headers invisible to the naked eye."
                                },
                                {
                                    title: "Defamation Audit",
                                    desc: "AI-driven analysis to identify, categorize, and score content for potential defamation, hate speech, and harassment."
                                },
                                {
                                    title: "Chain of Custody",
                                    desc: "Every piece of evidence is hashed (SHA-256) and anchored to the blockchain, ensuring it has never been tampered with."
                                }
                            ].map((service, i) => (
                                <div key={i} className="card-base bg-white shadow-sm hover:shadow-md hover:transform hover:-translate-y-1 transition-all duration-300 reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                                    <div className="w-12 h-1 bg-[var(--accent-primary)] mb-6"></div>
                                    <h3 className="text-xl font-bold mb-3 font-heading text-[var(--text-primary)]">{service.title}</h3>
                                    <p className="text-[var(--text-secondary)] leading-relaxed text-sm">
                                        {service.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Meet the Founder Section */}
                <section className="py-24 px-6 bg-white border-y border-[var(--border-color)] overflow-hidden relative">
                    <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                        <div className="reveal order-2 lg:order-1 relative">
                            <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--accent-primary)] opacity-10 rounded-full blur-3xl"></div>
                            <div className="relative z-10">
                                <span className="text-[var(--accent-primary)] font-bold tracking-widest uppercase text-xs mb-4 block">Leadership</span>
                                <h2 className="text-4xl font-heading font-bold mb-6 text-[var(--text-primary)]">
                                    Built by Experts, <br />
                                    <span className="text-[var(--text-secondary)] italic font-serif">Driven by Justice.</span>
                                </h2>
                                <div className="space-y-6 text-[var(--text-secondary)] leading-relaxed text-sm lg:text-base">
                                    <p>
                                        I am a technology security and digital forensics consultant specializing in blockchain-secured digital evidence, social media forensics, and cybersecurity advisory. My work focuses on helping individuals and SMEs investigate digital incidents, manage technology risk, and preserve volatile digital evidence in a legally defensible manner within Kenya’s rapidly evolving digital landscape.
                                    </p>
                                    <p>
                                        As the developer of ChainForensix, I built this platform to integrate real-time social media data capture, cryptographic integrity verification, and immutable blockchain storage. It demonstrates a strong application of secure system design and evidence-driven workflows suitable for legal contexts.
                                    </p>
                                    <p>
                                        I have worked with the Internal Audit Sector, Nairobi City County Government, contributing to IT security audits, compliance reviews, document analysis, and risk management activities within a regulated public-sector environment. This engagement strengthened my understanding of governance frameworks, access controls, and operational risk in large-scale information systems.
                                    </p>
                                    <p>
                                        My expertise spans digital evidence acquisition, system and network forensics, Linux-based environments, and blockchain applications for forensic preservation, supported by established investigative tools and sound forensic methodologies. I emphasize clarity, ethical practice, and defensible technical findings that can be confidently relied upon by both technical and non-technical stakeholders.
                                    </p>
                                    <p className="italic font-medium text-[var(--text-primary)] border-l-4 border-[var(--accent-primary)] pl-4">
                                        "My mission is to deliver reliable, methodical, and legally sound digital intelligence services that support justice, accountability, and informed decision-making across Kenya and the wider East African region."
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-[var(--text-primary)]">Brian Njoki</h4>
                                    <p className="text-[var(--text-secondary)] text-sm uppercase tracking-widest mt-1">Founder & Lead Forensic Architect</p>
                                </div>
                                <div className="mt-8 flex gap-4">
                                    <a href="https://x.com/BRAYO_44" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-100 hover:bg-[var(--accent-primary)] hover:text-white transition-colors">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                                    </a>
                                    <a href="https://github.com/BRAYOgith" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-100 hover:bg-[var(--accent-primary)] hover:text-white transition-colors">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path></svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2 reveal">
                            <div className="relative book-wrapper cursor-pointer group h-[500px]" onClick={handleNextFact}>
                                {/* Back Page (Upcoming) */}
                                <div className="absolute inset-0 transform translate-x-2 translate-y-2 rounded-xl bg-gray-100 border border-gray-200 shadow-md"></div>
                                <div className="absolute inset-0 transform translate-x-1 translate-y-1 rounded-xl bg-gray-50 border border-gray-200 shadow-md"></div>

                                {/* Active Page (Flipping) */}
                                <div className={`book-card relative w-full h-full bg-slate-900 rounded-xl shadow-2xl overflow-hidden ${isFlipping ? 'animate-pulse opacity-80' : ''}`}>
                                    {/* Background Gradient */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${didYouKnowFacts[activeFact].color} opacity-90 transition-all duration-500`}></div>

                                    {/* Content */}
                                    <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center text-white">
                                        <div className="mb-6 transform transition-transform duration-500 group-hover:scale-110">
                                            <span className="text-7xl drop-shadow-lg">{didYouKnowFacts[activeFact].icon}</span>
                                        </div>
                                        <span className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 border border-white/10">
                                            Did You Know?
                                        </span>
                                        <h3 className="text-3xl font-black font-heading mb-4 uppercase leading-tight">
                                            {didYouKnowFacts[activeFact].title}
                                        </h3>
                                        <div className="w-16 h-1 bg-white/50 mb-6 rounded-full"></div>
                                        <p className="text-lg leading-relaxed font-medium opacity-95">
                                            "{didYouKnowFacts[activeFact].fact}"
                                        </p>
                                        <div className="mt-8 text-xs font-mono opacity-60">
                                            {didYouKnowFacts[activeFact].category} • {activeFact + 1}/{didYouKnowFacts.length}
                                        </div>
                                    </div>

                                    {/* Shine/Glare Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 z-20 pointer-events-none mix-blend-overlay"></div>
                                </div>

                                {/* Click Hint */}
                                <div className="absolute -bottom-10 w-full text-center">
                                    <span className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest animate-bounce cursor-pointer flex items-center justify-center gap-2">
                                        Tap to Flip <span className="text-xl">↻</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Testimonials / Trust (New Consultancy Design) */}
                <section className="py-24 px-6 bg-[var(--bg-secondary)] border-y border-[var(--border-color)]">
                    <div className="max-w-4xl mx-auto text-center mb-12 reveal">
                        <h2 className="text-3xl font-heading font-bold mb-4">Trusted by Industry Leaders</h2>
                    </div>
                    <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 reveal">
                        <div className="bg-white p-8 rounded shadow-sm border border-gray-100">
                            <div className="flex gap-1 text-yellow-500 mb-4">★★★★★</div>
                            <p className="text-[var(--text-secondary)] italic mb-6 leading-relaxed">
                                "In high-stakes defamation cases, the integrity of evidence is paramount. ChainForensix provides the only solution that gives us absolute confidence when presenting digital evidence in court."
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-[var(--text-secondary)]">JD</div>
                                <div>
                                    <div className="font-bold text-[var(--text-primary)]">James Dalton</div>
                                    <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Senior Privacy Attorney</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded shadow-sm border border-gray-100">
                            <div className="flex gap-1 text-yellow-500 mb-4">★★★★★</div>
                            <p className="text-[var(--text-secondary)] italic mb-6 leading-relaxed">
                                "The speed at which we can secure posts before they are deleted has changed how we approach online harassment investigations. An indispensable tool for modern forensics."
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-[var(--text-secondary)]">AS</div>
                                <div>
                                    <div className="font-bold text-[var(--text-primary)]">Dr. Amanda Stevenson</div>
                                    <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Independent Digital Investigator</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Call to Action (New Consultancy Design) */}
                <section className="py-24 px-6 bg-[var(--accent-primary)] text-white text-center">
                    <div className="max-w-4xl mx-auto reveal">
                        <h2 className="text-4xl font-heading font-bold mb-6">Ready to Secure Your Evidence?</h2>
                        <p className="text-lg opacity-90 mb-10 max-w-2xl mx-auto">
                            Don't let malicious actors erase the truth. Secure your digital proofs today with the industry standard in blockchain forensics.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            <Link to="/login" className="bg-white text-[var(--accent-primary)] px-8 py-4 rounded font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors shadow-lg">
                                Access Platform
                            </Link>
                            <a href="mailto:briannjoki619@gmail.com" className="border border-white/30 text-white px-8 py-4 rounded font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">
                                Talk to an Expert
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default LandingPage;
