/*!
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module dependencies.
 * @private
 */

var debug = require('debug')('express:router:layer');
const isPromise = require('is-promise')


/**
 * Module variables.
 * @private
 */

var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Module exports.
 * @public
 */

module.exports = Layer;

const RegexpFastStar = Symbol("fast_star")
const RegexpFastSlash = Symbol("fast_slash")
const RegexpFastRoot = Symbol("fast_root")

function Layer(path, options, fn) {
  if (!(this instanceof Layer)) {
    return new Layer(path, options, fn);
  }

  debug('new %o', path)
  var opts = options || {};

  this.handle = fn;
  this.name = fn.name || '<anonymous>';
  this.params = undefined;
  this.path = undefined;
  this._end = opts.end !== false;

  // set fast path flags
  if(path === '*'){
    this.regexp = RegexpFastStar
  } else if(path === '/' && opts.end === false){
    this.regexp = RegexpFastSlash
  } else if(path == '/') {
    this.regexp = RegexpFastRoot
  } else {
    this.regexp = path
  }
}

/**
 * Handle the error for the layer.
 *
 * @param {Error} error
 * @param {Request} req
 * @param {Response} res
 * @param {function} next
 * @api private
 */

Layer.prototype.handleError = function handle_error(error, req, res, next) {
  var fn = this.handle;

  if (fn.length !== 4) {
    // not a standard error handler
    return next(error);
  }

  try {// invoke function
    const ret = fn(error, req, res, next)

    // wait for returned promise
    if (isPromise(ret)) {
      ret.then(null, function (error) {
        next(error || new Error('Rejected promise'))
      })
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Handle the request for the layer.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {function} next
 * @api private
 */

Layer.prototype.handleRequest = function handle(req, res, next) {
  var fn = this.handle;

  if (fn.length > 3) {
    // not a standard request handler
    return next();
  }

  try {
    // invoke function
    const ret = fn(req, res, next)

    // wait for returned promise
    if (isPromise(ret)) {
      ret.then(null, function (error) {
        next(error || new Error('Rejected promise'))
      })
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Check if this route matches `path`, if so
 * populate `.params`.
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

Layer.prototype.match = function match(path) {
  if (path != null) {
    switch(this.regexp){
      // fast path non-ending match for / (any path matches)
      case RegexpFastSlash:
        this.params = {}
        this.path = ''
        return true

      case RegexpFastStar:
        this.params = {'0': decode_param(path)}
        this.path = path
        return true

      case RegexpFastRoot:
        if(path === '' || path === '/'){
          this.params = {}
          this.path = path
          return true
        }
        return false
    }
  }

  if(typeof this.regexp === 'string'){
    if(!this._end) {
      path = path.substring(0, this.regexp.length)
    }

    if(this.regexp === path) {    
      this.params = {}

      // this will end on a path separator, remove it
      if(!this._end) path = path.substring(0, path.length - 1)

      this.path = path
      return true
    }
    
    this.path = undefined
    return false
  }

  // match the path
  let match = this.regexp.exec(path)

  if (!match) {
    this.params = undefined;
    this.path = undefined;
    return false;
  }

  // store values
  this.params = {};
  this.path = match[0]

  var params = this.params;

  for(const key in match.groups) {
    var val = decode_param(match.groups[key])

    if (val !== undefined || !(hasOwnProperty.call(params, prop))) {
      params[key] = val;
    }
  }

  return true;
};

/**
 * Decode param value.
 *
 * @param {string} val
 * @return {string}
 * @private
 */

function decode_param(val) {
  if (typeof val !== 'string' || val.length === 0) {
    return val;
  }

  try {
    return decodeURIComponent(val);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = 'Failed to decode param \'' + val + '\'';
      err.status = err.statusCode = 400;
    }

    throw err;
  }
}
