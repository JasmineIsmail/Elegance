const User = require('../model/userModel');
//-------------------------------------


// Middleware if user is loging or checking is user blocked!
const isLogin = async (req, res, next) => {
  if (req.session.user_id) {
    const userData = await User.findOne({_id:req.session.user_id});
    if(userData && !userData.is_blocked){
      next();
    }else{
      res.json("Accedd denied your account is blocked!");
    }
  } else {
    res.redirect("/users/login");
  }
};




// Middleware if user is logout
const isLogout = async (req, res, next) => {
  if (req.session.user_id) {
    res.redirect("/users/home");
  }
  next();
};

module.exports = {
  isLogin,
  isLogout,
};
