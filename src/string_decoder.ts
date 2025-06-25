// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// Changes were made to this file to remove the dependency on Buffer and support only UTF-8
// Copyright © 2021 KeeeX SAS
// Under the same MIT license terms as above

/** Ensure that the provided value is a valid encoding name */
const isEncoding = (encodingInput: string | undefined): boolean => {
  if (encodingInput === undefined) return false;
  const encoding = encodingInput.toLowerCase();
  switch (encoding) {
    case "utf8":
      return true;
    default:
      return false;
  }
};

/** Coerce encoding names to standard names */
const _normalizeEncoding = (encInput: string): string | undefined => {
  const enc = encInput.toLowerCase();
  switch (enc) {
    case "utf8":
    case "utf-8":
      return "utf8";
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
const normalizeEncoding = (enc: string): string => {
  const normalizedEncoding = _normalizeEncoding(enc);
  if (normalizedEncoding && isEncoding(normalizedEncoding)) {
    return normalizedEncoding;
  }
  throw new Error(`Unknown encoding: ${enc}`);
};

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
export class StringDecoder {
  private readonly _encoding: string;
  private lastNeed = 0;
  private lastTotal = 0;
  private readonly lastChar: Uint8Array;
  private readonly decoder = new TextDecoder();

  public constructor(encoding = "utf8") {
    this._encoding = normalizeEncoding(encoding);
    const BUFFER_LENGTH_UNICODE = 4;
    this.lastChar = new Uint8Array(BUFFER_LENGTH_UNICODE);
  }

  /**
   * Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
   * continuation byte. If an invalid byte is detected, -2 is returned.
   */
  private static utf8CheckByte(byte: number): number {
    /* eslint-disable @typescript-eslint/no-magic-numbers */
    if (byte <= 0x7f) {
      return 0;
    } else if (byte >> 5 === 0x06) {
      return 2;
    } else if (byte >> 4 === 0x0e) {
      return 3;
    } else if (byte >> 3 === 0x1e) {
      return 4;
    }
    return byte >> 6 === 0x02 ? -1 : -2;
    /* eslint-enable @typescript-eslint/no-magic-numbers */
  }

  public get encoding(): string {
    return this._encoding;
  }

  public write(inputBuffer: Uint8Array): string {
    if (inputBuffer.length === 0) return "";
    /* eslint-disable @typescript-eslint/init-declarations */
    let r;
    let i;
    /* eslint-enable @typescript-eslint/init-declarations */
    if (this.lastNeed) {
      r = this.fillLast(inputBuffer);
      if (r === undefined) return "";
      i = this.lastNeed;
      this.lastNeed = 0;
    } else {
      i = 0;
    }
    if (i < inputBuffer.length) {
      return r ? r + this.utf8Text(inputBuffer, i) : this.utf8Text(inputBuffer, i);
    }
    return r ?? "";
  }

  public end(inputBuffer?: Uint8Array): string {
    return this.utf8End(inputBuffer);
  }

  /** Attempts to complete a partial non-UTF-8 character using bytes from an Uint8Array */
  private fillLast(inputBuffer: Uint8Array): string | undefined {
    const p = this.lastTotal - this.lastNeed;
    const r = this.utf8CheckExtraBytes(inputBuffer);
    if (r !== undefined) return r;
    if (this.lastNeed <= inputBuffer.length) {
      this.lastChar.set(inputBuffer.slice(0, this.lastNeed), p);
      return this.decoder.decode(this.lastChar.slice(0, this.lastTotal));
    }
    this.lastChar.set(inputBuffer.slice(0, inputBuffer.length), p);
    this.lastNeed -= inputBuffer.length;
  }

  /**
   * Validates as many continuation bytes for a multi-byte UTF-8 character as
   * needed or are available. If we see a non-continuation byte where we expect
   * one, we "replace" the validated continuation bytes we've seen so far with
   * a single UTF-8 replacement character ('\\ufffd'), to match v8's UTF-8 decoding
   * behavior. The continuation byte check is included three times in the case
   * where all of the continuation bytes for a character exist in the same buffer.
   * It is also done this way as a slight performance increase instead of using a
   * loop.
   */
  private utf8CheckExtraBytes(inputBuffer: Uint8Array): string | undefined {
    /* eslint-disable @typescript-eslint/no-magic-numbers */
    if ((inputBuffer[0] & 0xc0) !== 0x80) {
      this.lastNeed = 0;
      return "\ufffd";
    }
    if (this.lastNeed > 1 && inputBuffer.length > 1) {
      if ((inputBuffer[1] & 0xc0) !== 0x80) {
        this.lastNeed = 1;
        return "\ufffd";
      }
      if (this.lastNeed > 2 && inputBuffer.length > 2) {
        if ((inputBuffer[2] & 0xc0) !== 0x80) {
          this.lastNeed = 2;
          return "\ufffd";
        }
      }
    }
    /* eslint-enable @typescript-eslint/no-magic-numbers */
  }

  /**
   * Checks at most 3 bytes at the end of a Buffer in order to detect an
   * incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
   * needed to complete the UTF-8 character (if applicable) are returned.
   */
  private utf8CheckIncomplete(inputBuffer: Uint8Array, i: number): number {
    /* eslint-disable @typescript-eslint/no-magic-numbers */
    let j = inputBuffer.length - 1;
    if (j < i) return 0;
    let nb = StringDecoder.utf8CheckByte(inputBuffer[j]);
    if (nb >= 0) {
      if (nb > 0) this.lastNeed = nb - 1;
      return nb;
    }
    if (--j < i || nb === -2) return 0;
    nb = StringDecoder.utf8CheckByte(inputBuffer[j]);
    if (nb >= 0) {
      if (nb > 0) this.lastNeed = nb - 2;
      return nb;
    }
    if (--j < i || nb === -2) return 0;
    nb = StringDecoder.utf8CheckByte(inputBuffer[j]);
    if (nb >= 0) {
      if (nb > 0) {
        if (nb === 2) {
          nb = 0;
        } else {
          this.lastNeed = nb - 3;
        }
      }
      return nb;
    }
    return 0;
    /* eslint-enable @typescript-eslint/no-magic-numbers */
  }

  /**
   * Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
   * partial character, the character's bytes are buffered until the required
   * number of bytes are available.
   */
  private utf8Text(inputBuffer: Uint8Array, i: number): string {
    const total = this.utf8CheckIncomplete(inputBuffer, i);
    if (!this.lastNeed) return this.decoder.decode(inputBuffer.slice(i));
    this.lastTotal = total;
    const end = inputBuffer.length - (total - this.lastNeed);
    this.lastChar.set(inputBuffer.slice(end));
    return this.decoder.decode(inputBuffer.slice(i, end));
  }

  /**
   * For UTF-8, a replacement character is added when ending on a partial
   * character.
   */
  private utf8End(inputBuffer?: Uint8Array): string {
    const r = inputBuffer?.length ? this.write(inputBuffer) : "";
    if (this.lastNeed) return `${r}\ufffd`;
    return r;
  }
}
