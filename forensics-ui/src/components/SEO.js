import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, keywords, canonical, type = 'website', image }) => {
    const siteTitle = 'ChainForensix | Forensic X Post Tool';
    const currentTitle = title ? `${title} | ChainForensix` : siteTitle;
    const currentDescription = description || 'ChainForensix: The premier Forensic X post tool. Capture, analyze, and secure digital evidence on the blockchain.';
    const currentUrl = canonical || 'https://forensic-tool-project.vercel.app/';

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{currentTitle}</title>
            <meta name="description" content={currentDescription} />
            {keywords && <meta name="keywords" content={keywords} />}
            <link rel="canonical" href={currentUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={currentTitle} />
            <meta property="og:description" content={currentDescription} />
            {image && <meta property="og:image" content={image} />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={currentTitle} />
            <meta name="twitter:description" content={currentDescription} />
            {image && <meta name="twitter:image" content={image} />}
        </Helmet>
    );
};

export default SEO;
