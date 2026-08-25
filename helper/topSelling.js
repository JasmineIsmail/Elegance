const Order= require('../model/orderModel');
//TOP SELLING PRODUCT
const topSellingProduct= async function (){
    const result=  await Order.aggregate([
        {$match :{ status :"Delivered"}},
        {$unwind:'$products'},
         {$group:{
            _id:'$products.productId',
            totalSold:{$sum:'$products.count'}
        }},
        {$lookup:{
            from: 'products',
            foreignField:'_id',
            localField:'_id',
            as:'product'
        }},
        {$unwind:'$product'},
        {
            $project:{
                _id:0,
                productId:'$product._id',
                price:'$product.price',
                name:'$product.Name',
                totalSold:1
            }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
    ])
    return result;
}

// TOP SELLING CATEGORY

async function topSellingCategory(){
    const result = await Order.aggregate([
        {$match: {status: "Delivered"}},
        {$unwind:'$products'},
        {   $lookup:{
            from:'products',
            localField: 'products.productId',
            foreignField: '_id',
            as:'product'
        }}, 
        { $unwind : '$product'},
        {   $group:{
                _id:'$product.category',
                totalSold : {$sum:'$products.count'}
        }},
        {   $lookup:{
                    from:'categories',
                    localField:'_id',
                    foreignField:'_id',
                    as:'category'
        }},
        { $unwind :"$category"},
        {
            $project :{
                _id :0 ,
                category :"$category.categoryName",
                totalSold :1
            }
        },
        {
            $sort :{ totalSold :-1}
        },
        {
            $limit :10
        }
    ]);
    return result;
}
module.exports = {topSellingProduct,topSellingCategory}