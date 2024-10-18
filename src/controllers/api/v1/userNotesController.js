'use strict';

const { UserNotes } = require('@models');
const Response = require('@services/Response');
const {
  addEditUserNotesValidation,
  userNotesDetailedListValidation,
  deleteNoteValidation
} = require('@services/userValidations/userNotesValidations');
const { toObjectId, unixTimeStamp, makeRandomDigit } = require('@services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const {
  USER_MEDIA_PATH,
  SUCCESS,
  PAGE,
  PER_PAGE,
  CLOUDFRONT_URL,
  FAIL,
  CATEGORY_TYPE,
  BADGE_TYPE
} = require('@services/Constant');
const { updateBadges, sendBadgeNotification } = require('@services/userServices/badgeServices');
const { ContentCounts } = require('../../../models');
const { default: axios } = require('axios');
const { currentDateOnly } = require('../../../services/Helper');
const { analyzeSentiment } = require('./historyController');

module.exports = {
  /**
   * @description This function is used to add or edit User Notes.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditUserNotes: (req, res) => {
    try {
      const reqParam = req.body;
      addEditUserNotesValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            title: reqParam.title.trim(),
            is_saved: reqParam.isSaved
          };
          let notesImageUrl;
          if (reqParam.description) {
            updateData = {
              ...updateData,
              description: reqParam.description.trim()
            };
          }
          if (reqParam.imageUrl) {
            const imageExtension = reqParam.imageUrl.split('/')[1];
            const notesImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            notesImageUrl = await getUploadURL(
              reqParam.imageUrl,
              notesImage,
              USER_MEDIA_PATH.NOTES
            );
            updateData = {
              ...updateData,
              image_url: notesImage
            };
          }
          if (reqParam.isImageDeleted) {
            updateData = {
              ...updateData,
              image_url: null
            };
          }
          if (reqParam.folderId) {
            updateData = {
              ...updateData,
              folder_id: reqParam.folderId
            };
          }
          let response = await analyzeSentiment(updateData.title);
          updateData = {
            ...updateData,
            positivity: response ? response : false
          };

          if (reqParam.notesId) {
            const filterCondition = {
              _id: reqParam.notesId,
              user_id: req.authUserId,
              deletedAt: null
            };
            if (reqParam.imageUrl || reqParam.isImageDeleted) {
              const existingImageUrl = await UserNotes.findOne(filterCondition).select('image_url');
              if (existingImageUrl && existingImageUrl.image_url) {
                await removeOldImage(existingImageUrl.image_url, USER_MEDIA_PATH.NOTES, res);
              }
            }

            await UserNotes.findOneAndUpdate(filterCondition, updateData);
          } else {
            let { data: sentiments } = await axios.post(
              `https://suru-therapy.shoorah.io/match?input_text=${reqParam.title}`
            );
            let newData = {
              ...updateData,
              user_id: req.authUserId,
              sentiments
            };

            let response = await analyzeSentiment(newData.title);
            newData = {
              ...newData,
              positivity: response ? response : false
            };

            await UserNotes.create(newData);
          }
          const notesCount = await UserNotes.countDocuments({
            user_id: req.authUserId,
            is_saved: true,
            deletedAt: null
          });
          let badgeReceived = false;
          switch (notesCount) {
            case 5:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.NOTES,
                BADGE_TYPE.BRONZE
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.NOTES,
                  BADGE_TYPE.BRONZE
                ));
              break;
            case 15:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.NOTES,
                BADGE_TYPE.SILVER
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.NOTES,
                  BADGE_TYPE.SILVER
                ));
              break;
            case 25:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.NOTES,
                BADGE_TYPE.GOLD
              );
              badgeReceived &&
                (await sendBadgeNotification(req.authUserId, CATEGORY_TYPE.NOTES, BADGE_TYPE.GOLD));
              break;
            case 50:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.NOTES,
                BADGE_TYPE.PLATINUM
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.NOTES,
                  BADGE_TYPE.PLATINUM
                ));
              break;
            case 100:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.NOTES,
                BADGE_TYPE.DIAMOND
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.NOTES,
                  BADGE_TYPE.DIAMOND
                ));
              break;
          }
          return Response.successResponseWithoutData(
            res,
            reqParam.notesId ? res.__('notesUpdateSuccess') : res.__('notesAddSuccess'),
            SUCCESS,
            notesImageUrl || null
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
   * @description This function is used to get detailed list of saved or draft notes.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  userNotesDetailedList: (req, res) => {
    try {
      const reqParam = req.query;
      userNotesDetailedListValidation(reqParam, res, async (validate) => {
        if (validate) {
          let page = PAGE;
          let perPage = PER_PAGE;
          if (reqParam.page) {
            page = parseInt(reqParam.page);
          }
          if (reqParam.perPage) {
            perPage = parseInt(reqParam.perPage);
          }
          const skip = (page - 1) * perPage || 0;
          let filterCondition = {
            user_id: toObjectId(req.authUserId),
            is_saved: JSON.parse(reqParam.isSaved),
            deletedAt: null
          };
          if (reqParam.searchKey) {
            filterCondition = {
              ...filterCondition,
              $or: [{ title: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
            };
          }

          if (reqParam.folderId) {
            filterCondition = {
              ...filterCondition,
              folder_id: toObjectId(reqParam.folderId),
            }
          }

          if (reqParam.startDate || reqParam.endDate) {
            let fromDate = currentDateOnly();
            let toDate = currentDateOnly();
            if (reqParam.startDate) {
              fromDate = new Date(reqParam.startDate);
            }
            if (reqParam.endDate) {
              toDate = new Date(reqParam.endDate);
            }
            toDate.setDate(toDate.getDate() + 1);
            filterCondition = {
              ...filterCondition,
              createdAt: {
                $gt: fromDate,
                $lte: toDate
              }
            };
          }
          let aggregationPipeline = [];

          if (reqParam.folderId) {
            aggregationPipeline = [
              {
                $match: filterCondition
              },
              {
                $lookup: {
                  from: 'user_folders',
                  localField: 'folder_id',
                  foreignField: '_id',
                  as: 'folder'
                }
              },
              {
                $unwind: '$folder'
              },
              {
                $project: {
                  notesId: '$_id',
                  _id: 0,
                  title: 1,
                  description: 1,
                  imageUrl: {
                    $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.NOTES, '/', '$image_url']
                  },
                  folderName: '$folder.name',
                  folderId: '$folder._id',
                  createdOn: '$createdAt',
                  updatedAt: 1
                }
              },
              {
                $sort: {
                  updatedAt: -1
                }
              },
              {
                $facet: {
                  metaData: [{ $count: 'totalCount' }, { $addFields: { page, perPage } }],
                  data: [{ $skip: skip }, { $limit: perPage }]
                }
              }
            ];
          } else {
            aggregationPipeline = [
              {
                $match: filterCondition
              },
              {
                $project: {
                  notesId: '$_id',
                  _id: 0,
                  title: 1,
                  description: 1,
                  imageUrl: {
                    $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.NOTES, '/', '$image_url']
                  },
                  createdOn: '$createdAt',
                  updatedAt: 1
                }
              },
              {
                $sort: {
                  updatedAt: -1
                }
              },
              {
                $facet: {
                  metaData: [{ $count: 'totalCount' }, { $addFields: { page, perPage } }],
                  data: [{ $skip: skip }, { $limit: perPage }]
                }
              }
            ];
          }

          const notesData = await UserNotes.aggregate(aggregationPipeline);
          const totalNotes = await UserNotes.find({ user_id: toObjectId(req.authUserId) });
          let existingCount = await ContentCounts.findOne({ user_id: toObjectId(req.authUserId) });
          if (existingCount) {
            await ContentCounts.updateOne(
              { user_id: req.authUserId },
              {
                $set: {
                  notes: totalNotes.length
                }
              }
            );
          } else {
            await ContentCounts.create({
              notes: totalNotes.length,
              user_id: req.authUserId
            });
          }
          return notesData.length > 0
            ? Response.successResponseData(
              res,
              notesData[0].data,
              SUCCESS,
              res.__('notesListSucess'),
              notesData[0].metaData[0]
            )
            : Response.successResponseWithoutData(res, res.__('somethingWrong'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete note.
   * @param {*} req
   * @param {*} res
   * @returns {8}
   */
  deleteNote: (req, res) => {
    try {
      const reqParam = req.query;
      deleteNoteValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: reqParam.notesId,
            user_id: req.authUserId
          };
          const deleteNote = await UserNotes.findOneAndUpdate(
            filterCondition,
            {
              deletedAt: new Date()
            },
            { new: true }
          ).select('_id');
          return Response.successResponseWithoutData(
            res,
            deleteNote ? res.__('deleteNoteSuccess') : res.__('noNoteFound'),
            deleteNote ? SUCCESS : FAIL
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
