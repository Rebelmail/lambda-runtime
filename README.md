# RebelMail Lambda Runtime

![rebelmail-lambda-runtime](../master/rebelmail-lambda-runtime.gif?raw=true)

Simple package to allow versioning in AWS Lambdas as well as basic fallback.

## Why?

There is no tagging in AWS Lambdas which makes it difficult to have multiple versions of a Lambda running. Think of backwards compatibility with some clients.
Also, in the case of a Lambda going down in one AZ you have the ability to call other AZ's until one runs.

## Example

```js

var LambdaRouter = require('rebelmail-lambda-runtime');
var lambda = new LambdaRouter(aws_key, aws_secret);

var supportedLambdas = {
  "2015-02-01": "0.0.*",
  "2016-09-01": "1.3.*"
};

var version = supportedLambdas[emailVersion];

var lambdaName = "differ";
var env = process.env.NODE_ENV;
var payload = JSON.stringify({});

lambda.invokeAsync(lambdaName, env, version, ['us-east-1', 'us-west-2'], payload, function(err, data) {
  console.log(err, data);
});

```

## Specifications

For the package to perform its function effectively, your lambda names must follow this guideline:

```
NAME-WITH-WHATEVER-SIZE-YOU-NEED-IT-**ENV**-**MAJOR**-**MINOR**-**PATCH**
```

## Documentation
### `LambdaRuntime(awsKey, awsSecret)`

Returns a LambdaRuntime object.

### `isValidLambda(lambda, functionName, env, version)`

Function used to compare against official Lambdas

* `lambda` - Object must have FunctionName defined.
* `functionName` - Name to be compared with FunctionName
* `env` - Env to be compared with FunctionName
* `version` - Version to be comprared with FunctionName

Returns true if the Lambda is compatible with the one being compared with.

### `latestLambda(lambdas)`

* `lambdas` - Array of Lambda names. Ex -> ['name-production-0-2-1', 'name-production-0-1-2'];

Returns the lastest definition of the Lambda.

### `findLatestLambda(functionName, env, version, region, callback)`

* `functionName` - Lambda name to look for.
* `env` - Env to look for.
* `version` - Semantic version that should be matched Ex -> (^0.0.x)
* `region` - Region to look for.
* `callback(err, lambda)` - Will be called with the latest version found.

### `invokeFallback(lambdas, payload, callback)`

* `lambdas` - Array of lambdas. Ex -> [null, {name: name-production-0-1-2, region: us-west-2}, {name: name-production-0-1-1, region: us-east-1}]
* `payload` - Payload to be invoked.
* `callback(err, result)` - If no Errors happened, result can be `false` or a Lambda object. False implies that no Lambda was accepted.

Once 1 Lambda is successfully executed, the callback will be triggered.

### `invokeAsync(name, env, version, regions, payload, callback)`

* `name` - Name of lambda.
* `env` - Env of lambda.
* `version` - Semantic version to compare against.
* `payload` - Payload for lambda.
* `callback(err, lambda)` - If no Errors happened, result can be `false` or a Lambda object. False implies that no Lambda was accepted.

## Enjoy
