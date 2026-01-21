import React from 'react';
import SEO from './components/SEO';

const PrivacyPage = () => {
    return (
        <div className="bg-[var(--bg-color)] text-[var(--text-primary)] min-h-screen font-sans py-24 px-6">
            <SEO
                title="Privacy Policy"
                description="ChainForensix Privacy Policy. Learn how we collect, use, and protect your data during forensic investigations."
                canonical="https://forensic-tool-project.vercel.app/privacy"
            />
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-heading font-bold mb-8 border-b border-[var(--border-color)] pb-4">Privacy Policy</h1>
                <div className="prose prose-lg text-[var(--text-secondary)] leading-relaxed space-y-6">
                    <p>Last updated: January 14, 2026</p>
                    <section>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">1. Introduction</h2>
                        <p>ChainForensix ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our forensic tool.</p>
                    </section>
                    <section>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">2. Data Collection</h2>
                        <p>We collect information necessary to provide our forensic services, including:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Account information (name, email) for client portal access.</li>
                            <li>URL data provided for forensic extraction.</li>
                            <li>Metadata associated with captured digital evidence.</li>
                        </ul>
                    </section>
                    <section>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">3. Data Usage</h2>
                        <p>Your data is used solely for the purpose of generating forensic reports and anchoring evidence to the blockchain as requested. We do not sell your personal information to third parties.</p>
                    </section>
                    <section>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">4. Security</h2>
                        <p>We implement industry-standard security measures to protect your digital evidence, including cryptographic hashing and secure storage protocols.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPage;
