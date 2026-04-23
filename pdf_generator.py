import os
import io
import base64
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging

# Try to import reportlab for better PDF generation
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib.colors import HexColor, black, white
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.platypus.tableofcontents import TableOfContents
    from reportlab.platypus.frames import Frame
    from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False
    logging.warning("ReportLab not installed. Falling back to basic PDF generation.")

# Fallback to pdfkit if reportlab is not available
try:
    import pdfkit
    HAS_PDFKIT = True
except ImportError:
    HAS_PDFKIT = False
    logging.warning("pdfkit not installed. PDF generation will be limited.")

logger = logging.getLogger(__name__)

class ProfessionalPDFGenerator:
    """Professional PDF generator for forensic reports with proper formatting"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet() if HAS_REPORTLAB else None
        self.setup_custom_styles()
    
    def setup_custom_styles(self):
        """Setup custom styles for professional report formatting"""
        if not HAS_REPORTLAB:
            return
            
        # Custom styles for forensic report
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=HexColor('#0A192F'),
            alignment=TA_CENTER,
            borderWidth=2,
            borderColor=HexColor('#06b6d4'),
            borderPadding=10
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            spaceBefore=20,
            textColor=HexColor('#06b6d4'),
            borderWidth=1,
            borderColor=HexColor('#06b6d4'),
            borderPadding=5
        ))
        
        self.styles.add(ParagraphStyle(
            name='EvidenceText',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            leftIndent=20,
            textColor=HexColor('#475569')
        ))
        
        self.styles.add(ParagraphStyle(
            name='CategorySafe',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=HexColor('#10b981'),
            backColor=HexColor('#10b98120'),
            borderWidth=1,
            borderColor=HexColor('#10b981'),
            borderPadding=3
        ))
        
        self.styles.add(ParagraphStyle(
            name='CategoryDefamatory',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=HexColor('#f59e0b'),
            backColor=HexColor('#f59e0b20'),
            borderWidth=1,
            borderColor=HexColor('#f59e0b'),
            borderPadding=3
        ))
        
        self.styles.add(ParagraphStyle(
            name='CategoryHate',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=HexColor('#ef4444'),
            backColor=HexColor('#ef444420'),
            borderWidth=1,
            borderColor=HexColor('#ef4444'),
            borderPadding=3
        ))

    def generate_forensic_report(self, data: Dict[str, Any], output_path: Optional[str] = None) -> bytes:
        """Generate a professional forensic report"""
        
        if not HAS_REPORTLAB and not HAS_PDFKIT:
            raise ImportError("Neither ReportLab nor pdfkit is available for PDF generation")
        
        if HAS_REPORTLAB:
            return self._generate_with_reportlab(data, output_path)
        else:
            return self._generate_with_pdfkit(data, output_path)
    
    def _generate_with_reportlab(self, data: Dict[str, Any], output_path: Optional[str] = None) -> bytes:
        """Generate PDF using ReportLab for professional formatting"""
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        story = []
        
        # Title Page
        story.extend(self._create_title_page(data))
        story.append(PageBreak())
        
        # Executive Summary
        story.extend(self._create_executive_summary(data))
        story.append(PageBreak())
        
        # Statistics Overview
        story.extend(self._create_statistics_section(data))
        story.append(PageBreak())
        
        # Evidence Details
        story.extend(self._create_evidence_section(data))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        if output_path:
            with open(output_path, 'wb') as f:
                f.write(buffer.getvalue())
        
        return buffer.getvalue()
    
    def _create_title_page(self, data: Dict[str, Any]) -> List:
        """Create professional title page"""
        elements = []
        
        # Main title
        elements.append(Paragraph("FORENSIC ANALYSIS REPORT", self.styles['CustomTitle']))
        elements.append(Spacer(1, 0.5*inch))
        
        # Report metadata
        metadata = [
            f"<b>Report ID:</b> {data.get('report_id', 'N/A')}",
            f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            f"<b>User:</b> {data.get('username', 'N/A')}",
            f"<b>Period:</b> {self._format_date_range(data.get('filters', {}))}",
        ]
        
        for meta in metadata:
            elements.append(Paragraph(meta, self.styles['Normal']))
            elements.append(Spacer(1, 0.1*inch))
        
        elements.append(Spacer(1, 1*inch))
        
        # Classification summary
        stats = data.get('stats', {})
        elements.append(Paragraph("CLASSIFICATION SUMMARY", self.styles['SectionHeader']))
        
        summary_data = [
            ['Category', 'Count', 'Percentage'],
            ['Safe', str(stats.get('safeCount', 0)), f"{self._calculate_percentage(stats.get('safeCount', 0), stats.get('totalFetched', 0)):.1f}%"],
            ['Defamatory', str(stats.get('defamatoryCount', 0)), f"{self._calculate_percentage(stats.get('defamatoryCount', 0), stats.get('totalFetched', 0)):.1f}%"],
            ['Hate Speech', str(stats.get('hateSpeechCount', 0)), f"{self._calculate_percentage(stats.get('hateSpeechCount', 0), stats.get('totalFetched', 0)):.1f}%"],
        ]
        
        summary_table = Table(summary_data, colWidths=[2*inch, 1*inch, 1*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#06b6d4')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8fafc')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#e2e8f0'))
        ]))
        
        elements.append(summary_table)
        
        return elements
    
    def _create_executive_summary(self, data: Dict[str, Any]) -> List:
        """Create executive summary section"""
        elements = []
        
        elements.append(Paragraph("EXECUTIVE SUMMARY", self.styles['SectionHeader']))
        
        stats = data.get('stats', {})
        total_scanned = stats.get('totalFetched', 0)
        stored_count = stats.get('storedCount', 0)
        flagged_count = stats.get('defamatoryCount', 0) + stats.get('hateSpeechCount', 0)
        risk_rate = self._calculate_percentage(flagged_count, total_scanned)
        
        summary_text = f"""
        This forensic analysis report covers {total_scanned} social media posts analyzed during the specified period. 
        Of these, {stored_count} items were stored on the blockchain for permanent evidence preservation. 
        The analysis identified {flagged_count} items requiring attention ({risk_rate:.1f}% risk rate), 
        categorized as potentially defamatory content or hate speech. The remaining content was classified as safe.
        """
        
        elements.append(Paragraph(summary_text, self.styles['Normal']))
        elements.append(Spacer(1, 0.3*inch))
        
        # Key metrics
        metrics_data = [
            ['Metric', 'Value'],
            ['Total Posts Analyzed', str(total_scanned)],
            ['Blockchain Stored', str(stored_count)],
            ['Flagged Content', str(flagged_count)],
            ['Risk Rate', f"{risk_rate:.1f}%"],
            ['Safe Content', str(stats.get('safeCount', 0))]
        ]
        
        metrics_table = Table(metrics_data, colWidths=[2.5*inch, 1.5*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#0A192F')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f1f5f9')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#cbd5e1'))
        ]))
        
        elements.append(metrics_table)
        
        return elements
    
    def _create_statistics_section(self, data: Dict[str, Any]) -> List:
        """Create detailed statistics section"""
        elements = []
        
        elements.append(Paragraph("DETAILED STATISTICS", self.styles['SectionHeader']))
        
        # Add charts if available
        charts = data.get('charts', {})
        if charts.get('weekly'):
            elements.append(Paragraph("Weekly Activity Trend", self.styles['Heading3']))
            # Note: Chart images would need to be processed and added here
            elements.append(Spacer(1, 0.2*inch))
        
        if charts.get('daily'):
            elements.append(Paragraph("Daily Comparison", self.styles['Heading3']))
            elements.append(Spacer(1, 0.2*inch))
        
        if charts.get('harm'):
            elements.append(Paragraph("Content Classification Distribution", self.styles['Heading3']))
            elements.append(Spacer(1, 0.2*inch))
        
        return elements
    
    def _create_evidence_section(self, data: Dict[str, Any]) -> List:
        """Create evidence details section"""
        elements = []
        
        elements.append(Paragraph("EVIDENCE DETAILS", self.styles['SectionHeader']))
        
        evidence = data.get('evidence', [])
        if not evidence:
            elements.append(Paragraph("No evidence records found matching the specified criteria.", self.styles['Normal']))
            return elements
        
        elements.append(Paragraph(f"Showing {len(evidence)} evidence records:", self.styles['Normal']))
        elements.append(Spacer(1, 0.2*inch))
        
        for idx, item in enumerate(evidence[:50], 1):  # Limit to first 50 items
            elements.append(Paragraph(f"Evidence #{idx}", self.styles['Heading3']))
            
            # Category badge
            category = item.get('category', 'Unknown')
            category_style = f'Category{category.replace(" ", "")}'
            if category_style in self.styles:
                elements.append(Paragraph(f"Category: {category}", self.styles[category_style]))
            else:
                elements.append(Paragraph(f"Category: {category}", self.styles['Normal']))
            
            # Evidence details
            details = [
                f"Evidence ID: {item.get('evidence_id', 'N/A')}",
                f"Author: @{item.get('author_username', 'N/A')}",
                f"Investigator: @{item.get('username', 'N/A')}",
                f"Date: {self._format_datetime(item.get('timestamp'))}",
                f"Confidence: {(item.get('confidence', 0) * 100):.1f}%",
                f"Verified: {'Yes' if item.get('verified') else 'No'}"
            ]
            
            for detail in details:
                elements.append(Paragraph(detail, self.styles['Normal']))
            
            # Content snippet
            content = item.get('content', '')
            if content:
                elements.append(Paragraph("Content:", self.styles['Heading4']))
                # Truncate long content
                if len(content) > 200:
                    content = content[:200] + "..."
                elements.append(Paragraph(f'"{content}"', self.styles['EvidenceText']))
            
            # Blockchain info
            if item.get('tx_hash'):
                elements.append(Paragraph(f"Transaction Hash: {item.get('tx_hash')}", self.styles['Normal']))
            
            elements.append(Spacer(1, 0.3*inch))
            
            if idx % 10 == 0:  # Page break every 10 items
                elements.append(PageBreak())
        
        return elements
    
    def _generate_with_pdfkit(self, data: Dict[str, Any], output_path: Optional[str] = None) -> bytes:
        """Fallback PDF generation using pdfkit"""
        
        html_content = self._create_html_template(data)
        
        config = pdfkit.configuration(wkhtmltopdf=os.getenv('WKHTMLTOPDF_PATH', '/usr/bin/wkhtmltopdf'))
        
        options = {
            'page-size': 'A4',
            'margin-top': '0.75in',
            'margin-right': '0.75in',
            'margin-bottom': '0.75in',
            'margin-left': '0.75in',
            'encoding': "UTF-8",
            'no-outline': None,
            'enable-local-file-access': None
        }
        
        pdf_bytes = pdfkit.from_string(html_content, False, options=options, configuration=config)
        
        if output_path:
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
        
        return pdf_bytes
    
    def _create_html_template(self, data: Dict[str, Any]) -> str:
        """Create HTML template for fallback PDF generation"""
        
        stats = data.get('stats', {})
        evidence = data.get('evidence', [])
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Forensic Analysis Report</title>
            <style>
                body {{ 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: #f8fafc;
                    color: #1e293b;
                }}
                .header {{ 
                    text-align: center; 
                    border-bottom: 3px solid #06b6d4; 
                    padding-bottom: 20px; 
                    margin-bottom: 30px; 
                }}
                .title {{ 
                    font-size: 28px; 
                    font-weight: bold; 
                    color: #0A192F; 
                    margin-bottom: 10px; 
                }}
                .metadata {{ 
                    background: #f1f5f9; 
                    padding: 15px; 
                    border-radius: 8px; 
                    margin-bottom: 20px; 
                }}
                .section {{ 
                    margin-bottom: 30px; 
                    page-break-inside: avoid; 
                }}
                .section-title {{ 
                    font-size: 18px; 
                    font-weight: bold; 
                    color: #06b6d4; 
                    border-left: 4px solid #06b6d4; 
                    padding-left: 10px; 
                    margin-bottom: 15px; 
                }}
                .stats-table {{ 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 20px; 
                }}
                .stats-table th, .stats-table td {{ 
                    border: 1px solid #e2e8f0; 
                    padding: 10px; 
                    text-align: left; 
                }}
                .stats-table th {{ 
                    background: #06b6d4; 
                    color: white; 
                    font-weight: bold; 
                }}
                .evidence-item {{ 
                    background: white; 
                    border: 1px solid #e2e8f0; 
                    border-radius: 8px; 
                    padding: 15px; 
                    margin-bottom: 15px; 
                    page-break-inside: avoid; 
                }}
                .category-safe {{ 
                    background: #10b98120; 
                    color: #10b981; 
                    border: 1px solid #10b981; 
                    padding: 4px 8px; 
                    border-radius: 4px; 
                    font-size: 12px; 
                    font-weight: bold; 
                }}
                .category-defamatory {{ 
                    background: #f59e0b20; 
                    color: #f59e0b; 
                    border: 1px solid #f59e0b; 
                    padding: 4px 8px; 
                    border-radius: 4px; 
                    font-size: 12px; 
                    font-weight: bold; 
                }}
                .category-hate {{ 
                    background: #ef444420; 
                    color: #ef4444; 
                    border: 1px solid #ef4444; 
                    padding: 4px 8px; 
                    border-radius: 4px; 
                    font-size: 12px; 
                    font-weight: bold; 
                }}
                .content-snippet {{ 
                    background: #f8fafc; 
                    padding: 10px; 
                    border-radius: 4px; 
                    font-style: italic; 
                    margin: 10px 0; 
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">FORENSIC ANALYSIS REPORT</div>
                <div>Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</div>
            </div>
            
            <div class="metadata">
                <strong>Report ID:</strong> {data.get('report_id', 'N/A')}<br>
                <strong>User:</strong> {data.get('username', 'N/A')}<br>
                <strong>Period:</strong> {self._format_date_range(data.get('filters', {}))}
            </div>
            
            <div class="section">
                <div class="section-title">Executive Summary</div>
                <p>
                    This forensic analysis report covers {stats.get('totalFetched', 0)} social media posts analyzed.
                    {stats.get('storedCount', 0)} items were stored on blockchain evidence preservation.
                    {stats.get('defamatoryCount', 0) + stats.get('hateSpeechCount', 0)} items were flagged as requiring attention.
                </p>
                
                <table class="stats-table">
                    <tr>
                        <th>Category</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>
                    <tr>
                        <td>Safe</td>
                        <td>{stats.get('safeCount', 0)}</td>
                        <td>{self._calculate_percentage(stats.get('safeCount', 0), stats.get('totalFetched', 0)):.1f}%</td>
                    </tr>
                    <tr>
                        <td>Defamatory</td>
                        <td>{stats.get('defamatoryCount', 0)}</td>
                        <td>{self._calculate_percentage(stats.get('defamatoryCount', 0), stats.get('totalFetched', 0)):.1f}%</td>
                    </tr>
                    <tr>
                        <td>Hate Speech</td>
                        <td>{stats.get('hateSpeechCount', 0)}</td>
                        <td>{self._calculate_percentage(stats.get('hateSpeechCount', 0), stats.get('totalFetched', 0)):.1f}%</td>
                    </tr>
                </table>
            </div>
            
            <div class="section">
                <div class="section-title">Evidence Details</div>
        """
        
        for idx, item in enumerate(evidence[:50], 1):
            category = item.get('category', 'Unknown')
            category_class = f"category-{category.lower().replace(' ', '-')}"
            
            html += f"""
                <div class="evidence-item">
                    <h4>Evidence #{idx}</h4>
                    <div class="{category_class}">{category}</div>
                    <p><strong>Evidence ID:</strong> {item.get('evidence_id', 'N/A')}</p>
                    <p><strong>Author:</strong> @{item.get('author_username', 'N/A')}</p>
                    <p><strong>Date:</strong> {self._format_datetime(item.get('timestamp'))}</p>
                    <p><strong>Confidence:</strong> {(item.get('confidence', 0) * 100):.1f}%</p>
                    
                    <div class="content-snippet">
                        "{item.get('content', '')[:200]}{'...' if len(item.get('content', '')) > 200 else ''}"
                    </div>
                </div>
            """
        
        html += """
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _calculate_percentage(self, value: int, total: int) -> float:
        """Calculate percentage safely"""
        if total == 0:
            return 0.0
        return (value / total) * 100
    
    def _format_date_range(self, filters: Dict[str, Any]) -> str:
        """Format date range for display"""
        start = filters.get('start_date', '')
        end = filters.get('end_date', '')
        
        if start and end:
            return f"{start} to {end}"
        elif start:
            return f"From {start}"
        elif end:
            return f"Until {end}"
        else:
            return "All time"
    
    def _format_datetime(self, timestamp: str) -> str:
        """Format timestamp for display"""
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            return dt.strftime('%B %d, %Y at %I:%M %p')
        except:
            return str(timestamp)

# Singleton instance
pdf_generator = ProfessionalPDFGenerator()
