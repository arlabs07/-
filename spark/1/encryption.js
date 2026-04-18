/**
 * encryption.js — Spark Message Encryption v1
 *
 * Provides transparent compress + encrypt for chat messages.
 * Uses the chatId as the symmetric key so both parties can decrypt.
 *
 * Pipeline (encrypt):
 *   plaintext → LZW compress (if it helps) → XOR keystream → Base64
 *
 * Pipeline (decrypt):
 *   Base64 → XOR keystream → LZW decompress → plaintext
 *
 * Key generation: FNV-1a hash of chatId → Xorshift PRNG seed
 * Encryption:     XOR cipher (symmetric; fast; no external deps)
 * Compression:    LZW (good for repetitive chat text)
 *
 * IMPORTANT: Only text-type messages are encrypted.
 *            Image/video/file/poll JSON payloads are sent as-is.
 *            Encrypted messages carry msg.encrypted = true.
 *            If decryption fails (old messages), original text is returned.
 */

const Encryption = (() => {

  /* ── Constants ─────────────────────────────────────────── */
  const COMPRESS_MIN_LEN = 30;    // don't bother compressing short strings
  const COMPRESS_FLAG    = '\x01';// prefix byte flags: \x00=none, \x01=lzw

  /* ── PRNG (Xorshift32 seeded with FNV-1a hash of key) ─── */

  const _fnv1a = (str) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  };

  const _makeRng = (key) => {
    let s = _fnv1a(key || 'default');
    if (s === 0) s = 1;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) & 0xFF;
    };
  };

  /* ── LZW Compression ────────────────────────────────────── */

  const _lzwCompress = (str) => {
    if (!str || str.length < COMPRESS_MIN_LEN) return null;

    const dict = new Map();
    for (let i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i);
    let code = 256;

    const out = [];
    let w = '';
    for (const c of str) {
      const wc = w + c;
      if (dict.has(wc)) {
        w = wc;
      } else {
        out.push(dict.get(w));
        if (code < 65536) dict.set(wc, code++);
        w = c;
      }
    }
    if (w !== '') out.push(dict.get(w));

    // Pack 16-bit codes to bytes
    const bytes = new Uint8Array(out.length * 2);
    for (let i = 0; i < out.length; i++) {
      bytes[i * 2]     = (out[i] >> 8) & 0xFF;
      bytes[i * 2 + 1] =  out[i]       & 0xFF;
    }
    return bytes;
  };

  const _lzwDecompress = (bytes) => {
    const out = [];
    for (let i = 0; i < bytes.length; i += 2) {
      out.push((bytes[i] << 8) | bytes[i + 1]);
    }

    const dict = new Map();
    for (let i = 0; i < 256; i++) dict.set(i, String.fromCharCode(i));
    let code = 256;

    if (!out.length) return '';

    let w = dict.get(out[0]);
    let result = w;

    for (let i = 1; i < out.length; i++) {
      const k = out[i];
      const entry = dict.has(k) ? dict.get(k) : w + w[0];
      result += entry;
      if (code < 65536) dict.set(code++, w + entry[0]);
      w = entry;
    }
    return result;
  };

  /* ── XOR Cipher ─────────────────────────────────────────── */

  const _xorBytes = (bytes, key) => {
    const rng = _makeRng(key);
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ rng();
    return out;
  };

  /* ── Encode / Decode helpers ─────────────────────────────── */

  /** Convert Uint8Array → Base64 without triggering max-call-stack */
  const _toBase64 = (bytes) => {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  /** Base64 → Uint8Array */
  const _fromBase64 = (b64) => {
    const binary = atob(b64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  /** UTF-8 string → Uint8Array */
  const _encode = (str) => {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    // Fallback
    const out = [];
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xC0|(c>>6)); out.push(0x80|(c&0x3F)); }
      else { out.push(0xE0|(c>>12)); out.push(0x80|((c>>6)&0x3F)); out.push(0x80|(c&0x3F)); }
    }
    return new Uint8Array(out);
  };

  /** Uint8Array → UTF-8 string */
  const _decode = (bytes) => {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
    return String.fromCharCode(...bytes);
  };

  /* ══════════════════════════════════════════════════════════
     PUBLIC API
     ══════════════════════════════════════════════════════════ */

  /**
   * Encrypt a plaintext string.
   * @param {string} text    — plaintext
   * @param {string} chatId  — symmetric key
   * @returns {string}       — base64-encoded ciphertext
   */
  const encrypt = (text, chatId) => {
    if (!text || !chatId) return text;
    try {
      // Step 1: Try LZW compression
      const compressed = _lzwCompress(text);
      let payload;
      let flagByte;

      if (compressed && compressed.length < _encode(text).length) {
        // Compression helped — prepend flag byte \x01
        flagByte = 0x01;
        payload  = compressed;
      } else {
        // No compression — just encode UTF-8, flag byte \x00
        flagByte = 0x00;
        payload  = _encode(text);
      }

      // Step 2: Prepend flag + XOR encrypt
      const withFlag = new Uint8Array(1 + payload.length);
      withFlag[0] = flagByte;
      withFlag.set(payload, 1);

      const encrypted = _xorBytes(withFlag, chatId);

      // Step 3: Base64 encode
      return _toBase64(encrypted);
    } catch (e) {
      console.warn('Encryption.encrypt failed:', e);
      return text;   // fallback: send unencrypted
    }
  };

  /**
   * Decrypt a ciphertext string.
   * @param {string} ciphertext — base64-encoded ciphertext
   * @param {string} chatId     — symmetric key
   * @returns {string}          — plaintext, or original string if decryption fails
   */
  const decrypt = (ciphertext, chatId) => {
    if (!ciphertext || !chatId) return ciphertext;
    try {
      // Step 1: Base64 decode
      const encrypted = _fromBase64(ciphertext);

      // Step 2: XOR decrypt
      const withFlag = _xorBytes(encrypted, chatId);

      // Step 3: Check flag and decompress if needed
      const flag    = withFlag[0];
      const payload = withFlag.subarray(1);

      if (flag === 0x01) {
        // Compressed
        return _lzwDecompress(payload);
      } else if (flag === 0x00) {
        // Uncompressed UTF-8
        return _decode(payload);
      } else {
        // Unknown flag — return original (old/unencrypted message)
        return ciphertext;
      }
    } catch (e) {
      // Decryption failed — message is probably not encrypted (old message)
      return ciphertext;
    }
  };

  /**
   * Quick check: does a string look like an encrypted ciphertext?
   * (All encrypted messages are valid base64.)
   */
  const isEncrypted = (str) => {
    if (!str || str.length < 4) return false;
    return /^[A-Za-z0-9+/]+=*$/.test(str);
  };

  return { encrypt, decrypt, isEncrypted };
})();
