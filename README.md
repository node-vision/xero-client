# xero-client
Node.JS integration client for Xero accounting software. Allows integrating [Public apps](http://developer.xero.com/documentation/getting-started/api-application-types/)

# Features:

- full xero authentication flow
- send and receive all entities to (from) Xero
- automatically saves auth data to req.session.xeroAuth for token and secret reuse ( can be worked around if you don't want to use session)


# Usage

## 1) Install with npm into your project
`npm install xero-client --save`
 
## 2) Initialize client 

- All params are mandatory

```
var xeroClient = require('xero-client')({   
    xeroConsumerKey: 'key',        //if omitted, env variable XERO_CONSUMER_KEY will be used
    xeroConsumerSecret: 'secret',  //if omitted, env variable XERO_CONSUMER_SECRET will be used
    xeroCallbackUrl: 'http://...'  //if omitted, env variable XERO_CALLBACK_URL will be used
});
```
`... initialize session`

## 3) Set routes

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

## 4) Use client:
```
//contacts and invoices have a thin wrapper around raw requests
xeroClient.syncContacts(contacts, req, function(err, xeroContacts){
    if (err){
        //handle errors
    }
    //do something with xeroContacts
}
//any other entity can be sent or received with raw request:
xeroClient._putRequest(req, 'https://api.xero.com/api.xro/2.0/Payments', 'Payments', payments, function(err, xeroPayments){
    if (err){
        //handle errors
    }
    //do something with xeroPayments
}
//xeroClient._getRequest(req, url, root, callback)
//xeroClient._postRequest(req, url, xmlRoot, data, callback)

```

### To see complete app built with node.js and react using xero-client see [node-react-xero-app on github](https://github.com/node-vision/node-react-xero-app) and read post [How to integrate node.js/react app with Xero](https://nodevision.com.au/blog/post/how-to-integrate-nodejsreact-app-with-xero) 