
var after = require('after');
var express = require('../')
  , request = require('supertest')
  , assert = require('assert');
var onFinished = require('on-finished');
var path = require('path');
var should = require('should');
var fixtures = path.join(__dirname, 'fixtures');
var utils = require('./support/utils');

describe('res', function(){
  describe('.sendFile(path)', function () {
    it('should error missing path', function (done) {
      var app = createApp();

      request(app)
      .get('/')
      .expect(500, /path.*required/, done);
    });

    it('should transfer a file', function (done) {
      var app = createApp(path.resolve(fixtures, 'name.txt'));

      request(app)
      .get('/')
      .expect('X-Accel-Redirect', path.resolve(fixtures, 'name.txt'))
      .expect(200, '', done)
    });

    it('should transfer a file with special characters in string', function (done) {
      var app = createApp(path.resolve(fixtures, '% of dogs.txt'));

      request(app)
      .get('/')
      .expect('X-Accel-Redirect', path.resolve(fixtures, '% of dogs.txt'))
      .expect(200, '', done)
    });

    it('should not override manual content-types', function (done) {
      var app = express();

      app.use(function (req, res) {
        res.contentType('application/x-bogus');
        res.sendFile(path.resolve(fixtures, 'name.txt'));
      });

      request(app)
      .get('/')
      .expect('Content-Type', 'application/x-bogus')
      .end(done);
    })

    describe('with "headers" option', function () {
      it('should accept headers option', function (done) {
        var headers = {
          'x-success': 'sent',
          'x-other': 'done'
        };
        var app = createApp(path.resolve(__dirname, 'fixtures/name.txt'), { headers: headers });

        request(app)
        .get('/')
        .expect('x-success', 'sent')
        .expect('x-other', 'done')
        .expect(200, done);
      });
    });
  })

  describe('.sendFile(path, fn)', function () {
    it('should invoke the callback when complete', function (done) {
      var cb = after(2, done);
      var app = createApp(path.resolve(fixtures, 'name.txt'), cb);

      request(app)
      .get('/')
      .expect(200, cb);
    })

    it('should invoke the callback without error when HEAD', function (done) {
      var app = express();
      var cb = after(2, done);

      app.use(function (req, res) {
        res.sendFile(path.resolve(fixtures, 'name.txt'), cb);
      });

      request(app)
      .head('/')
      .expect(200, cb);
    });
  })
})

function createApp(path, options, fn) {
  var app = express();

  app.use(function (req, res) {
    res.sendFile(path, options, fn);
  });

  return app;
}
