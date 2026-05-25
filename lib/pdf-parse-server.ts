import 'server-only'

/**
 * pdfjs-dist needs DOMMatrix and a Node canvas factory. Import the worker
 * bundle first (sets globals), then load PDFParse with CanvasFactory.
 */
export async function createPdfParser(buffer: Buffer) {
  const { CanvasFactory } = await import('pdf-parse/worker')
  const { PDFParse } = await import('pdf-parse')

  return new PDFParse({
    data: buffer,
    CanvasFactory,
  })
}
