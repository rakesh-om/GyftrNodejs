const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


// Log helper function
function logToFile(logData) {
  const date = new Date();
  const dateStr = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  const logDir = path.join(__dirname, '..', 'log');
  const logFile = path.join(logDir, `initiategyftercheckout_${dateStr}.log`);

  const logEntry = `[${new Date().toISOString()}] ${logData}\n`;

  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  // Append log entry
  fs.appendFileSync(logFile, logEntry);
}


const ENCRYPT_DECRYPT_KEY = "mvPjj93b78BOuupjmETBBY6yrQGhbizC";
// Derive key and IV like OpenSSL (MD5 + salt)
function getKeyAndIv(password, salt) {
  let key = Buffer.alloc(0);
  let prev = Buffer.alloc(0);

  while (key.length < 32 + 16) { // 32 bytes key + 16 bytes IV
    const md5 = crypto.createHash('md5');
    md5.update(Buffer.concat([prev, Buffer.from(password), salt]));
    prev = md5.digest();
    key = Buffer.concat([key, prev]);
  }

  return {
    key: key.slice(0, 32),
    iv: key.slice(32, 48)
  };
}

function encrypt(text, password) {
  const salt = crypto.randomBytes(8);
  const { key, iv } = getKeyAndIv(Buffer.from(password), salt);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'binary');
  encrypted += cipher.final('binary');

  const encryptedBytes = Buffer.concat([
    Buffer.from('Salted__'), // 8 bytes OpenSSL salt prefix
    salt,
    Buffer.from(encrypted, 'binary')
  ]);

  return encryptedBytes.toString('base64');
}
exports.initiateGyfterpay = (req, res) => {
  const { amount, customerId } = req.body;

  if (!amount || !customerId) {
    logToFile(`❌ Missing fields - Body: ${JSON.stringify(req.body)}`);
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  const transactionId = `GYFTER-${Date.now()}`;
  
  logToFile(`✅ Payment Initiated - CustomerID: ${customerId}, Amount: ${amount}, TransactionID: ${transactionId}`);

  res.status(200).json({
    success: true,
    message: 'GyfterPay initiated successfully',
    data: {
      amount,
      customerId,
      transactionId
    }
  });
};

exports.encryptpayload = (req, res) => {
  try {
    const payload = req.body;

    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: 'Empty payload' });
    }

    // Convert payload JSON to string
    const payloadStr = JSON.stringify(payload);

    // Encrypt payload string
    const encryptedPayload = encrypt(payloadStr, ENCRYPT_DECRYPT_KEY);

    // Respond with encrypted data
    return res.status(200).json({
      success: true,
      data: encryptedPayload
    });
  } catch (error) {
    console.error('Encryption error:', error);
    return res.status(500).json({ success: false, message: 'Encryption failed', error: error.message });
  }
};
