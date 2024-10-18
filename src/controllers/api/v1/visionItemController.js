/* eslint-disable camelcase */
'use strict';
const Response = require('@services/Response');
const { ITEM_TYPE, SUCCESS, FAIL } = require('@services/Constant');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const {
  unixTimeStamp,
  makeRandomDigit
} = require('@services/Helper');

const {
  addEditVisionItemsValidation,
  deleteVisionItemsValidation,
  reorderVisionItemsValidation
} = require('../../../services/userValidations/visionItemsValidation');
// @services/userValidations/visionItemsValidation
const VisionItem = require('../../../models/VisionItems');
const Users = require('../../../models/Users');
const { USER_MEDIA_PATH, CLOUDFRONT_URL } = require('../../../services/Constant');
const { toObjectId } = require('../../../services/Helper');
module.exports = {
  addEditVisionItemsController: async (req, res) => {
    try {
      const reqParam = req.body;

      let updateData = {
        item_type: reqParam.item_type,
        main_text: reqParam.main_text || null,
        secondary_text: reqParam.secondary_text || null,
        color_code: reqParam.color_code || null,
        main_text_color: reqParam.main_text_color || null,
        text_color: reqParam.text_color || null,
        secondary_text_color: reqParam.secondary_text_color || null,
        theme: reqParam.theme || '',
        item_type: reqParam.item_type,
        vision_id: reqParam.vision_id || null,
        tags: reqParam.tags,
        title: reqParam.title || null,
        story: reqParam.story || null,
        user_id: req.authUserId,
        is_random_image: reqParam.isRandomImage
      };

      if (reqParam.vision_item_id && reqParam?.image_url) {
        updateData = {
          ...updateData,
          image_url: reqParam.image_url,
          title: reqParam.title || null,
          story: reqParam.story || null,
          color_code: reqParam.color_code || null,
          main_text_color: reqParam.main_text_color || null,
          text_color: reqParam.text_color || null,
          secondary_text_color: reqParam.secondary_text_color || null,
          theme: reqParam.theme || '',
          vision_id: reqParam.vision_id || null,
          created_by: reqParam.created_by,
          created_at: reqParam.created_at,
          tags: reqParam.tags
        };
      }

      if (reqParam.vision_item_id && !reqParam?.image_url) {
        updateData = {
          ...updateData,
          main_text: reqParam.main_text || null,
          secondary_text: reqParam.secondary_text || null,
          color_code: reqParam.color_code || null,
          main_text_color: reqParam.main_text_color || null,
          text_color: reqParam.text_color || null,
          secondary_text_color: reqParam.secondary_text_color || null,
          theme: reqParam.theme || '',
          vision_id: reqParam.vision_id || null,
          tags: reqParam.tags
        };
      }

      let visionImageUrl;

      if (reqParam.image_url && !reqParam.isRandomImage) {
        const existingProfile = await VisionItem.findById(req.authUserId).select('image_url');
        if (existingProfile && existingProfile.image_url) {
          await removeOldImage(existingProfile.image_url, USER_MEDIA_PATH.VISIONS, res);
        }
        const imageExtension = reqParam.image_url.split('/')[1];
        const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
          4
        )}.${imageExtension}`;
        visionImageUrl = await getUploadURL(
          reqParam.image_url,
          profileImage,
          USER_MEDIA_PATH.VISIONS
        );
        updateData = {
          ...updateData,
          image_url: profileImage
        };
      }

      let array = [];

      if (reqParam.image && reqParam.isRandomImage) {

        if (reqParam.image.length > 0) {
          for (const [index, image] of reqParam.image.entries()) {
            const visionItems = await VisionItem.find({ user_id: req.authUserId })
              .sort({ order_number: -1 })
              .limit(1);
            const latestVisionItem = visionItems?.length > 0 ? visionItems[0] : null;
            const orderNumber = latestVisionItem ? latestVisionItem.order_number + index : index;

            let obj = {
              ...updateData,
              image_url: image.image_url,
              order_number: orderNumber,
              title: reqParam.title || null,
              story: reqParam.story || null,
              color_code: reqParam.color_code || null,
              vision_id: reqParam.vision_id || null,
              created_by: image.created_by,
              tags: reqParam.tags
            }
            array.push(obj);
          }

        }

      }


      addEditVisionItemsValidation(reqParam, res, async (validate) => {
        if (validate) {
          if (reqParam.vision_item_id) {
            const visionItem = await VisionItem.findById(reqParam.vision_item_id);

            if (visionItem) {
              const newVisionItem = await VisionItem.findOneAndUpdate(
                { _id: reqParam.vision_item_id },
                updateData,
                { new: true }
              );
              if (newVisionItem) {

                return Response.successResponseData(
                  res,
                  newVisionItem,
                  SUCCESS,
                  res.__('itemAddedSuccess'),
                  visionImageUrl
                );
              } else {
                console.log('failed')

                return Response.successResponseData(res, res.__('itemAddedFailed'), SUCCESS);
              }
            }

            return Response.successResponseWithoutData(res, res.__('itemNotFound'), SUCCESS);
          } else {
            const visionItems = await VisionItem.find({ user_id: req.authUserId })
              .sort({ order_number: -1 })
              .limit(1);

            const latestVisionItem = visionItems?.length > 0 ? visionItems[0] : null;
            if (latestVisionItem && latestVisionItem?.order_number) {
              updateData['order_number'] = latestVisionItem.order_number + 1;
            } else {
              updateData['order_number'] = 1;
            }

            if (reqParam.item_type == ITEM_TYPE.PHOTO_TYPE) {
              let newVisionItem;
              if (reqParam.isRandomImage) {
                newVisionItem = await VisionItem.insertMany(array);
              } else {

                newVisionItem = await VisionItem.create(updateData);
              }

              if (newVisionItem) {
                return Response.successResponseData(res, newVisionItem, SUCCESS, res.__('itemsAddedSuccess'), visionImageUrl);
              } else {
                return Response.successResponseWithoutData(res, res.__('itemsAddedFailed'), FAIL);
              }
            }
            if (reqParam.item_type == ITEM_TYPE.WORD_TYPE) {
              let newVisionItem = await VisionItem.create({
                ...updateData,
                order_number: updateData.order_number + 1
              });
              if (newVisionItem) {
                return Response.successResponseData(res, {}, SUCCESS, res.__('itemAddedSuccess'));
              } else {
                return Response.successResponseWithoutData(res, res.__('itemAddedFailed'), FAIL);
              }
            }
          }
        } else {
          console.log('error', err);
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log('error', err);

      return Response.internalServerErrorResponse(res);
    }
  },

  getVisionsDetailedItemList: async (req, res) => {
    try {
      const userExist = await Users.findById(req.authUserId);
      const { vision_id, vision_item_id } = req.query;
      if (userExist) {
        if (vision_item_id) {
          const aggregationPipeline = [
            { $match: { _id: toObjectId(vision_item_id) } },
            { $sort: { order_number: -1 } },
            {
              $lookup: {
                from: 'visions',
                foreignField: '_id',
                localField: 'vision_id',
                as: 'vision'
              }
            },
            {
              $unwind: '$vision'
            },
            // { $set: { vision_title: '$vision.title' } },
            // {
            //   $unset: ['vision.tag', 'user_id', '__v', 'vision.__v', 'order_number', 'updatedAt']
            // },
            { $project: { vision: 0 } }
          ];
          const visionItems = await VisionItem.aggregate(aggregationPipeline);
          if (visionItems?.length > 0) {
            let filterData = visionItems.map((i) => {
              if (i.image_url) {
                if (i.image_url.includes('http')) {
                  i.image_url = i.image_url;
                  return i;
                } else {
                  i.image_url = CLOUDFRONT_URL + USER_MEDIA_PATH.VISIONS + '/' + i.image_url;
                  return i;
                }
              }
              return i;
            })
            return Response.successResponseData(
              res,
              filterData[0],
              SUCCESS,
              res.__('getVisionItemsSuccess')
            );
          } else {
            return Response.successResponseWithoutData(
              res,
              res.__('visionItemNotFound'),
              SUCCESS
            );
          }
        } else {
          if (vision_id) {
            const aggregationPipeline = [
              { $match: { vision_id: toObjectId(vision_id) } },
              { $sort: { order_number: -1 } },
              {
                $lookup: {
                  from: 'visions',
                  foreignField: '_id',
                  localField: 'vision_id',
                  as: 'vision'
                }
              },
              {
                $unwind: '$vision'
              },
              // { $set: { vision_title: '$vision.title' } },
              // {
              //   $unset: ['vision.tag', 'user_id', '__v', 'vision.__v', 'order_number', 'updatedAt']
              // },
              { $project: { vision: 0 } }
            ];
            const visionItems = await VisionItem.aggregate(aggregationPipeline);

            if (visionItems?.length > 0) {
              let filterData = visionItems.map((i) => {
                if (i.image_url) {
                  if (i.image_url.includes('http')) {
                    i.image_url = i.image_url;
                    return i;
                  } else {
                    i.image_url = CLOUDFRONT_URL + USER_MEDIA_PATH.VISIONS + '/' + i.image_url;
                    return i;
                  }
                }
                return i;
              })
              return Response.successResponseData(
                res,
                filterData,
                SUCCESS,
                res.__('getVisionItemsSuccess')
              );
            } else {
              return Response.successResponseWithoutData(
                res,
                res.__('visionItemNotFound'),
                SUCCESS
              );
            }
          } else {
            return Response.successResponseWithoutData(res, res.__('visionIdNotFound'), FAIL);
          }
        }
      } else {
        return Response.internalServerErrorResponse(res);
      }
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  deleteVisionItemList: (req, res) => {
    try {
      const queryParams = req.query;
      deleteVisionItemsValidation(req.query, res, async (validate) => {
        if (validate) {
          const visionItem = await VisionItem.findById(req.query.vision_item_id);
          if (visionItem) {
            await VisionItem.findOneAndDelete({ _id: req.query.vision_item_id });
            return Response.successResponseWithoutData(
              res,
              res.__('visionItemDeleteSuccessfully'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('visionItemNotFound'), FAIL);
          }
        } else {
          return Response.successResponseWithoutData(res, res.__('visionItemIdNotFound'), FAIL);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  reorderVisionItemsList: async (req, res) => {
    try {
      const reqParam = req.body;
      reorderVisionItemsValidation(reqParam, res, async (validate) => {
        if (validate) {
          const queryOperation = reqParam.item_ids.map((id, index) => ({
            updateOne: {
              filter: { _id: id },
              update: { order_number: index + 1 }
            }
          }));

          let data = await VisionItem.bulkWrite(queryOperation);

          if (data) {
            return Response.successResponseWithoutData(
              res,
              res.__('visionItemsReorderedSuccessfully'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(
              res,
              res.__('visionItemsReorderedFailed'),
              FAIL
            );
          }
        } else {
          return Response.successResponseWithoutData(res, res.__('visionItemIdsNotFound'), FAIL);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
