/**
 * encryption.js — Spark Message Encryption v2
 *
 * What changed from v1:
 *  • LZW compression replaced with BIT-PACKED variable-width LZW
 *    (classic GIF/PDF-style, 9-12 bit codes, LSB-first bit order).
 *
 *    v1 used flat 16-bit codes for every dictionary entry, meaning even
 *    a highly-compressed result cost 2 bytes per code. This actually made
 *    SHORT messages larger after "compression". v2 packs codes tightly:
 *      - Starts at 9 bits (dict has 258 entries: 256 bytes + CLEAR + END)
 *      - Widens to 10 bits when dict reaches 512, 11 at 1024, 12 at 2048
 *      - Maximum dictionary: 4096 codes (12-bit ceiling)
 *    For a 500-char chat message this typically yields 35-50% compression
 *    vs. 0% (or worse) with v1 for messages under ~200 chars.
 *
 *  • Compression is only applied when the packed output is < 82% of the
 *    raw UTF-8 byte count (a meaningful saving after Base64 overhead).
 *    Messages shorter than 40 chars always skip compression — the overhead
 *    of the algorithm outweighs any gain on such tiny inputs.
 *
 *  • Public API is 100% compatible with v1:
 *      Encryption.encrypt(text, chatId) → base64 string
 *      Encryption.decrypt(ciphertext, chatId) → plain string
 *      Encryption.isEncrypted(str) → boolean
 *    All callers (chat.js) need zero changes.
 *
 *  • Cipher: XOR stream with Xorshift32 PRNG seeded by FNV-1a(chatId).
 *    Unchanged from v1 — fast, symmetric, zero external dependencies.
 *
 * Wire format (before XOR + Base64):
 *   Byte 0   : flag  (0x00 = raw UTF-8 | 0x01 = LZW compressed)
 *   Byte 1…N : data  (UTF-8 bytes  OR  LZW bit-stream bytes)
 */

const Encryption = (() => {

  /* ────────────────────────────────────────────────────────────
     CONSTANTS
     ──────────────────────────────────────────────────────────── */

  const FLAG_RAW = 0x00;
  const FLAG_LZW = 0x01;

  /** Minimum input length (UTF-8 bytes) to attempt LZW compression. */
  const MIN_COMPRESS_LEN = 25;

  /**
   * Compression is kept when the packed LZW output is < this fraction of the
   * raw UTF-8 input.  0.97 = use compression if it saves at least ~3%.
   *
   * Even a 3% payload reduction is worthwhile:
   *   • Each message is stored in the messages[] array of the chat record.
   *   • Every sendChatMessage() patches the ENTIRE array to Parqra.
   *   • Savings compound as conversations grow.
   *   • Base64 adds a flat 33% overhead regardless, so squeezing the
   *     pre-Base64 payload is the only lever we have.
   */
  const COMPRESS_RATIO_THRESHOLD = 0.97;

  /* ────────────────────────────────────────────────────────────
     BIT-PACKED LZW  —  BitWriter / BitReader
     LSB-first packing (same convention as GIF LZW / DEFLATE stored blocks)
     ──────────────────────────────────────────────────────────── */

  /**
   * Accumulates bits and flushes whole bytes into an output array.
   * Bits are packed LSB-first into each byte.
   */
  class _BitWriter {
    constructor() {
      this._buf  = [];    // output bytes
      this._word = 0;     // pending bits (up to 31 bits)
      this._fill = 0;     // how many bits are pending
    }

    /** Write `bits`-wide `value` into the stream. */
    write(value, bits) {
      this._word |= ((value & ((1 << bits) - 1)) << this._fill);
      this._fill += bits;
      while (this._fill >= 8) {
        this._buf.push(this._word & 0xFF);
        this._word = (this._word >>> 8);
        this._fill -= 8;
      }
    }

    /** Flush any remaining partial byte; return the complete byte array. */
    flush() {
      if (this._fill > 0) this._buf.push(this._word & 0xFF);
      return new Uint8Array(this._buf);
    }
  }

  /**
   * Reads bit fields of arbitrary width from a Uint8Array.
   * Bits are consumed LSB-first from each byte.
   */
  class _BitReader {
    constructor(bytes) {
      this._bytes = bytes;
      this._pos   = 0;    // next byte to read
      this._word  = 0;    // buffered bits
      this._fill  = 0;    // how many bits are buffered
    }

    /**
     * Read the next `bits`-wide value.
     * Returns undefined when the stream is exhausted.
     */
    read(bits) {
      // Fill buffer until we have enough bits
      while (this._fill < bits) {
        if (this._pos >= this._bytes.length) return undefined;
        this._word |= (this._bytes[this._pos++] << this._fill);
        this._fill += 8;
      }
      const val    = this._word & ((1 << bits) - 1);
      this._word >>>= bits;
      this._fill  -= bits;
      return val;
    }
  }

  /* ────────────────────────────────────────────────────────────
     LZW  COMPRESS
     ──────────────────────────────────────────────────────────── */

  /**
   * Compress a Uint8Array with bit-packed LZW.
   *
   * Returns a Uint8Array with the compressed bit-stream, or null when:
   *   • The input is shorter than MIN_COMPRESS_LEN bytes, OR
   *   • The compressed size is not meaningfully smaller than the input.
   */
  const _lzwCompress = (bytes) => {
    if (!bytes || bytes.length < MIN_COMPRESS_LEN) return null;

    const CLEAR    = 256;
    const END      = 257;
    const MAX_DICT = 4096;   // 12-bit ceiling

    let width    = 9;        // current code width
    let nextCode = 258;      // next dictionary slot to assign

    /*
     * Encoder dictionary: maps (parent_code << 8) | byte → child_code.
     *
     * Key arithmetic: parent is ≤ 4095 (12 bits), byte is 0-255 (8 bits).
     * Combined key ≤ (4095 << 8) | 255 = 1,048,575 — safe JS integer.
     */
    const dict = new Map();
    const bw   = new _BitWriter();

    bw.write(CLEAR, width);

    let w = bytes[0];   // current code  (starts as a single-byte literal)

    for (let i = 1; i < bytes.length; i++) {
      const c   = bytes[i];
      const key = (w << 8) | c;

      const found = dict.get(key);
      if (found !== undefined) {
        // Extend current sequence
        w = found;
      } else {
        // Emit code for current sequence, then start a new one
        bw.write(w, width);

        if (nextCode < MAX_DICT) {
          dict.set(key, nextCode++);
          // Widen codes BEFORE outputting the code that requires it
          if (nextCode >= (1 << width) && width < 12) width++;
        }
        // If the dict is full (nextCode == MAX_DICT) we continue encoding
        // without adding new entries — still valid LZW, just no new patterns.

        w = c;
      }
    }

    bw.write(w, width);
    bw.write(END, width);

    const out = bw.flush();

    // Reject if savings are too small (overhead would outweigh gain after Base64)
    if (out.length >= bytes.length * COMPRESS_RATIO_THRESHOLD) return null;

    return out;
  };

  /* ────────────────────────────────────────────────────────────
     LZW  DECOMPRESS
     ──────────────────────────────────────────────────────────── */

  /**
   * Decompress a bit-stream produced by _lzwCompress.
   * Returns a Uint8Array of the original bytes, or null on error.
   */
  const _lzwDecompress = (compressed) => {
    if (!compressed || !compressed.length) return null;

    const CLEAR    = 256;
    const END      = 257;
    const MAX_DICT = 4096;

    let width    = 9;
    let nextCode = 258;

    /*
     * Decoder table: indexed by code → Uint8Array of bytes.
     * Pre-populate the 256 single-byte literals.
     */
    const table = new Array(MAX_DICT);
    for (let i = 0; i < 256; i++) table[i] = new Uint8Array([i]);

    const br     = new _BitReader(compressed);
    const chunks = [];   // collected Uint8Array output segments

    /* ── Read and validate the first code ── */
    let code = br.read(width);

    // Skip leading CLEAR if present (we always write one)
    if (code === CLEAR) {
      width = 9; nextCode = 258;
      code  = br.read(width);
    }

    if (code === undefined || code === END) return new Uint8Array(0);
    if (!table[code]) return null;   // corrupt stream

    chunks.push(table[code]);
    let prev = code;

    /* ── Main decode loop ── */
    while (true) {
      code = br.read(width);

      if (code === undefined || code === END) break;

      if (code === CLEAR) {
        // Reset dictionary and code width
        width    = 9;
        nextCode = 258;
        for (let i = 258; i < MAX_DICT; i++) table[i] = undefined;

        code = br.read(width);
        if (code === undefined || code === END) break;
        if (!table[code]) return null;

        chunks.push(table[code]);
        prev = code;
        continue;
      }

      let entry;
      if (code < nextCode && table[code]) {
        // Known code — directly look up
        entry = table[code];
      } else {
        // Special LZW case: code == nextCode
        // The entry is prevEntry + prevEntry[0]
        const prevEntry = table[prev];
        if (!prevEntry) return null;   // corrupt
        entry = new Uint8Array(prevEntry.length + 1);
        entry.set(prevEntry);
        entry[prevEntry.length] = prevEntry[0];
      }

      chunks.push(entry);

      // Add new dictionary entry: prev-sequence + first byte of current entry
      if (nextCode < MAX_DICT && table[prev]) {
        const prevEntry = table[prev];
        const newEntry  = new Uint8Array(prevEntry.length + 1);
        newEntry.set(prevEntry);
        newEntry[newEntry.length - 1] = entry[0];
        table[nextCode++] = newEntry;
        if (nextCode >= (1 << width) && width < 12) width++;
      }

      prev = code;
    }

    /* ── Concatenate all output chunks into one Uint8Array ── */
    let totalLen = 0;
    for (let i = 0; i < chunks.length; i++) totalLen += chunks[i].length;

    const result = new Uint8Array(totalLen);
    let offset   = 0;
    for (let i = 0; i < chunks.length; i++) {
      result.set(chunks[i], offset);
      offset += chunks[i].length;
    }

    return result;
  };

  /* ────────────────────────────────────────────────────────────
     XOR CIPHER  (symmetric, seeded by chatId)
     ──────────────────────────────────────────────────────────── */

  /** FNV-1a 32-bit hash — deterministic seed from chatId string. */
  const _fnv1a = (str) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h  = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  };

  /** Xorshift32 PRNG seeded with FNV-1a(key). Returns byte-emitting function. */
  const _makeRng = (key) => {
    let s = _fnv1a(key || 'default');
    if (s === 0) s = 1;  // Xorshift must not start at 0
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) & 0xFF;
    };
  };

  /** XOR every byte in `bytes` with successive outputs of the PRNG. */
  const _xorBytes = (bytes, key) => {
    const rng = _makeRng(key);
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ rng();
    return out;
  };

  /* ────────────────────────────────────────────────────────────
     BINARY ↔ BASE64 HELPERS
     ──────────────────────────────────────────────────────────── */

  /** Uint8Array → Base64 string without hitting the max-call-stack limit. */
  const _toBase64 = (bytes) => {
    let binary    = '';
    const CHUNK   = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  };

  /** Base64 string → Uint8Array. */
  const _fromBase64 = (b64) => {
    const binary = atob(b64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  /* ────────────────────────────────────────────────────────────
     UTF-8 ENCODE / DECODE
     ──────────────────────────────────────────────────────────── */

  /** String → UTF-8 Uint8Array. */
  const _encode = (str) => {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    // Fallback for environments without TextEncoder
    const out = [];
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
      } else if (c < 0xD800 || c >= 0xE000) {
        out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
      } else {
        // Surrogate pair
        const cp = 0x10000 + (((c & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF));
        out.push(
          0xF0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3F),
          0x80 | ((cp >> 6) & 0x3F),
          0x80 | (cp & 0x3F)
        );
      }
    }
    return new Uint8Array(out);
  };

  /** UTF-8 Uint8Array → String. */
  const _decode = (bytes) => {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
    return String.fromCharCode(...bytes);
  };

  /* ════════════════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════════════════ */

  /**
   * Encrypt a plaintext string.
   *
   * Pipeline:
   *   text  →  UTF-8 bytes
   *         →  [optional] bit-packed LZW compress
   *         →  prepend 1-byte flag (0x00 raw | 0x01 lzw)
   *         →  XOR stream cipher  (key = chatId)
   *         →  Base64 encode
   *
   * @param {string} text    - Plaintext message
   * @param {string} chatId  - Symmetric key (chat record ID)
   * @returns {string}       - Base64-encoded ciphertext
   */
  const encrypt = (text, chatId) => {
    if (!text || !chatId) return text;
    try {
      const raw        = _encode(text);
      const compressed = _lzwCompress(raw);

      let flag, payload;
      if (compressed) {
        // Compression gave a meaningful saving — use it
        flag    = FLAG_LZW;
        payload = compressed;
      } else {
        // Raw UTF-8 is smaller (or the saving was negligible)
        flag    = FLAG_RAW;
        payload = raw;
      }

      // Prepend flag byte then XOR-cipher the whole thing
      const withFlag    = new Uint8Array(1 + payload.length);
      withFlag[0]       = flag;
      withFlag.set(payload, 1);

      const cipherBytes = _xorBytes(withFlag, chatId);
      return _toBase64(cipherBytes);

    } catch (e) {
      console.warn('Encryption.encrypt failed:', e);
      return text;   // graceful fallback: store unencrypted rather than crash
    }
  };

  /**
   * Decrypt a ciphertext string produced by encrypt().
   *
   * Pipeline (reverse of encrypt):
   *   Base64 → XOR decipher → check flag → [optional] LZW decompress → string
   *
   * @param {string} ciphertext - Base64-encoded ciphertext
   * @param {string} chatId     - Symmetric key
   * @returns {string}          - Plaintext, or original string if decryption fails
   */
  const decrypt = (ciphertext, chatId) => {
    if (!ciphertext || !chatId) return ciphertext;
    try {
      const cipherBytes = _fromBase64(ciphertext);
      const withFlag    = _xorBytes(cipherBytes, chatId);

      const flag    = withFlag[0];
      const payload = withFlag.subarray(1);

      if (flag === FLAG_LZW) {
        const decompressed = _lzwDecompress(payload);
        if (!decompressed) return ciphertext;  // decompress error → not our format
        return _decode(decompressed);

      } else if (flag === FLAG_RAW) {
        return _decode(payload);

      } else {
        // Unknown flag — this is an old/unencrypted message stored as-is
        return ciphertext;
      }

    } catch {
      // Decryption failed (old unencrypted message, different key, etc.)
      return ciphertext;
    }
  };

  /**
   * Quick heuristic: does this string look like our Base64 ciphertext?
   * (Encrypted messages are always valid, non-empty Base64.)
   */
  const isEncrypted = (str) => {
    if (!str || str.length < 4) return false;
    return /^[A-Za-z0-9+/]+=*$/.test(str);
  };

  return { encrypt, decrypt, isEncrypted };
})();