/**
 * Created by Roman Mandryk on 19/04/2016.
 */

/**
 * Client connecting to Xero Api - https://github.com/node-vision/xero-client
 */

var OAuth = require("oauth");
var EasyXml = require('easyxml');
var inflect = require('inflect');

var REQUEST_URL = 'https://api.xero.com/oauth/RequestToken';
var ACCESS_URL = 'https://api.xero.com/oauth/AccessToken';
var API_BASE_URL = 'https://api.xero.com/api.xro/2.0/';
var ORGANIZATION_URL = API_BASE_URL + 'Organisation';
var INVOICES_URL = API_BASE_URL + 'Invoices';
var INVOICES_POST_URL = INVOICES_URL + '?SummarizeErrors=false';
var CONTACTS_URL = API_BASE_URL + 'Contacts';
var AUTHORIZE_URL = 'https://api.xero.com/oauth/Authorize?oauth_token=';

var config = {};

// Xero API defaults to application/xml content-type
var customHeaders = {
  "Accept": "application/json",
  "Connection": "close"
};

var oauth = {};

exports.setConfig = function(cfg){
  config = cfg;
  oauth = new OAuth.OAuth(
    REQUEST_URL,
    ACCESS_URL,
    config.xeroConsumerKey,
    config.xeroConsumerSecret,
    '1.0A',
    null,
    'HMAC-SHA1',
    null,
    customHeaders
  );
  // This is important - Xero will redirect to this URL after successful authentication
  // and provide the request token as query parameters
  oauth._authorize_callback = config.xeroCallbackUrl;
};

/**
 * Initiate the request to Xero to get an oAuth Request Token.
 * With the token, we can send the user to Xero's authorize page
 * @param req
 * @param res
 */
exports.requestXeroRequestToken = function (req, res) {

  oauth.getOAuthRequestToken(function (error, oauth_token, oauth_token_secret, results) {

    if (error) {
      console.log(error);
      return res.status(500).send('failed');
    }

    // store the token in the session
    req.session.xeroAuth = {
      token: oauth_token,
      token_secret: oauth_token_secret
    };

    // redirect the user to Xero's authorize url page
    return res.redirect(AUTHORIZE_URL + oauth_token);
  });
};


/**
 * Perform the callback leg of the three-legged oAuth.
 * Given the auth_token and auth_verifier from xero, request the AccessToken
 * @param req
 * @param res
 */
exports.requestXeroAccessToken = function (req, res) {
  var oAuthData = req.session.xeroAuth;
  if (!oAuthData) {
    return res.status(500).send('failed');
  }
  oAuthData.verifier = req.query.oauth_verifier;


  oauth.getOAuthAccessToken(
    oAuthData.token,
    oAuthData.token_secret,
    oAuthData.verifier,
    function (error, oauth_access_token, oauth_access_token_secret, results) {

      if (error) {
        console.error(error);
        return res.status(403).send("Authentication Failure!");
      }

      req.session.xeroAuth = {
        token: oAuthData.token,
        token_secret: oAuthData.token_secret,
        verifier: oAuthData.verifier,
        access_token: oauth_access_token,
        access_token_secret: oauth_access_token_secret,
        //expires in 30 mins
        access_token_expiry: new Date(new Date().getTime() + 30 * 60 * 1000)
      };
      return res.send('Successfully authorized, closing...<script>window.close();</script>');
    }
  );
};

/**
 * Returns status of xero authentication token and latest sync results * 
 * @param req
 * @param callback
 */
exports.syncStatus = function(req, callback){
  var isAuthenticated = (req.session.xeroAuth
  && req.session.xeroAuth.access_token_expiry
  && new Date(req.session.xeroAuth.access_token_expiry).getTime() >= new Date().getTime());
  var json = {isAuthenticated: isAuthenticated};
  if (isAuthenticated){
    json.contactsSynced = req.session.xeroAuth.contactsSynced;
    json.invoicesSynced = req.session.xeroAuth.invoicesSynced;    
    json.lastSyncTime = req.session.xeroAuth.lastSyncTime;
    json.accessTokenExpiry = req.session.xeroAuth.access_token_expiry;
  }
  callback(json);
};



/**
 * get Organization info
 * @param req
 * @param callback
 */
exports.getOrganizationInfo = function (req, callback) {
  oauth.get(ORGANIZATION_URL,
    req.session.xeroAuth.access_token,
    req.session.xeroAuth.access_token_secret,
    function (e, data, response) {
      if (e) {
        console.error(e);
        return;
      }
      var res = JSON.parse(data);
      callback(res);
    });
};


/**
 * synchronizes all contacts (in Xero format) from local app to XERO
 * @param contacts - list of contacts in Xero format
 * @param req
 * @param callback
 */
exports.syncContacts = function (contacts, req, callback) {
  makePostRequest(req, CONTACTS_URL, 'Contacts', contacts, function (err, contacts) {
    if (err) {
      return callback(err);
    }
    //update number of updated contacts for client
    req.session.xeroAuth.contactsSynced = contacts.length;
    callback(null, contacts);
  });

};

/**
 * get all my invoices
 synchronizes all contacts (in Xero format) from local app to XERO
 * @param invoices
 * @param req
 * @param callback
 */
exports.syncInvoices = function (invoices, req, callback) {
  makePostRequest(req, INVOICES_POST_URL, 'Invoices', invoices, function (err, xeroInvoices) {
    if (err) {
      return callback(err);
    }
    //update number of updated invoices for client
    req.session.xeroAuth.invoicesSynced = invoices.length;

    callback(null, xeroInvoices);
  });
};

function makeGetRequest(req, root, url, callback) {
  oauth.get(url,
    req.session.xeroAuth.access_token,
    req.session.xeroAuth.access_token_secret,
    function (e, data, response) {
      if (e) {
        return callback(e);
      }
      var res = JSON.parse(data);
      callback(null, res[root]);
    });
}

function makePutRequest(req, url, xmlRoot, data, callback) {
  makePostOrPutRequest(req, url, xmlRoot, data, callback, true);
}

function makePostRequest(req, url, xmlRoot, data, callback) {
  makePostOrPutRequest(req, url, xmlRoot, data, callback, false);
}

function makePostOrPutRequest(req, url, xmlRoot, data, callback, usePUT) {
  //var root = path.match(/([^\/\?]+)/)[1];
  if (!data || !data.length) {
    return callback(null, []);
  }
  if (!req.session.xeroAuth){
    req.session.xeroAuth = {};
  }
  var root = xmlRoot;
  var post_body = new EasyXml({rootElement: inflect.singularize(root), rootArray: root, manifest: true}).render(data);
  //console.log(post_body);
  var content_type = 'application/xml';
  oauth._putOrPost(usePUT ? 'PUT' : 'POST',
    url,
    req.session.xeroAuth.access_token,
    req.session.xeroAuth.access_token_secret,
    //we can get json but have to post Xml! - https://community.xero.com/developer/discussion/2900620/
    post_body,
    content_type,
    function (e, data, response) {
      if (e) {
        console.error(e);
        return callback(e);
      }
      var res = JSON.parse(data);
      callback(null, res[xmlRoot]);
    });
}

