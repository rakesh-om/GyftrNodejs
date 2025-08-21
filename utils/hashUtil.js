const crypto = require('crypto');

function checkString(value) {
  if (value === 'null' || value == null) return '';
  return String(value).trim(); // force string + remove any accidental spaces
}

/**
 * Generate SHA512 hash of sorted params concatenated with secret key
 * @param {Object} params - POST params (without 'hash')
 * @param {string} secretKey - hash salt provided by GyFTR
 * @returns {string} - lowercase SHA512 hash string
 */
function generateHash(params, secretKey) {
  const sortedKeys = Object.keys(params).sort();
  let hashString = '';

  sortedKeys.forEach(key => {
    const value = checkString(params[key]);
    hashString += value + '|';
  });

  hashString += secretKey;

  return crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
}

/**
 * Generate reverse hash from GyFTR callback data using SHA512
 * @param {Object} data - Parsed response data (from inputData)
 * @param {string} secretKey - Reverse hash salt (HASH_SALT)
 * @returns {string} - SHA512 hash in lowercase
 */




/**
 * Generate reverse hash for GyFTR callback
 * @param {Object} data - Callback data from GyFTR
 * @param {string} secretKey - Reverse hash salt (HASH_SALT)
 * @returns {string} - Lowercase SHA512 hash
 */
function reverseHashData(requestPayLoad, key) {
    var hashString = "";
    var hashData = "";
    const jsonObject = JSON.parse(requestPayLoad);
    try {
        // Sort the keys of the JSON object
        const sortedKeys = Object.keys(jsonObject).sort();
        // Construct a new object with sorted keys
        const sortedRequestBody = {};
        sortedKeys.forEach((key) => {
            sortedRequestBody[key] = jsonObject[key];
        });

        // creating hash string 
        for (const key in sortedRequestBody) {
          if(Array.isArray(sortedRequestBody[key])){
            let detailsData = sortedRequestBody[key];
            // console.log("detailsData ", detailsData);
            for (const data of detailsData){
              // console.log("data ", data);
              for (const dataKey in data){
                // console.log("dataKey ", dataKey);
                if(data[dataKey]){
                  hashString += `${data[dataKey]}|`;
                }
              }
            }
          } else {
            hashString += `${sortedRequestBody[key]}|`;
          }          
        }
        
        hashString += `${key}`;
        //console.log("hashString ", hashString);
        
        // Creation hash of string 
        if(hashString){
          // hashData = CryptoJS.SHA512(hashString).toString(CryptoJS.enc.Hex);
          // hashData = hashData.toLowerCase();
          const reveserhash = crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();
          //console.log('utils has', reveserhash);
         // console.log('line 85',Buffer.from(hashString, 'utf8').toString('hex'));
          return reveserhash;
        }
		
		console.log("hashData ", hashData);
        
    } catch (err) {
      console.log(JSON.stringify(err))
    }

    return hashData;
  }
  

module.exports = {
  generateHash,
  reverseHashData
};