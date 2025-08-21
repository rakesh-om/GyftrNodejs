const CryptoJS = require('crypto-js');

const KEY = CryptoJS.enc.Utf8.parse('mvPjj93b78BOuupjmETBBY6yrQGhbizC'); // 32-byte
const IV = CryptoJS.enc.Utf8.parse('9660064408704604'); // 16-byte

// Encrypt raw JSON string using AES-256-CBC with key and IV
function encrypt(text) {
  const encrypted = CryptoJS.AES.encrypt(text, KEY, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString(); // base64 format
}

// Decrypt base64 string using AES-256-CBC with key and IV
function decrypt(encryptedText) {
  const decrypted = CryptoJS.AES.decrypt(encryptedText, KEY, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

module.exports = { encrypt, decrypt };
