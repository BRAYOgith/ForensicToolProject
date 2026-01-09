import React from 'react';


const DocumentationPage = () => {
    return (
        <div className="min-h-screen bg-[#0A192F] text-gray-300 font-sans selection:bg-cyan-500 selection:text-white">
            {/* Navigation */}


            <main className="pt-12 max-w-4xl mx-auto px-6">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">
                    Documentation & FAQ
                </h1>

                <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                    Technical resources for digital investigators, legal professionals, and developers using ChainForensix for X post preservation and defamation analysis.
                </p>

                <section className="mb-16">
                    <h2 className="text-2xl font-semibold text-white mb-6">Frequently Asked Questions</h2>
                    <div className="space-y-6">

                        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                            <h3 className="text-lg font-bold text-white mb-2">How do I trace crypto transactions related to a case?</h3>
                            <p className="text-gray-400">
                                While ChainForensix specializes in X post forensics, it anchors evidence to the blockchain. You can view the transaction hash provided in your report on any standard block explorer (Etherscan, BscScan) to verify the timestamp and integrity of the evidence.
                            </p>
                        </div>

                        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                            <h3 className="text-lg font-bold text-white mb-2">How can I preserve social media posts as evidence?</h3>
                            <p className="text-gray-400">
                                Enter the URL of the target X post into the ChainForensix dashboard. Our system will automatically extract the metadata, run a defamation analysis, and write the cryptographic hash to the blockchain.
                            </p>
                        </div>

                        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                            <h3 className="text-lg font-bold text-white mb-2">Is the AI model reliable for court verification?</h3>
                            <p className="text-gray-400">
                                The AI model provides a preliminary probability score for defamation and hate speech. This is intended to act as a "triage" tool for investigators. The core evidence is the raw, unalterable JSON data preserved on the blockchain, which allows human experts to verify the findings independently.
                            </p>
                        </div>

                    </div>
                </section>

                <section className="mb-16">
                    <h2 className="text-2xl font-semibold text-white mb-6">Citing ChainForensix</h2>
                    <p className="mb-4">
                        If you are using ChainForensix in an academic paper or forensic report, please use the following citation format:
                    </p>
                    <div className="bg-black/50 p-6 rounded-lg font-mono text-sm overflow-x-auto text-cyan-400 border border-gray-700">
                        Njoki, B. (2026). ChainForensix: A Blockchain-Based Forensic Tool for X Post Preservation (v1.0) [Software]. Available at https://forensic-tool-project.vercel.app
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-white mb-6">Technical Specifications</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-gray-900 p-4 rounded border border-gray-800">
                            <span className="block text-sm text-gray-500">Supported Platforms</span>
                            <span className="text-white">X (Twitter)</span>
                        </div>
                        <div className="bg-gray-900 p-4 rounded border border-gray-800">
                            <span className="block text-sm text-gray-500">Blockchain Networks</span>
                            <span className="text-white">Ethereum (Mainnet/Sepolia)</span>
                        </div>
                        <div className="bg-gray-900 p-4 rounded border border-gray-800">
                            <span className="block text-sm text-gray-500">Evidence Format</span>
                            <span className="text-white">JSON (Raw), SHA-256 Hash</span>
                        </div>
                        <div className="bg-gray-900 p-4 rounded border border-gray-800">
                            <span className="block text-sm text-gray-500">AI Model</span>
                            <span className="text-white">Transformer (Defamation/Hate Speech)</span>
                        </div>
                    </div>
                </section>

            </main>

            <footer className="border-t border-gray-800 bg-[#061225] py-12">
                <div className="max-w-7xl mx-auto px-6 text-center text-gray-500">
                    <p>&copy; {new Date().getFullYear()} ChainForensix. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default DocumentationPage;
