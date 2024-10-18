'use strict';

const { generatePassword } = require('@services/authServices');
const { Users, ModuleAccess } = require('@models');
const { USER_TYPE, STATUS } = require('@services/Constant');

module.exports = {
  run: () =>
    new Promise((resolve) => {
      (async () => {
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminsArray = [
          { name: 'Jay Thakkar', email: 'jay.thakkar@mindinventory.com' },
          { name: 'Rushi Patel', email: 'rushi.patel@mindinventory.com' },
          { name: 'Parth Pandya', email: 'parth.pandya@mindinventory.com' }
        ];
        const hashPassword = await generatePassword(adminPassword);
        for (let i = 0; i < adminsArray.length; i++) {
          const adminDetails = {
            name: adminsArray[i].name,
            password: hashPassword,
            user_type: USER_TYPE.SUPER_ADMIN,
            is_email_verified: true
          };
          const filterData = {
            email: adminsArray[i].email,
            status: {
              $ne: STATUS.DELETED
            },
            user_type: {
              $ne: USER_TYPE.USER
            }
          };
          await Users.findOneAndUpdate(
            filterData,
            {
              $setOnInsert: adminDetails
            },
            { upsert: true, new: true }
          )
            .select('_id')
            .then(async (user) => {
              const filterCondition = {
                user_id: user._id
              };
              const updateCondition = {
                module_access: {
                  earning_module_access: true
                }
              };
              await ModuleAccess.findOneAndUpdate(filterCondition, updateCondition, {
                upsert: true
              });
              console.log('admin data seeded.');
            })
            .catch((err) => {
              console.error('Opps! ', err);
            });
        }
        resolve(true);
      })();
    })
};
