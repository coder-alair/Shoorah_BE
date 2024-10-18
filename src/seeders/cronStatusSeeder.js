'use strict';

const { CronStatus } = require('@models');
const { CRON_TYPE } = require('@services/Constant');

module.exports = {
  run: () =>
    new Promise((resolve) => {
      (async () => {
        const cronTypeArray = Object.values(CRON_TYPE);
        for (let i = 0; i < cronTypeArray.length; i++) {
          const cronDetails = {
            cron_type: cronTypeArray[i],
            cron_status: true
          };
          await CronStatus.findOneAndUpdate(
            { cron_type: cronDetails.cron_type },
            {
              $setOnInsert: {
                cron_status: true
              }
            },
            { upsert: true }
          )
            .then(() => {
              console.log('cron type data seeded');
            })
            .catch((err) => {
              console.log('Oops!', err);
            });
        }
      })();
      resolve(true);
    })
};
