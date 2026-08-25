const Order= require('../model/orderModel');
const getSalesReport = async ( req , res ) => {
    try {
        const {timeRange} = req.body;
        let fromDate = new Date;
        let toDate = new Date();
        switch(timeRange){
            case "daily":
                fromDate.setDate(fromDate.getDate()-1)
                break;
            case "weekly" :
                fromDate.setDate(fromDate.getDate() - 7);
                break;
            case "yearly":
                fromDate.setFullYear(fromDate.getFullYear() - 1);
                break;
            default :
                return res.redirect("/admin/dashboard");
        }
        const salesData = await Order.find({
            status : "Delivered" ,
            date : {
                $gte : fromDate ,
                $lte : toDate
            }
        })
        .populate("userId")
        .populate("products.productId")
        .sort({date :-1})
        .lean();
        res.render("./admin/salesReport" , { salesData , fromDate , toDate });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}
const salesOnDate = async(req,res)=>{
    try {
        let { fromDate , toDate } = req.body;
        fromDate = new Date(fromDate);
        toDate = new Date(toDate);
         toDate.setHours(23, 59, 59, 999);
        const salesData = await Order.find({
            status : "Delivered" ,
            date : {
                $gte : fromDate ,
                $lte : toDate
            }
        })
        .populate("userId")
        .populate("products.productId")
        .sort({date :-1})
        .lean();
        res.render("./admin/salesReport" , { salesData , fromDate , toDate });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

module.exports = {getSalesReport,salesOnDate}