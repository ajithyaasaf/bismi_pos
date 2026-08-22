export interface ScaleProvider {
  name: string;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  onWeightChange: (callback: (weightKg: number) => void) => void;
}

export class SimulatedScaleProvider implements ScaleProvider {
  name = 'Simulated Electronic Scale';
  private timer: any = null;
  private currentWeight: number = 0;
  private callback?: (w: number) => void;

  async connect(): Promise<boolean> {
    return true;
  }

  async disconnect(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
  }

  onWeightChange(callback: (w: number) => void) {
    this.callback = callback;
  }

  // Method for manual test injection
  public injectWeight(weightKg: number) {
    this.currentWeight = weightKg;
    if (this.callback) {
      this.callback(weightKg);
    }
  }
}

export class WebSerialScaleProvider implements ScaleProvider {
  name = 'USB / RS-232 Serial Scale (WebSerial)';
  private port: any = null;
  private reader: any = null;
  private callback?: (w: number) => void;

  async connect(): Promise<boolean> {
    try {
      if (!('serial' in navigator)) {
        throw new Error('WebSerial is not supported in this browser. Use Chrome/Edge.');
      }
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: 9600 });
      this.startReading();
      return true;
    } catch (e) {
      console.error('Serial scale connection failed:', e);
      return false;
    }
  }

  private async startReading() {
    const textDecoder = new TextDecoderStream();
    this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          // Parse ASCII scale output e.g. "ST,GS,+001.320KG"
          const match = value.match(/(\d+\.\d{3})/);
          if (match && this.callback) {
            const parsed = parseFloat(match[1]);
            if (!isNaN(parsed)) {
              this.callback(parsed);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Scale read stream ended:', e);
    }
  }

  async disconnect(): Promise<void> {
    if (this.reader) await this.reader.cancel();
    if (this.port) await this.port.close();
  }

  onWeightChange(callback: (w: number) => void) {
    this.callback = callback;
  }
}

export const scaleService = new SimulatedScaleProvider();
