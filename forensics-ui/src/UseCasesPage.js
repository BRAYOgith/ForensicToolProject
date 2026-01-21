import React from 'react';
import { Link } from 'react-router-dom';
import SEO from './components/SEO';

const UseCasesPage = () => {
    return (
        <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] font-sans transition-colors duration-300">
            <SEO
                title="Use Cases & Applications"
                description="Explore how ChainForensix aids Justice Seekers, Legal Counsel, and OSINT investigators in securing immutable social media evidence."
                keywords="Forensics Use Cases, Legal Evidence, Digital Harassment, OSINT Investigation, Defamation Lawsuit Support"
                canonical="https://forensic-tool-project.vercel.app/use-cases"
            />

            <header className="bg-[var(--bg-secondary)] py-16 border-b border-[var(--border-color)]">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <span className="text-accent font-bold tracking-widest uppercase text-xs mb-4 block">Applications</span>
                    <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6 text-[var(--text-primary)]">
                        Use Cases
                    </h1>
                    <p className="text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
                        Tailored forensic solutions for victims, legal professionals, and investigators.
                    </p>
                </div>
            </header>

            <main className="py-16 max-w-5xl mx-auto px-6">

                {/* Justice Seekers */}
                <section className="mb-24 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-accent/10 p-2 rounded text-accent">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </span>
                            <h2 className="text-3xl font-heading font-bold text-[var(--text-primary)]">Justice Seekers</h2>
                        </div>
                        <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
                            For individuals facing online harassment, cyberstalking, or defamation, time is critical. Perpetrators often delete incriminating posts once they know an investigation is underway.
                        </p>
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-start gap-3">
                                <span className="text-accent mt-1">✓</span>
                                <span className="text-[var(--text-secondary)]"><strong>Preserve deleted content:</strong> Capture posts before they vanish.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-accent mt-1">✓</span>
                                <span className="text-[var(--text-secondary)]"><strong>Provable integrity:</strong> Blockchain anchoring proves the evidence wasn't faked.</span>
                            </li>
                        </ul>
                        <Link to="/login" className="text-accent font-bold hover:underline">Start Preserving Evidence &rarr;</Link>
                    </div>
                    <div className="bg-[var(--bg-secondary)] p-8 rounded-xl border border-[var(--border-color)]">
                        <h3 className="text-lg font-bold mb-4 font-heading">Scenario: Cyberstalking</h3>
                        <p className="text-sm text-[var(--text-secondary)] italic mb-4">
                            "An anonymous account is posting private photos. Reporting to the platform takes days, and posts are deleted before I can document them."
                        </p>
                        <div className="bg-[var(--bg-color)] p-4 rounded text-xs border border-[var(--border-color)]">
                            <strong>ChainForensix Solution:</strong><br />
                            Instant capture of the profile and posts. The generated report includes server timestamps and media metadata, creating a solid package for law enforcement.
                        </div>
                    </div>
                </section>

                {/* Legal Counsel */}
                <section className="mb-24 grid md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
                    <div className="md:order-2">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-accent/10 p-2 rounded text-accent">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                </svg>
                            </span>
                            <h2 className="text-3xl font-heading font-bold text-[var(--text-primary)]">Legal Counsel</h2>
                        </div>
                        <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
                            Attorneys require evidence that withstands scrutiny. simple screenshots are easily challenged in court as "doctored" or "fake".
                        </p>
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-start gap-3">
                                <span className="text-accent mt-1">✓</span>
                                <span className="text-[var(--text-secondary)]"><strong>Chain of Custody:</strong> Verification from capture to storage.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-accent mt-1">✓</span>
                                <span className="text-[var(--text-secondary)]"><strong>Metadata Analysis:</strong> Establish timeline and origin.</span>
                            </li>
                        </ul>
                        <Link to="/methodology" className="text-accent font-bold hover:underline">Review Methodology &rarr;</Link>
                    </div>
                    <div className="md:order-1 bg-[var(--bg-secondary)] p-8 rounded-xl border border-[var(--border-color)]">
                        <h3 className="text-lg font-bold mb-4 font-heading">Scenario: Defamation Lawsuit</h3>
                        <p className="text-sm text-[var(--text-secondary)] italic mb-4">
                            "The opposing counsel argues that the screenshots provided by the plaintiff were fabricated in Photoshop."
                        </p>
                        <div className="bg-[var(--bg-color)] p-4 rounded text-xs border border-[var(--border-color)]">
                            <strong>ChainForensix Solution:</strong><br />
                            Verify the transaction hash on the Ethereum blockchain. The hash matches the data payload exactly, proving the evidence existed in that state at the time of capture.
                        </div>
                    </div>
                </section>

                {/* OSINT / Investigators */}
                <section className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-accent/10 p-2 rounded text-accent">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <h2 className="text-3xl font-heading font-bold text-[var(--text-primary)]">OSINT Investigators</h2>
                        </div>
                        <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
                            Open Source Intelligence requires processing vast amounts of data while maintaining rigorous verification standards.
                        </p>
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-start gap-3">
                                <span className="text-accent mt-1">✓</span>
                                <span className="text-[var(--text-secondary)]"><strong>High-Velocity Extraction:</strong> Rapid data collection.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-accent mt-1">✓</span>
                                <span className="text-[var(--text-secondary)]"><strong>JSON-Source Access:</strong> Full raw data access for deeper analysis.</span>
                            </li>
                        </ul>
                    </div>
                    <div className="bg-[var(--bg-secondary)] p-8 rounded-xl border border-[var(--border-color)]">
                        <h3 className="text-lg font-bold mb-4 font-heading">Scenario: Disinformation Network</h3>
                        <p className="text-sm text-[var(--text-secondary)] italic mb-4">
                            "Tracking a coordinated bot network spreading false information across multiple accounts."
                        </p>
                        <div className="bg-[var(--bg-color)] p-4 rounded text-xs border border-[var(--border-color)]">
                            <strong>ChainForensix Solution:</strong><br />
                            Batch analysis of posts to identify device ID patterns and temporal correlation between accounts, anchored securely for the final report.
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default UseCasesPage;
