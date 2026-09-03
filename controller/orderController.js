require('dotenv').config();
const Product = require('../model/productModel')
const Address = require('../model/addressModel')
const Order = require('../model/orderModel')
const User = require('../model/userModel');
const Cart = require('../model/cartModel');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require("crypto");
const ReturnProduct = require('../model/returnModel');
const WalletTransaction =  require('../model/walletTransactionModel');
const PDFDocument = require('pdfkit');
const getPagination = require("../helper/pagination");
const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const ORDER_STATUS = {
    PENDING: "Pending",
    PAYMENT_PENDING: "Payment pending",
    PLACED: "Placed",
    PAID: "Paid",
    CANCELLED: "Cancelled",
    RETURNED: "Returned",
};
// helper functions
const generateOrderId = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `${date}-${random}`;
};
// update order status
const updateOrderStatus = async (orderId, status) => {
    return await Order.findOneAndUpdate({order_Id:orderId},
        {
            $set: {
                status,
                "products.$[].status": status,
            },
        },
    );
};
// Wallet Transaction Helper

const createWalletTransaction = async (user,amount,type,description,session=null) => {
    const transaction = await WalletTransaction.create([{
        user: user._id,
        amount,
        type,
        description,
    }],{session});
    user.walletTransactions.push(transaction[0]._id);
    await user.save({session});
    return transaction[0];
};
// Refund Helper

const creditWallet = async (user,amount,description,session=null) => {
    user.wallet += amount;
    await user.save({session});
    await createWalletTransaction(
        user,
        amount,
        "credit",
        description,
        session
    );
};
const debitWallet = async (user,amount,description,session=null) => {
    user.wallet -= amount;
    await user.save({session});
    await createWalletTransaction(
        user,
        amount,
        "debit",
        description,
        session
    );
};
const getDeliveryAddress = async (addressId) => {
    const address = await Address.findOne({"addresses._id": addressId},{"addresses.$": 1}).lean();
    return address?.addresses?.[0] || null;
};
const restoreStock = async (products,session = null) => {
    const operations = products.map(product => ({
            updateOne: {filter: {_id: product.productId},
                    update: {$inc: {productQuantity: product.count}}
            }
    }));
    await Product.bulkWrite(operations,{session});
};
const reduceStock = async (products,session = null) => {
    const operations = products.map(product => ({
            updateOne: {filter: {_id: product.productId},
                update: {$inc: {productQuantity: -product.count}}
            }
    }));
    await Product.bulkWrite(operations,{session});
};
// CREATE NEW ORDER
const newOrder = async (req,res)=>{
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const userId = req.session.user_id;
        const {paymentMethod,cartId,selectedAddress,discount = 0} = req.body;
        const user= await User.findById(userId).session(session);
        if(!user){
            await session.abortTransaction();
            return res.status(404).json({
                success : false,
                message : "user not found"
            })
        }
        const cart = await Cart.findById(cartId).populate("products.productId").session(session);
         if (!cart || cart.products.length === 0) {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message: "Cart is empty"
            });
        }
        if (cart.userName.toString() !== userId.toString()) {
            await session.abortTransaction();

            return res.status(403).json({
                success: false,
                message: "Unauthorized cart"
            });
        }
        const deliveryAddress = await getDeliveryAddress(selectedAddress);
        if(!deliveryAddress){
             await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Address not found"
            });
        }
         const outOfStock = cart.products.filter(item =>
            item.count > item.productId.productQuantity
        );
        if (outOfStock.length > 0) {
            await session.abortTransaction();
            return res.json({
                stockout: true,
                products: outOfStock.map(item => ({
                    product: item.productId.Name,
                    available: item.productId.productQuantity
                }))
            });
        }
        let subtotal =0;

        cart.products.forEach(item => {
                            const originalPrice = Number(item.productPrice);
                            const offerPrice = Number(item.offerPrice);
                            const actualPrice = offerPrice >0 ? offerPrice : originalPrice ;
                            const quantity = Number(item.count);
                            subtotal += actualPrice*quantity;
                        });
          let discountAmount = Number(discount) || 0;
           if (discountAmount > subtotal) {
            discountAmount = subtotal;
        }
        const finalAmount = subtotal - discountAmount;
        await reduceStock(cart.products, session);
       
        const order = await Order.create([{
                order_Id: generateOrderId(),
                userAddress: selectedAddress,
                userId: user._id,
                paymentMethod,
                products: cart.products.map(item => ({
                    productId: item.productId._id,
                    count: item.count,
                    productPrice: item.productPrice,
                    offerPrice: item.offerPrice,
                    status: ORDER_STATUS.PENDING
                })),
                Amount: finalAmount,
                discount: discountAmount,
                status: ORDER_STATUS.PENDING
            }], {session});
        const createdOrder = order[0];
         if (paymentMethod === "cod") {
            if (finalAmount > 1000) {
                await restoreStock(cart.products,session);
                await Order.findByIdAndDelete(createdOrder._id).session(session);
                await session.abortTransaction();
                return res.json({
                    codStatus: false
                });
            }
            await updateOrderStatus(createdOrder._id,ORDER_STATUS.PLACED);
            await Cart.deleteOne({_id:cartId}).session(session);
            await session.commitTransaction();
            return res.json({
                codStatus: true
            });
        }
        if (paymentMethod === "online") {
            const razorpayOrder =
                await instance.orders.create({
                    amount: Math.round(finalAmount * 100),
                    currency: "INR",
                    receipt: createdOrder.order_Id
                });
            await updateOrderStatus(createdOrder._id,ORDER_STATUS.PAYMENT_PENDING);
            await session.commitTransaction();
            return res.json({
                onlinePayment: true,
                order: razorpayOrder,
                orderId: createdOrder._id
            });
        }
        if (paymentMethod === "wallet") {
            if (user.wallet < finalAmount) {
                await restoreStock(cart.products,session);
                await Order.findByIdAndDelete(createdOrder._id).session(session);
                await session.abortTransaction();
                return res.json({
                    walletStatus: false
                });
            }
            await debitWallet(user,finalAmount,"Purchase using wallet",session);
            await updateOrderStatus(createdOrder._id,ORDER_STATUS.PLACED);
            await Cart.deleteOne({_id: cartId}).session(session);
            await session.commitTransaction();
            return res.json({
                walletStatus: true
            });
        }
        await session.abortTransaction();
        return res.status(400).json({
            success: false,
            message: "Invalid payment method"
        });

    }catch (error) {
        await session.abortTransaction();
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        })
    }
    finally{
        session.endSession();
    }
}
const verifyPayment = async (req,res)=>{
    try{
      const {payment,order}= req.body;
      const generatedSignature = crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET)
       .update(`${payment.razorpay_order_id}|${payment.razorpay_payment_id}`)
       .digest('hex');
      if(generatedSignature !==payment.razorpay_signature){
          await Order.findOneAndUpdate({ order_Id: order.receipt },
                {$set: {
                        status: ORDER_STATUS.PAYMENT_PENDING,
                        "products.$[].status": ORDER_STATUS.PAYMENT_PENDING
                    }
                }
            );
             return res.json({
                success: false,
                message: "Payment verification failed"
            });
      }
    // payment succesfull 
        await Order.findOneAndUpdate({order_Id:order.receipt},
            {$set:{
                paymentId: payment.razorpay_payment_id,
                status: ORDER_STATUS.PAID,
                'products.$[].status':ORDER_STATUS.PAID
               }
            }
        );
        await Cart.deleteOne({userName:req.session.user_id});
        return res.json({success:true});
    }catch(error){
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Payment verification failed"
        });
    }
  }
 // FAILED ONLINE PAYMENT
 const failedPayment = async(req,res)=>{
    try {
        const {orderId} = req.body;
        const order = await Order.findById(orderId);
        if(!order){
             return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }
        order.status = ORDER_STATUS.PAYMENT_PENDING
        order.products.forEach(product => {
            product.status = ORDER_STATUS.PAYMENT_PENDING;
        });
        await order.save();
        return res.json({success:true});
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
 } 
 // CONTINUE FAILED PAYMENT
 const continuePayment = async(req,res)=>{
    try {
        const {orderId} = req.body;
        const order = await Order.findById(orderId);
         if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }
         if (order.status !== ORDER_STATUS.PAYMENT_PENDING) {
            return res.status(400).json({
                success: false,
                message: "This order cannot be paid again."
            });
        }
        let razorpayOrder = await instance.orders.create({
            amount: (order.Amount)*100,
            currency:"INR",
            receipt: order.order_Id,
           }); 
           return res.json({ success: true, order :razorpayOrder});
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Unable to continue payment"
        });
    }
 }
//VIEW ORDER
const viewOrders = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 5;
        const pagination =await getPagination(Order,page,itemsPerPage,{userId});
        const user = await User.findById(userId);
        const orders = await Order.find({userId}).populate("products.productId").sort({date:-1}).skip(pagination.startIndex).limit(pagination.itemsPerPage).lean();
        const addressData = await Address.findOne({ userId }).lean();
        const ordersWithAddress = orders.map((order) => {
                const deliveryAddress = addressData?.addresses?.find(
                    address => address._id.toString() === order.userAddress.toString()
                );
                return {...order,deliveryAddress};
        });
        res.render('./users/user_order',{user,orders:ordersWithAddress,totalPages:pagination.totalPages,currentPage:pagination.currentPage});
    } catch (error) {
        console.error(error);
        res.redirect("/");
    }
}

// CANCEL ORDER,
const cancelOrder = async(req,res)=>{
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const userId= req.session.user_id;
        const orderId = req.params.id;
        const productId =req.query.id;
        const user = await User.findById(userId).session(session);
        const order = await Order.findOne({order_Id:orderId}).populate("products.productId").session(session);
         if (!order) {
            await session.abortTransaction();
            return res.status(404).send("Order not found");
        }
        const orderedProduct = order.products.find(
            item => item.productId._id.toString() === productId
        );
        if (!orderedProduct) {
            await session.abortTransaction();
            return res.status(404).send("Product not found");
        }
        if (orderedProduct.status === ORDER_STATUS.CANCELLED || orderedProduct.status === ORDER_STATUS.RETURNED) {
            await session.abortTransaction();
            return res.redirect("/orders");
        }
        await Product.findByIdAndUpdate(productId,
            {$inc: {
                    productQuantity: orderedProduct.count
                }
            },
            { session }
        );
        orderedProduct.status = ORDER_STATUS.CANCELLED;
        const allCancelled = order.products.every(product =>
            product._id.equals(orderedProduct._id)||product.status === ORDER_STATUS.CANCELLED
        );
        if (allCancelled) {
            order.status = ORDER_STATUS.CANCELLED;
        }
        if (order.paymentMethod === "online" || order.paymentMethod === "wallet") {
            const refundAmount = orderedProduct.offerPrice * orderedProduct.count;
            await creditWallet(user,refundAmount,`Refund for Order ${order.order_Id}`,session);
        }
        await order.save({ session });
        await session.commitTransaction();
        return res.redirect("/orders");
    } catch (error) {
        await session.abortTransaction();
        console.error(error);
        return res.redirect("/orders");
    }
    finally {
        session.endSession();
    }
}
//VIEW ORDER ADMIN
const listOrders = async(req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
        const pagination =await getPagination(Order,page,itemsPerPage)
       
        const orders = await Order.find().populate("userId").sort({date:-1}).skip(pagination.startIndex).limit(pagination.itemsPerPage).lean();
        res.render('./admin/listOrders',{orders,totalPages:pagination.totalPages,currentPage:pagination.currentPage});
    } catch (error) {
        console.error(error);
        res.redirect("/admin");
    }
}
const manageOrders=async(req,res)=>{
    try {
        const orderId = req.query.id;
        const order =await Order.findOne({order_Id:orderId}).populate('products.productId').populate('userId').lean();
        if (!order) {
            return res.redirect("/admin/viewOrders");
        }
        const deliveryAddress= await getDeliveryAddress(order.userAddress);
        res.render('./admin/manageOrder',{order,deliveryAddress});
    } catch (error) {
      console.error(error);
      res.redirect("/admin/viewOrders");
    }
}
const orderStatusUpdate = async (req,res)=>{
    try {
        const {id} = req.query;
        const {orderStatus} =req.body;
        await updateOrderStatus(id,orderStatus);
        res.redirect('/admin/viewOrders');
    } catch (error) {
        console.error(error);
        res.redirect("/admin/viewOrders");
    }
}
const productOrderStatusUpdate=async(req,res)=>{
try {
    const {productOrderStatus} = req.body;
    const productId= req.params.id;
    const orderId = req.query.Id;
    const order = await Order.findOne({order_id:orderId});
    if(!order){
        return res.redirect("/admin/viewOrders");
    }
    const product = order.products.find(item => item.productId.toString()===productId);
    if(!product){
        return res.redirect("/admin/viewOrders");
    }
    product.status = productOrderStatus;
    const allDelivered = order.products.every(
                item => item.status === ORDER_STATUS.PAID || item.status === "Delivered"
            );
    if(allDelivered){
        order.status = "Delivered";
    }
    await order.save();
    res.redirect(`/admin/manageorder?id=${orderId}`);
} catch (error) {
    console.error(error);
    res.redirect("/admin/viewOrders");
}
}  
const adminCancelOrder = async (req,res)=>{
    try {
        const {id} = req.query;
        await updateOrderStatus(id,ORDER_STATUS.CANCELLED);
        res.redirect('/admin/viewOrders');   
    } catch (error) {
       console.log(error);
        res.redirect("/admin/viewOrders");
    }
}
// RETURN PRODUCT
const returnOrder = async(req,res)=>{
    try {
      const orderId= req.params.id;
      const productId = req.query.id;
      const product = await Product.findById(productId).lean();
      if (!product) {
        return res.status(404).send("Product not found");
      }
      res.render('./users/returnOrder',{product,orderId});
    } catch (error) {
      console.error(error);
      res.redirect("/orders");
    }
  }
 
const returnSubmit=async(req,res)=>{
    const session = await mongoose.startSession();
    try{
        session.startTransaction();
        const productId =req.query.id;
        const orderId= req.params.id;
        const userId = req.session.user_id; 
        const reason = req.body.returnReason;
        const user = await User.findById(userId).session(session);
        const order = await Order.findById(orderId).populate("products.productId").session(session);
        if (!order) {
            await session.abortTransaction();
            return res.status(404).send("Order not found");
        }
        const product = order.products.find( item => item.productId._id.toString() === productId);
        if (!product) {
            await session.abortTransaction();
            return res.status(404).send("Product not found");
        }
        if (product.status === ORDER_STATUS.RETURNED) {
            await session.abortTransaction();
            return res.redirect("/orders");
        }
        const maxReturnDate = new Date(order.date);
        maxReturnDate.setDate( maxReturnDate.getDate() + 7 );
        const userWallet = user.wallet;
        if (new Date() > maxReturnDate) {
            await session.abortTransaction();
            return res.status(403).json({
                noReturn: true
            });
        }
        product.status = ORDER_STATUS.RETURNED;
        await Product.findByIdAndUpdate(productId,
            {$inc:{
                productQuantity: product.count
                }
            },
            {
               session
            }
        )
        await ReturnProduct.create([{
            orderId,
            productId,
            reason
        }],
        {session}
        )
        if(order.paymentMethod === "online" || order.paymentMethod === "wallet"){
            const refundAmount = product.offerPrice * product.count;
            await creditWallet(user,refundAmount,`Refund for Order ${order.order_Id}`,session);
        }
        const allReturned = order.products.every(item => item.status === ORDER_STATUS.RETURNED);
        if (allReturned) {
            order.status = ORDER_STATUS.RETURNED;
        }
        await order.save({session});
        await session.commitTransaction();
        res.redirect('/orders');
    }catch(error){
        await session.abortTransaction();
        console.error(error);
        return res.redirect("/orders");
    }
    finally{
        session.endSession();
    }
}

// INVOICE DOWNLOAD
const downloadInvoice = async (req, res) => {
    try {
          const order = await Order.findById(req.query.id).populate("userId").populate("products.productId").lean();
          if (!order) {
            return res.status(404).send("Order not found");
        }
        const deliveryAddress = await getDeliveryAddress( order.userAddress);
        if (!deliveryAddress) {
            return res.status(404).send("Address not found");
        }
        const invoice = {
            shipping: {
                name: order.userId.name,
                address: deliveryAddress.houseName,
                place: deliveryAddress.place,
                landmark: deliveryAddress.landmark,
                city: deliveryAddress.City,
                state: deliveryAddress.State,
                postal_code: deliveryAddress.pin,
                mobile: deliveryAddress.mobile
            },
            items: order.products.map(item => ({
                item: item.productId.Name,
                description: (item.productId.description||"").substring(0, 30) + "...",
                quantity: item.count,
                amount: item.offerPrice || item.productPrice
            })),
            subtotal: order.Amount,
            discount: order.discount,
            total: order.Amount,
            date: order.date.toLocaleDateString("en-GB"),
            invoice_nr: `INV-${order.order_Id.slice(-8)}`,
            id: order.order_Id
        }
        const pdf = await createInvoice(invoice);
        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${invoice.invoice_nr}.pdf`
        );

        pdf.pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).send("Unable to generate invoice");
    }
}

function createInvoice(invoice) {
    return new Promise((resolve, reject) => {
        try{
             let doc = new PDFDocument({ size: "A4", margin: 50 });
             generateHeader(doc);
             generateCustomerInformation(doc, invoice);
             generateInvoiceTable(doc, invoice);
             doc.end();
             resolve(doc)
        }catch (err) {
            reject(err);
        }
    });
}

  
  function generateHeader(doc) {
    doc
      .fontSize(20)
      .text("Elegance", 110, 57)
      .fontSize(10)
      .text("Elegance", 200, 50, { align: "right" })
      .text("Kannur", 200, 65, { align: "right" })
      .text("Kerala, 670612", 200, 80, { align: "right" })
      .moveDown();
  }
  
  function generateCustomerInformation(doc, invoice) {
    doc
      .fillColor("#444444")
      .fontSize(20)
      .text("Invoice", 50, 160);
  
    generateHr(doc, 185);
  
    const customerInformationTop = 200;
  
    doc
      .fontSize(10)
      .text("Invoice Number:", 50, customerInformationTop)
      .font("Helvetica-Bold")
      .text(invoice.invoice_nr, 150, customerInformationTop)
      .font("Helvetica")
      .text("Invoice Date:", 50, customerInformationTop + 15)
      .text(invoice.date , 150, customerInformationTop + 15)
      .text("Order Id:", 50, customerInformationTop + 30)
      .text(
        invoice.id,
        150,
        customerInformationTop + 30
      )
  
      .font("Helvetica-Bold")
      .text(invoice.shipping.name, 300, customerInformationTop)
      .font("Helvetica")
      .text(invoice.shipping.address, 300, customerInformationTop + 15)
      .text(
        invoice.shipping.place +
          ", " +
         invoice.shipping.landmark +
          ", " +
          invoice.shipping.city +
          ", " +
          invoice.shipping.state +
          ", " +
          invoice.shipping.postal_code +
          ", " +
          invoice.shipping.mobile ,
          
        300,
        customerInformationTop + 30
      )
      .moveDown();
  
    generateHr(doc, 252);
  }
  
  function generateInvoiceTable(doc, invoice) {
    let i;
    const invoiceTableTop = 330;
  
    doc.font("Helvetica-Bold");
    generateTableRow(
      doc,
      invoiceTableTop,
      "Item",
      "Description",
      "Price",
      "Quantity",
      "Total"
    );
    generateHr(doc, invoiceTableTop + 20);
    doc.font("Helvetica");
  
    for (i = 0; i < invoice.items.length; i++) {
      const item = invoice.items[i];
      const position = invoiceTableTop + (i + 1) * 30;
      generateTableRow(
        doc,
        position,
        item.item,
        item.description,
        item.amount,
        item.quantity,
        item.amount * item.quantity
      );
  
      generateHr(doc, position + 20);
    }
  
    const subtotalPosition = invoiceTableTop + (i + 1) * 30;
    const discountPosition = subtotalPosition + 30;
    const totalPosition = discountPosition  + 30;
    generateTableRow(
      doc,
      subtotalPosition,
      "",
      "",
      "Subtotal",
      "",
      invoice.subtotal
    );
    generateTableRow(
        doc,
        discountPosition,
        "",
        "",
        "Discount",
        "",
        invoice.discount
      );
      generateTableRow(
        doc,
        totalPosition,
        "",
        "",
        "Total",
        "",
        invoice.total
      );
  }
  
  
  function generateTableRow(
    doc,
    y,
    item,
    description,
    price,
    quantity,
    Total
  ) {
    doc
      .fontSize(10)
      .text(item, 50, y)
      .text(description, 150, y)
      .text(price, 280, y, { width: 90, align: "right" })
      .text(quantity, 370, y, { width: 90, align: "right" })
      .text(Total, 0, y, { align: "right" });
  }
  
  function generateHr(doc, y) {
    doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(50, y)
      .lineTo(550, y)
      .stroke();
  }




module.exports={
    newOrder,
    viewOrders,
    cancelOrder,
    listOrders,
    manageOrders,
    orderStatusUpdate,
    productOrderStatusUpdate,
    adminCancelOrder,
    returnOrder,
    returnSubmit,
    verifyPayment,
    failedPayment,
    continuePayment,
    downloadInvoice
}
