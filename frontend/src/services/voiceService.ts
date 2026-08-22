import { Product, VoiceParsedItem } from '../types/index.js';

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export class MeatShopLexiconParser {
  private products: Product[];

  constructor(products: Product[]) {
    this.products = products;
  }

  public updateProducts(products: Product[]) {
    this.products = products;
  }

  // Linguistic number normalization for Indian English and colloquial expressions
  private normalizeSpokenText(raw: string): string {
    return raw
      .toLowerCase()
      .replace(/\bone point five\b/g, '1.5')
      .replace(/\bone point two five\b/g, '1.25')
      .replace(/\bone point seven five\b/g, '1.75')
      .replace(/\btwo point five\b/g, '2.5')
      .replace(/\bthree point five\b/g, '3.5')
      .replace(/\bhalf kilo\b|\bhalf kg\b|\bara kilo\b/g, '0.500 kg')
      .replace(/\bquarter kilo\b|\bquarter kg\b|\bkkaal kilo\b/g, '0.250 kg')
      .replace(/\bthree fourth kilo\b|\bthree fourth kg\b|\bmukkaal kilo\b/g, '0.750 kg')
      .replace(/\bone and a half\b/g, '1.5')
      .replace(/\btwo and a half\b/g, '2.5')
      .replace(/\bone kilo\b|\bone kg\b|\borukilo\b/g, '1.0 kg')
      .replace(/\btwo kilo\b|\btwo kg\b|\brendukilo\b/g, '2.0 kg')
      .replace(/\bthree kilo\b|\bthree kg\b/g, '3.0 kg')
      .replace(/\bfour kilo\b|\bfour kg\b/g, '4.0 kg')
      .replace(/\bfive kilo\b|\bfive kg\b/g, '5.0 kg')
      .replace(/\bten kilo\b|\bten kg\b/g, '10.0 kg')
      .replace(/\bone\b/g, '1')
      .replace(/\btwo\b/g, '2')
      .replace(/\bthree\b/g, '3')
      .replace(/\bfour\b/g, '4')
      .replace(/\bfive\b/g, '5')
      .replace(/\bsix\b/g, '6')
      .replace(/\bseven\b/g, '7')
      .replace(/\beight\b/g, '8')
      .replace(/\bnine\b/g, '9')
      .replace(/\bten\b/g, '10')
      .replace(/\bhundred\b/g, '100')
      .replace(/\btwo hundred\b/g, '200')
      .replace(/\bthree hundred\b/g, '300')
      .replace(/\bfour hundred\b/g, '400')
      .replace(/\bfive hundred\b/g, '500')
      .replace(/\bseven hundred fifty\b/g, '750')
      .replace(/\btwo hundred fifty\b/g, '250');
  }

  // Parse weight expressions like "1 kg 300 grams" -> 1.300
  public extractWeight(text: string): number | null {
    // Match "1 kg 250 g" or "1 kilo 250 grams"
    const compoundMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos)\s*(\d+)\s*(?:g|gm|grams|gram)?/i);
    if (compoundMatch) {
      const kg = parseFloat(compoundMatch[1]);
      const g = parseFloat(compoundMatch[2]);
      return kg + (g / 1000);
    }

    // Match "1.5 kg" or "2 kg"
    const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos)/i);
    if (kgMatch) {
      return parseFloat(kgMatch[1]);
    }

    // Match "300 grams" or "250g"
    const gramMatch = text.match(/(\d+)\s*(?:g|gm|grams|gram)/i);
    if (gramMatch) {
      return parseFloat(gramMatch[1]) / 1000;
    }

    // Match raw decimal numbers e.g. "1.320" or "1.820"
    const decimalMatch = text.match(/\b(\d+\.\d{1,3})\b/);
    if (decimalMatch) {
      return parseFloat(decimalMatch[1]);
    }

    // Match standalone single digit e.g. "2"
    const singleDigit = text.match(/\b([1-9])\b/);
    if (singleDigit) {
      return parseFloat(singleDigit[1]);
    }

    return null;
  }

  public parseTranscript(rawTranscript: string): VoiceParsedItem[] {
    const normalized = this.normalizeSpokenText(rawTranscript);
    const results: VoiceParsedItem[] = [];

    // Split by conjunctions ("and", "comma", "+") for multi-item phrases
    const phrases = normalized.split(/\band\b|,|\+/i);

    for (const phrase of phrases) {
      const cleanPhrase = phrase.trim();
      if (!cleanPhrase) continue;

      // 1. Identify Product
      let matchedProduct: Product | undefined;
      let highestMatchScore = 0;

      for (const prod of this.products) {
        const prodName = prod.name.toLowerCase();
        const code = prod.code.toLowerCase();

        // Exact or partial name match
        if (cleanPhrase.includes(prodName) || (prodName.includes('chicken') && cleanPhrase.includes('chicken') && !cleanPhrase.includes('country') && !cleanPhrase.includes('liver') && !cleanPhrase.includes('gizzard'))) {
          matchedProduct = prod;
          highestMatchScore = 1.0;
          break;
        } else if (cleanPhrase.includes('country') && (prodName.includes('country') || prodName.includes('nattu'))) {
          matchedProduct = prod;
          highestMatchScore = 0.9;
          break;
        } else if (cleanPhrase.includes('liver') && prodName.includes('liver')) {
          matchedProduct = prod;
          highestMatchScore = 0.95;
          break;
        } else if (cleanPhrase.includes('gizzard') && prodName.includes('gizzard')) {
          matchedProduct = prod;
          highestMatchScore = 0.95;
          break;
        } else if (cleanPhrase.includes('breast') && prodName.includes('breast')) {
          matchedProduct = prod;
          highestMatchScore = 0.9;
          break;
        } else if (cleanPhrase.includes('egg') && prodName.includes('egg')) {
          matchedProduct = prod;
          highestMatchScore = 0.9;
          break;
        } else if (cleanPhrase.includes(code)) {
          matchedProduct = prod;
          highestMatchScore = 0.99;
          break;
        }
      }

      // Default to first chicken product if unspecified but weight exists
      if (!matchedProduct && (cleanPhrase.includes('curry cut') || cleanPhrase.includes('biryani cut') || cleanPhrase.includes('65 cut') || cleanPhrase.includes('kilo') || cleanPhrase.includes('kg'))) {
        matchedProduct = this.products.find((p) => p.code === 'CHK-01') || this.products[0];
      }

      if (!matchedProduct) continue;

      // 2. Identify Weight or Quantity
      let weight: number | undefined;
      let quantity: number | undefined;

      if (matchedProduct.pricingType === 'WEIGHT_BASED') {
        const extracted = this.extractWeight(cleanPhrase);
        weight = extracted !== null ? extracted : 1.000;
      } else {
        const qtyMatch = cleanPhrase.match(/\b(\d+)\b/);
        quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
      }

      // 3. Identify Cutting Option
      let matchedOption = matchedProduct.options?.find((o) => o.isDefault) || matchedProduct.options?.[0];

      if (matchedProduct.options && matchedProduct.options.length > 0) {
        for (const opt of matchedProduct.options) {
          const optName = opt.name.toLowerCase();
          if (cleanPhrase.includes('biryani') && optName.includes('biryani')) {
            matchedOption = opt;
            break;
          } else if (cleanPhrase.includes('65') && optName.includes('65')) {
            matchedOption = opt;
            break;
          } else if (cleanPhrase.includes('curry') && optName.includes('curry')) {
            matchedOption = opt;
            break;
          } else if (cleanPhrase.includes('boneless') && optName.includes('boneless')) {
            matchedOption = opt;
            break;
          } else if (cleanPhrase.includes('skinless') && optName.includes('skinless')) {
            matchedOption = opt;
            break;
          } else if (cleanPhrase.includes('whole') && optName.includes('whole')) {
            matchedOption = opt;
            break;
          }
        }
      }

      // 4. Anomaly Check
      let isAnomaly = false;
      let anomalyReason: string | undefined;

      if (weight && matchedProduct.warningWeightLimit && weight > matchedProduct.warningWeightLimit) {
        isAnomaly = true;
        anomalyReason = `${weight.toFixed(3)} KG is unusually high for ${matchedProduct.name} (Typical limit: ${matchedProduct.warningWeightLimit} KG). Please confirm.`;
      }

      results.push({
        product: matchedProduct,
        weight,
        quantity,
        option: matchedOption,
        confidence: highestMatchScore || 0.85,
        isAnomaly,
        anomalyReason,
      });
    }

    return results;
  }
}

export class VoiceRecognitionService {
  private recognition: any = null;
  private isListening: boolean = false;
  private onResultCallback?: (result: SpeechRecognitionResult) => void;
  private onErrorCallback?: (err: string) => void;
  private onStateChangeCallback?: (listening: boolean) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-IN'; // Indian English dialect default

        this.recognition.onresult = (event: any) => {
          let transcript = '';
          let isFinal = false;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              isFinal = true;
            }
          }

          if (this.onResultCallback && transcript.trim()) {
            this.onResultCallback({
              transcript,
              isFinal,
              confidence: event.results[0]?.[0]?.confidence || 0.9,
            });
          }
        };

        this.recognition.onerror = (event: any) => {
          this.isListening = false;
          if (this.onStateChangeCallback) this.onStateChangeCallback(false);
          if (this.onErrorCallback) {
            this.onErrorCallback(event.error === 'not-allowed' ? 'Microphone permission denied.' : `Speech error: ${event.error}`);
          }
        };

        this.recognition.onend = () => {
          this.isListening = false;
          if (this.onStateChangeCallback) this.onStateChangeCallback(false);
        };
      }
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public startListening(
    onResult: (result: SpeechRecognitionResult) => void,
    onError?: (err: string) => void,
    onStateChange?: (listening: boolean) => void
  ) {
    if (!this.recognition) {
      if (onError) onError('Web Speech API is not supported in this browser.');
      return;
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    this.onStateChangeCallback = onStateChange;

    try {
      this.recognition.start();
      this.isListening = true;
      if (this.onStateChangeCallback) this.onStateChangeCallback(true);
    } catch (e: any) {
      this.isListening = false;
      if (onError) onError(e.message);
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (_) {}
      this.isListening = false;
      if (this.onStateChangeCallback) this.onStateChangeCallback(false);
    }
  }
}

export const voiceService = new VoiceRecognitionService();
