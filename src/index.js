/**
 * Copyrights (C) 2018 JimmyCode <https://jimmycode.com>
 */

'use strict';

const simpleOAuth2 = require('simple-oauth2');

// Required options.
const requiredArgs = [
  {
    name: 'clientId',
    type: 'string'
  },
  {
    name: 'clientSecret',
    type: 'string'
  },
  {
    name: 'callbackURL',
    type: 'string'
  }
];

module.exports = {
 /**
  * Plugin definition.
  * @param {*} config OAuth configuration.
  */
  create: (config) => {
    // Options can be static or dynamic.
    let args = typeof config === 'function' ? config() : config;

    // Set default values.
    args = Object.assign(
      {},
      {
        scope: 'profile email',
        state: '',
        returnError: false
      },
      args
    );
  
    // Validates all required options.
    requiredArgs.forEach((arg) => {
      if (!args[arg.name]) {
        throw new Error(`'SimpleOAuth2GooglePlus requires a [${arg.name}]'`);
      }
      // eslint-disable-next-line valid-typeof
      else if (typeof args[arg.name] !== arg.type) {
        // eslint-disable-next-line max-len
        throw new Error(`SimpleOAuth2GooglePlus expects [${arg.name}] to be a [${arg.type}] but it was a [${typeof args[arg.name]}]'`);
      }
    });
  
    // https://developers.facebook.com/docs/facebook-login/permissions/
    if (args.scope && (typeof args.scope !== 'string' && !Array.isArray(args.scope))) {
      // eslint-disable-next-line max-len
      throw new Error(`SimpleOAuth2GooglePlus expects [scope] to be a [array or string] but it was a [${typeof args.scope}]`);
    }
  
    // Creates a new simple-oauth2 client with the provided configuration.
    // @see: https://github.com/lelylan/simple-oauth2/blob/master/index.js#L12
    const oauth2 = simpleOAuth2.create({
      client: {
        id: args.clientId,
        secret: args.clientSecret
      },
      auth: {
        authorizeHost: args.authorizeHost || 'https://accounts.google.com',
        authorizePath: args.authorizePath || '/o/oauth2/v2/auth',
        tokenHost: args.tokenHost || 'https://www.googleapis.com',
        tokenPath: args.tokenPath || '/oauth2/v4/token'
      }
    });
  
    // Handler/Middleware to request authorization.
    const authorize = (req, res) => {
      const options = Object.assign(
        {},
        args.authorizeOptions || {},
        {
          redirect_uri: args.callbackURL,
          scope: args.scope,
          state: args.state
        }
      );
  
      const authorizationUri = oauth2.authorizationCode.authorizeURL(options);
  
      return res.redirect(authorizationUri);
    };
  
    // Middleware to request access_token.
    const accessToken = (req, res, next) => {
      const code = req.query.code;
      
      if (!code) {
        const error = new Error('SimpleOAuth2GooglePlus expects [code] param in the request');

        if (args.returnError) {
          req.tokenError = error;
        }

        return next(args.returnError ? null : error);
      }
  
      // Exchange code for access_token.
      const options = Object.assign(
        {},
        args.tokenOptions || {},
        {
          code,
          state: args.state,
          client_id: args.clientId,
          client_secret: args.clientSecret,
          redirect_uri: args.callbackURL,
          grant_type: 'authorization_code'
        }
      );
  
      return oauth2.authorizationCode
        .getToken(options)
        .then((result) => {
          req.token = oauth2.accessToken.create(result);
          next();
        })
        .catch((e) => {
          if (args.returnError) {
            req.tokenError = e;
          }
  
          next(args.returnError ? null : e);
        });
    };
  
    return {
      oauth2,
      authorize,
      accessToken
    };
  }
};
