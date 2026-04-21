/**
 * ai.js — AI Image Generator v2
 * Stripped to utility only — no chat UI, no Aria bot.
 * The generateImage function is called by chat.js when
 * the user taps "AI Image" in the attach menu.
 */

const AriaBot = (() => {

  const IMG_API = 'https://image.pollinations.ai/prompt/';

  /**
   * Generate an image using Pollinations.
   * Returns a URL string (stable for same prompt+seed).
   * @param {string} prompt - Image description
   * @returns {Promise<string>} Image URL
   */
  const generateImage = async (prompt) => {
    const encoded = encodeURIComponent((prompt || '').trim().slice(0, 250));
    const seed    = Math.floor(Math.random() * 999999);
    return `${IMG_API}${encoded}?width=768&height=768&seed=${seed}&nologo=true`;
  };

  return { generateImage };
})();