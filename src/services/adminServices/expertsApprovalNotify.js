'use strict';

const { Notification, Users } = require('@models');
const {
    SENT_TO_USER_TYPE,
    NOTIFICATION_TYPE,
    USER_TYPE,
    ACCOUNT_STATUS,
    NOTIFICATION_ACTION,
} = require('@services/Constant');
const { sendNotification } = require('@services/Notify');
const { EXPERT_APPROVAL_MESSAGE, EXPERT_APPROVAL_REQUEST } = require('../Constant');
const { toObjectId } = require('../Helper');

module.exports = {
    /**
     * @description This function is used to send approval request notification to super admins
     * @param {*} userName
     * @param {*} fromUserId
     */
    sendApprovalRequest: async (userName, fromUserId) => {
        const superAdminTokens = await Users.aggregate([
            {
                $match: {
                    user_type: USER_TYPE.SUPER_ADMIN,
                    status: ACCOUNT_STATUS.ACTIVE
                }
            },
            {
                $lookup: {
                    from: 'device_tokens',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'result'
                }
            },
            {
                $unwind: {
                    path: '$result',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: null,
                    deviceTokens: {
                        $addToSet: '$result.device_token'
                    },
                    toUserIds: {
                        $addToSet: '$_id'
                    }
                }
            }
        ]);
        if (
            superAdminTokens.length > 0 &&
            superAdminTokens[0].toUserIds &&
            superAdminTokens[0].deviceTokens.length > 0
        ) {
            const reqData = {
                title: EXPERT_APPROVAL_REQUEST,
                message: `${userName}` + EXPERT_APPROVAL_MESSAGE.REQUEST,
                notificationType: NOTIFICATION_TYPE.EXPERT_VERIFICATON
            };
            const newData = {
                title: EXPERT_APPROVAL_REQUEST,
                message: `${userName}` + EXPERT_APPROVAL_MESSAGE.REQUEST,
                sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
                from_user_id: fromUserId,
                type: NOTIFICATION_TYPE.EXPERT_VERIFICATON,
                to_user_ids: superAdminTokens[0].toUserIds
            };
            await Notification.create(newData);
            await sendNotification(
                superAdminTokens[0].deviceTokens,
                reqData.message,
                reqData,
                NOTIFICATION_ACTION.EXPERT_VERIFICATON
            );
        }
    },

    /**
    * @description This function is used to send approval request notification to super admins
    * @param {*} userName
    * @param {*} fromUserId
    */
    sendApprovalAccept: async (userName, fromUserId, toUserId) => {
        const expertId = await Users.aggregate([
            {
                $match: {
                    _id: toObjectId(toUserId)
                }
            },
            {
                $lookup: {
                    from: 'device_tokens',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'result'
                }
            },
            {
                $unwind: {
                    path: '$result',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: null,
                    deviceTokens: {
                        $addToSet: '$result.device_token'
                    },
                    toUserIds: {
                        $addToSet: '$_id'
                    }
                }
            }
        ]);
        if (
            expertId.length > 0 &&
            expertId[0].toUserIds &&
            expertId[0].deviceTokens.length > 0
        ) {
            const reqData = {
                title: EXPERT_APPROVAL_REQUEST,
                message: `${userName}` + EXPERT_APPROVAL_MESSAGE.APPROVE,
                notificationType: NOTIFICATION_TYPE.EXPERT_VERIFICATON
            };
            const newData = {
                title: EXPERT_APPROVAL_REQUEST,
                message: `${userName}` + EXPERT_APPROVAL_MESSAGE.APPROVE,
                sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
                from_user_id: fromUserId,
                type: NOTIFICATION_TYPE.EXPERT_VERIFICATON,
                to_user_ids: expertId[0].toUserIds
            };
            await Notification.create(newData);
            await sendNotification(
                expertId[0].deviceTokens,
                reqData.message,
                reqData,
                NOTIFICATION_ACTION.EXPERT_VERIFICATON
            );
        }
    },

    /**
     * @description This function is used to send approval request notification to super admins
     * @param {*} userName
     * @param {*} fromUserId
     */
    sendApprovalReject: async (userName, fromUserId, toUserId) => {
        const expertId = await Users.aggregate([
            {
                $match: {
                    _id: toObjectId(toUserId)
                }
            },
            {
                $lookup: {
                    from: 'device_tokens',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'result'
                }
            },
            {
                $unwind: {
                    path: '$result',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: null,
                    deviceTokens: {
                        $addToSet: '$result.device_token'
                    },
                    toUserIds: {
                        $addToSet: '$_id'
                    }
                }
            }
        ]);
        if (
            expertId.length > 0 &&
            expertId[0].toUserIds &&
            expertId[0].deviceTokens.length > 0
        ) {
            const reqData = {
                title: EXPERT_APPROVAL_REQUEST,
                message: `${userName}` + EXPERT_APPROVAL_MESSAGE.REJECT,
                notificationType: NOTIFICATION_TYPE.EXPERT_VERIFICATON
            };
            const newData = {
                title: EXPERT_APPROVAL_REQUEST,
                message: `${userName}` + EXPERT_APPROVAL_MESSAGE.REJECT,
                sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
                from_user_id: fromUserId,
                type: NOTIFICATION_TYPE.EXPERT_VERIFICATON,
                to_user_ids: expertId[0].toUserIds
            };
            await Notification.create(newData);
            await sendNotification(
                expertId[0].deviceTokens,
                reqData.message,
                reqData,
                NOTIFICATION_ACTION.EXPERT_VERIFICATON
            );
        }
    },

};
