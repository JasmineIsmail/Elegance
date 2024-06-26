const Categories = require('../model/categoryModel') ;
const Product = require('../model/productModel');
const Cart = require('../model/cartModel');
const User = require('../model/userModel');
const Address = require('../model/addressModel');
const productModel = require('../model/productModel');
const CategoryOffer = require('../model/categoryOfferModel');
const ProductOffer = require('../model/productOfferModel');

//LOAD CART PAGE

const loadCart = async (req,res)=>{
    try {
        const userId= req.session.user_id;
        const userData = await User.findOne({_id:userId});
        let cartData = await Cart.findOne({userName:userId}).populate({path:"products.productId"});
        if(userId){
            if(cartData){
                if(cartData.products.length>0){
                    const products = cartData.products;
                    let cartImages=[]
                    let totalPriceperItem =[];
                    let discountPerItem = [];
                    for(const item of products){
                        const productId = item.productId._id;
                        const productData = await Product.findOne({_id:productId});
                        cartImages.push(productData.images[0]);
                        item.offerPrice = Math.floor(await checkAllOffer(item.productId));
                        const quantity= item.count;
                        totalPriceperItem.push(quantity * item.productPrice); 
                        discountPerItem.push(quantity * item.offerPrice);
                    }
                   const cartItems= products.length;
                   const total = await Cart.aggregate([
                    {$match : {userName:userData._id}},
                    {$unwind: "$products"},
                    {
                        $project  :{
                            productPrice : '$products.productPrice',
                            count : '$products.count',
                        } 
                    },
                    { $group :{
                        _id:null,
                        total :{$sum:{$multiply:["$productPrice","$count"]}},
                    }}
                ]);
             
                const Total = total[0].total;
                
                const reducedTotal = discountPerItem.reduce((acc,curr)=> acc+curr);
                if(Total == reducedTotal){
                    cartData= await Cart.findOneAndUpdate({userName:userData._id},{$set:{totalPrice:Total}});
                }else{
                    cartData= await Cart.findOneAndUpdate({userName:userData._id},{$set:{totalPrice:reducedTotal}});
                }
                
                res.render('./users/shoping-cart',{products,cartData,Total,userId,totalPriceperItem,cartImages,cartItems,discountPerItem,reducedTotal});
                }else{
                    res.render('./users/emptyCart',{message:"No products in cart!!"});
                }
            }
        }else{
         res.redirect('/login');   
        }
    } catch (error) {
        console.error(error);
        res.send('error while loading cart');
    }
}
const checkAllOffer = async (product)=>{
    const categoryOffer = await CategoryOffer.findOne({category:product.category});
    const productOffer = await ProductOffer.findOne({product:product._id});
    if(categoryOffer){
        return  categoryOfferPrice= calculateDiscountedPrice(product.price,categoryOffer.discountPercentage)
    }else if(productOffer){
      return productOfferPrice =calculateDiscountedPrice(product.price,productOffer.discountPercentage)
    }else if(categoryOffer && productOffer){
          return (categoryOfferPrice  > productOfferPrice)?categoryOfferPrice :productOfferPrice;
    }else {
       return product.price; // No offer price
    }
  }
  
  const calculateDiscountedPrice = (originalPrice, discountValue) => {
    return originalPrice - (originalPrice * discountValue) / 100; // For percentage-based discount
  };

//ADD TO CART

const addToCart = async (req,res)=>{
    try {
        const productId  =req.query.id.trim();
       // const productCount = req.query.count;
        req.session.productId=productId;
        const productData = await Product.findOne({_id:productId});
        productData.offerPrice=  Math.floor(await checkAllOffer(productData));
        const userId = req.session.user_id;
        const user = await User.findOne({_id:userId});
        if(user){
            const cartData = await Cart.findOne({userName:user._id});
            if(productData.productQuantity >0){
                if(cartData){
                    const productExist = cartData.products.findIndex((product)=>productId === product.productId.toString());
                    
                    if(productExist !== -1){
                        await Cart.updateOne({userName:user._id,'products.productId':productData._id},{$inc:{'products.$.count':1}});
                    }else{
                        //const priceUpdate= productData.price+cartData.totalPrice;
                        await Cart.findOneAndUpdate(
                            {userName:user._id},
                            {$push:{products:
                                 {productId:productData._id,
                                  productPrice:productData.price,
                                  offerPrice:productData.offerPrice
                                }
                                }
                            }
                         );
                    }
                }else{
                    const cart = new Cart({
                        userName:user._id,
                        products:[{
                            productId :productData._id,
                            productPrice : productData.price,
                            offerPrice:productData.offerPrice
                        }],
                       // totalPrice:productData.price
                    });
                    const cartItem =await cart.save();
                }
            }else{
                res.json({stockOut: true});
            }
        res.redirect('/viewCart');
        }else{
            res.redirect('/login');
        }
    } catch (error) {
        console.error(error);   
        res.send('Error while adding to cart!'); 
    }
}

// REMOVE ITEM FROM CART

const deleteItem =  async (req,res) =>{
    try {
        const user= req.session.user_id;
        const productId = req.query.id;
       
        const cart = await Cart.findOne({userName:user});
        const product = cart.products.find(p => p.productId.toString() === productId);
        const productTotalPrice = product.count * product.productPrice;

        const updatedPrice = cart.totalPrice - productTotalPrice;

        // Save the updated cart
   
        await Cart.updateOne({userName:user},{$pull:{products:{productId}}});
        await Cart.updateOne({ userName: user },{ $set: { totalPrice: updatedPrice } });
        res.redirect('/viewCart');
    } catch (error) {
        console.log(error.message);
        res.send("error in deleting product");
    }
} 

// change product quantity
const changeProductQuantity = async (req, res) => {
    try {
      const cartId = req.body.cart;
      const proId = req.body.product;
      let count = req.body.count;
      let quantity = req.body.quantity;
      count = parseInt(count);
      quantity = parseInt(quantity);
      const productData = await Product.findById({_id:proId});
      productData.offerPrice=Math.floor(await checkAllOffer(productData));
      const cartData = await Cart.findOne({userName:req.session.user_id});
      let updatedPrice= cartData.totalPrice + (productData.price*count);
      const totalWithDiscount= cartData.totalPrice +(productData.offerPrice*count);
      if (quantity+count < 1) {
            res.json({removeProductPrompt:true})
      }else if(quantity+count > productData.productQuantity){
             res.json({stockOut :true});
      }else {
            if(productData.price === productData.offerPrice){
                await Cart.updateOne({ _id: cartId, 'products.productId': proId },
                { $inc: { 'products.$.count': count } ,$set: { totalPrice: updatedPrice } }
                );
            }else{
                await Cart.updateOne({ _id: cartId, 'products.productId': proId },
                { $inc: { 'products.$.count': count } ,$set: { totalPrice: totalWithDiscount } }
                );
            }
         
          res.json({success: true, updatedPrice,totalWithDiscount});
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  
module.exports={
    loadCart,
    addToCart,
    deleteItem,
    changeProductQuantity
}