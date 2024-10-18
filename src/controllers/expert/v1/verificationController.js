'use strict';

const Response = require('@services/Response');
const { SUCCESS, FAIL, EXPERT_MEDIA_PATH, USER_TYPE, RESPONSE_CODE, CLOUDFRONT_URL, DBS_VERIFICATION_STATUS } = require('../../../services/Constant');
const { makeRandomDigit, unixTimeStamp, toObjectId, convertObjectKeysToCamelCase } = require('../../../services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const ExpertAttachment = require('../../../models/ExpertAttachments');
const Expert = require('../../../models/Expert');
const { addEditAttachments, getExpertAttachments, deleteAttachmentValidation, addDocVerifyValidation, getExpertApprovalStats } = require('../../../services/adminValidations/expertValidations');
const { sendApprovalRequest } = require('../../../services/adminServices/expertsApprovalNotify');
const { Users } = require('../../../models');
const ExpertApproval = require('../../../models/ExpertApprovals');

module.exports = {
    /**
    * @description This function is used to upload doc to verify for dbs and super admin approval
    * @param {*} req
    * @param {*} res
    * @returns {*}
    */
    addDocVerify: (req, res) => {
        try {
            const reqParam = req.body;
            if (req.userType !== USER_TYPE.EXPERT) {
                return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
            }
            addDocVerifyValidation(reqParam, res, async (validate) => {
                if (validate) {
                    let updateData = {
                        user_id: req.authAdminId,
                        file_title: reqParam.fileTitle,
                        doc_type: reqParam.docType
                    };
                    let expert = await Expert.findOne({ user_id: req.authAdminId, deletedAt: null }).select('_id');
                    if (expert) {
                        updateData = {
                            ...updateData,
                            expert_id: expert._id
                        };
                    } else {
                        return Response.successResponseWithoutData(res, res.__('expertNotFound'), FAIL);
                    }
                    let existingApproval = await ExpertApproval.findOne({user_id:toObjectId(req.adminAuthId)});
                    if (existingApproval) {
                        return Response.successResponseWithoutData(res, res.__('alreadySentForApproval'), FAIL);
                    }
                    let fileUrl;
                    if (reqParam.file) {
                        const fileExtension = reqParam.file.split('/')[1];
                        const fileName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
                            4
                        )}.${fileExtension}`;
                        fileUrl = await getUploadURL(
                            reqParam.file,
                            fileName,
                            EXPERT_MEDIA_PATH.DOCUMENTS
                        );
                        updateData = {
                            ...updateData,
                            file_name: fileName
                        };

                        const newDataCondition = {
                            ...updateData,
                            verification_status: DBS_VERIFICATION_STATUS.PENDING,
                            sent_for_verification: true,
                        };
                        const newData = await ExpertApproval.create(newDataCondition);

                        let user = await Users.findOne({ _id: toObjectId(req.authAdminId) }).select('name');
                        await sendApprovalRequest(user?.name, req.authAdminId);

                        if (newData) {
                            return Response.successResponseWithoutData(res, res.__('sentForApprovalSuccess'), SUCCESS, fileUrl);
                        } else {
                            return Response.successResponseWithoutData(res, res.__('somethingWentWrong'), FAIL);
                        }

                    } else {
                        return Response.successResponseWithoutData(res, res.__('noFileUploaded'), FAIL);
                    }
                } else {
                    return Response.internalServerErrorResponse(res);
                }
            });
        } catch (err) {
            console.log(err);
            return Response.internalServerErrorResponse(res);
        }
    },

    /**
     * @description This function is used to get approval stats
     * @param {*} req
     * @param {*} res
     * @returns {*}
     */
    getApprovalStatus: (req, res) => {
        try {
            const reqParam = req.query;
            if (req.userType !== USER_TYPE.EXPERT) {
                return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
            }
            getExpertApprovalStats(reqParam, res, async (validate) => {
                if (validate) {
                    let filterCondition = {
                        user_id: toObjectId(req.authAdminId),
                        deletedAt: null
                    };

                    if (reqParam.docType) {
                        filterCondition = {
                            ...filterCondition,
                            doc_type: reqParam.docType,
                        }
                    }

                    const aggregationPipeline = [
                        {
                            $match: filterCondition
                        },
                        {
                            $project: {
                                approvalId: '$_id',
                                approvalFileTitle: '$file_title',
                                approvalFileName: '$file_name',
                                approvalFileUrl: {
                                    $concat: [CLOUDFRONT_URL, EXPERT_MEDIA_PATH.DOCUMENTS, '/', '$file_name']
                                },
                                approvalType: '$doc_type',
                                status: '$verification_status',
                                sentForVerification: '$sent_for_verification',
                                dbsVerified:'$dbs_verified',
                                createdAt: 1,
                                _id: 0
                            }
                        }
                    ];

                    const expertApproval = await ExpertApproval.aggregate(aggregationPipeline);
                    if (expertApproval.length > 0) {
                        return Response.successResponseData(
                            res,
                            convertObjectKeysToCamelCase(expertApproval[0]),
                            SUCCESS,
                            res.__('expertApprovalStatsGetSuccess')
                        );
                    } else {
                        return Response.successResponseWithoutData(res, res.__('noVerificationFound'), FAIL);
                    }
                } else {
                    return Response.internalServerErrorResponse(res);
                }
            });
        } catch (err) {
            console.log(err);
            return Response.internalServerErrorResponse(res);
        }
    },

};
