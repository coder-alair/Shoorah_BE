'use strict';

const Response = require('@services/Response');
const {
    addEditUserNotesValidation,
} = require('@services/userValidations/userNotesValidations');
const {
    SUCCESS,
} = require('@services/Constant');
const { toObjectId } = require('@services/Helper');

const { UserFolders, UserNotes } = require('../../../models');
const { addEditUserFolderValidation, deleteFolderValidation, userFoldersDetailedListValidation } = require('../../../services/userValidations/userFolderValidations');
const { FAIL, FOLDER_TYPES } = require('../../../services/Constant');

module.exports = {
    /**
   * @description This function is used to add or edit User folder.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
    addEditUserFolders: (req, res) => {
        try {
            const reqParam = req.body;
            addEditUserFolderValidation(reqParam, res, async (validate) => {
                if (validate) {
                    let updateData = {
                        name: reqParam.name.trim(),
                        folder_type: reqParam.folderType
                    };
                    if (reqParam.folderId) {
                        const filterCondition = {
                            _id: reqParam.folderId,
                            user_id: req.authUserId,
                            deletedAt: null
                        };

                        await UserFolders.findOneAndUpdate(filterCondition, updateData);
                    } else {
                        const newData = {
                            ...updateData,
                            user_id: req.authUserId,
                        };
                        await UserFolders.create(newData);
                    }

                    return Response.successResponseWithoutData(
                        res,
                        reqParam.folderId ? res.__('foldersUpdateSuccess') : res.__('foldersAddSuccess'),
                        SUCCESS,
                    );
                } else {
                    return Response.internalServerErrorResponse(res);
                }
            });
        } catch (err) {
            return Response.internalServerErrorResponse(res);
        }
    },

    /**
 * @description This function is used to get detailed list of folders.
 * @param {*} req
 * @param {*} res
 * @returns {*}
 */
    userFoldersDetailedList: (req, res) => {
        try {
            const reqParam = req.query;
            userFoldersDetailedListValidation(reqParam, res, async (validate) => {
                if (validate) {
                    let filterCondition = {
                        user_id: toObjectId(req.authUserId),
                        folder_type: parseInt(reqParam.folderType),
                        deletedAt: null
                    };

                    if (reqParam.searchKey) {
                        filterCondition = {
                          ...filterCondition,
                          $or: [{ name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
                        };
                      }

                    const aggregationPipeline = [
                        {
                            $match: filterCondition
                        },
                        {
                            $lookup: {
                                from: 'user_notes', 
                                localField: '_id',
                                foreignField: 'folder_id',
                                as: 'notes'
                            }
                        },
                        {
                            $addFields: {
                                notes: {
                                    $filter: {
                                        input: '$notes',
                                        as: 'note',
                                        cond: { $eq: ['$$note.deletedAt', null] }                                     }
                                }
                            }
                        },
                        {
                            $addFields: {
                                noteCounts: { $size: '$notes' } 
                            }
                        },
                        {
                            $project: {
                                folderId: '$_id',
                                _id: 0,
                                name: 1,
                                createdOn: '$createdAt',
                                counts:'$noteCounts',
                                updatedAt: 1
                            }
                        },
                        {
                            $sort: {
                                updatedAt: -1
                            }
                        }
                    ];
                    const foldersData = await UserFolders.aggregate(aggregationPipeline);
                    return Response.successResponseData(
                        res,
                        foldersData,
                        SUCCESS,
                        res.__('folderListSucess')
                    )
                        ;
                } else {
                    return Response.internalServerErrorResponse(res);
                }
            });
        } catch (err) {
            return Response.internalServerErrorResponse(res);
        }
    },


    /**
   * @description This function is used to delete folder.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
    deleteFolder: (req, res) => {
        try {
            const reqParam = req.query;
            deleteFolderValidation(reqParam, res, async (validate) => {
                if (validate) {
                    const filterCondition = {
                        _id: reqParam.folderId,
                        user_id: req.authUserId
                    };
                    const deleteFolderType = await UserFolders.findOne(filterCondition).select('folder_type _id');
                    if (deleteFolderType) {
                        const filterContentsCondition = {
                            user_id: req.authUserId,
                            folder_id: deleteFolderType._id
                        }
                        if (deleteFolderType.folder_type == FOLDER_TYPES.NOTES) {
                            delete 
                            await UserNotes.updateMany(
                                filterContentsCondition,
                                {
                                    deletedAt: new Date()
                                },
                                { new: true }
                            );
                        }

                    }

                    const deleteFolder = await UserFolders.updateMany(
                        filterCondition,
                        {
                            deletedAt: new Date()
                        },
                        { new: true }
                    ).select('_id');
                    return Response.successResponseWithoutData(
                        res,
                        deleteFolder ? res.__('deleteFolderSuccess') : res.__('noFolderFound'),
                        deleteFolder ? SUCCESS : FAIL
                    );
                } else {
                    return Response.internalServerErrorResponse(res);
                }
            });
        } catch (err) {
            return Response.internalServerErrorResponse(res);
        }
    }





};
