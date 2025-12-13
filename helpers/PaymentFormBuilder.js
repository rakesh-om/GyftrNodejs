// helpers/PaymentFormHelper.js
const { generateHash } = require('../utils/hashUtil'); // You can place your hash logic here
const GYFTR_TEST_URL = process.env.GYFTR_TEST_URL;
const HASH_SALT = process.env.HASH_SALT;
const RETURN_URL = process.env.CALL_BACK_URL;

class PaymentFormHelper {
  constructor(address, merchant, txnamount, porderid) {
    this.address = address;
    this.merchant = merchant;
    this.txnamount = txnamount;
    this.porderid = porderid;
  }

  buildPostData() {
    const { address, merchant, txnamount, porderid } = this;

    if (!address.mobile || !txnamount || !porderid) {
      throw new Error('Missing mobile, txnamount, or porderid');
    }

    const postData = {
      api_version: 'V2',
      enforce_prefix: '',
      merchant_sub_mid: '',
      mid: merchant.mid,
      mobile: address.mobile,
      porderid,
      return_url: RETURN_URL,
      source: 'W',
      tid: 'T123456',
      txnamount,
    };

    postData.hash = generateHash(postData, HASH_SALT);

    return postData;
  }

  generateAutoSubmitForm(postData) {
    let formHtml = `<html><body onload="document.forms[0].submit()">`;
    formHtml += `<form method="POST" action="${GYFTR_TEST_URL}">`;

    for (let key in postData) {
      formHtml += `<input type="hidden" name="${key}" value="${postData[key]}" />`;
    }

    formHtml += `</form></body></html>`;
    return formHtml;
  }
}

module.exports = PaymentFormHelper;
  