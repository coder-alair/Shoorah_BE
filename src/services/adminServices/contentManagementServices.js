/* eslint-disable camelcase */
'use strict';

module.exports = {
  /**
   * @description This function is used as object-transformer for all get content list APIs response
   * @param {*} array
   * @returns {*}
   */
  contentResponseObjTransformerList: (array) => {
    if (array.length > 0) {
      const resArray = array.map((el) => {
        const { created_by, approved_by, updated_by, contentApproval, focus_ids, ...rest } = el;
        return {
          createdBy: created_by,
          approvedBy: approved_by,
          updatedBy: updated_by,
          approvalStatus: contentApproval?.content_status,
          focus: focus_ids,
          ...rest
        };
      });
      return resArray;
    } else {
      return [];
    }
  },

  /**
   * @description This function is used as object-transformer for all get content by id APIs response
   * @param {*} Object
   * @returns {*}
   */
  contentResponseObjTransformer: (Object) => {
    const { created_by, approved_by, updated_by, contentApproval, focus_ids, ...rest } = Object;
    return {
      createdBy: created_by,
      approvedBy: approved_by,
      updatedBy: updated_by,
      approvalStatus: contentApproval?.content_status,
      focus: focus_ids,
      comments: contentApproval?.comments
        ?.map((x) => {
          const { commented_by, ...rest } = x;
          return { commented_by: commented_by?.name, ...rest };
        })
        .reverse(),
      ...rest
    };
  }
};
