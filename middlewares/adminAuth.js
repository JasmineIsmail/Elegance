const isLogin = (req, res, next) => {
    if (req.session.admin_id) {
      next();
    } else {
      res.redirect("/admin/login");
    }
  };
  
  const isLogout = (req, res, next) => {
    if (req.session.admin_id) {
       res.redirect("/admin/dashboard");
    }
    next();
  };
  
  module.exports = {
    isLogin,
    isLogout,
  };
  