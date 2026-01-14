import React from 'react';
import Footer from './Footer';
// Link removed as it was unused

const MethodologyPage = () => {
    return (
        <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-sans transition-colors duration-300">
            {/* Header / Hero Partial */}
            <header className="bg-[var(--bg-secondary)] py-16 border-b border-[var(--border-color)]">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <span className="text-accent font-bold tracking-widest uppercase text-xs mb-4 block">Process & Integrity</span>
                    <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6 text-[var(--text-primary)]">
                        Methodology
                    </h1>
                    <p className="text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
                        A deterministic, three-stage process to Capture, Analyze, and Preserve digital evidence. We establish a verifiable chain of custody for every investigation.
                    </p>
                </div>
            </header>

            <main className="py-16 max-w-4xl mx-auto px-6">

                <section className="mb-20">
                    <div className="flex items-baseline gap-4 mb-6 border-b border-[var(--border-color)] pb-4">
                        <span className="text-4xl font-black text-[var(--bg-secondary)] opacity-50 select-none">01.</span>
                        <h2 className="text-2xl font-bold font-heading text-[var(--text-primary)]">
                            High-Velocity Extraction
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2">
                            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
                                We utilize specialized forensic scrapers to capture the raw JSON payload of X posts directly from the platform's internal API. This bypasses the rendered UI to collect metadata often hidden from public view, including:
                            </p>
                            <ul className="list-disc ml-6 space-y-2 text-[var(--text-secondary)] marker:text-accent">
                                <li>Exact UTC creation timestamp (ms precision).</li>
                                <li>Original Device ID / Client Application.</li>
                                <li>Unmodified media URLs and attachment metadata.</li>
                                <li>Edit history flags and deleted state markers.</li>
                            </ul>
                        </div>
                        <div className="bg-[var(--bg-secondary)] p-6 rounded border border-[var(--border-color)] h-fit">
                            <span className="text-xs font-bold uppercase tracking-widest text-accent mb-2 block">Technical Note</span>
                            <p className="text-xs text-[var(--text-secondary)]">
                                All extraction occurs via a headless browser environment to simulate organic traffic while maintaining a zero-trust session isolation.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mb-20">
                    <div className="flex items-baseline gap-4 mb-6 border-b border-[var(--border-color)] pb-4">
                        <span className="text-4xl font-black text-[var(--bg-secondary)] opacity-50 select-none">02.</span>
                        <h2 className="text-2xl font-bold font-heading text-[var(--text-primary)]">
                            AI-Powered Analysis
                        </h2>
                    </div>
                    <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                        Extracted text content is run through our proprietary fine-tuned AI model specifically designed for <strong>Defamation and Hate Speech Detection</strong>. This provides an immediate triage score for legal professionals.
                    </p>
                    <div className="card-base">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 font-heading">Model Specifications</h3>
                        <div className="grid sm:grid-cols-3 gap-6 text-sm">
                            <div>
                                <strong className="block text-[var(--text-primary)] mb-1">Task</strong>
                                <span className="text-[var(--text-secondary)]">Multi-class Classification (Defamation, Hate Speech, Harassment)</span>
                            </div>
                            <div>
                                <strong className="block text-[var(--text-primary)] mb-1">Architecture</strong>
                                <span className="text-[var(--text-secondary)]">Transformer-based LLM fine-tuned on legal datasets.</span>
                            </div>
                            <div>
                                <strong className="block text-[var(--text-primary)] mb-1">Output</strong>
                                <span className="text-[var(--text-secondary)]">Probability Score (0-100%) & Category Label.</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-20">
                    <div className="flex items-baseline gap-4 mb-6 border-b border-[var(--border-color)] pb-4">
                        <span className="text-4xl font-black text-[var(--bg-secondary)] opacity-50 select-none">03.</span>
                        <h2 className="text-2xl font-bold font-heading text-[var(--text-primary)]">
                            Cryptographic Preservation
                        </h2>
                    </div>
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1">
                            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
                                To prevent evidence tampering, ChainForensix generates a <strong>SHA-256 cryptographic hash</strong> of the captured data payload. This hash is then anchored to the destination blockchain network.
                            </p>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                This process creates an immutable timestamp. Any alteration to the stored evidence file would result in a different hash, immediately alerting the investigator to a breach of integrity.
                            </p>
                        </div>
                        <div className="w-full md:w-80 bg-[#0A192F] p-6 rounded-lg shadow-inner border border-gray-800 font-mono text-xs overflow-hidden text-cyan-400">
                            <div className="mb-2 opacity-50">// Evidence Hash Generation</div>
                            <div className="text-pink-400">const</div> payload = <span className="text-yellow-300">JSON</span>.stringify(data);<br />
                            <div className="text-pink-400">const</div> hash = sha256(payload);<br />
                            <div className="text-green-400 mt-2">{'>>'} Anchor to Ethereum</div>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="bg-accent text-white p-8 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-2 font-heading">Court Admissibility</h2>
                        <p className="opacity-90 leading-relaxed">
                            Reports generated by ChainForensix differ from standard screenshots. By providing the JSON source and a blockchain verification receipt, our evidence meets the standards for <strong>Scientific Evidence</strong> and digital authenticity in many jurisdictions.
                        </p>
                    </div>
                </section>

            </main>

            <Footer />
        </div>
    );
};

export default MethodologyPage;
