export interface ReceiptItem {
  name: string;
  weightOrQty: string;
  rate: number;
  cuttingName?: string;
  cuttingCharge?: number;
  total: number;
}

export interface ReceiptData {
  shopName: string;
  branchName?: string;
  address: string;
  phone: string;
  gstin?: string;
  invoiceNumber: string;
  orderNumber?: number;
  date: string;
  cashierName: string;
  customerName?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  rounding: number;
  grandTotal: number;
  paymentMethod: string;
  cashReceived?: number;
  cashChange?: number;
  receiptFooter?: string;
  paperWidth?: '58mm' | '80mm';
}

export class EscPosBuilder {
  private buffer: string[] = [];
  private widthChars: number = 48; // 80mm default

  constructor(paperWidth: '58mm' | '80mm' = '80mm') {
    this.widthChars = paperWidth === '58mm' ? 32 : 48;
  }

  // ESC/POS Command Constants
  private static readonly ESC = '\x1B';
  private static readonly GS = '\x1D';
  private static readonly INIT = EscPosBuilder.ESC + '@';
  private static readonly ALIGN_LEFT = EscPosBuilder.ESC + 'a' + '\x00';
  private static readonly ALIGN_CENTER = EscPosBuilder.ESC + 'a' + '\x01';
  private static readonly ALIGN_RIGHT = EscPosBuilder.ESC + 'a' + '\x02';
  private static readonly BOLD_ON = EscPosBuilder.ESC + 'E' + '\x01';
  private static readonly BOLD_OFF = EscPosBuilder.ESC + 'E' + '\x00';
  private static readonly DOUBLE_ON = EscPosBuilder.GS + '!' + '\x11';
  private static readonly DOUBLE_OFF = EscPosBuilder.GS + '!' + '\x00';
  private static readonly CUT = EscPosBuilder.GS + 'V' + '\x42' + '\x00';
  private static readonly DRAWER_KICK = EscPosBuilder.ESC + 'p' + '\x00' + '\x19' + '\xFA';

  private centerText(text: string): string {
    const space = Math.max(0, Math.floor((this.widthChars - text.length) / 2));
    return ' '.repeat(space) + text;
  }

  private padLine(left: string, right: string): string {
    const space = this.widthChars - left.length - right.length;
    if (space <= 0) {
      return left.substring(0, this.widthChars - right.length - 1) + ' ' + right;
    }
    return left + ' '.repeat(space) + right;
  }

  private divider(): string {
    return '-'.repeat(this.widthChars);
  }

  private doubleDivider(): string {
    return '='.repeat(this.widthChars);
  }

  public generateReceipt(data: ReceiptData, options: { kickDrawer?: boolean; cut?: boolean } = {}): {
    rawEscPos: string;
    plainText: string;
  } {
    const lines: string[] = [];
    const raw: string[] = [EscPosBuilder.INIT];

    if (options.kickDrawer) {
      raw.push(EscPosBuilder.DRAWER_KICK);
    }

    // Header
    raw.push(EscPosBuilder.ALIGN_CENTER, EscPosBuilder.DOUBLE_ON, EscPosBuilder.BOLD_ON);
    raw.push(data.shopName + '\n');
    lines.push(this.centerText(data.shopName.toUpperCase()));

    raw.push(EscPosBuilder.DOUBLE_OFF, EscPosBuilder.BOLD_OFF);

    if (data.branchName) {
      raw.push(data.branchName + '\n');
      lines.push(this.centerText(data.branchName));
    }

    raw.push(data.address + '\n');
    lines.push(this.centerText(data.address));

    raw.push(`Phone: ${data.phone}\n`);
    lines.push(this.centerText(`Phone: ${data.phone}`));

    if (data.gstin) {
      raw.push(`GSTIN: ${data.gstin}\n`);
      lines.push(this.centerText(`GSTIN: ${data.gstin}`));
    }

    raw.push(EscPosBuilder.ALIGN_LEFT);
    raw.push(this.doubleDivider() + '\n');
    lines.push(this.doubleDivider());

    // Invoice Metadata
    const invLine = this.padLine(`Bill: ${data.invoiceNumber}`, `Date: ${data.date}`);
    raw.push(invLine + '\n');
    lines.push(invLine);

    const cashierLine = this.padLine(
      `Cashier: ${data.cashierName}`,
      data.orderNumber ? `Token #${data.orderNumber}` : ''
    );
    raw.push(cashierLine + '\n');
    lines.push(cashierLine);

    if (data.customerName && data.customerName !== 'Walk-in Customer') {
      const custLine = `Customer: ${data.customerName}`;
      raw.push(custLine + '\n');
      lines.push(custLine);
    }

    raw.push(this.divider() + '\n');
    lines.push(this.divider());

    // Table Header
    const colHeader = this.widthChars === 32
      ? this.padLine('ITEM / QTY', 'AMT (₹)')
      : this.padLine('ITEM & PREP / WEIGHT', 'RATE    TOTAL (₹)');
    raw.push(EscPosBuilder.BOLD_ON, colHeader + '\n', EscPosBuilder.BOLD_OFF);
    lines.push(colHeader);
    raw.push(this.divider() + '\n');
    lines.push(this.divider());

    // Items
    for (const item of data.items) {
      const itemTitle = item.name;
      const itemDetails = `${item.weightOrQty} @ ₹${item.rate.toFixed(2)}${
        item.cuttingName && item.cuttingName !== 'Whole' ? ` [${item.cuttingName}]` : ''
      }`;
      const itemAmt = `₹${item.total.toFixed(2)}`;

      if (this.widthChars === 32) {
        raw.push(EscPosBuilder.BOLD_ON, itemTitle + '\n', EscPosBuilder.BOLD_OFF);
        lines.push(itemTitle);
        const detailLine = this.padLine(` ${itemDetails}`, itemAmt);
        raw.push(detailLine + '\n');
        lines.push(detailLine);
      } else {
        const itemLine = this.padLine(
          `${itemTitle} (${itemDetails})`,
          itemAmt
        );
        raw.push(itemLine + '\n');
        lines.push(itemLine);
      }
    }

    raw.push(this.divider() + '\n');
    lines.push(this.divider());

    // Totals
    const subtotalLine = this.padLine('Subtotal:', `₹${data.subtotal.toFixed(2)}`);
    raw.push(subtotalLine + '\n');
    lines.push(subtotalLine);

    if (data.discount > 0) {
      const discLine = this.padLine('Discount:', `-₹${data.discount.toFixed(2)}`);
      raw.push(discLine + '\n');
      lines.push(discLine);
    }

    if (data.rounding !== 0) {
      const roundLine = this.padLine('Round Off:', `${data.rounding > 0 ? '+' : ''}₹${data.rounding.toFixed(2)}`);
      raw.push(roundLine + '\n');
      lines.push(roundLine);
    }

    raw.push(this.doubleDivider() + '\n');
    lines.push(this.doubleDivider());

    // Grand Total
    const grandTotalLine = this.padLine('NET PAYABLE:', `₹${data.grandTotal.toFixed(2)}`);
    raw.push(EscPosBuilder.BOLD_ON, EscPosBuilder.DOUBLE_ON, grandTotalLine + '\n', EscPosBuilder.DOUBLE_OFF, EscPosBuilder.BOLD_OFF);
    lines.push(grandTotalLine);

    raw.push(this.divider() + '\n');
    lines.push(this.divider());

    // Payment Details
    const payLine = this.padLine(`Payment Mode: ${data.paymentMethod}`, `Status: PAID`);
    raw.push(payLine + '\n');
    lines.push(payLine);

    if (data.cashReceived && data.cashReceived > 0) {
      const cashLine = this.padLine('Cash Received:', `₹${data.cashReceived.toFixed(2)}`);
      const changeLine = this.padLine('Change Returned:', `₹${(data.cashChange || 0).toFixed(2)}`);
      raw.push(cashLine + '\n', changeLine + '\n');
      lines.push(cashLine, changeLine);
    }

    raw.push(this.divider() + '\n');
    lines.push(this.divider());

    // Footer
    raw.push(EscPosBuilder.ALIGN_CENTER);
    if (data.receiptFooter) {
      raw.push(data.receiptFooter + '\n');
      lines.push(this.centerText(data.receiptFooter));
    } else {
      raw.push('Thank you! Visit Again.\n');
      lines.push(this.centerText('Thank you! Visit Again.'));
    }

    raw.push('\n\n\n'); // Feed
    if (options.cut !== false) {
      raw.push(EscPosBuilder.CUT);
    }

    return {
      rawEscPos: raw.join(''),
      plainText: lines.join('\n'),
    };
  }
}
