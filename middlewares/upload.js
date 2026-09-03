const path = require("path");
const multer=require("multer");

// Multer configuration for file uploads
const storage = multer.memoryStorage();
  
const upload = multer({
     storage: storage,
     fileFilter(req, file, cb) {
      if (!file.originalname.match(/\.(png|jpg|jpeg)$/i)) { 
         // upload only png and jpg format
         return cb(new Error('Please upload a Image'))
       }
     cb(null, true)
  },
     limits:{
      fileSize :2*1024*1024
     }
});
module.exports=upload;
