

var xeroClient = require('./xeroClient');

module.exports = function(){
  var res = {};
  res.syncContacts = xeroClient.syncContacts;
  res.syncInvoices = xeroClient.syncInvoices;
  res.getOrganizationInfo = xeroClient.getOrganizationInfo;
  res.syncStatus = xeroClient.syncStatus;
  res.authenticate = xeroClient.requestXeroRequestToken;
  res._getRequest = xeroClient._getRequest;
  res._postRequest = xeroClient._postRequest;
  res._putRequest = xeroClient._putRequest;

  return function(config){
    config = config || {};
    config.xeroConsumerKey = config.xeroConsumerKey || process.env.XERO_CONSUMER_KEY;
    config.xeroConsumerSecret = config.xeroConsumerSecret || process.env.XERO_CONSUMER_SECRET;
    config.xeroCallbackUrl = config.xeroCallbackUrl || process.env.XERO_CALLBACK_URL;
    xeroClient.setConfig(config);
    return res;
  };
  
}();


