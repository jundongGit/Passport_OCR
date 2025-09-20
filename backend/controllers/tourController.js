const { Tour, Tourist } = require('../models');
const { Op } = require('sequelize');

exports.createTour = async (req, res) => {
  try {
    const { productName, departureDate } = req.body;
    
    const newTour = await Tour.create({
      productName,
      departureDate
    });
    
    res.status(201).json({
      success: true,
      data: newTour
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.getAllTours = async (req, res) => {
  try {
    const tours = await Tour.findAll({
      order: [['departureDate', 'DESC']]
    });
    
    // 如果是销售人员请求，添加该销售人员的游客数量和状态统计
    if (req.headers.authorization && req.salesperson && req.salesperson.role === 'salesperson') {
      const toursWithCount = await Promise.all(tours.map(async (tour) => {
        // 总游客数
        const touristCount = await Tourist.count({
          where: {
            tourId: tour.id,
            salespersonId: req.salesperson.id
          }
        });
        
        // 已验证游客数
        const verifiedCount = await Tourist.count({
          where: {
            tourId: tour.id,
            salespersonId: req.salesperson.id,
            uploadStatus: 'verified'
          }
        });
        
        // 待处理游客数（包括pending、uploaded、rejected）
        const pendingCount = await Tourist.count({
          where: {
            tourId: tour.id,
            salespersonId: req.salesperson.id,
            uploadStatus: { [Op.in]: ['pending', 'uploaded', 'rejected'] }
          }
        });
        
        return {
          ...tour.toJSON(),
          touristCount,
          verifiedCount,
          pendingCount
        };
      }));
      
      return res.json({
        success: true,
        data: toursWithCount
      });
    }
    
    // 管理员或其他情况，返回基本的旅游产品列表
    if (req.headers.authorization && req.salesperson && req.salesperson.role === 'admin') {
      // 为管理员添加每个产品的总游客统计
      const toursWithAdminStats = await Promise.all(tours.map(async (tour) => {
        const totalTourists = await Tourist.count({ where: { tourId: tour.id } });
        const verifiedTourists = await Tourist.count({ 
          where: { 
            tourId: tour.id, 
            uploadStatus: 'verified' 
          }
        });
        const pendingTourists = await Tourist.count({ 
          where: { 
            tourId: tour.id, 
            uploadStatus: { [Op.in]: ['pending', 'uploaded', 'rejected'] }
          }
        });
        
        return {
          ...tour.toJSON(),
          totalTourists,
          verifiedTourists,
          pendingTourists
        };
      }));
      
      return res.json({
        success: true,
        data: toursWithAdminStats
      });
    }
    
    res.json({
      success: true,
      data: tours
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getTourById = async (req, res) => {
  try {
    const tour = await Tour.findByPk(req.params.id);
    if (!tour) {
      return res.status(404).json({
        success: false,
        error: 'Tour not found'
      });
    }
    res.json({
      success: true,
      data: tour
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    const { productName, departureDate } = req.body;
    const [updatedRowsCount] = await Tour.update(
      { productName, departureDate },
      { 
        where: { id: req.params.id },
        returning: true
      }
    );
    
    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tour not found'
      });
    }
    
    const updatedTour = await Tour.findByPk(req.params.id);
    
    res.json({
      success: true,
      data: updatedTour
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    const deletedRowsCount = await Tour.destroy({
      where: { id: req.params.id }
    });
    
    if (deletedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tour not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Tour deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};