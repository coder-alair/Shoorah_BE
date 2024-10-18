'use strict';

const { Focus } = require('@models');
const Response = require('@services/Response');
const { FAIL, SUCCESS } = require('@services/Constant');
const csv = require('csv-parser');
const stream = require('stream');
const { Category } = require('../../../models');
const { CONTENT_TYPE } = require('../../../services/Constant');

module.exports = {
  /**
   * @description This function is for importing csv files of focus to categories
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  getAllFocus: async (req, res) => {
    // let filterCondition = {
    //     focus_type: 1,
    //     status: 1,
    //     deletedAt: null
    // }
    // let totalFocuses = await Focus.find(filterCondition).select('_id display_name').lean();

    const csvFile = req.files;
    let data = [];
    let focuses = [];

    if (!csvFile || !csvFile[0]) {
      return Response.errorResponseWithoutData(res, 'CSV file is required', FAIL);
    }

    const bufferStream = new stream.PassThrough();
    bufferStream.end(csvFile[0].buffer);

    bufferStream
      .pipe(csv())
      .on('data', (row) => {
        data.push(row);
      })

      .on('end', async () => {
        for (const i of data) {
          focuses.push(i);
          const focus = await Focus.findOne({
            display_name: { $regex: new RegExp(i.focus, 'i') }
          }).select('_id display_name');

          if (focus) {
            // if (focus.display_name == 'Meditation') {

            let alreadyMediCategory = await Category.findOne({
              contentType: CONTENT_TYPE.MEDITATION,
              name: i.meditation
            });

            let alreadyPodsCategory = await Category.findOne({
              contentType: CONTENT_TYPE.SHOORAH_PODS,
              name: i.pods
            });

            let alreadyRitualsCategory = await Category.findOne({
              contentType: CONTENT_TYPE.RITUALS,
              name: i.rituals
            });

            let alreadySoundsCategory = await Category.findOne({
              contentType: CONTENT_TYPE.SOUND,
              name: i.sounds
            });

            if (alreadyMediCategory) {
              let focuses = [...alreadyMediCategory.focuses, focus._id];
              await Category.findByIdAndUpdate(alreadyMediCategory._id, {
                $addToSet: {
                  focuses: focus._id
                }
              });
            } else {
              let category = Category.create({
                name: i.meditation,
                contentType: 3,
                focuses: [focus._id]
              });
            }

            if (alreadyPodsCategory) {
              let focuses = [...alreadyPodsCategory.focuses, focus._id];

              await Category.findByIdAndUpdate(alreadyPodsCategory._id, {
                $addToSet: {
                  focuses: focus._id
                }
              });
            } else {
              let category = Category.create({
                name: i.pods,
                contentType: CONTENT_TYPE.SHOORAH_PODS,
                focuses: [focus._id]
              });
            }

            if (alreadyRitualsCategory) {
              let focuses = [...alreadyRitualsCategory.focuses, focus._id];

              await Category.findByIdAndUpdate(alreadyRitualsCategory._id, {
                $addToSet: {
                  focuses: focus._id
                }
              });
            } else {
              let category = Category.create({
                name: i.rituals,
                contentType: CONTENT_TYPE.RITUALS,
                focuses: [focus._id]
              });
            }

            if (alreadySoundsCategory) {
              await Category.findByIdAndUpdate(alreadySoundsCategory._id, {
                $addToSet: {
                  focuses: focus._id
                }
              });
            } else {
              let category = Category.create({
                name: i.sounds,
                contentType: 4,
                focuses: [focus._id]
              });
            }
          }
        }

        let categories = await Category.find();
        return Response.successResponseData(res, categories, SUCCESS, res.__('focusListSuccess'));
      });
  },

  getAffirmationFocuses: async (req, res) => {
    // let filterCondition = {
    //     focus_type: 1,
    //     status: 1,
    //     deletedAt: null
    // }
    // let totalFocuses = await Focus.find(filterCondition).select('_id display_name').lean();

    const csvFile = req.files;
    let data = [];
    let focuses = [];

    if (!csvFile || !csvFile[0]) {
      return Response.errorResponseWithoutData(res, 'CSV file is required', FAIL);
    }

    const bufferStream = new stream.PassThrough();
    bufferStream.end(csvFile[0].buffer);

    bufferStream
      .pipe(csv())
      .on('data', (row) => {
        data.push(row);
      })

      .on('end', async () => {
        for (const i of data) {
          focuses.push(i);
          const focus = await Focus.findOne({
            display_name: { $regex: new RegExp(i.focus, 'i') },
            focus_type: 2
          }).select('_id display_name');

          if (focus) {
            // if (focus.display_name == 'Meditation') {

            let alreadyAffirmation = await Category.findOne({
              contentType: CONTENT_TYPE.AFFIRMATION,
              name: i.affirmation
            });

            if (alreadyAffirmation) {
              let focuses = [...alreadyAffirmation.focuses, focus._id];
              await Category.findByIdAndUpdate(alreadyAffirmation._id, {
                $addToSet: {
                  focuses: focus._id
                }
              });
            } else {
              let category = Category.create({
                name: i.affirmation,
                contentType: CONTENT_TYPE.AFFIRMATION,
                focuses: [focus._id]
              });
            }
          }
        }

        let categories = await Category.find({ contentType: CONTENT_TYPE.AFFIRMATION });
        return Response.successResponseData(
          res,
          categories,
          SUCCESS,
          res.__('affirmationfocusListSuccess')
        );
      });
  },

  /**
   * @description This function is for get Categories by Content type
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  getCategoriesByContentId: async (req, res) => {
    const { id } = req.params;
    try {
      let filterCondition = {
        contentType: id,
        deletedAt: null
      };

      const categories = await Category.find(filterCondition).lean();
      return Response.successResponseData(
        res,
        categories,
        SUCCESS,
        res.__('categoriesListedSuccessfully')
      );
    } catch (error) {
      return Response.errorResponseWithoutData(res, error.message, FAIL);
    }
  }
};
