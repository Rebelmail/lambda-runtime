var aws = require('aws-sdk');
var semver = require('semver');
var async = require('async');
var fallback = require('fallback');
var packageJson = require('./../package.json');

function LambdaRuntime(aws_key, aws_secret) {
  this.version = packageJson.version;

  // keep those credentials private
  this.buildLambda = function(region) {
    aws.config.update({
      accessKeyId: aws_key,
      secretAccessKey: aws_secret,
      region: region
    });
    return new aws.Lambda({apiVersion: '2014-11-11'});
  };
}

LambdaRuntime.prototype.isValidLambda = function(lambda, functionName, env, version) {
  var func = lambda.FunctionName.split('-');
  var funcVer = func.slice(-3).join('.');
  if (!semver.valid(funcVer)) {
    return false;
  }
  var funcEnv = func.slice(-4, -3)[0];
  var funcName = func.slice(0, -4).join('-');

  // version can be expressed using the formate found here https://github.com/npm/node-semver
  if (funcEnv === env && funcName === functionName && semver.satisfies(funcVer, version)) {
    return true;
  }
  return false;
};

LambdaRuntime.prototype.latestLambda = function(lambdas) {
  lambdas.sort(function(a, b) {
    var aVer = a.name.split('-').slice(-3).join('.');
    var bVer = b.name.split('-').slice(-3).join('.');
    return semver.rcompare(aVer, bVer);
  });
  return lambdas[0];
};

// callback ->
// err if call to aws failed
// lambdas -> null if no lambda was found
//         -> array of [{name:'lambda-name', region: 'lambda-region'}]
LambdaRuntime.prototype.findLatestLambda = function(functionName, env, version, region, cb) {
  var that = this;
  var lambda = that.buildLambda(region);

  lambda.listFunctions({}, function(err, data) {
    if (err) {
      return cb(err);
    }
    var lambdas = [];
    // Iterate through all FunctionNames and find a match for all args
    for (var i = 0; i < data.Functions.length; i++) {
      if (that.isValidLambda(data.Functions[i], functionName, env, version)) {
        lambdas.push({
          name: data.Functions[i].FunctionName,
          region: region
        });
      }
    }
    if (lambdas.length === 0) {
      return cb(null, null);
    }
    return cb(null, that.latestLambda(lambdas));
  });
};

// lambdas -> Array
//    lambda
//    - name -> Example: 'render-lambda-0-1-3-production'
//    - region -> Example 'us-east-1'
//  payload -> http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#invokeAsync-property
//  callback ->
//  - err
//  - result -> invoked Lambda result
//  - lambda -> executed Lambda object
LambdaRuntime.prototype.invokeFallback = function(lambdas, payload, callback) {
  var that = this;
  // Try to invoke at least one of the matches given the specified region
  fallback(lambdas, function(opts, cb) {
    if (opts === null) {
      return cb();
    }

    var lambda = that.buildLambda(opts.region);

    var lambdaPayload = {
      FunctionName: opts.name,
      InvokeArgs: payload
    };

    lambda.invokeAsync(lambdaPayload, function(err, data) {
      if (err) {
        return cb();
      }
      if (data.Status === 202) {
        return cb(null, data);
      }
      return cb();

    });
  }, function(err, result, lambda) {
    if (err) return callback(err);
    if (result === false) return callback(err, result);
    return callback(err, lambda);
  });
};

LambdaRuntime.prototype.invokeAsync = function(functionName, env, version, regions, payload, callback) {
  var that = this;
  // Iterate through all possible regions and find all functionNames
  async.map(regions, async.apply(that.findLatestLambda.bind(that), functionName, env, version), function(err, results) {
    if (err) {
      return callback(err);
    }
    that.invokeFallback(results, payload, function(err, result) {
      if (err) return callback(err);
      if (result === false) return callback(new Error('no lambda was able to execute'));
      return callback(null, result);
    });
  });
};

module.exports = LambdaRuntime;
