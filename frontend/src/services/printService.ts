export interface PrinterAdapter {
  name: string;
  isAvailable: () => Promise<boolean>;
  printRaw: (base64Payload: string) => Promise<boolean>;
  printHtml: (plainTextReceipt: string) => Promise<boolean>;
}

export class BrowserPrintAdapter implements PrinterAdapter {
  name = 'Browser System Print Dialog';

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined';
  }

  async printRaw(base64Payload: string): Promise<boolean> {
    return this.printHtml(atob(base64Payload));
  }

  async printHtml(receiptText: string): Promise<boolean> {
    try {
      const printWindow = window.open('', '_blank', 'width=350,height=600');
      if (!printWindow) return false;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - Bismi POS</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              html, body {
                margin: 0;
                padding: 0;
                background-color: #fff;
                color: #000;
                font-family: 'Courier New', Courier, monospace;
              }
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                padding: 10px;
                box-sizing: border-box;
              }
              .receipt-container {
                width: 76mm;
                max-width: 100%;
                margin: 0 auto;
                padding: 4px;
                box-sizing: border-box;
                font-size: 11px;
                line-height: 1.35;
              }
              pre {
                white-space: pre-wrap;
                word-break: break-word;
                font-family: inherit;
                font-size: inherit;
                margin: 0;
              }
              @media print {
                html, body {
                  width: 100%;
                  margin: 0;
                  padding: 0;
                }
                body {
                  display: block;
                  padding: 0;
                }
                .receipt-container {
                  width: 76mm;
                  margin: 0 auto;
                  padding: 2mm 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="receipt-container">
              <pre>${receiptText}</pre>
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      return true;
    } catch (e) {
      console.error('Browser print error:', e);
      return false;
    }
  }
}

export class QZTrayAdapter implements PrinterAdapter {
  name = 'QZ Tray Local ESC/POS Bridge';

  async isAvailable(): Promise<boolean> {
    return typeof (window as any).qz !== 'undefined';
  }

  async printRaw(base64Payload: string): Promise<boolean> {
    const qz = (window as any).qz;
    if (!qz) throw new Error('QZ Tray is not running or connected.');

    try {
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
      }
      const printer = await qz.printers.getDefault();
      const config = qz.configs.create(printer, { encoding: 'ISO-8859-1' });
      await qz.print(config, [{ type: 'raw', format: 'base64', data: base64Payload }]);
      return true;
    } catch (e) {
      console.error('QZ Tray print failure:', e);
      throw e;
    }
  }

  async printHtml(receiptText: string): Promise<boolean> {
    return new BrowserPrintAdapter().printHtml(receiptText);
  }
}

export class PrintManager {
  private activeAdapter: PrinterAdapter = new BrowserPrintAdapter();
  private isAutoPrintEnabled: boolean = true;
  private paperWidth: '58mm' | '80mm' = '80mm';

  public setAdapter(adapter: PrinterAdapter) {
    this.activeAdapter = adapter;
  }

  public setAutoPrint(enabled: boolean) {
    this.isAutoPrintEnabled = enabled;
  }

  public setPaperWidth(width: '58mm' | '80mm') {
    this.paperWidth = width;
  }

  public async printReceipt(receiptData: { plainText: string; rawEscPosBase64?: string }): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.activeAdapter instanceof QZTrayAdapter && receiptData.rawEscPosBase64) {
        const ok = await this.activeAdapter.printRaw(receiptData.rawEscPosBase64);
        return { success: ok };
      }
      const ok = await this.activeAdapter.printHtml(receiptData.plainText);
      return { success: ok };
    } catch (e: any) {
      return { success: false, error: e.message || 'Printer communication error.' };
    }
  }
}

export const printManager = new PrintManager();
export default printManager;
