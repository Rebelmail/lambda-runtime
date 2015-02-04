var aws = require('aws-sdk');
var semver = require('semver');
var async = require('async');
var fallback = require('fallback');
function LambdaRouter(aws_key, aws_secret) {
  this.aws_key = aws_key;
  this.aws_secret = aws_secret;
}

LambdaRouter.prototype.invokeAsync = function(functionName, env, version, regions, payload, callback) {
  var that = this;

  // Iterate through all possible regions and find all functionNames
  async.map(regions, function(region, cb) {

    aws.config.update({
      accessKeyId: that.aws_key,
      secretAccessKey: that.aws_secret,
      region: region
    });
    var lambda = new aws.Lambda({apiVersion: '2014-11-11'});
    
    lambda.listFunctions({}, function(err, data) {
      if (err) {
        return cb(err);
      } 

      // Iterate through all FunctionNames and find a match for all args
      for (var i = 0; i < data.Functions.length; i++) {
        var func = data.Functions[i];
        func = func.FunctionName.split('-');
        var funcVer = func.slice(-3).join('.');
        if (!semver.valid(funcVer)) {
          continue;
        }
        var funcEnv = func.slice(-4, -3)[0];
        var funcName = func.slice(0, -4).join('-');
        
        // version can be expressed using the formate found here https://github.com/npm/node-semver
        if (funcEnv === env && funcName === functionName && semver.satisfies(funcVer, version)) {
          return cb(null, {
            region: region,
            name: data.Functions[i].FunctionName
          });
        }
      }
      return cb(null, null); // No matches found
    });
  }, function(err, results) {
    if (err) {
      return callback(err);
    }
    
    // Try to invoke at least one of the matches given the specified region
    fallback(results, function(opts, cb) {
      if (opts === null) { 
        return cb();
      } 
      
      aws.config.update({
        accessKeyId: that.aws_key,
        secretAccessKey: that.aws_secret,
        region: opts.region
      });  
  
      var lambda = new aws.Lambda({apiVersion: '2014-11-11'});
  
      var lambdaPayload = {
        FunctionName: opts.name,
        InvokeArgs: JSON.stringify(payload)
      };
      
      lambda.invokeAsync(lambdaPayload, function(err, data) {
        if (err) {
          return cb();
        } 
        return cb(null, data);
      });
    }, function(err, result, server) {
      return callback(err, result); // final callback, returns true if it was executed at some point else false
    });
  });
};
    
module.exports = LambdaRouter;
