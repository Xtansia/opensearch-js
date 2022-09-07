/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

'use strict';
const Connection = require('../Connection');
const Transport = require('../Transport');
const aws4 = require('aws4');
const AwsSigv4SignerError = require('./errors');

function AwsSigv4Signer(opts) {
  const credentialsState = {
    credentials: null,
  };
  if (opts && (!opts.region || opts.region === null || opts.region === '')) {
    throw new AwsSigv4SignerError('Region cannot be empty');
  }
  if (opts && typeof opts.getCredentials !== 'function') {
    throw new AwsSigv4SignerError('getCredentials function is required');
  }

  function buildSignedRequestObject(request = {}) {
    request.service = 'es';
    request.region = opts.region;
    request.headers = request.headers || {};
    request.headers['host'] = request.hostname;
    return aws4.sign(request, credentialsState.credentials);
  }

  class AwsSigv4SignerConnection extends Connection {
    buildRequestObject(params) {
      const request = super.buildRequestObject(params);
      return buildSignedRequestObject(request);
    }
  }

  class AwsSigv4SignerTransport extends Transport {
    request(params, options = {}, callback = undefined) {
      // options is optional so if options is a function, it's the callback.
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      const currentCredentials = credentialsState.credentials;
      let expired = false;
      if (!currentCredentials) {
        // Credentials haven't been acquired yet.
        expired = true;
      }
      // AWS SDK V2, needsRefresh should be available.
      else if (typeof currentCredentials.needsRefresh === 'function') {
        expired = currentCredentials.needsRefresh();
      }
      // AWS SDK V2, alternative to needsRefresh.
      else if (currentCredentials.expired === true) {
        expired = true;
      }
      // AWS SDK V2, alternative to needsRefresh and expired.
      else if (currentCredentials.expireTime && currentCredentials.expireTime < new Date()) {
        expired = true;
      }
      // AWS SDK V3, Credentials.expiration is a Date object
      else if (currentCredentials.expiration && currentCredentials.expiration < new Date()) {
        expired = true;
      }

      if (!expired) {
        if (typeof callback === 'undefined') {
          return super.request(params, options);
        }
        super.request(params, options, callback);
        return;
      }

      // In AWS SDK V2 Credentials.refreshPromise should be available.
      if (currentCredentials && typeof currentCredentials.refreshPromise === 'function') {
        if (typeof callback === 'undefined') {
          return currentCredentials.refreshPromise().then(() => {
            return super.request(params, options);
          });
        } else {
          currentCredentials
            .refreshPromise()
            .then(() => {
              super.request(params, options, callback);
            })
            .catch(callback);
          return;
        }
      }

      // For AWS SDK V3 or when the client has not acquired credentials yet.
      if (typeof callback === 'undefined') {
        return opts.getCredentials().then((credentials) => {
          credentialsState.credentials = credentials;
          return super.request(params, options);
        });
      } else {
        opts
          .getCredentials()
          .then((credentials) => {
            credentialsState.credentials = credentials;
            super.request(params, options, callback);
          })
          .catch(callback);
      }
    }
  }

  return {
    Transport: AwsSigv4SignerTransport,
    Connection: AwsSigv4SignerConnection,
    buildSignedRequestObject,
  };
}
module.exports = AwsSigv4Signer;