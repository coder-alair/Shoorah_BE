'use strict';

const { RESPONSE_CODE, FAIL, SUCCESS, CLOUDFRONT_URL } = require('@services/Constant');
const Response = require('@services/Response');
const {
    convertObjectKeysToCamelCase,
    toObjectId,
    currentDateOnly
} = require('../../../services/Helper');
const { default: axios } = require('axios');

module.exports = {
    /**
     * @description This function is used send bot message on slack
     * @param {*} req
     * @param {*} res
     * @return {*}
     */

    sendBotMessage: async function (req, res) {
        try {
            const reqParam = req.query;
            // let message = await app.client.chat.postMessage({
            //     token: process.env.SLACK_BOT_TOKEN,
            //     channel: "shoorah",
            //     text: "shoorah message"
            // })

            let message ="hello"

            return Response.successResponseData(
                res,
                convertObjectKeysToCamelCase(message),
                SUCCESS,
                res.__('slackMessageSuccess')
            );
        } catch (err) {
            console.log(err);
            return Response.internalServerErrorResponse(res);
        }
    },

    getClientToken: async (req, res) => {
        try {
            let { clientId, clientSecret, code, redirectUri } = req.body;
            console.log({ clientId, clientSecret, code, redirectUri })
            // let slackUrl = `https://slack.com/api/oauth.v2.access`;
            // let client_id = clientId;
            // let client_secret = clientSecret;
            // let details = {
            //     code,
            //     client_id,
            //     client_secret
            // }
            // var formBody = [];
            // for (var property in details) {
            //     var encodedKey = encodeURIComponent(property);
            //     var encodedValue = encodeURIComponent(details[property]);
            //     formBody.push(encodedKey + "=" + encodedValue);
            // }
            // formBody = formBody.join("&");
            
            // const _headers = {
            //     'Content-Type': 'application/x-www-form-urlencoded'
            // };
            
            // let config = {
            //     method: 'POST',
            //     url: slackUrl,
            //     data: formBody,
            //     headers: _headers
            // };
            
            // let installation = await axios(config);

            // const response = await axios.post('https://slack.com/api/oauth.v2.access', {
            //     client_id: clientId,
            //     client_secret: clientSecret,
            //     code: encodeURIComponent(code),
            //     redirect_uri: redirectUri
            // });

            return res.send("installation");
        } catch (error) {
            console.error('Error getting access token:', error);
            res.send(error)
        }
    }

};
