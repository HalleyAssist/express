/*!
 * serve-static
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014-2016 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var parseUrl = require('parseurl')
var resolve = require('path').resolve
var fs = require('fs')

/**
 * Module exports.
 * @public
 */

module.exports = serveStatic

/**
 * @param {string} root
 * @param {object} [options]
 * @return {function}
 * @public
 */

function serveStatic (root, urlRoot, opts) {
  if (!root) {
    throw new TypeError('root path required')
  }

  if (typeof root !== 'string') {
    throw new TypeError('root path must be a string')
  }

  if(!opts) opts = {}

  // fall-though
  var fallthrough = opts.fallthrough !== false

  // headers listener
  var setHeaders = opts.setHeaders

  if (setHeaders && typeof setHeaders !== 'function') {
    throw new TypeError('option setHeaders must be function')
  }

  // setup options for send
  root = resolve(root)

  return function serveStatic (req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (fallthrough) {
        return next()
      }

      // method not allowed
      res.statusCode = 405
      res.setHeader('Allow', 'GET, HEAD')
      res.setHeader('Content-Length', '0')
      res.end()
      return
    }

    var originalUrl = parseUrl.original(req)
    var path = parseUrl(req).pathname

    // make sure redirect occurs at mount
    if (path === '/' && originalUrl.pathname.substr(-1) !== '/') {
      path = ''
    }

    var filePath = root + "/" + path

    if(!fs.existsSync(filePath)){
      next()
      return
    }

    var urlPath = urlRoot + "/" + path

    res.sendFile(urlPath);
  }
}
