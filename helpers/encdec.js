// PI encryption
const crypto = require('crypto');
exports.piEncryption = async (pidata) => {	
	secret_key = process.env.PI_KEY;
	secret_iv = process.env.PI_IV;
	pidata = pidata.toString();
	let cipher = crypto.createCipheriv('aes-256-cbc', secret_key, secret_iv);
	let encrypted = cipher.update(pidata, 'utf8', 'base64');
	encrypted += cipher.final('base64');
	return encrypted;
}

exports.piDecryption = async (encdata) => {
	secret_key = process.env.PI_KEY;
	secret_iv = process.env.PI_IV;

	encdata = encdata.toString();
	let decipher = crypto.createDecipheriv('aes-256-cbc', secret_key, secret_iv);
	let decrypted = decipher.update(encdata, 'base64', 'utf8');
	decrypted = (decrypted + decipher.final('utf8'));
	return decrypted;
}