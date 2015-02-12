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

var lambdaName = "rebelmail-lambda-differ";
var env = process.env.NODE_ENV;


lambda.invokeAsync(lambdaName, env, version, ['us-east-1', 'us-west-2'], payload, function(err, data) {
  console.log(err, data);
});

```

## Specifications

For the package to perform its function effectively, your lambda names must follow this guideline:

```
NAME-WITH-WHATEVER-SIZE-YOU-NEED-IT-**ENV**-**MAJOR**-**MINOR**-**PATCH**
```

## Enjoy
