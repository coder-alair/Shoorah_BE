'use strict';

const { SurveyCategory } = require('../../../models');

const {
  CLOUDFRONT_URL,
  SUCCESS,
  FAIL,
  RESPONSE_CODE,
  PAGE,
  PER_PAGE,
  ACCOUNT_TYPE,
  USER_TYPE,
  STATUS,
  NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
  ACCOUNT_STATUS,
  SENT_TO_USER_TYPE
} = require('../../../services/Constant');
const Response = require('@services/Response');
const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const mongoose = require('mongoose');

module.exports = {
  createCategory: async (req, res) => {
    const categoryValidationschema = Joi.object({
      name: Joi.string().required(),
      status: Joi.number(),
      deleted_at: Joi.number()
    });
    const { result, error } = categoryValidationschema.validate(req.body);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        res.__(validationMessageKey('addCategoryValidation', error))
      );
    }
    try {
      let { name, status, deleted_at } = req.body;
      let createdCategory = await SurveyCategory.create({
        name,
        status,
        deleted_at
      });
      return Response.successResponseData(
        res,
        createdCategory,
        SUCCESS,
        res.__('addCategorySuccess')
      );
    } catch (error) {
      return Response.errorResponseWithoutData(
        res,
        'Category has not been created !',
        RESPONSE_CODE.BAD_REQUEST
      );
    }
  },
  updateCategory: async (req, res) => {
    const categoryValidationschema = Joi.object({
      name: Joi.string().required(),
      status: Joi.number(),
      deleted_at: Joi.number()
    });
    const { result, error } = categoryValidationschema.validate(req.body);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        res.__(validationMessageKey('addCategoryValidation', error))
      );
    }
    try {
      let { name, status, deleted_at } = req.body;
      const { id } = req.params;
      let categoryDetails = await SurveyCategory.findOne({
        _id: id
      });
      if (!categoryDetails) {
        return res.status(500).json({
          message: 'No Category Details Found with this ID'
        });
      }
      let updatedCategory = await SurveyCategory.findByIdAndUpdate(id, {
        name,
        status,
        deleted_at
      });
      return Response.successResponseWithoutData(res, SUCCESS, res.__('updateCategorySuccess'));
    } catch (error) {
      return Response.errorResponseWithoutData(
        res,
        'Category has not been updated !',
        RESPONSE_CODE.BAD_REQUEST
      );
    }
  },
  getCategoryDetails: async (req, res) => {
    const { id } = req.params;
    let categoryDetails = await SurveyCategory.findOne({
      _id: id
    });
    if (!categoryDetails) {
      return res.status(500).json({
        message: 'No Category Details Found with this ID'
      });
    }
    return Response.successResponseData(
      res,
      categoryDetails,
      SUCCESS,
      res.__('CategoryDetailsSuccess')
    );
  },
  getAllCategory: async (req, res) => {
    let categoryDetails = await SurveyCategory.find({
      status: 1,
      deleted_at: 0
    });
    if (!categoryDetails) {
      return res.status(500).json({
        message: 'No Categories Found'
      });
    }
    return Response.successResponseData(
      res,
      categoryDetails,
      SUCCESS,
      res.__('AllCategorySuccess')
    );
  },
  deleteCategoryDetails: async (req, res) => {
    try {
      const { id } = req.body;
      let dltCategory = await SurveyCategory.findOne({
        _id: id
      });
      if (!dltCategory) {
        return res.status(500).json({
          message: 'No Category Details Found with this ID'
        });
      }
      const deleted_at = 1;
      let deletedCategory = await SurveyCategory.findByIdAndUpdate(id, {
        deleted_at
      });
      return Response.successResponseWithoutData(res, SUCCESS, res.__('deleteCategorySuccess'));
    } catch (error) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
