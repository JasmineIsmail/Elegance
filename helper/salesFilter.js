const Order= require('../model/orderModel');
const salesFilter= async(req,res)=>{
    try {
        const filter= req.params.filter;
        let pipeline = [];
        switch(filter){
            case "week" :
                pipeline =[
                    {$match :{status : "Delivered"}},
                    {$group :{
                        _id:{
                            $dateToString :{
                                format :"%Y-%U",
                                date : "$date"
                            }
                        },
                        totalRevenue :{ $sum : "$Amount"},
                        totalOrders :{$sum :1}
                    }},
                    {$sort:{"_id":1}}
                ]
                break;
                case "month":
                pipeline = [
                    { $match: { status: "Delivered" } },
                    {
                        $group: {
                            _id: {
                                month: { $month: "$date" },
                                year: { $year: "$date" }
                            },
                            totalRevenue: { $sum: "$Amount" },
                            totalOrders: { $sum: 1 }
                        }
                    },
                    { $sort: { "_id.year": 1, "_id.month": 1 } }
                ];
                break;
                 case "year":
                pipeline = [
                    { $match: { status: "Delivered" } },
                    {
                        $group: {
                            _id: { $year: "$date" },
                            totalRevenue: { $sum: "$Amount" },
                            totalOrders: { $sum: 1 }
                        }
                    },
                    { $sort: { "_id": 1 } }
                ];
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: "Invalid filter"
                });
        }
        
        const data = await Order.aggregate(pipeline);
        res.json({
            success: true,
            data
        });;
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
}


module.exports =salesFilter;