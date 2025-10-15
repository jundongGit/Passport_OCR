'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('salespersons', 'username', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
      after: 'name'
    });
    
    // 为现有记录设置默认用户名（基于邮箱前缀）
    await queryInterface.sequelize.query(`
      UPDATE salespersons 
      SET username = SUBSTRING_INDEX(email, '@', 1)
      WHERE username IS NULL
    `);
    
    // 将字段设为非空
    await queryInterface.changeColumn('salespersons', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('salespersons', 'username');
  }
};
