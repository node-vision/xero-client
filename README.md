# xero-client
Node.JS integration client for Xero accounting software. Allows integrating [Public apps](http://developer.xero.com/documentation/getting-started/api-application-types/)

Features:

- full xero authentication flow
- get organization info
- one way synchronization of contacts
- one way synchronization of invoices


# Usage

## 1) Initialize client 

- Xero key, secret and callback url are mandatory
- session object is optional (pass reference to express session if you already have it defined in the app)

```
var session = require('express-session');
var xeroClient = require('xero-client')({
    session: session,
    xeroConsumerKey: 'key',        //if omitted, env variable XERO_CONSUMER_KEY will be used
    xeroConsumerSecret: 'secret',  //if omitted, env variable XERO_CONSUMER_SECRET will be used
    xeroCallbackUrl: 'http://...'  //if omitted, env variable XERO_CALLBACK_URL will be used
});
```
`... initialize session`

## 2) Set routes

You will need 2 routes:
- authentication entry point
- callback when client is successfully authorized

Example:
```
var express = require('express');
var router = express.Router();
router  
  .get('/authenticate', xeroClient.authenticate)
  .get('/callback', xeroClient.callback);  
```

## 3) Use client -
```
xeroClient.syncContacts(contacts, req, function(err, xeroContacts){
    if (err){
        //handle errors
    }
    //do something with xeroContacts
}
```

