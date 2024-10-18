'use strict';

const Response = require('@services/Response');
const { FAIL, SUCCESS } = require('@services/Constant');
const HelpUsImprove = require('../../../models/HelpUsImprove');
const { addUserFeedbackValidation, getFeedbackValidation } = require('../../../services/userValidations/feedbackValidation');
const { toObjectId, convertObjectKeysToCamelCase } = require('../../../services/Helper');


module.exports = {
    /**
     * @description This function is for add help us feedback
     * @param {*} req
     * @param {*} res
     * @returns {*}
     */

    addFeedback: (req, res) => {
        try {
            const reqParam = req.body;
            addUserFeedbackValidation(reqParam, res, async (validate) => {
                if (validate) {
                    let findCondition = {
                        user_id: toObjectId(req.authUserId),
                        content_id: toObjectId(reqParam.contentId),
                        content_type: reqParam.contentType,
                    };

                    const result = await HelpUsImprove.findOne(findCondition);
                    if (result) {
                        return Response.successResponseWithoutData(res, res.__('userFeedbackAlreadyExists'), SUCCESS);
                    } else {
                        let updateData = {
                            user_id: toObjectId(req.authUserId),
                            content_id: toObjectId(reqParam.contentId),
                            content_type: reqParam.contentType,
                            feedback: reqParam.feedback,
                        };

                        await HelpUsImprove.create(updateData);

                        return Response.successResponseWithoutData(res, res.__('userFeedbackAddedSuccess'), SUCCESS);
                    }
                } else {
                    return Response.internalServerErrorResponse(res);
                }
            })
        } catch (err) {
            console.error(err);
            return Response.internalServerErrorResponse(res);
        }
    },

    /**
    * @description This function is for get help feedback
    * @param {*} req
    * @param {*} res
    * @returns {*}
    */

    getUserFeedback: (req, res) => {
        try {
            const reqParam = req.query;
            getFeedbackValidation(reqParam, res, async (validate) => {
                if (validate) {
                    let findCondition = {
                        user_id: toObjectId(req.authUserId),
                        content_id: toObjectId(reqParam.contentId),
                        content_type: reqParam.contentType,
                    };

                    const result = await HelpUsImprove.findOne(findCondition).select('feedback');
                    if (result) {
                        return Response.successResponseData(res, convertObjectKeysToCamelCase(result), SUCCESS, res.__('userFeedbackAlreadyExists'));
                    } else {
                        return Response.successResponseWithoutData(res, res.__('userFeedbackNotFound'), FAIL);
                    }
                } else {
                    return Response.internalServerErrorResponse(res);
                }
            })
        } catch (err) {
            console.error(err);
            return Response.internalServerErrorResponse(res);
        }
    },





};
