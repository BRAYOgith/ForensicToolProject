import React from 'react';
import SEO from './components/SEO';

const DocumentationPage = () => {
    return (
        <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-sans transition-colors duration-300">
             <SEO
                title="Documentation & Usage"
                description="Technical resources for digital investigators, legal professionals, and developers using ChainForensix for X post preservation."
                canonical="https://forensic-tool-project.vercel.app/docs"
            />

            {/* Header / Hero */}
            <header className="bg-[var(--bg-secondary)] py-16 border-b border-[var(--border-color)]">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <span className="text-accent font-bold tracking-widest uppercase text-xs mb-4 block">Knowledge Base</span>
                    <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6 text-[var(--text-primary)]">
                        Documentation
                    </h1>
                    <p className="text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
                        Technical resources for digital investigators, legal professionals, and developers using ChainForensix for X post preservation.
                    </p>
                </div>
            </header>

            <main className="py-16 max-w-4xl mx-auto px-6">

                {/* ==================== PLATFORM FEATURES ==================== */}
                <section className="mb-20">
                    <h2 className="text-3xl font-heading font-bold text-[var(--text-primary)] mb-8 border-b border-[var(--border-color)] pb-4">
                        Platform Features
                    </h2>
                    <div className="space-y-6">

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">🔍 AI-Powered Content Classification</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Our fine-tuned <strong>Afro-XLMR</strong> transformer model classifies X posts into three categories: <strong>Safe</strong>, <strong>Defamatory</strong>, and <strong>Hate Speech</strong>. The model was trained on approximately 48,000 Kenyan tweets with class-weighted loss to handle data imbalance, and includes the <strong>NCIC Act 2008 Lexicon</strong> for alignment with Kenyan legal definitions. A <strong>Universal Emoji Bridge</strong> translates emoji sentiment into text for more accurate analysis.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">🖼️ OCR Visual Analysis (English & Swahili)</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                ChainForensix uses <strong>EasyOCR</strong> to automatically extract text from images and videos attached to X posts, supporting both <strong>English</strong> and <strong>Swahili</strong>. Extracted visual text is combined with the post caption for a comprehensive dual-evidence analysis, ensuring hate speech hidden in images is not missed.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">⛓️ Blockchain Evidence Anchoring</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Evidence is cryptographically hashed using <strong>Keccak-256</strong> and permanently stored on the <strong>Ethereum Sepolia testnet</strong> via a Solidity smart contract. Each evidence record receives a unique Evidence ID of the evidence together with an Ethereum Transaction Hash, providing tamper-proof proof-of-existence verifiable on <strong>Etherscan</strong>.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">📊 Forensic Analytics Dashboard</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                The Reports page features a comprehensive analytics suite including a <strong>7-day activity trend line chart</strong> (fetches vs. retrievals), a <strong>daily comparison bar chart</strong> (yesterday vs. today), and a <strong>3-class AI distribution pie chart</strong> showing the breakdown of Safe, Defamatory, and Hate Speech classifications across all analyzed posts.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">📄 Court-Ready PDF Report Generation</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Generate comprehensive PDF forensic reports that include all captured evidence, AI classification results, blockchain transaction hashes, and <strong>embedded analytics charts</strong>. Reports contain the investigator identity, timestamps, and verification links for each piece of evidence. It is designed for submission to Kenyan courts and legal practitioners.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">🔎 X Post Search by Content</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                In addition to fetching by Post ID, investigators can <strong>search X posts by content keywords</strong>. The search returns up to 10 recent matching posts with full metadata and engagement metrics, allowing investigators to discover relevant evidence without needing the exact post URL.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">🤖 AI Forensic Chatbot Assistant</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                An integrated AI chatbot provides real-time guidance on platform usage, troubleshooting, and forensic methodology. It includes a <strong>knowledge base</strong> covering workflows, error resolution, and blockchain explanations. The chatbot also supports <strong>escalation to human forensic experts</strong> and <strong>appointment scheduling</strong> for consultations.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">📅 Expert Appointment Booking</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Users can schedule consultations with forensic experts directly through the platform. The booking system captures topic, preferred date/time, and contact details, with status tracking from <strong>pending</strong> through to <strong>confirmed</strong>. This feature enables seamless escalation from automated analysis to human expert review.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">🔐 Tamper-Evident Audit Logging</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Every user action (login, fetch, store, retrieve, report generation) is recorded in a <strong>cryptographically chained audit log</strong>. Each log entry contains a SHA-256 hash of the previous entry (genesis-block style), making the entire audit trail tamper-evident. Any modification to a past log entry would break the hash chain and be immediately detectable.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">🔒 Field-Level Encryption</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Sensitive evidence fields (post content, author username, media URLs, engagement metrics) are <strong>encrypted at rest</strong> before storage in the local database using AES encryption via the <code className="text-accent">crypto_utils</code> module. Data is only decrypted when displayed to the authenticated investigator or when generating reports.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">☁️ Cloud AI Fallback (Hugging Face API)</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                When local GPU resources are unavailable or in production environments, the system automatically falls back to the <strong>Hugging Face Inference API</strong> for AI classification. This ensures that the Afro-XLMR model remains accessible regardless of server hardware, providing seamless cloud-local hybrid inference.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">🛡️ Security Hardening</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                The backend implements production-grade security measures including <strong>Content Security Policy (CSP)</strong>, <strong>X-Frame-Options</strong>, <strong>X-Content-Type-Options</strong>, <strong>Referrer-Policy</strong>, and <strong>Permissions-Policy</strong> headers. API endpoints are protected by <strong>Flask-Limiter</strong> rate limiting (200/day, 50/hour default; 3/min login; 20/hour fetch). Authentication uses <strong>httpOnly secure cookies</strong> with JWT tokens.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">✉️ Email Verification & Recovery</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                User registration requires <strong>email verification</strong> via the Brevo (Sendinblue) API. Activation links expire after 1 hour. The system also supports <strong>password reset flows</strong> with secure time-limited tokens, and <strong>activation link resending</strong> for users who missed their initial email.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">🧬 Forensic Marker Extraction</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Beyond AI classification, the system extracts <strong>forensic markers</strong> from post text, including NCIC-monitored terms (e.g., "Madoa doa", "Fumigation"), defamatory markers, security threat keywords, @handles, proper names, and hashtags. These markers are used to generate granular, context-specific justifications for each AI verdict.
                            </p>
                        </div>

                    </div>
                </section>

                {/* ==================== FAQ ==================== */}
                <section className="mb-20">
                    <h2 className="text-3xl font-heading font-bold text-[var(--text-primary)] mb-8 border-b border-[var(--border-color)] pb-4">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-6">

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">How do I trace crypto transactions related to a case?</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                While ChainForensix specializes in X post forensics, it anchors evidence to the blockchain. You can view the transaction hash provided in your report on any standard block explorer (Etherscan, BscScan) to verify the timestamp and integrity of the evidence.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">How can I preserve social media posts as evidence?</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Enter the URL of the target X post into the ChainForensix dashboard. Our system will automatically extract the metadata, run a defamation analysis, and write the cryptographic hash to the blockchain.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Is the AI model reliable for court verification?</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                The AI model provides a preliminary probability score for defamation and hate speech. This is intended to act as a "triage" tool for investigators. The core evidence is the raw, unalterable JSON data preserved on the blockchain, which allows human experts to verify the findings independently.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">What happens if an image contains hate speech text?</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                ChainForensix uses OCR (Optical Character Recognition) to automatically extract text from images attached to X posts. The extracted visual text is combined with the post caption and analyzed together. If sensitive content is found in images, the system flags it for human confirmation before final classification.
                            </p>
                        </div>

                        <div className="card-base group hover:border-accent transition-colors">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Can I talk to a human expert?</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                Yes. Use the chatbot widget in the bottom-right corner and type "talk to expert" or "schedule appointment". You can book a consultation with a forensic specialist through the built-in appointment system, specifying your topic and preferred date and time.
                            </p>
                        </div>

                    </div>
                </section>

                {/* ==================== CITING ==================== */}
                <section className="mb-20">
                    <h2 className="text-2xl font-heading font-bold text-[var(--text-primary)] mb-6">Citing ChainForensix</h2>
                    <p className="mb-4 text-[var(--text-secondary)]">
                        If you are using ChainForensix in an academic paper or forensic report, please use the following citation format:
                    </p>
                    <div className="bg-[var(--text-primary)] text-[var(--bg-color)] p-6 rounded-lg font-mono text-sm overflow-x-auto border border-transparent">
                        Njoki, B. (2026). ChainForensix: A Blockchain-Based Forensic Tool for X Post Preservation (v1.0) [Software]. Available at https://forensic-tool-project.vercel.app
                    </div>
                </section>

                {/* ==================== TECH SPECS ==================== */}
                <section>
                    <h2 className="text-2xl font-heading font-bold text-[var(--text-primary)] mb-6">Technical Specifications</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">Supported Platforms</span>
                            <span className="text-[var(--text-primary)] font-semibold">X (Twitter)</span>
                        </div>
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">Blockchain Network</span>
                            <span className="text-[var(--text-primary)] font-semibold">Ethereum (Sepolia)</span>
                        </div>
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">Evidence Hashing</span>
                            <span className="text-[var(--text-primary)] font-semibold">Keccak-256</span>
                        </div>
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">AI Model</span>
                            <span className="text-[var(--text-primary)] font-semibold">Afro-XLMR (3-class)</span>
                        </div>
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">OCR Engine</span>
                            <span className="text-[var(--text-primary)] font-semibold">EasyOCR (En/Sw)</span>
                        </div>
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">Smart Contract</span>
                            <span className="text-[var(--text-primary)] font-semibold">Solidity 0.8.x</span>
                        </div>
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">Backend Framework</span>
                            <span className="text-[var(--text-primary)] font-semibold">Python Flask</span>
                        </div>
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">Frontend Framework</span>
                            <span className="text-[var(--text-primary)] font-semibold">React 18 + Vite</span>
                        </div>
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">Data Encryption</span>
                            <span className="text-[var(--text-primary)] font-semibold">AES (at rest)</span>
                        </div>
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">Audit Integrity</span>
                            <span className="text-[var(--text-primary)] font-semibold">SHA-256 Chain</span>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default DocumentationPage;
