var LambdaRuntime = require('../lib/main.js');
var assert = require('assert');
var sinon = require('sinon');


describe('LambdaRuntime', function() {
  it('has version', function() {
    assert.equal(new LambdaRuntime().version, '0.2.3');
  });

  describe('#constructor', function() {
    it('should not return null', function() {
      assert(new LambdaRuntime('test', 'test'));
    });
  });

  describe('#isValidLambda', function() {
    var router;
    var lambda;
    beforeEach(function() {
      router = new LambdaRuntime('aws_key', 'aws_secret');
      lambda = {};
    });


    it('should throw is lambda name is invalid', function() {
      lambda.FunctionName = 'a-production';
      assert.throws(router.isValidLambda(lambda, 'test', 'env', '0.1'));
    });

    it('should return false if version is not semver', function() {
      lambda.FunctionName = 'name-staging-a-b-c';
      assert.equal(router.isValidLambda(lambda, 'test', 'env', '0.1'), false);
    });

    it('should return true is function matches', function() {
      lambda.FunctionName = 'name-staging-0-2-10';
      assert(router.isValidLambda(lambda, 'name', 'staging', '0.2.*'));
    });
  });

  describe('#latestLambda', function() {
    var router;
    var lambdas;
    beforeEach(function() {
      router = new LambdaRuntime('aws_key', 'aws_secret');
      lambdas = [
        {
          'name': 'name-staging-0-0-3'
        },
        {
          'name': 'name-staging-0-1-1'
        }
      ];
    });

    it('should return the latest version of the lambda', function() {
      var latest = router.latestLambda(lambdas);
      assert.equal(latest.name, 'name-staging-0-1-1');
    });
  });

  describe('#findMatchingLambda', function() {
    var router;
    beforeEach(function() {
      router = new LambdaRuntime('aws_key', 'aws_secret');
    });

    it('should callback with error if AWS fails', function(done) {
      var stub = sinon.stub(router, 'buildLambda', function(region) {
        return {
          listFunctions: function(params, cb) {
            cb(new Error('AWS blew up'), null);
          }
        };
      });
      router.findMatchingLambda('a', 'b', 'c', 'd', function(err, result) {
        assert(err);
        done();
      });
    });

    it('should return an error if no lambda matches', function(done) {
      var stub = sinon.stub(router, 'buildLambda', function(region) {
        return {
          listFunctions: function(params, cb) {
            return cb(null, {
              Functions: [
                {
                  FunctionName: 'name-production-0-1-1'
                }
              ]
            });
          }
        };
      });
      router.findMatchingLambda('name', 'staging', '0.*.*', 'region', function(err, result) {
        assert.equal(result, null);
        done();
      });
    });

    it('should return the first match', function(done) {
      var stub = sinon.stub(router, 'buildLambda', function(region) {
        return {
          listFunctions: function(params, cb) {
            return cb(null, {
              Functions: [
                {
                  FunctionName: 'name-production-0-1-1'
                },
                {
                  FunctionName: 'name-staging-0-1-1'
                }
              ]
            });
          }
        };
      });
      router.findMatchingLambda('name', 'staging', '0.*.*', 'region', function(err, result) {
        assert.ifError(err);
        assert(result);
        done();
      });
    });
  });


  describe('#invokeFallback', function () {
    var router;
    beforeEach(function() {
      router = new LambdaRuntime('aws_key', 'aws_secret');
    });

    it('should return false if lambdas were null', function(done) {
      router.invokeFallback([null], null, function(err, result) {
        assert.ifError(err);
        assert.equal(result, false);
        done();
      });
    });

    it('should return false if lambdas were not called due to AWS', function(done) {
      var stub = sinon.stub(router, 'buildLambda', function(region) {
        return {
          invokeAsync: function(payload, cb) {
            cb(new Error('AWS blew up'));
          }
        };
      });
      router.invokeFallback([{name: 'test', region: 'home'}], null, function(err, result) {
        assert.ifError(err);
        assert.equal(result, false);
        done();
      });
    });

    it('should return the executed lambda', function(done) {
      var stub = sinon.stub(router, 'buildLambda', function(region) {
        return {
          invokeAsync: function(payload, cb) {
            cb(null, 'i got executed');
          }
        };
      });
      router.invokeFallback([{name: 'test', region: 'home'}], null, function(err, result) {
        assert.ifError(err);
        assert(result);
        done();
      });
    });
  });

  describe('#invokeAsync', function() {
    var router;
    beforeEach(function() {
      router = new LambdaRuntime('aws_key', 'aws_secret');
    });

    it('should return the lambda executed', function (done) {
      var stub = sinon.stub(router, 'buildLambda', function(region) {
        return {
          invokeAsync: function(payload, cb) {
            cb(null, payload.FunctionName);
          },
          listFunctions: function(params, cb) {
            return cb(null, {
              Functions: [
                {
                  FunctionName: 'name-production-0-1-1'
                },
                {
                  FunctionName: 'name-staging-0-1-1'
                }
              ]
            });
          }
        };
      });
      router.invokeAsync('name', 'staging', '0.1.*', ['us-west-2'], {},function (err, res) {
        assert.ifError(err);
        assert(res);
        assert.equal(res, 'name-staging-0-1-1');
        done();
      });
    });
  });
});
