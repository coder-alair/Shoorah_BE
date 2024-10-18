'use strict';

const Response = require('@services/Response');
const {
    USER_TYPE,
    ACCOUNT_STATUS,
    FAIL,
    SUCCESS,
} = require('@services/Constant');
const { default: axios } = require('axios');
const { Meditation, ShoorahPods, Sound } = require('../../../models');
const { toObjectId, unixTimeStamp, makeRandomDigit } = require('@services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const Breathwork = require('../../../models/Breathwork');

function replaceText(content) {
    return content.replace(/the kid in the school/g, 'the person in the park');
}

module.exports = {
    /**
     * @description This function is used to get srt data
     * @param {*} req
     * @param {*} res
     * @returns {*}
     */
    updateSrtData: async (req, res) => {
        try {
            const reqParam = req.body;
            let srtPreSignUrl = '';

            if (parseInt(reqParam.contentType) == 3) {
                let updateData={
                    meditation_srt:null
                }
                let meditation = await Meditation.findOne({ _id: toObjectId(reqParam.contentId) });
            
                if(meditation){
                    if (meditation?.meditation_srt) {
                        await removeOldImage(
                            meditation.meditation_srt,
                            'admins/meditations/srt',
                            res
                        );
                    }
    
                    if (reqParam.srtUrl) {
                        const srtExtension = reqParam.srtUrl.split('/')[1];
                        const srtName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
                            4
                        )}.${srtExtension}`;
                        srtPreSignUrl = await getUploadURL(
                            reqParam.srtUrl,
                            srtName,
                            'admins/meditations/srt'
                        );
    
                        updateData={
                            ...updateData,
                            meditation_srt:srtName
                        }
                    }
    
                    await Meditation.updateOne({_id: toObjectId(reqParam.contentId)},{
                        $set:updateData
                    })
                }else{
                return Response.successResponseData(res, null, FAIL, res.__('contentNotFound'));
                }


            } else if (parseInt(reqParam.contentType) == 4) {
                let updateData={
                    sound_srt:null
                }
                let sound = await Sound.findOne({ _id: toObjectId(reqParam.contentId) });
            
                if(sound){
                    if (sound?.sound_srt) {
                        await removeOldImage(
                            pods.pods_srt,
                            'admins/sounds/srt',
                            res
                        );
                    }
    
                    if (reqParam.srtUrl) {
                        const srtExtension = reqParam.srtUrl.split('/')[1];
                        const srtName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
                            4
                        )}.${srtExtension}`;
                        srtPreSignUrl = await getUploadURL(
                            reqParam.srtUrl,
                            srtName,
                            'admins/sounds/srt'
                        );
    
                        updateData={
                            ...updateData,
                            sound_srt:srtName
                        }
                    }
    
                    await Sound.updateOne({_id: toObjectId(reqParam.contentId)},{
                        $set:updateData
                    })
                }else{
                return Response.successResponseData(res, null, FAIL, res.__('contentNotFound'));
                }
            } else if (parseInt(reqParam.contentType) == 5) {
                let updateData={
                    pods_srt:null
                }
                let pods = await ShoorahPods.findOne({ _id: toObjectId(reqParam.contentId) });
            
                if(pods){
                    if (pods?.pods_srt) {
                        await removeOldImage(
                            pods.pods_srt,
                            'admins/shoorah_pods/srt',
                            res
                        );
                    }
    
                    if (reqParam.srtUrl) {
                        const srtExtension = reqParam.srtUrl.split('/')[1];
                        const srtName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
                            4
                        )}.${srtExtension}`;
                        srtPreSignUrl = await getUploadURL(
                            reqParam.srtUrl,
                            srtName,
                            'admins/shoorah_pods/srt'
                        );
    
                        updateData={
                            ...updateData,
                            pods_srt:srtName
                        }
                    }
    
                    await ShoorahPods.updateOne({_id: toObjectId(reqParam.contentId)},{
                        $set:updateData
                    })
                }else{
                return Response.successResponseData(res, null, FAIL, res.__('contentNotFound'));
                }
            }else if(parseInt(reqParam.contentType)==11){
                let updateData={
                    breathwork_srt:null
                }
                let breathwork = await Breathwork.findOne({ _id: toObjectId(reqParam.contentId) });
            
                if(breathwork){
                    if (breathwork?.breathwork_srt) {
                        await removeOldImage(
                            breathwork.breathwork_srt,
                            'admins/breathworks/srt',
                            res
                        );
                    }
    
                    if (reqParam.srtUrl) {
                        const srtExtension = reqParam.srtUrl.split('/')[1];
                        const srtName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
                            4
                        )}.${srtExtension}`;
                        srtPreSignUrl = await getUploadURL(
                            reqParam.srtUrl,
                            srtName,
                            'admins/breathwork/srt'
                        );
    
                        updateData={
                            ...updateData,
                            breathwork_srt:srtName
                        }
                    }
    
                    await Breathwork.updateOne({_id: toObjectId(reqParam.contentId)},{
                        $set:updateData
                    })
                }else{
                return Response.successResponseData(res, null, FAIL, res.__('contentNotFound'));
                }
            }else {
                return Response.successResponseData(res, null, FAIL, res.__('updateSrtDataFail'));
            }

            let message = 'File updated successfully';

            return Response.successResponseData(res, srtPreSignUrl, SUCCESS, res.__('updateSrtDataSuccess'));
        } catch (err) {
            console.error(err);
            return Response.internalServerErrorResponse(res);
        }
    },


};
