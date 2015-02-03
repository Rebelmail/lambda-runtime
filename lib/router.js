var aws = require('aws-sdk');
var semver = require('semver');
var async = require('async');

function LambdaRouter(aws_key, aws_secret) {
  this.aws_key = aws_key;
  this.aws_secret = aws_secret;
}

LambdaRouter.prototype.invokeAsync = function(functionName, env, version, regions, payload, callback) {
  var that = this;
  
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
      // Iterate through all FunctionNames returned and find a match
      for (var i = 0; i < data.Functions.length; i++) {
        var func = data.Functions[i];
        func = func.FunctionName.split('-');
        var funcVer = func.slice(-3).join('.');
        if (!semver.valid(funcVer)) {
          continue;
        }
        var funcEnv = func.slice(-4, -3);
        var funcName = func.slice(0, -4).join('-'); 

        if (funcEnv === env && funcName === functionName && semver.satisfies(funcVer, version)) {
          return cb(null, {
            region: region,
            name: data.Functions[i].FunctionName
          });
        }
      }
      return cb(null, null);
    });
  }, function(err, results) {
    if (err) {
      return callback(err);
    }
    async.some(results, function(opts, success) {
      if (opts === null) { 
        return success(false);
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
          return success(false);
        } 
        return success(true);
      });
    }, function(result) {
      return callback(result);
    });
  });
};
    
module.exports = LambdaRouter;
