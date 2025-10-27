import { Card, User, SUPPORTED_LANGUAGES, isRTLLanguage } from '@pedi-psych/shared'

export interface ExportOptions {
  format: 'html' | 'pdf'
  language: string
  includeMetadata?: boolean
  template?: 'default' | 'medical' | 'educational'
}

export class ExportService {
  private static instance: ExportService

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService()
    }
    return ExportService.instance
  }

  /**
   * Export cards to HTML format with RTL support
   */
  async exportToHTML(
    cards: Card[],
    user: User,
    options: ExportOptions
  ): Promise<string> {
    const { language, includeMetadata = true, template = 'default' } = options
    const isRTL = isRTLLanguage(language)

    let html = this.generateHTMLTemplate(language, isRTL, template)
    
    const cardsHTML = cards.map(card => 
      this.generateCardHTML(card, language, includeMetadata)
    ).join('\n')

    html = html.replace('{{CARDS_CONTENT}}', cardsHTML)
    html = html.replace('{{EXPORT_DATE}}', new Date().toLocaleDateString(language))
    html = html.replace('{{USER_NAME}}', user.name)
    html = html.replace('{{TOTAL_CARDS}}', cards.length.toString())

    return html
  }

  /**
   * Generate HTML template with proper RTL support
   */
  private generateHTMLTemplate(
    language: string,
    isRTL: boolean,
    template: string
  ): string {
    const dir = isRTL ? 'rtl' : 'ltr'
    const textAlign = isRTL ? 'right' : 'left'

    return `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pediatric Psychology Knowledge Base Export</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
            text-align: ${textAlign};
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header .meta {
            font-size: 0.9em;
            opacity: 0.9;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }
        .card h2 {
            color: #2c3e50;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 1.5em;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 10px;
        }
        .card .category {
            display: inline-block;
            background: #e8f4fd;
            color: #2980b9;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 500;
            margin-bottom: 15px;
        }
        .card .tags {
            margin-top: 15px;
        }
        .card .tag {
            display: inline-block;
            background: #f8f9fa;
            color: #6c757d;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            margin-${isRTL ? 'left' : 'right'}: 8px;
            margin-bottom: 5px;
            border: 1px solid #dee2e6;
        }
        .metadata {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin-top: 20px;
            font-size: 0.9em;
            color: #6c757d;
        }
        .metadata strong {
            color: #495057;
        }
        .rtl .card {
            border-left: none;
            border-right: 4px solid #667eea;
        }
        .rtl .card .tag {
            margin-right: 0;
            margin-left: 8px;
        }
        @media print {
            body {
                background-color: white;
                padding: 10px;
            }
            .card {
                break-inside: avoid;
                box-shadow: none;
                border: 1px solid #dee2e6;
            }
        }
        ${isRTL ? `
        .rtl .card h2 {
            text-align: right;
        }
        .rtl .metadata {
            text-align: right;
        }
        ` : ''}
    </style>
</head>
<body class="${isRTL ? 'rtl' : ''}">
    <div class="header">
        <h1>Pediatric Psychology Knowledge Base</h1>
        <div class="meta">
            Exported by {{USER_NAME}} on {{EXPORT_DATE}} | {{TOTAL_CARDS}} cards
        </div>
    </div>
    
    {{CARDS_CONTENT}}
</body>
</html>`
  }

  /**
   * Generate HTML for a single card
   */
  private generateCardHTML(
    card: Card,
    language: string,
    includeMetadata: boolean
  ): string {
    const title = card.title[language as keyof typeof card.title] || card.title.en
    const content = card.content[language as keyof typeof card.content] || card.content.en
    const isRTL = isRTLLanguage(language)

    let html = `
    <div class="card">
        <div class="category">${this.escapeHtml(card.category)}</div>
        <h2>${this.escapeHtml(title)}</h2>
        <div class="content">
            ${this.formatContent(content)}
        </div>`

    if (card.tags && card.tags.length > 0) {
      html += `
        <div class="tags">
            ${card.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
        </div>`
    }

    if (includeMetadata && card.metadata) {
      html += `
        <div class="metadata">
            <strong>Additional Information:</strong><br>
            ${this.formatMetadata(card.metadata)}
        </div>`
    }

    html += `
    </div>`

    return html
  }

  /**
   * Format content for HTML display
   */
  private formatContent(content: string): string {
    // Convert line breaks to paragraphs
    const paragraphs = content.split('\n\n').map(para => 
      `<p>${this.escapeHtml(para.trim())}</p>`
    ).join('\n')
    
    return paragraphs
  }

  /**
   * Format metadata for HTML display
   */
  private formatMetadata(metadata: Record<string, any>): string {
    const entries = Object.entries(metadata)
      .map(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        return `<strong>${formattedKey}:</strong> ${value}<br>`
      })
      .join('\n')
    
    return entries
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    
    return text.replace(/[&<>"']/g, m => map[m])
  }

  /**
   * Export cards to PDF format (placeholder for PDF generation)
   */
  async exportToPDF(
    cards: Card[],
    user: User,
    options: ExportOptions
  ): Promise<Buffer> {
    // For now, convert HTML to PDF using a simple approach
    // In a real implementation, you would use a library like Puppeteer or PDFKit
    const html = await this.exportToHTML(cards, user, options)
    
    // This is a placeholder - in production, use a proper PDF generation library
    throw new Error('PDF generation not implemented. Use HTML export instead.')
  }

  /**
   * Validate export options
   */
  validateExportOptions(options: any): ExportOptions {
    const { format, language, includeMetadata, template } = options
    
    if (!['html', 'pdf'].includes(format)) {
      throw new Error('Invalid format. Must be "html" or "pdf"')
    }
    
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      throw new Error(`Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`)
    }
    
    if (template && !['default', 'medical', 'educational'].includes(template)) {
      throw new Error('Invalid template. Must be "default", "medical", or "educational"')
    }
    
    return {
      format,
      language,
      includeMetadata: includeMetadata !== false,
      template: template || 'default'
    }
  }
}

// Export singleton instance
export const exportService = ExportService.getInstance()