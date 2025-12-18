function generatePORDERID() {
  const random8Digit = Math.floor(10000000 + Math.random() * 90000000);
  return `PO${random8Digit}`;
}

module.exports = { generatePORDERID };
