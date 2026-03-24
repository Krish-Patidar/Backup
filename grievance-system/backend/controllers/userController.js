const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('departmentId', 'name code');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone }, { new: true });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCreditHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('credits creditHistory totalRewards lastRewardClaim');
    res.json({ success: true, credits: user.credits, history: user.creditHistory, totalRewards: user.totalRewards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.claimReward = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    if (user.lastRewardClaim && user.lastRewardClaim > threeMonthsAgo) {
      return res.status(400).json({ success: false, message: 'Rewards can be claimed every 3 months' });
    }

    if (user.credits < 100) {
      return res.status(400).json({ success: false, message: 'Minimum 100 credits required to claim reward' });
    }

    const rewardAmount = Math.floor(user.credits / 100) * 100;
    const reward = rewardAmount; // ₹1 per credit
    user.credits -= rewardAmount;
    user.totalRewards += reward;
    user.lastRewardClaim = now;
    await user.save();

    res.json({ success: true, message: `₹${reward} reward claimed successfully!`, reward, remainingCredits: user.credits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllWorkers = async (req, res) => {
  try {
    const filter = { role: 'worker', isActive: true };
    if (req.user.role === 'department_admin') filter.departmentId = req.user.departmentId;
    const workers = await User.find(filter).populate('departmentId', 'name').select('-password');
    res.json({ success: true, workers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, role, departmentId, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });

    const user = await User.create({ name, email, role, departmentId, password, isVerified: true });
    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
