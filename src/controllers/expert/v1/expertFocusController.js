'use strict';

const Response = require('@services/Response');
const { SUCCESS, FAIL, STATUS, USER_TYPE, RESPONSE_CODE } = require('../../../services/Constant');
const formidable = require('formidable');
const fs = require('fs');
const csv = require('csv-parser');
const ExpertFocus = require('../../../models/ExpertFocus');
const { convertObjectKeysToCamelCase, shuffleArray } = require('../../../services/Helper');


module.exports = {
    /**
    * @description This function is used to import expert specialisation focuses
    * @param {*} req
    * @param {*} res
    * @returns {*}
    */
    uploadExpertFocuses: async (req, res) => {
        try {
            const form = formidable();
            form.parse(req, (err, reqParam, reqFile) => {
                if (err) {
                    return Response.internalServerErrorResponse(res);
                }
                if (!reqFile.csvFile) {
                    return Response.validationErrorResponseData(res, res.__('expertFocusCsvRequired'));
                }
                reqParam.csvFileMimetype = reqFile.csvFile.mimetype;

                const readData = fs.createReadStream(reqFile.csvFile.filepath);

                const expertFocusArray = [];
                readData.pipe(
                    csv({
                        // separator: ';'
                    })
                        .on('data', async (row) => {
                            if (row.display_name) {
                                if (/^[A-Za-z\s]+$/.test(row.display_name.trim())) {
                                    const tempObj = {
                                        display_name: row.display_name.trim(),
                                    };
                                    expertFocusArray.push(tempObj);
                                }
                            }
                        })
                        .on('end', async function () {
                            if (expertFocusArray.length > 0) {
                                await ExpertFocus.insertMany(expertFocusArray);
                                return Response.successResponseWithoutData(res, res.__('CSVimportedSuccess'), SUCCESS);

                            } else {
                                return Response.validationErrorResponseData(res, res.__('notValidCsv'));
                            }
                        })
                        .on('error', function (error) {
                            return Response.successResponseWithoutData(res, error.message, FAIL);
                        })
                );
            });
        } catch (err) {
            return Response.internalServerErrorResponse(res);
        }
    },

    /**
    * @description This function is used to get all expert focuses
    * @param {*} req
    * @param {*} res
    * @returns {*}
    */
    expertFocusList: async (req, res) => {
        try {
            if (req.userType !== USER_TYPE.EXPERT) {
                return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
            }

            const filterCondition = {
                status: STATUS.ACTIVE,
                deletedAt: null
            };
            const aggregationPipeline = [
                {
                    $match: filterCondition
                },
                {
                    $project: {
                        focusId: '$_id',
                        focusName: '$display_name',
                        createdAt: 1,
                        _id: 0
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                }
            ];
            const focusData = await ExpertFocus.aggregate(aggregationPipeline);
            if (focusData.length > 0) {
                return Response.successResponseData(
                    res,
                    convertObjectKeysToCamelCase(shuffleArray(focusData)),
                    SUCCESS,
                    res.__('expertFocusListSuccess')
                );
            } else {
                return Response.successResponseWithoutData(res, res.__('noFocusFound'), FAIL);
            }

        } catch (err) {
            console.log(err)
            return Response.internalServerErrorResponse(res);
        }
    },




};
