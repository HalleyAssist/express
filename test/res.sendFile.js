
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

    it('should not error if the client aborts', function (done) {
      var cb = after(1, done);
      var app = express();

      app.use(function (req, res) {
        setImmediate(function () {
          res.sendFile(path.resolve(fixtures, 'name.txt'));
          server.close(cb)
        });
        test.abort();
      });

      app.use(function (err, req, res, next) {
        err.code.should.be.empty()
        cb();
      });

      var server = app.listen()
      var test = request(server).get('/')
      test.expect(200, cb);
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

    it('should invoke the callback when client aborts', function (done) {
      var cb = after(1, done);
      var app = express();

      app.use(function (req, res) {
        setImmediate(function () {
          res.sendFile(path.resolve(fixtures, 'name.txt'), function (err) {
            should(err).be.ok()
            err.code.should.equal('ECONNABORTED');
            server.close(cb)
          });
        });
        test.abort();
      });

      var server = app.listen()
      var test = request(server).get('/')
      test.expect(200, cb);
    })

    it('should invoke the callback when client already aborted', function (done) {
      var cb = after(1, done);
      var app = express();

      app.use(function (req, res) {
        onFinished(res, function () {
          res.sendFile(path.resolve(fixtures, 'name.txt'), function (err) {
            should(err).be.ok()
            err.code.should.equal('ECONNABORTED');
            server.close(cb)
          });
        });
        test.abort();
      });

      var server = app.listen()
      var test = request(server).get('/')
      test.expect(200, cb);
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

  describe('.sendFile(path, options)', function () {
    it('should pass options to send module', function (done) {
      request(createApp(path.resolve(fixtures, 'name.txt'), { start: 0, end: 1 }))
      .get('/')
      .expect(200, 'to', done)
    })
  })

  describe('.sendfile(path, fn)', function(){
    it('should invoke the callback when complete', function(done){
      var app = express();
      var cb = after(2, done);

      app.use(function(req, res){
        res.sendfile('test/fixtures/user.html', cb)
      });

      request(app)
      .get('/')
      .expect(200, cb);
    })

    it('should invoke the callback when client aborts', function (done) {
      var cb = after(1, done);
      var app = express();

      app.use(function (req, res) {
        setImmediate(function () {
          res.sendfile('test/fixtures/name.txt', function (err) {
            should(err).be.ok()
            err.code.should.equal('ECONNABORTED');
            server.close(cb)
          });
        });
        test.abort();
      });

      var server = app.listen()
      var test = request(server).get('/')
      test.expect(200, cb);
    })

    it('should invoke the callback when client already aborted', function (done) {
      var cb = after(1, done);
      var app = express();

      app.use(function (req, res) {
        onFinished(res, function () {
          res.sendfile('test/fixtures/name.txt', function (err) {
            should(err).be.ok()
            err.code.should.equal('ECONNABORTED');
            server.close(cb)
          });
        });
        test.abort();
      });

      var server = app.listen()
      var test = request(server).get('/')
      test.expect(200, cb);
    })

    it('should invoke the callback without error when HEAD', function (done) {
      var app = express();
      var cb = after(2, done);

      app.use(function (req, res) {
        res.sendfile('test/fixtures/name.txt', cb);
      });

      request(app)
      .head('/')
      .expect(200, cb);
    });



    it('should not override manual content-types', function(done){
      var app = express();

      app.use(function(req, res){
        res.contentType('txt');
        res.sendfile('test/fixtures/user.html');
      });

      request(app)
      .get('/')
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .end(done);
    })

    it('should invoke the callback on 403', function(done){
      var app = express()

      app.use(function(req, res){
        res.sendfile('test/fixtures/foo/../user.html', function(err){
          assert(!res.headersSent);
          res.send(err.message);
        });
      });

      request(app)
      .get('/')
      .expect('Forbidden')
      .expect(200, done);
    })

    it('should invoke the callback on socket error', function(done){
      var app = express()

      app.use(function(req, res){
        res.sendfile('test/fixtures/user.html', function(err){
          assert(!res.headersSent);
          req.socket.listeners('error').should.have.length(1); // node's original handler
          done();
        });

        req.socket.emit('error', new Error('broken!'));
      });

      request(app)
      .get('/')
      .end(function(){});
    })
  })

  describe('.sendfile(path)', function(){
    it('should accept headers option', function(done){
      var app = express();
      var headers = {
        'x-success': 'sent',
        'x-other': 'done'
      };

      app.use(function(req, res){
        res.sendfile('test/fixtures/user.html', { headers: headers });
      });

      request(app)
      .get('/')
      .expect('x-success', 'sent')
      .expect('x-other', 'done')
      .expect(200, done);
    })

    it('should transfer a file', function (done) {
      var app = express();

      app.use(function (req, res) {
        res.sendfile('test/fixtures/name.txt');
      });

      request(app)
      .get('/')
      .expect(200, 'tobi', done);
    });

    it('should transfer a directory index file', function (done) {
      var app = express();

      app.use(function (req, res) {
        res.sendfile('test/fixtures/blog/');
      });

      request(app)
      .get('/')
      .expect(200, '<b>index</b>', done);
    });

    it('should transfer a file with urlencoded name', function (done) {
      var app = express();

      app.use(function (req, res) {
        res.sendfile('test/fixtures/%25%20of%20dogs.txt');
      });

      request(app)
      .get('/')
      .expect(200, '20%', done);
    });

    it('should not error if the client aborts', function (done) {
      var cb = after(1, done);
      var app = express();

      app.use(function (req, res) {
        setImmediate(function () {
          res.sendfile(path.resolve(fixtures, 'name.txt'));
          server.close(cb)
        });
        test.abort();
      });

      app.use(function (err, req, res, next) {
        err.code.should.be.empty()
        cb();
      });

      var server = app.listen()
      var test = request(server).get('/')
      test.expect(200, cb);
    })

    describe('with an absolute path', function(){
      it('should transfer the file', function(done){
        var app = express();

        app.use(function(req, res){
          res.sendfile(path.join(__dirname, '/fixtures/user.html'))
        });

        request(app)
        .get('/')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(200, '<p>{{user.name}}</p>', done);
      })
    })

    describe('with a relative path', function(){
      it('should transfer the file', function(done){
        var app = express();

        app.use(function(req, res){
          res.sendfile('test/fixtures/user.html');
        });

        request(app)
        .get('/')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(200, '<p>{{user.name}}</p>', done);
      })

      it('should serve relative to "root"', function(done){
        var app = express();

        app.use(function(req, res){
          res.sendfile('user.html', { root: 'test/fixtures/' });
        });

        request(app)
        .get('/')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(200, '<p>{{user.name}}</p>', done);
      })

      it('should consider ../ malicious when "root" is not set', function(done){
        var app = express();

        app.use(function(req, res){
          res.sendfile('test/fixtures/foo/../user.html');
        });

        request(app)
        .get('/')
        .expect(403, done);
      })

      it('should allow ../ when "root" is set', function(done){
        var app = express();

        app.use(function(req, res){
          res.sendfile('foo/../user.html', { root: 'test/fixtures' });
        });

        request(app)
        .get('/')
        .expect(200, done);
      })

      it('should disallow requesting out of "root"', function(done){
        var app = express();

        app.use(function(req, res){
          res.sendfile('foo/../../user.html', { root: 'test/fixtures' });
        });

        request(app)
        .get('/')
        .expect(403, done);
      })

      describe('with non-GET', function(){
        it('should still serve', function(done){
          var app = express()

          app.use(function(req, res){
            res.sendfile(path.join(__dirname, '/fixtures/name.txt'))
          });

          request(app)
          .get('/')
          .expect('tobi', done);
        })
      })
    })
  })
})

describe('.sendfile(path, options)', function () {
  it('should pass options to send module', function (done) {
    var app = express()

    app.use(function (req, res) {
      res.sendfile(path.resolve(fixtures, 'name.txt'), { start: 0, end: 1 })
    })

    request(app)
      .get('/')
      .expect(200, 'to', done)
  })
})

function createApp(path, options, fn) {
  var app = express();

  app.use(function (req, res) {
    res.sendFile(path, options, fn);
  });

  return app;
}
