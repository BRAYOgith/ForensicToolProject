import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-[var(--bg-color)] py-12 px-6 border-t border-[var(--border-color)]">
            <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-8">
                <div className="col-span-2">
                    <Link to="/" className="flex items-center gap-2 mb-4 text-[var(--text-primary)]">
                        <span className="text-2xl font-bold font-heading">ChainForensix</span>
                    </Link>
                    <p className="text-[var(--text-secondary)] max-w-sm mb-4 leading-relaxed text-sm">
                        The global standard for X post forensics and blockchain evidence anchoring. We empower legal teams and investigators with immutable truth.
                    </p>
                </div>
                <div>
                    <h4 className="font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider text-sm">Platform</h4>
                    <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
                        <li><Link to="/login" className="hover:text-accent transition-colors">Client Portal</Link></li>
                        <li><Link to="/methodology" className="hover:text-accent transition-colors">Methodology</Link></li>
                        <li><Link to="/docs" className="hover:text-accent transition-colors">Documentation</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider text-sm">Legal</h4>
                    <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
                        <li><Link to="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
                        <li><Link to="/terms" className="hover:text-accent transition-colors">Terms of Service</Link></li>
                        <li><a href="mailto:briannjoki619@gmail.com" className="hover:text-accent transition-colors">Contact Support</a></li>
                    </ul>
                </div>
            </div>
            <div className="max-w-7xl mx-auto pt-6 border-t border-[var(--border-color)] flex flex-col md:flex-row justify-between items-center text-xs text-[var(--text-secondary)]">
                <p>&copy; {new Date().getFullYear()} ChainForensix. Brian Njoki. All rights reserved.</p>
                <div className="flex gap-4 mt-4 md:mt-0">
                    <a href="https://x.com/BRAYO_44" target="_blank" rel="noreferrer" className="hover:text-accent">X (Twitter)</a>
                    <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-accent">LinkedIn</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
