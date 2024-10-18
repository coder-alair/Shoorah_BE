'use strict';

const { UserLegals } = require('@models');
const Response = require('@services/Response');
const { SUCCESS } = require('@services/Constant');
const { updateUserLegalValidation } = require('@root/src/services/userValidations/userLegalsValidation');

module.exports = {
    /**
     * @description This function is used to add update user legals
     * @param {*} req
     * @param {*} res
     * @return {*}
     */
    updateUserLegals: (req, res) => {
        try {
            const reqParam = req.body;
            updateUserLegalValidation(reqParam, res, async (validate) => {
                if (validate) {
                    const updateData = {
                        legals: reqParam.legals
                    };
                    await UserLegals.findOneAndUpdate({ user_id: req.authUserId }, updateData, {
                        upsert: true
                    });
                    return Response.successResponseWithoutData(res, res.__('updateLegalSuccess'), SUCCESS);
                } else {
                    return Response.internalServerErrorResponse(res);
                }
            });
        } catch (err) {
            return Response.internalServerErrorResponse(res);
        }
    },

    /**
     * @description This function is used to get user legals data
     * @param {*} req
     * @param {*} res
     * @return {*}
     */
    getUserLegals: async (req, res) => {
        try {
            const userLegals = await UserLegals.findOne(
                { user_id: req.authUserId },
                { id: '$_id', legals: '$legals', _id: 0 }
            );
            if (userLegals) {
                let legalData;

                if (typeof userLegals.legals === 'string') {
                    legalData = JSON.parse(userLegals?.legals);  
                } else {
                    legalData = userLegals?.legals;  
                }
                return Response.successResponseData(res, legalData, SUCCESS, res.__('userLegalGetSuccess'));
            } else {
                return Response.successResponseWithoutData(res, res.__('noUserLegalsFound'), SUCCESS);
            }
        } catch (err) {
            return Response.internalServerErrorResponse(res);
        }
    }

};
