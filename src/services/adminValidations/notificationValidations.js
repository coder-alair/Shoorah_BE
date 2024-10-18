'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { SENT_TO_USER_TYPE, NOTIFICATION_LIST_TYPE } = require('@services/Constant');
const { id } = require('@services/adminValidations/adminValidations');
const { IMAGE_MIMETYPE, AUDIO_MIMETYPE } = require('../Constant');

module.exports = {
  addNotificationValidation: (req, res, callback) => {
    const schema = Joi.object({
      title: Joi.string().required().trim().max(100),
      message: Joi.string().required().trim().max(1000),
      sentOnDate: Joi.optional(),
      cronSent: Joi.boolean().optional(),
      audioUrl: Joi.string()
        .optional()
        .allow(null, '')
        .valid(...AUDIO_MIMETYPE.map((x) => x)),
      image: Joi.string()
        .optional()
        .allow(null, '')
        .valid(...IMAGE_MIMETYPE.map((x) => x)),
      reminder: Joi.number().optional(),
      sentToUser: Joi.number()
        .required()
        .valid(
          SENT_TO_USER_TYPE.ALL,
          SENT_TO_USER_TYPE.IN_TRIAL,
          SENT_TO_USER_TYPE.PAID,
          SENT_TO_USER_TYPE.CUSTOM_LIST,
          SENT_TO_USER_TYPE.EXPIRED,
          SENT_TO_USER_TYPE.NOT_SUBSCRIBED
        ),
      toUserIds: Joi.array()
        .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
        .unique()
        .when('sentToUser', {
          is: SENT_TO_USER_TYPE.CUSTOM_LIST,
          then: Joi.required(),
          otherwise: Joi.valid('', null)
        })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addNotificationValidation', error))
      );
    }
    return callback(true);
  },
  notificationDetailedListValidation: (req, res, callback) => {
    const schema = Joi.object({
      notificationListType: Joi.number()
        .required()
        .valid(NOTIFICATION_LIST_TYPE.ALL_NOTIFICATION, NOTIFICATION_LIST_TYPE.MY_NOTIFICATION),
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('notificationDetailedListValidation', error))
      );
    }
    return callback(true);
  },
  usersEmailListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('usersEmailListValidation', error))
      );
    }
    return callback(true);
  },
  deleteMyNotificationValidation: (req, res, callback) => {
    const schema = Joi.object({
      deleteType: Joi.number().required().valid(1, 2),
      notificationId: id.when('deleteType', {
        is: 1,
        then: Joi.required(),
        otherwise: Joi.allow('', null)
      })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteMyNotificationValidation', error))
      );
    }
    return callback(true);
  }
};
