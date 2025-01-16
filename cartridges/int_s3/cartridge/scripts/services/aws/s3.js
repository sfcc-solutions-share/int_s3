/* eslint-disable */
const LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
const MessageDigest = require('dw/crypto/MessageDigest');
const Bytes = require('dw/util/Bytes');
const Encoding = require('dw/crypto/Encoding');
const Mac = require('dw/crypto/Mac');

const SERVICE_NAME = 'aws.s3';

/**
 * @typedef {Object} V4SignatureRequest
 * @property {string} method
 * @property {string} service
 * @property {string} region
 * @property {string} accessKey
 * @property {string} secretKey
 * @property {string} host
 * @property {string} path
 * @property {string} payload
 */

/**
 *
 * @param {V4SignatureRequest} config
 * @return {object}
 */
function generateAWSSignatureV4(config) {
    const { method, service, region, accessKey, secretKey, host, path, payload } = config;

    const algorithm = 'AWS4-HMAC-SHA256';
    const currentDate = new Date().toISOString()
        .replace(/[:-]|\.\d{3}/g, '');
    const date = currentDate.substr(0, 8);
    const scope = `${date}/${region}/${service}/aws4_request`;

    var md = new MessageDigest(MessageDigest.DIGEST_SHA_256);
    const _payloadHash = md.digestBytes(new Bytes(payload));
    const payloadHash = payload ? Encoding.toHex(_payloadHash) : 'UNSIGNED-PAYLOAD';

    const canonicalHeaders = [
        `host:${host}`,
        `x-amz-content-sha256:${payloadHash}`,
        `x-amz-date:${currentDate}`
    ];

    const signedHeaders = canonicalHeaders.map(h => h.split(':')[0])
        .sort()
        .join(';');

    const canonicalRequest = [
        method,
        path,
        '', // Query string
        canonicalHeaders.sort()
            .join('\n') + '\n',
        signedHeaders,
        payloadHash
    ].join('\n');

    md = new MessageDigest(MessageDigest.DIGEST_SHA_256);
    const stringToSign = [
        algorithm,
        currentDate,
        scope,
        Encoding.toHex(md.digestBytes(new Bytes(canonicalRequest)))
    ].join('\n');

    const mac = new Mac(Mac.HMAC_SHA_256);
    const kDate = mac.digest(date, `AWS4${secretKey}`);
    const kRegion = mac.digest(region, kDate);
    const kService = mac.digest(service, kRegion);
    const kSigning = mac.digest('aws4_request', kService);
    const signature = Encoding.toHex(mac.digest(stringToSign, kSigning));

    const authorizationHeader = `${algorithm} Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
        authorization: authorizationHeader,
        date: currentDate,
        contentHash: payloadHash,
    };
}

function getS3Service(serviceName) {
    return LocalServiceRegistry.createService(serviceName, {
        /**
         *
         * @param {dw.svc.HTTPService}  svc
         * @param params
         */
        createRequest: function (svc, params) {
            const method = params.method;
            const path = params.path;
            const payload = params.payload;

            const region = svc.configuration.credential.custom.awsRegion || 'us-east-1';
            const accessKey = svc.configuration.credential.user;
            const secretKey = svc.configuration.credential.password;
            const host = svc.configuration.credential.URL.split('://')[1].split('/')[0];

            const auth = generateAWSSignatureV4({
                method: method,
                service: 's3',
                region: region,
                accessKey: accessKey,
                secretKey: secretKey,
                host: host,
                path: path
                // use unsigned payload for simplicity with files
            })

            return {
                url: `https://${host}${path}`,
                method: method,
                headers: {
                    'x-amz-date': auth.date,
                    'Authorization': auth.authorization,
                    'x-amz-content-sha256': auth.contentHash
                },
                payload: payload
            }
        },
        executeOverride: true,
        /**
         *
         * @param {dw.svc.HTTPService} svc
         * @param client
         */
        execute: function (svc, request) {
            // execute override to send files via underlying HTTPClient
            const client = svc.client;
            client.open(request.method, request.url);

            for (var header in request.headers) {
                client.setRequestHeader(header, request.headers[header]);
            }

            if (request.payload && request.payload.class === dw.io.File) {
                client.sendAndReceiveToFile(request.payload);
            } else if (request.payload) {
                client.send(request.payload);
            } else {
                client.send();
            }
            if (svc.isThrowOnError() && client.statusCode >= 300) {
                throw new Error(`HTTP call failed with status code ${client.statusCode}: ` + client.errorText);
            }
            return client
        },
        parseResponse: function (svc, client) {
            return client;
        },
        filterLogMessage(msg) {
            return msg;
        }
    });
}

/**
 * Uploads a file to S3
 * @param {dw.io.File} file valid file
 * @param {string} path destination path
 */
function putFile(file, path) {
    const svc = getS3Service(SERVICE_NAME);
    svc.setThrowOnError()

    return svc.call({
        method: 'PUT',
        path: path,
        payload: file
    })
}

/**
 * Uploads a string to S3 text file
 * @param {string} payload
 * @param {string} path
 */
function putString(payload, path) {
    const svc = getS3Service(SERVICE_NAME);
    svc.setThrowOnError()

    return svc.call({
        method: 'PUT',
        path: path,
        payload: payload
    })
}

/**
 *
 * @param path
 * @param {dw.io.File} file destination file
 */
function getFile(path, file) {
    const svc = getS3Service(SERVICE_NAME);
    svc.setThrowOnError()

    return svc.call({
        method: 'GET',
        path: path,
        payload: file
    })
}

/**
 *
 * @param path
 * @returns {string}
 */
function getString(path) {
    const svc = getS3Service(SERVICE_NAME);
    svc.setThrowOnError()

    const result = svc.call({
        method: 'GET',
        path: path
    })
    return result.object.text;
}

module.exports = {
    getS3Service: getS3Service,
    generateAWSSignatureV4: generateAWSSignatureV4,
    putFile: putFile,
    putString: putString,
    getFile: getFile,
    getString: getString,
    SERVICE_NAME: SERVICE_NAME
};
