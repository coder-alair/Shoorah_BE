'use strict';

const BelovedChild = require('../../../models/BelovedOrChild');
const Affirmation = require('../../../models/Affirmation');
const { SUCCESS, FAIL } = require('../../../services/Constant');
const { convertObjectKeysToCamelCase } = require('../../../services/Helper');
const Response = require('../../../services/Response');
const { addBelovedChildValidation,getBelovedChildValidation,deleteBelovedChildValidation } = require('../../../services/userValidations/belovedChildValidation');

module.exports = {
  /**
* @description This function is used to add user mood emotions for a day 
* @param {*} req
* @param {*} res
* @return {*}
*/

  addBeloveChild: async (req, res) => {
    try {
      const reqParam = req.body;
      addBelovedChildValidation(reqParam, res, async (validate) => {
        if (validate) {
            let updateData = {
              user_id: req.authUserId,
              name: reqParam.name,
              date_of_birth: new Date(reqParam.dob),
              gender: reqParam.gender,
              affirmation_focus_ids: reqParam.affirmation,
              family_type:reqParam.familyType
                        };
 
            await BelovedChild.create(updateData);

            const resObj = {
              name: reqParam.name,
              dateOfBirth: new Date(reqParam.dob),
              gender: reqParam.gender,
              affirmationFocuses: reqParam.affirmation
              };
            if(reqParam.family_type ===  'child'){
              return Response.successResponseData(res, resObj, SUCCESS, res.__('childAdded'));
            }else{
              return Response.successResponseData(res, resObj, SUCCESS, res.__('belovedAdded'));
            }
           
        }else {
          return Response.internalServerErrorResponse(res);
        }
      })
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  }, 
    /**
 * @description This function is used to get detailed list of folders.
 * @param {*} req
 * @param {*} res
 * @returns {*}
 */
  getBelovedChild: async (req, res) => {
    try {
        const reqParam = req.query;
        getBelovedChildValidation(reqParam, res, async (validate) => {
          let findCondition ={};
          if (validate) {
           
            if(reqParam.familyType ==="all"){
              findCondition = {
                user_id: req.authUserId,
                my_family_delete: false,
                deleted_at:null
              };
            }else{
              findCondition = {
                user_id: req.authUserId,
                my_family_delete: false,
                family_type: reqParam.familyType,
                deleted_at:null
              };
            }
         
          

          const children = await BelovedChild.find(findCondition);
                return Response.successResponseData(
                    res,
                    convertObjectKeysToCamelCase(children),
                    SUCCESS,
                    res.__('belovedChildSuccess')
                );
            } else {
                return Response.internalServerErrorResponse(res);
            }
        });
    } catch (err) {
      console.log("error---"+err);
        return Response.internalServerErrorResponse(res); 
    }
},

getChildAffirmation: async (req, res) => {
  try {
           
    let findCondition = {};

    if (req.query.affirmationMode) {
      findCondition.affirmation_mode = req.query.affirmationMode
    }
     
         console.log(req.query);
        const affirmation = await Affirmation.find(findCondition);
              return Response.successResponseData(
                  res,
                  convertObjectKeysToCamelCase(affirmation),
                  res.__('childAffirmationSuccess')
              );
  } catch (err) {
    console.log("error---"+err);
      return Response.internalServerErrorResponse(res); 
  }
},

  deleteBelovedChild: async (req, res) => { 
  try {
      const reqParam = req.query;
      console.log("reqParam--"+reqParam);
      deleteBelovedChildValidation(reqParam, res, async (validate) => {
        if (validate) {
       
        const { id } = reqParam;

        const result = await BelovedChild.findByIdAndUpdate(id,{ deleted_at: new Date() });
        if (!result) {
          return Response.notFoundResponse(res, res.__('belovedChildNotFound'));
        }    
        return Response.successResponseData(res, null, SUCCESS, res.__('belovedChildDeleted'));
          } else {
              return Response.internalServerErrorResponse(res);
          }
      });
  } catch (err) {
      return Response.internalServerErrorResponse(res);
  } 
},
} 