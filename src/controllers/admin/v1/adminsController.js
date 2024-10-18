'use strict';

const Response = require('@services/Response');
const {
  addEditAdminValidation,
  adminsListValidation,
  deleteAdminValidation,
  adminNameListValidation
} = require('@services/adminValidations/adminValidations');
const { Users, DeviceTokens, ModuleAccess, Notification } = require('@models');
const {
  USER_TYPE,
  ACCOUNT_STATUS,
  FAIL,
  SUCCESS,
  PAGE,
  PER_PAGE,
  RESPONSE_CODE,
  PASSWORD_LENGTH,
  ADMIN_MEDIA_PATH,
  CLOUDFRONT_URL,
  SENT_TO_USER_TYPE,
  SORT_BY,
  SORT_ORDER
} = require('@services/Constant');
const {
  toObjectId,
  makeRandomString,
  unixTimeStamp,
  makeRandomDigit
} = require('@services/Helper');
const { generatePassword } = require('@services/authServices');
const { sendPassword } = require('@services/Mailer');
const { getUploadURL, removeOldImage } = require('@services/s3Services');

module.exports = {
  /**
   * @description This function is used to add edit subadmin
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditAdmin: (req, res) => {
    try {
      if (req.userType !== USER_TYPE.SUPER_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const reqParam = req.body;
      addEditAdminValidation(reqParam, res, async (validate) => {
        if (validate) {
          const reqEmail = reqParam.email.toLowerCase().trim();
          let findCondition = {
            email: reqEmail,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: {
              $ne: USER_TYPE.USER
            }
          };
          if (reqParam.userId) {
            findCondition = {
              ...findCondition,
              _id: {
                $ne: reqParam.userId
              }
            };
          }
          const user = await Users.findOne(findCondition).select('_id');
          if (user) {
            return Response.successResponseWithoutData(res, res.__('adminAleadyExists'), FAIL);
          } else {
            let updateData = {
              name: reqParam.name?.trim(),
              email: reqEmail,
              user_type: reqParam.userType,
              status: reqParam.accountStatus,
              is_email_verified: true
            };
            let userProfileUrl;
            if (reqParam.userId) {
              const filterData = {
                _id: reqParam.userId,
                status: {
                  $ne: ACCOUNT_STATUS.DELETED
                }
              };
              if (reqParam.profile) {
                const existingProfile = await Users.findOne(filterData).select('user_profile');
                if (existingProfile && existingProfile.user_profile) {
                  await removeOldImage(
                    existingProfile.user_profile,
                    ADMIN_MEDIA_PATH.ADMIN_PROFILE,
                    res
                  );
                }
                const imageExtension = reqParam.profile.split('/')[1];
                const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
                  4
                )}.${imageExtension}`;
                userProfileUrl = await getUploadURL(
                  reqParam.imageUrl,
                  profileImage,
                  ADMIN_MEDIA_PATH.ADMIN_PROFILE
                );
                updateData = {
                  ...updateData,
                  user_profile: profileImage
                };
              }
              const adminData = await Users.findByIdAndUpdate(filterData, updateData, {
                new: true
              }).select('_id');
              if (adminData) {
                await ModuleAccess.findOneAndUpdate(
                  { user_id: reqParam.userId },
                  { module_access: reqParam.moduleAccess }
                );
                return Response.successResponseWithoutData(
                  res,
                  res.__('adminDataUpdated'),
                  SUCCESS,
                  userProfileUrl || null
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('invalidAdminId'), FAIL);
              }
            } else {
              if (reqParam.profile) {
                const imageExtension = reqParam.profile.split('/')[1];
                const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
                  4
                )}.${imageExtension}`;
                userProfileUrl = await getUploadURL(
                  reqParam.imageUrl,
                  profileImage,
                  ADMIN_MEDIA_PATH.ADMIN_PROFILE
                );
                updateData = {
                  ...updateData,
                  user_profile: profileImage
                };
              }
              const randomPassword = await makeRandomString(PASSWORD_LENGTH);
              const hasPassword = await generatePassword(randomPassword);
              updateData = {
                ...updateData,
                password: hasPassword
              };
              const newUser = await Users.create(updateData);
              await ModuleAccess.create({
                user_id: newUser._id,
                module_access: reqParam.moduleAccess
              });
              const locals = {
                name: reqParam.name?.trim(),
                email: reqParam.email,
                password: randomPassword
              };
              await sendPassword(reqEmail, locals);

              return Response.successResponseWithoutData(
                res,
                res.__('adminAddedSuccessfull'),
                SUCCESS,
                userProfileUrl || null
              );
            }
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to list all super admins and sub admins
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  adminsList: (req, res) => {
    try {
      const reqParam = req.query;
      adminsListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          const filterData = {
            _id: { $ne: toObjectId(req.authAdminId) },
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: {
              $in: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN]
            },
            ...(reqParam.id && { _id: toObjectId(reqParam.id) }),
            ...(reqParam.searchKey && {
              $or: [
                { name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                { email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }
              ]
            }),
            ...(reqParam.userType && { user_type: parseInt(reqParam.userType) }),
            ...(reqParam.accountStatus && { status: parseInt(reqParam.accountStatus) })
          };
          const aggregationPipeline = [
            {
              $match: filterData
            },
            {
              $sort: {
                [sortBy]: sortOrder
              }
            },
            {
              $skip: skip
            },
            {
              $limit: perPage
            },
            {
              $lookup: {
                from: 'module_accesses',
                localField: '_id',
                foreignField: 'user_id',
                as: 'moduleAccess'
              }
            },
            {
              $project: {
                id: '$_id',
                name: '$name',
                profile: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.ADMIN_PROFILE, '/', '$user_profile']
                },
                email: '$email',
                userType: '$user_type',
                accountStatus: '$status',
                lastLogin: '$last_login',
                last_login: 1,
                createdAt: 1,
                moduleAccess: {
                  $arrayElemAt: ['$moduleAccess.module_access', 0]
                },
                _id: 0
              }
            }
          ];
          const totalRecords = await Users.countDocuments(filterData);
          const adminsData = await Users.aggregate(aggregationPipeline);
          return Response.successResponseData(
            res,
            adminsData,
            SUCCESS,
            res.__('adminsListSuccess'),
            {
              page,
              perPage,
              totalRecords
            }
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
   * @description This function is used to delete admin account
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteAdmin: (req, res) => {
    try {
      if (req.userType !== USER_TYPE.SUPER_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const reqParam = req.query;
      deleteAdminValidation(reqParam, res, async (validate) => {
        if (validate) {
          await Users.findByIdAndUpdate(reqParam.userId, {
            status: ACCOUNT_STATUS.DELETED,
            deletedAt: new Date()
          });
          await ModuleAccess.findOneAndUpdate(
            { user_id: reqParam.userId },
            { deletedAt: new Date() }
          );
          await DeviceTokens.deleteMany({ user_id: reqParam.userId });
          return Response.successResponseWithoutData(res, res.__('adminDeleteSuccess'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get admin name listing only
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  adminNameList: (req, res) => {
    try {
      const reqParam = req.query;
      adminNameListValidation(reqParam, res, async (validate) => {
        if (validate) {
          let filterData = {
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: {
              $in: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN]
            }
          };
          if (reqParam.searchKey) {
            filterData = {
              ...filterData,
              name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
            };
          }
          const adminsData = await Users.find(filterData).select('name').sort({ name: 1 });
          return Response.successResponseData(
            res,
            adminsData,
            SUCCESS,
            res.__('adminsListSuccess')
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
   * @description This function is used to get logged in user admin type and its module access.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getUserAccess: async (req, res) => {
    try {
      if (req.authAdminId) {
        const filterCondition = {
          deletedAt: null,
          is_read_by: { $ne: toObjectId(req?.authAdminId) },
          sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
          to_user_ids: toObjectId(req?.authAdminId),
          deleted_by: {
            $ne: toObjectId(req?.authAdminId)
          }
        };
        const unreadNotificationCount = await Notification.countDocuments(filterCondition);
        const resObj = {
          userType: req.userType,
          authModuleAccess: req?.authModuleAccess,
          authAdminName: req?.authAdminName,
          authProfile: req?.authProfile,
          unreadNotification: unreadNotificationCount
        };

        return Response.successResponseData(res, resObj, SUCCESS, res.__('adminsListSuccess'));
      } else if (req?.authCompanyId) {
        const resObj = {
          userType: req.companyAdmin.user_type,
          companyModuleAccess: req?.authModuleAccess,
          companyAdminName: req?.companyAdmin?.name,
          companyProfile: req?.companyLogo
        };
        return Response.successResponseData(res, resObj, SUCCESS, res.__('companyListSuccess'));
      } else {
        return Response.unauthorizedError(res, 'Unauthorized Access');
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
