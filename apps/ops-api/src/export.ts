import { Card, User, SUPPORTED_LANGUAGES, isRTLLanguage } from '@pedi-psych/shared'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

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

    if (includeMetadata) {
      const metadata = {
        languages: card.languages.join(', '),
        tags: card.tags.join(', '),
        target_roles: card.target_roles.join(', '),
        created_at: card.created_at,
        updated_at: card.updated_at
      }
      html += `
        <div class="metadata">
            <strong>Languages:</strong> ${this.escapeHtml(metadata.languages)}<br/>
            <strong>Tags:</strong> ${this.escapeHtml(metadata.tags)}<br/>
            <strong>Target Roles:</strong> ${this.escapeHtml(metadata.target_roles)}<br/>
            <strong>Created:</strong> ${this.escapeHtml(metadata.created_at)}<br/>
            <strong>Updated:</strong> ${this.escapeHtml(metadata.updated_at)}
        </div>`
    }

    html += '\n    </div>'
    return html
  }

  private formatContent(content: string): string {
    if (typeof content === 'string') {
      return this.escapeHtml(content)
    }
    if (typeof content === 'object') {
      return `<pre>${this.escapeHtml(JSON.stringify(content, null, 2))}</pre>`
    }
    return this.escapeHtml(String(content))
  }

  private formatMetadata(metadata: Record<string, any>): string {
    return Object.entries(metadata)
      .map(([key, value]) => `<div><strong>${this.escapeHtml(key)}:</strong> ${this.escapeHtml(String(value))}</div>`) 
      .join('\n')
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
   * Export cards to PDF format (basic implementation using pdf-lib)
   * Returns a base64-encoded PDF string for KV storage.
   */
  async exportToPDF(
    cards: Card[],
    user: User,
    options: ExportOptions
  ): Promise<string> {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)

    const margin = 50
    const lineHeight = 18
    const pageWidth = 595.28 // A4 width in points
    const pageHeight = 841.89 // A4 height in points

    const addPageWithText = (lines: string[]) => {
      const page = doc.addPage([pageWidth, pageHeight])
      let y = pageHeight - margin

      // Header
      page.drawText('Pediatric Psychology Knowledge Base Export', {
        x: margin,
        y,
        size: 16,
        font,
        color: rgb(0.2, 0.2, 0.6)
      })
      y -= lineHeight * 2

      const meta = `Exported by ${user.name} on ${new Date().toLocaleDateString(options.language)} | ${cards.length} cards`
      page.drawText(meta, { x: margin, y, size: 10, font })
      y -= lineHeight * 2

      for (const line of lines) {
        if (y < margin + lineHeight) {
          // Start a new page when space runs out
          y = pageHeight - margin
          const newPage = doc.addPage([pageWidth, pageHeight])
          y -= lineHeight
          // Switch to new page context
          const idx = doc.getPageIndices().length - 1
          const p = doc.getPages()[idx]
          p.drawText(line, { x: margin, y, size: 12, font })
          y -= lineHeight
          continue
        }
        page.drawText(line, { x: margin, y, size: 12, font })
        y -= lineHeight
      }
    }

    // Build lines from cards
    const lines: string[] = []
    for (const card of cards) {
      const title = card.title[options.language as keyof typeof card.title] || card.title.en
      const description = card.description?.[options.language as keyof typeof card.description] || card.description?.en || ''
      lines.push(`Category: ${card.category}`)
      lines.push(`Title: ${this.stripNewlines(String(title)).slice(0, 200)}`)
      if (description) {
        lines.push(`Description: ${this.stripNewlines(String(description)).slice(0, 300)}`)
      }
      lines.push(`Tags: ${card.tags.join(', ')}`)
      lines.push('')
    }

    if (lines.length === 0) {
      lines.push('No cards available to export.')
    }

    addPageWithText(lines)

    const pdfBytes = await doc.save() // Uint8Array
    const base64 = this.uint8ToBase64(pdfBytes)
    return base64
  }

  private stripNewlines(s: string): string {
    return s.replace(/\s+/g, ' ')
  }

  private uint8ToBase64(bytes: Uint8Array): string {
    let binary = ''
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    // btoa is available in CF Workers
    return btoa(binary)
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