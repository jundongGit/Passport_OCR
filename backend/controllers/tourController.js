const Tour = require('../models/Tour');
const Tourist = require('../models/Tourist');

exports.createTour = async (req, res) => {
  try {
    const { productName, departureDate } = req.body;
    
    const newTour = new Tour({
      productName,
      departureDate
    });
    
    const savedTour = await newTour.save();
    res.status(201).json({
      success: true,
      data: savedTour
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
    const tours = await Tour.find().sort({ departureDate: -1 });
    
    // 如果是销售人员请求，添加该销售人员的游客数量和状态统计
    if (req.headers.authorization && req.salesperson && req.salesperson.role === 'salesperson') {
      const toursWithCount = await Promise.all(tours.map(async (tour) => {
        // 总游客数
        const touristCount = await Tourist.countDocuments({
          tourId: tour._id,
          salespersonId: req.salesperson._id
        });
        
        // 已验证游客数
        const verifiedCount = await Tourist.countDocuments({
          tourId: tour._id,
          salespersonId: req.salesperson._id,
          uploadStatus: 'verified'
        });
        
        // 待处理游客数（包括pending、uploaded、rejected）
        const pendingCount = await Tourist.countDocuments({
          tourId: tour._id,
          salespersonId: req.salesperson._id,
          uploadStatus: { $in: ['pending', 'uploaded', 'rejected'] }
        });
        
        return {
          ...tour.toObject(),
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
        const totalTourists = await Tourist.countDocuments({ tourId: tour._id });
        const verifiedTourists = await Tourist.countDocuments({ 
          tourId: tour._id, 
          uploadStatus: 'verified' 
        });
        const pendingTourists = await Tourist.countDocuments({ 
          tourId: tour._id, 
          uploadStatus: { $in: ['pending', 'uploaded', 'rejected'] }
        });
        
        return {
          ...tour.toObject(),
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
    const tour = await Tour.findById(req.params.id);
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
    const tour = await Tour.findByIdAndUpdate(
      req.params.id,
      { productName, departureDate, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
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
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndDelete(req.params.id);
    
    if (!tour) {
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