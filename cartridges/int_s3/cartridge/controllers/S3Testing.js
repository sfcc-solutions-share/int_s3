
const S3 = require('*/cartridge/scripts/services/aws/s3')

// S3 Integration Testing
function Start() {
    if (dw.system.System.instanceType !== dw.system.System.DEVELOPMENT_SYSTEM) {
        response.setStatus(403)
        return
    }

    const svc = S3.getS3Service('aws.s3')
    const credentials = svc.configuration.credential
    const url = credentials.URL
    const hostname = url.split('://')[1].split('/')[0]
    const region = 'us-east-1'

    var testResults = []

    // use library without service callback
    const auth2 = S3.generateAWSSignatureV4({
        method: 'PUT',
        service: 's3',
        region: region,
        accessKey: credentials.user,
        secretKey: credentials.password,
        host: hostname,
        path: '/_s3_testing_target.txt',
        payload: "chuck was here"
    })
    const client2 = new dw.net.HTTPClient()
    client2.open('PUT', `https://${hostname}/_s3_testing_target.txt`)
    client2.setRequestHeader('x-amz-date', auth2.date)
    client2.setRequestHeader('Authorization', auth2.authorization)
    client2.setRequestHeader('x-amz-content-sha256', auth2.contentHash)
    client2.send("chuck was here")

    testResults.push({
        auth: auth2,
        status: client2.statusCode,
        text: client2.text,
        errorText: client2.errorText
    })

    const auth = S3.generateAWSSignatureV4({
        method: 'GET',
        service: 's3',
        region: region,
        accessKey: credentials.user,
        secretKey: credentials.password,
        host: hostname,
        path: '/_s3_testing_target.txt'
    })

    const client = new dw.net.HTTPClient()
    client.open('GET', `https://${hostname}/_s3_testing_target.txt`)
    client.setRequestHeader('x-amz-date', auth.date)
    client.setRequestHeader('Authorization', auth.authorization)
    client.setRequestHeader('x-amz-content-sha256', auth.contentHash)
    client.send()

    testResults.push({
        auth: auth,
        status: client.statusCode,
        text: client.text,
        errorText: client.errorText,
        match: client.text === "chuck was here"
    })

    // use helper methods (files are invalid for storefront due to quota; use job to test)
    try {
        S3.putString("another string", '/_s3_testing_file.txt')
        const result = S3.getString('/_s3_testing_file.txt')
        testResults.push({
            putString: result,
            match: result === "another string"
        })
    } catch (e) {
        testResults.push({
            error: e
        })
    }

    response.setHttpHeader('Content-Type', 'application/json')
    response.writer.print(JSON.stringify({
        testResults: testResults
    }, null, 2))
}
Start.public = true;
module.exports.Start = Start;
