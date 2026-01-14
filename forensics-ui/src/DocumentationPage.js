import React from 'react';
import Footer from './Footer';
// Link removed as it was unused

const DocumentationPage = () => {
    return (
        <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-sans transition-colors duration-300">
            {/* Header / Hero Partial */}
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

                    </div>
                </section>

                <section className="mb-20">
                    <h2 className="text-2xl font-heading font-bold text-[var(--text-primary)] mb-6">Citing ChainForensix</h2>
                    <p className="mb-4 text-[var(--text-secondary)]">
                        If you are using ChainForensix in an academic paper or forensic report, please use the following citation format:
                    </p>
                    <div className="bg-[var(--text-primary)] text-[var(--bg-color)] p-6 rounded-lg font-mono text-sm overflow-x-auto border border-transparent">
                        Njoki, B. (2026). ChainForensix: A Blockchain-Based Forensic Tool for X Post Preservation (v1.0) [Software]. Available at https://forensic-tool-project.vercel.app
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-heading font-bold text-[var(--text-primary)] mb-6">Technical Specifications</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">Supported Platforms</span>
                            <span className="text-[var(--text-primary)] font-semibold">X (Twitter)</span>
                        </div>
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">Blockchain Network</span>
                            <span className="text-[var(--text-primary)] font-semibold">Ethereum</span>
                        </div>
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">Evidence Format</span>
                            <span className="text-[var(--text-primary)] font-semibold">JSON + SHA-256</span>
                        </div>
                        <div className="card-base py-4 px-6 flex justify-between items-center">
                            <span className="text-sm text-[var(--text-secondary)]">AI Model</span>
                            <span className="text-[var(--text-primary)] font-semibold">Transformer</span>
                        </div>
                    </div>
                </section>

            </main>

            <Footer />
        </div>
    );
};

export default DocumentationPage;
