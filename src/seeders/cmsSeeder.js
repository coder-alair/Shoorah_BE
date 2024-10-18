'use strict';

const { Cms } = require('@models');
const { CMS_ALIAS } = require('@services/Constant');

module.exports = {
  run: () =>
    new Promise((resolve) => {
      (async () => {
        const cmsArray = [
          { title: 'About Us', alias: CMS_ALIAS.ABOUT_US },
          { title: 'Privacy Policy', alias: CMS_ALIAS.PRIVACY_POLICY },
          { title: 'Terms & Conditions', alias: CMS_ALIAS.TERM_AND_CONDITION }
        ];
        for (let i = 0; i < cmsArray.length; i++) {
          const cmsDetails = {
            title: cmsArray[i].title,
            alias: cmsArray[i].alias
          };
          await Cms.findOneAndUpdate(
            { alias: cmsArray[i].alias },
            {
              $setOnInsert: cmsDetails
            },
            { upsert: true }
          )
            .then(() => {
              console.log('cms data seeded');
            })
            .catch((err) => {
              console.log('Oops!', err);
            });
        }
      })();
      resolve(true);
    })
};
