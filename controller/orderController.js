const Product = require('../model/productModel')
const Address = require('../model/addressModel')
const Order = require('../model/orderModel')
const User = require('../model/userModel');
const Cart = require('../model/cartModel');
const Coupon = require('../model/couponModel');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const { findByIdAndUpdate } = require('../model/otpModel');
const returnProduct = require('../model/returnModel');
const WalletTransaction =  require('../model/walletTransactionModel');
const PDFDocument = require('pdfkit');
 var instance = new Razorpay({
    key_id:'rzp_test_MqnCi6yLhRGaUz',
    key_secret: 'aK5Z1VBQNyOLbKlOzyFpUPqK',
  });

// CREATE NEW ORDER
const newOrder = async (req,res)=>{
    try {
        let flag = 0;
        var stockUpdate;
        const user= await User.findById({_id:req.session.user_id});
        const paymentMethod= req.body.paymentMethod;
        let totalPrice = req.body.total;
        const discount= req.body.discount;
        if(discount)
            totalPrice = totalPrice-discount;
        const cartData = await Cart.findById({_id:req.body.cartId}).populate({path:"products.productId"});
        const products= cartData.products;
        cartData.products.forEach(async(product)=>{
            stockUpdate=product.productId.productQuantity- product.count;
            console.log("stock:",stockUpdate);                                                                                               
            if(product.count > product.productId.productQuantity){
              flag++;
            }else{
                await Product.findByIdAndUpdate({_id:product._id},{$set:{productQuantity:stockUpdate}});
            }
            
          })
          if(flag != 0){
            res.json({stockout:true});
        }
        var orderedDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        var uniqueId = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        var order_Id =  orderedDate + '-' + uniqueId;
        const order = new Order({
            order_Id:order_Id,
            userAddress: req.body.selectedAddress, 
            userId:user._id,
            paymentMethod:paymentMethod,
            userName:user.name,
            products:products,
            Amount:totalPrice,
            date:new Date(),
            discount:discount
        })
        const orderData = await order.save();
       // console.log("order data",orderData);
        if(orderData){
            if(paymentMethod=="cod"){
                if(totalPrice >1000){
                    await Order.deleteOne({_id:orderData._id}); 
                    return res.json({codStatus:false});
                }else{
                    await Order.updateOne({ _id: orderData._id }, { $set: {status: "Placed" , 'products.$[].status': "Placed" } })
                    await Cart.deleteOne({userName:req.session.user_id}); 
                    return res.json({ codStatus: true});
                }
            } 
            if(paymentMethod==="online"){
                let order = await instance.orders.create({
                 amount: totalPrice*100,
                 currency:"INR",
                 receipt:"" + order_Id,
                }); 
               // console.log("order",order);
                return res.json({ onlinePayment: true, order});
            }
            if(paymentMethod == "wallet"){
                let walletAmount = user.wallet;
                if(walletAmount < totalPrice)
                    res.json({walletStatus:false});
                else{
                    walletAmount= walletAmount-totalPrice;
                    await Order.updateOne({ _id: orderData._id }, { $set: {status: "Placed" , 'products.$[].status': "Placed" } })
                    await User.findByIdAndUpdate({_id:req.session.user_id},{$set:{wallet:walletAmount}});
                    await Cart.deleteOne({userName:req.session.user_id});  
                    orderData.products.forEach(async (item)=>{
                        const walletTransaction = new WalletTransaction({
                            user:user._id,
                            amount: parseInt(item.count * item.productPrice),
                            type:'debit',
                            description:'Purchase using wallet amount'
                        })
                        await walletTransaction.save();
                        user.walletTransactions.push(walletTransaction);
                        await user.save();})
                        res.json({walletStatus:true});
                }
            }
        }else{
            res.redirect("/users/checkout");
        }
    } catch (error) {
        console.error(error);
    }
}
const verifyPayment = async (req,res)=>{
    try{
      const details = req.body;
      const crypto = require('crypto');
      let hmac = crypto.createHmac('sha256','aK5Z1VBQNyOLbKlOzyFpUPqK');
      hmac.update(details.payment.razorpay_order_id +'|'+details.payment.razorpay_payment_id);
      hmac = hmac.digest('hex');
     
     if(hmac==details.payment.razorpay_signature){
        await Order.findOneAndUpdate({order_Id:details.order.receipt},{$set:{status:"Paid",'products.$[].status':"Paid"}});
        await Order.findOneAndUpdate({order_Id:details.order.receipt},{$set:{paymentId:details.payment.razorpay_payment_id}});
        await Cart.deleteOne({userName:req.session.user_id});
        return res.json({success:true});
      }else{
          await Order.findOneAndDelete({order_Id:details.order.receipt});
          return res.json({success:false});
      }
    }catch(error){
        console.log(error.message);
    }
  }
 // FAILED ONLINE PAYMENT
 const failedPayment = async(req,res)=>{
    try {
        const orderId = req.body.orderId;
        await Order.findOneAndUpdate({order_Id:orderId},{$set:{status:'Payment pending'}});
        return res.json({success:true});
    } catch (error) {
        console.error(error);
    }
 } 
 // CONTINUE FAILED PAYMENT
 const continuePayment = async(req,res)=>{
    try {
        const orderId = req.body.order_Id;
        const orderData = await Order.findOne({order_Id:orderId});
        console.log(orderData);
        let order = await instance.orders.create({
            amount: (orderData.Amount)*100,
            currency:"INR",
            receipt:"" + orderId,
           }); 
           return res.json({ success: true, order});

    } catch (error) {
        console.error(error);
    }
 }
//VIEW ORDER
const viewOrders = async(req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 5;
    
        const startIndex= (page-1)* itemsPerPage;
        const endIndex=page*itemsPerPage;
        const totalOrdersCount = await Order.countDocuments({});
        const totalPages = Math.ceil(totalOrdersCount/itemsPerPage);
        const user = await User.findById({_id:req.session.user_id});
        const orders = await Order.find({userId:req.session.user_id}).populate({path:"products.productId"}).sort({date:-1}).skip(startIndex).limit(itemsPerPage).populate({path:"userAddress"});
        for (const order of orders) {
            const destination=await Address.findOne({"addresses._id":order.userAddress},{ "addresses.$": 1 });
            var deliveryAddress=destination.addresses;
        }
        res.render('./users/user_order',{user,orders,deliveryAddress,totalPages,currentPage:page});
    } catch (error) {
        console.error(error);
    }
}

// CANCEL ORDER,
const cancelOrder = async(req,res)=>{
    try {
        const user= req.session.user_id;
        const orderId = req.params.id;
        const productId =req.query.id;
        const orderData= await Order.find({order_Id:orderId}).populate({path:"products.productId"});
        const userData = await User.findById({_id:user});
        const products = orderData.products;
        let userWallet =  userData.wallet;
        if(orderData[0].status == "Paid" || orderData[0].status == "Placed"){
                orderData[0].products.forEach(async (item)=>{
                    if(item.productId.equals(productId)){
                        var orderCount =item.count;
                        await Order.updateOne({$and:[{order_Id:orderId},{"products.productId":productId}]},{$set:{"products.$[].status":"Cancelled"}});
                        if(orderData[0].products.length == 1){
                            await Order.updateOne({$and:[{order_Id:orderId},{"products.productId":productId}]},{$set:{status:"Cancelled"}}); 
                        }
                        await Product.findByIdAndUpdate({_id:productId},{$inc:{productQuantity:+orderCount}});
                        if(item.status == 'Paid'){
                            userWallet+= item.count * item.productPrice;
                            await User.findByIdAndUpdate({_id:user},{$set:{wallet:userWallet}});
                            const walletTransaction = new WalletTransaction({
                                user:userData._id,
                                amount: parseInt(item.count * item.productPrice),
                                type:'credit',
                                description:'Product cancellation refund'
                            })
                            await walletTransaction.save();
                            userData.walletTransactions.push(walletTransaction);
                            await userData.save();
                        }
                    }
                })
            }
            
        res.redirect('/users/orders');
    } catch (error) {
        console.log(error.message);
        res.send("error while cancel an order");
    }
}
//VIEW ORDER ADMIN
const listOrders = async(req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
    
        const startIndex= (page-1)* itemsPerPage;
        const endIndex=page*itemsPerPage;
        const totalOrdersCount = await Order.countDocuments({});
        const totalPages = Math.ceil(totalOrdersCount/itemsPerPage);
        const orders = await Order.find({}).sort({date:-1}).skip(startIndex).limit(itemsPerPage).populate({path:"userId"});
        res.render('./admin/listOrders',{orders,totalPages,currentPage:page});
    } catch (error) {
        console.error(error);
    }
}
const manageOrders=async(req,res)=>{
    try {
        
        const orderId = req.query.id;
       
        const order =await Order
        .findOne({order_Id:orderId})
        .populate({path:'products.productId'})
        .populate({path:'userId'})
        .populate({path:'userAddress'});
        
        const destination=await Address.findOne({"addresses._id":order.userAddress},{ "addresses.$": 1 });
        const deliveryAddress=destination.addresses;
        const productIds = [];
        order.products.forEach(orderItem => {
           productIds.push(orderItem.productId._id);
        });
       
        const productData = await Product.find({_id:productIds});
        
        res.render('./admin/manageOrder',{order,deliveryAddress,productData});
    } catch (error) {
      console.error(error)  ;
    }
}
const orderStatusUpdate = async (req,res)=>{
    try {
        const orderId = req.query.id;
        const status =req.body.orderStatus;
        const order = await Order.findOneAndUpdate({order_Id:orderId},{$set:{status:status}},{new:true});
        res.redirect('/admin/viewOrders');
    } catch (error) {
        console.error(error);
    }
}
const productOrderStatusUpdate=async(req,res)=>{
try {
    const orderStatus= req.body.productOrderStatus;
    const productId= req.params.id;
    const orderId = req.query.Id;
    const order = await Order.findOne({order_Id:orderId});
    const selectedProduct = order.products.find(product=>product.productId.toString()===productId);
    selectedProduct.status=orderStatus;
    await order.save();
    res.redirect(`/admin/manageorder?id=${orderId}`);
} catch (error) {
    console.error(error);
}
}  
const adminCancelOrder = async (req,res)=>{
    try {
        const orderId = req.query.id;
        const order = await Order.findOneAndUpdate({order_Id:orderId},{$set:{status:"Cancelled"}},{new:true});
        res.redirect('/admin/viewOrders');   
    } catch (error) {
       console.log(error) ;
    }
}
// RETURN PRODUCT
const returnOrder = async(req,res)=>{
    try {
      const orderId= req.params.id;
      const productId = req.query.id;
      const product = await Product.findById(productId);
      if (!product) {
          // Handle case where product with given ID is not found
          return res.status(404).send("Product not found");
      }
      res.render('./users/returnOrder',{product,orderId});
    } catch (error) {
      console.log("error while loading Return order");
    }
  }
 
const returnSubmit=async(req,res)=>{
    try{
        const productId =req.query.id;
        const orderId= req.params.id;
        const user = req.session.user_id; 
        const orderData = await Order.findOne({ order_Id: orderId });
        console.log("order datA",orderData);
        const userData = await User.findById({_id:user});
        const userWallet = userData.wallet;
        if (orderData) {
            const currentDate = new Date();
            console.log("current date",currentDate);
            const maxReturnDays = 7;
            const maxReturnDate = new Date(orderData.date);
            maxReturnDate.setDate(maxReturnDate.getDate() +  maxReturnDays);
            console.log("maxReturnDate",maxReturnDate);
            if (currentDate <= maxReturnDate) {
             await Order.updateOne({order_Id:orderId,"products.productId":productId},{$set:{"products.$.status":"Returned"}});
             if (orderData.products.length == 1)
                await Order.updateOne({order_Id:orderId},{$set:{status:"Returned"}});

             const ReturnProduct = new returnProduct({
                orderId:orderId,
                productId:productId,
                reason:req.body.returnReason,
            })
            await ReturnProduct.save();
            orderData.products.forEach(async (item)=>{
                if(item.productId.equals(productId)){
                    var orderCount =item.count;
                    await Product.findByIdAndUpdate({_id:productId},{$inc:{productQuantity:+orderCount}});
                }
                if(orderData.paymentMethod == "online"){
                    const totalWallet = orderData.Amount+userWallet;
                    await User.updateOne({_id:req.session.user_id},{$set:{wallet:totalWallet}});
                    const walletTransaction = new WalletTransaction({
                        user:userData._id,
                        amount: parseInt(item.count * item.productPrice),
                        type:'credit',
                        description:'Product return refund'
                    })
                    await walletTransaction.save();
                    userData.walletTransactions.push(walletTransaction);
                    await userData.save();
                }
            })
            res.redirect('/users/orders');
            } else {
              res.status(403).json({ noReturn: true });
            }
          } else {
            res.status(404).json({ noOrder: true });
          }
        
    }catch(error){
        console.error(error);
    }
}

// INVOICE DOWNLOAD
function createInvoice(invoice) {
    return new Promise((resolve, reject) => {
        let doc = new PDFDocument({ size: "A4", margin: 50 });

        generateHeader(doc);
        generateCustomerInformation(doc, invoice);
        generateInvoiceTable(doc, invoice);

        doc.end();
        resolve(doc)
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

  const downloadInvoice = async (req, res) => {
    try {
        const orderData = await Order.findOne({order_Id:req.query.id}).populate('userId').populate('userAddress').populate('products.productId');
        const destination = await Address.findOne(
            { "addresses._id": orderData.userAddress }, // Find the address with the specified _id
            { "addresses.$": 1 } // Projection to return only the matched address
        );
        var deliveryAddress=destination.addresses;
        if (!orderData) {
            return res.status(404).send('Order not found');
        }

        const invoiceNumber = `INV${orderData.order_Id.toString().slice(-8)}`;
        
        const invoice = {
            shipping: {
                name: orderData.userId.name,
                address:  deliveryAddress[0].houseName,
                place:  deliveryAddress[0].place,
                landmark: deliveryAddress[0].landmark,
                city: deliveryAddress[0].City,
                state:  deliveryAddress[0].State,
                postal_code:  deliveryAddress[0].pin,
                mobile:  deliveryAddress[0].mobile
            },
            items: orderData.products.map(product => ({
                item: product.productId.Name,
                description: product.productId.description.slice(0,30)+"...",
                quantity: product.count,
                amount: product.productPrice
            })),
            subtotal: orderData.Amount,
            discount:orderData.discount || 0,
            total : orderData.Amount - (orderData.discount || 0),
            date : orderData.date.toLocaleDateString('en-GB') ,
            invoice_nr: invoiceNumber ,
            id : orderData.order_Id
        };

        // Create the invoice and wait for it to be created
        createInvoice(invoice)
        .then((doc) => {
            // Stream the PDF directly to the response for download
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", "attachment; filename=invoice.pdf");
            doc.pipe(res);
        })
        .catch((err) => {
            console.error("Error creating invoice:", err);
            res.status(500).end();
        });
    } catch (err) {
        console.error("Error retrieving order data:", err);
        res.status(500).end();
    }
};




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
