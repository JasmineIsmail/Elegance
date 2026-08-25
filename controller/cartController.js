const Product = require('../model/productModel');
const Cart = require('../model/cartModel');
const User = require('../model/userModel');
const CategoryOffer = require('../model/categoryOfferModel');
const ProductOffer = require('../model/productOfferModel');

 const calculateDiscountedPrice = (price, discount) => {
    return price - (price * discount) / 100; // For percentage-based discount
  };
const checkAllOffer = async (product)=>{
    const today = new Date();
    const [categoryOffer,productOffer] = await Promise.all([
        CategoryOffer.findOne({
            category:product.category,
            status: true,
            startDate: { $lte: today },
            expiryDate: { $gte: today }}),
        ProductOffer.findOne({product:product._id,
            status: true,
            startDate: { $lte: today },
            expiryDate: { $gte: today }
        })
    ]) ;
    let offerPrice = product.price;
    if(categoryOffer){
        offerPrice = Math.min(offerPrice,calculateDiscountedPrice(product.price,categoryOffer.discountPercentage));
    }
    if(productOffer){
       offerPrice = Math.min(offerPrice,calculateDiscountedPrice(product.price,productOffer.discountPercentage));
    }
    return Math.floor(offerPrice);
  }
//LOAD CART PAGE

const loadCart = async (req,res)=>{
    try {
        const userId= req.session.user_id;
        if(!userId){
            return res.redirect("/login");
        }
        const [userData,cartData] = await Promise.all([
            User.findById(userId),
            Cart.findOne({userName:userId}).populate("products.productId")
        ]) ;
        if (!cartData || cartData.products.length === 0) {
                return res.render("./users/emptyCart", {message: "No products in cart!!"});
        }
        const products = cartData.products;
        let cartImages = [];
        let totalPricePerItem = [];
        let discountPerItem = [];
        await Promise.all(
            products.map(async (item) =>{
                const offerPrice = await checkAllOffer(item.productId);
                item.offerPrice = offerPrice ;
                cartImages.push(item.productId.images[0]);
                totalPricePerItem.push(item.count * item.productPrice);
                discountPerItem.push(item.count * offerPrice);
            })
        );
        const Total = totalPricePerItem.reduce(
            (sum, price) => sum + price,
            0
        );
        const reducedTotal = discountPerItem.reduce(
            (sum, price) => sum + price,
            0
        );
        await Cart.updateOne({ userName: userId },
            {$set: {totalPrice: reducedTotal}}
        );
        res.render('./users/shoping-cart',{products,
                cartData,Total,userId,totalPricePerItem,
                cartImages,cartItems:products.length,discountPerItem,reducedTotal});
    } catch (error) {
        console.error(error);
        return res.status(500).send("Error while loading cart");
    }
}
const addToCart = async (req, res) => {
    try {
        const userId = req.session.user_id;

        if (!userId) {
            return res.redirect("/login");
        }

        const productId = req.query.id?.trim();

        if (!productId) {
            return res.status(400).send("Invalid Product");
        }

        const productData = await Product.findById(productId);

        if (!productData) {
            return res.status(404).send("Product not found");
        }

        if (productData.productQuantity <= 0) {
            return res.json({
                stockOut: true
            });
        }

        const offerPrice = await checkAllOffer(productData);

        const cart = await Cart.findOne({ userName: userId });

        // Create cart if it doesn't exist
        if (!cart) {
            await Cart.create({
                userName: userId,
                products: [
                    {
                        productId: productData._id,
                        productPrice: productData.price,
                        offerPrice,
                        count: 1
                    }
                ],
                totalPrice: offerPrice
            });

            return res.redirect("/viewCart");
        }

        // Check if product already exists in cart
        const productIndex = cart.products.findIndex(
            item => item.productId.toString() === productId
        );

        if (productIndex !== -1) {

            // Increase quantity
            await Cart.updateOne(
                {
                    userName: userId,
                    "products.productId": productId
                },
                {
                    $inc: {
                        "products.$.count": 1,
                        totalPrice: offerPrice
                    }
                }
            );

        } else {

            // Add new product
            await Cart.updateOne(
                {
                    userName: userId
                },
                {
                    $push: {
                        products: {
                            productId: productData._id,
                            productPrice: productData.price,
                            offerPrice,
                            count: 1
                        }
                    },
                    $inc: {
                        totalPrice: offerPrice
                    }
                }
            );
        }

        return res.redirect("/viewCart");

    } catch (error) {
        console.error(error);
        return res.status(500).send("Error while adding to cart!");
    }
};

const deleteItem =  async (req,res) =>{
    try {
        const userId= req.session.user_id;
        if (!userId) {
            return res.redirect("/login");
        }
        const productId = req.query.id;
        const cart = await Cart.findOne({userName:userId});
        if (!cart) {
            return res.redirect("/viewCart");
        }
        const product = cart.products.find(p => p.productId.toString() === productId);
        if (!product) {
            return res.redirect("/viewCart");
        }
        const offerPrice = product.offerPrice || product.productPrice;
        const updatedTotal = cart.totalPrice - (offerPrice * product.count)
      
        await Cart.updateOne({userName:userId},
            {
                $pull:{products:{productId}},
                $set: { totalPrice: Math.max(updatedTotal,0 )} 
            },
        );
        res.redirect('/viewCart');
    } catch (error) {
        console.log(error.message);
        return res.status(500).send("Error while deleting product");
    }
} 

const changeProductQuantity = async (req, res) => {
    try {
      let {cart,product,count,quantity} = req.body;
      count = Number(count);
      quantity = Number(quantity);
       if (!cart || !product || !Number.isFinite(count) || !Number.isFinite(quantity)) {
            return res.status(400).json({
                success: false,
                message: "Invalid request data"
            });
        }
      const productData = await Product.findById(product);
      if (!productData) {
            return res.json({
                success: false,
                message: "Product not found"
            });
        }
        const newQuantity = quantity + count;
        if (newQuantity < 1) {
            return res.json({
                 success: false,
                removeProductPrompt: true
            });
        }
        if ( newQuantity> productData.productQuantity) {
            return res.json({
                success: false, 
                stockOut: true,
                message: `Only ${productData.productQuantity} items available`
            });
        }
        const cartData = await Cart.findById(cart);
        if (!cartData) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }
        const cartProduct = cartData.products.find(
            item => item.productId.toString() === product.toString()
        );
        if (!cartProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found in cart"
            });
        }
        const offerPrice = Number(await checkAllOffer(productData));
        const unitPrice = Math.min(offerPrice,Number(productData.price));
        const currentTotal = Number(cartData.totalPrice) || 0;
        const updatedTotal = currentTotal + (unitPrice * count);
         const updatedCart =   await Cart.findOneAndUpdate(
            {  _id: cart,
               "products.productId": product
            },
            {
                $inc: {
                    "products.$.count": count
                },
                $set: {
                    totalPrice: updatedTotal,
                    "products.$.offerPrice": unitPrice
                }
            },
            {
                new: true
            }
        );
        if (!updatedCart) {
            return res.status(404).json({
                success: false,
                message: "Unable to update cart"
            });
        }
        const updatedItemTotal = unitPrice * newQuantity;
        return res.json({success: true,
            newQuantity,
            unitPrice,
            updatedItemTotal,
            updatedTotal});
    } catch (error) {
        console.error(error);
         return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
  };
  
module.exports={
    loadCart,
    addToCart,
    deleteItem,
    changeProductQuantity
}