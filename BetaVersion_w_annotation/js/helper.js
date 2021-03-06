/**
 * Send message to rewrite html. Communicate with background.js, which is responsible for page visualization.
 * @function _SendMsg
 * @param  {string} msg - page name
 * @param  {string} src - (optional) additional page content
 */
function _SendMsg(msg, src) {
  chrome.runtime.sendMessage({
    msg: msg,
    data: {
      screen: src,
      option: src,
    },
  });
}
/**
 * Create default structure of extension storage
 * @function _StorageStruct
 * @param  {string} pw
 * @returns {object} default structure object
 */
function _StorageStruct(pw) {
  let struct = {
    currAcc: -1,
    accList: [],
    walletpw: pw,
    tnm: {},
    txbuf: [],
  };
  return struct;
}
/**
 * Create account record object
 * @function _CreateAccountRecord
 * @param  {string} name
 * @param  {string} address
 * @returns {object} account record object
 */
function _CreateAccountRecord(name, address) {
  let oneAcc = {
    name: name,
    address: address,
    balance: [],
    history: [],
  };
  return oneAcc;
}
/**
 * Put account record object, created through _CreateAccountRecord(), into extension storage.
 * @function _PutStorage
 * @param  {object} accountObj - account object to be put
 * @param  {boolean} isFirst - true for account name with "Created", false for "Loaded"
 */
function _PutStorage(accountObj, isFirst) {
  console.log("putstorage came in");
  chrome.storage.sync.get(null, function (obj) {
    let name = "";
    if (isFirst) name = "AccountCreatedAt_" + _GetTime();
    else name = "AccountLoadedAt_" + _GetTime();
    const address = accountObj.address;

    let toPush = _CreateAccountRecord(name, address);
    obj["accList"].push(toPush);
    obj["currAcc"] = obj["accList"].length - 1;

    chrome.storage.sync.set(obj, function () {
      console.log("Saved");
      console.log(obj);
    });
  });
}
/**
 * Get ether balance of the given account address
 * @async
 * @function _GetBalance
 * @param  {string} accountAddress - account address
 * @returns {string} ether balance of the account
 */
async function _GetBalance(accountAddress) {
  const getbalance = await web3.eth.getBalance(accountAddress);
  const ethBal = String(web3.utils.fromWei(getbalance, "ether"));
  return ethBal;
}
/**
 * Get transaction status of given txHash via web3.
 * @async
 * @function _CheckTxStatus
 * @param  {string} txHash - transaction hash value
 * @returns {number} 1 for success, 0 for fail, -1 for undefined/pending
 */
async function _CheckTxStatus(txHash) {
  const status = await web3.eth.getTransactionReceipt(txHash);
  let res;
  try {
    res = status.status;
    if (res == true) res = 1;
    if (res == false) res = 0;
  } catch (err) {
    res = -1;
  }
  return res;
}
/**
 * Get current account's record object from extension storage
 * @async
 * @function _GetCurr
 * @returns {object} current account record object
 */
async function _GetCurr() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(null, function (res) {
        // console.log(res);
        let idx = res["currAcc"];
        resolve(res["accList"][idx]);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}
/**
 * Get whole extension storage object
 * @async
 * @function _GetAll
 * @returns {object} extension storage object
 */
async function _GetAll() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(null, function (res) {
        resolve(res);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}
/**
 * Get "accList", which is the list of account records, from extension storage
 * @async
 * @function _GetList
 * @returns {list} list of accounts, from extension storage
 *
 */
async function _GetList() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(null, function (res) {
        resolve(res["accList"]);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}
/**
 * Get current wallet's password from extension storage.
 * @async
 * @function _GetWalletPW
 * @returns {string} password of current wallet
 */
async function _GetWalletPW() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(null, function (res) {
        resolve(res["walletpw"]);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}
/**
 * Compare given password with the wallet's password
 * @async
 * @function _CheckPw
 * @param  {string} pw - wallet password to be validated
 * @returns {boolean} true if pw matchs, false for mismatch
 */
async function _CheckPw(pw) {
  const inputPw = await _sha256(pw);
  const correctPw = await _GetWalletPW();
  if (inputPw == correctPw) return true;
  else return false;
}
/**
 * Get current time. Used for transaction history
 * @function _GetTime
 * @returns {string} current time composed of year, month, date, hour, minute
 */
function _GetTime() {
  var today = new Date();
  var date =
    today.getFullYear() +
    "" +
    (today.getMonth() + 1) +
    "" +
    today.getDate() +
    "" +
    today.getHours() +
    "" +
    today.getMinutes();
  return date;
}
/**
 * Get current time (to seconds) Used for account's default name
 * @function _GetTimeSec
 * @returns {string} current time composed of year, month, date, hour, minute, second
 */
function _GetTimeSec() {
  var today = new Date();
  var date =
    today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
  var time =
    today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  var dateTime = date + " " + time;
  return dateTime;
}
/**
 * Save current wallet to web3js storage
 * @function _SaveWalletWeb3js
 */
function _SaveWalletWeb3js() {
  chrome.storage.sync.get(null, function (obj) {
    pw = obj["walletpw"];
    web3.eth.accounts.wallet.load(pw); // [CAUTION] SHOULD BE LOADED RIGHT BEFORE SAVING
    web3.eth.accounts.wallet.save(pw);
    web3.eth.accounts.wallet.load(pw);
  });
}
/**
 * Get wallet object with wallet password
 * @async
 * @function _GetWalletObj
 * @param  {string} isCorrect - "correct" for right pw, "checkneeded" to be hashed with sha256
 * @param  {string} pw - wallet password
 * @returns {obj} wallet object
 */
async function _GetWalletObj(isCorrect, pw) {
  if (isCorrect != "correct") {
    pw = await _sha256(pw);
  }
  const walletobj = web3.eth.accounts.wallet.load(pw);
  return walletobj;
}
/**
 * Make transaction record for transaction buffer
 * @function _TxBufferStruct
 * @param  {string} txType - send or token creation
 * @param  {string} currencyType - ether or token
 * @param  {string} txHash - transaction hash
 * @param  {string} from - sender or token creator's account address
 * @param  {string} to - receiver's account address
 * @param  {number} amount - amount of ether/token sent or total supply of token created
 * @param  {string} time - time when transaction is made
 * @returns {object} transaction record which is to be put in TxBuffer in extension storage
 */
function _TxBufferStruct(txType, currencyType, txHash, from, to, amount, time) {
  let txRecord = {
    txStatus: -1, // -1 Pending   0 Rejected    1 Accepted
    txType: txType,
    currencyType: currencyType,
    txHash: txHash,
    from: from,
    to: to,
    amount: amount,
    time: time,
  };
  return txRecord;
}
/**
 * Put transaction record created in _TxBufferStruct() to TxBuffer in extension storage
 * @function _TxBufferPush
 * @param  {object} txbufferstruct - transaction record
 */
function _TxBufferPush(txbufferstruct) {
  chrome.storage.sync.get(null, function (obj) {
    obj["txbuf"].push(txbufferstruct);
    chrome.storage.sync.set(obj, function () {
      console.log("Saved");
      console.log(obj);
    });
  });
}
/**
 * Check if address is valid. If so, complete its form starting with '0x'
 * @function _ValidateAdd
 * @param  {string} address - account / transaction address
 * @returns {string} correct address (with form of '0x~') or "fail" for invalid address
 */
function _ValidateAdd(address) {
  if (address.length == 42) {
    if (address[0] == "0" && address[1] == "x") {
      if (_isAlnum(address)) {
        return address;
      }
    }
  }
  if (address.length == 40) {
    if (address[0] != "0" && address[1] != "x") {
      if (_isAlnum(address)) {
        return "0x" + address;
      }
    }
  }
  return "fail";
}
/**
 * Check if private key is valid. If so, complete its form starting with '0x'
 * @function _ValidatePk
 * @param  {string} pk - private key
 * @returns {string} correct pk (with form of '0x~') or "fail" for invalid pk
 */
function _ValidatePk(pk) {
  console.log(pk.length);
  if (pk.length == 66) {
    if (pk[0] == "0" && pk[1] == "x") {
      if (_isAlnum(pk)) {
        return pk;
      }
    }
  }
  if (pk.length == 64) {
    if (pk[0] != "0" && pk[1] != "x") {
      console.log("camehere");
      if (_isAlnum(pk)) {
        return "0x" + pk;
      }
    }
  }
  return "fail";
}
/**
 * Check if given string is composed of alphabets and numbers
 * @function _isAlnum
 * @param  {string} str - string that should be checked
 * @returns {boolean} true for alphanumeric, false for not.
 */
function _isAlnum(str) {
  var code, i, len;

  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
    if (
      !(code > 47 && code < 58) && // numeric (0-9)
      !(code > 64 && code < 91) && // upper alpha (A-Z)
      !(code > 96 && code < 123)
    ) {
      return false;
    }
  }
  return true;
}
/**
 * Get average gas price from web3js
 * @async
 * @function _GetAvgGasPrice
 * @returns {number} average gas price of recent blocks
 */
async function _GetAvgGasPrice() {
  let gasprice = await web3.eth.getGasPrice();
  return gasprice;
}
// /**
//  * TODO:
//  * Get token address of given from current account by exploring extension storage
//  * @async
//  * @function _GetTokenAddress
//  * @param  {string} currencyAddress - token contract address
//  */
// async function _GetTokenAddress(currencyAddress) {
//   const curr = await _GetCurr();
//   const tokList = curr["balance"];
//   let tokAddress = "";
//   for (let eachTokList of tokList) {
//     if (eachTokList[3] == currency) {
//       tokAddress = eachTokList[3];
//       break;
//     }
//   }
//   return tokAddress;
// }
/**
 * Display loading image
 * @function Loading
 */
function Loading() {
  let loadingImg = "<img id='loadingImg' src='../loading.svg'/>";
  $("#main_body").append(loadingImg);
}
/**
 * Remove loading image
 * @function UnLoading
 */
function UnLoading() {
  $("#loadingImg").remove();
}
/**
 * sha256 for hashing password
 * @async
 * @function _sha256
 * @param  {string} message - string that should be hashed
 * @returns {string} hashed result
 */
async function _sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}
/**
 * Get index of given address.
 * @function _GetIdx
 * @param  {list} accList - list of account objects from extension storage.
 * @param  {string} address - account address to match from accList.
 */
function _GetIdx(accList, address) {
  let res;
  for (let i = 0; i < accList.length; i++) {
    if (accList[i]["address"] == address) {
      res = i;
      break;
    }
  }
  return res;
}
