const User = require("../model/userModel");
const bcrypt = require("bcrypt");
const Product = require('../model/productModel');
const Category = require('../model/categoryModel');
const Address = require("../model/addressModel");
const CategoryOffer = require('../model/categoryOfferModel');
const ProductOffer = require('../model/productOfferModel');
const getPagination = require('../helper/pagination');
const securePassword = require('../helper/passwordHelper')
const {transporter,sendVerifyMail,resendOtp} = require ("../helper/mailService");
const OtpVerification = require("../model/otpModel");

//Calculate discounted price
const calculateDiscountedPrice = (originalPrice, discountPercentage) => {
    return originalPrice - (originalPrice * (discountPercentage || 0)) / 100;
};

// Calculates offers for multiple products in bulk using a Map.
// This reduces DB lookups from O(N) sequential queries to just 2 bulk queries total.
const attachOfferPrices = async (products) => {
    if (!products.length) return products;

    const productIds = products.map(p => p._id);
    const categoryIds = [...new Set(products.map(p => p.category))];

    // Bulk fetch all relevant offers at once
    const [categoryOffers, productOffers] = await Promise.all([
        CategoryOffer.find({ category: { $in: categoryIds } }),
        ProductOffer.find({ product: { $in: productIds } })
    ]);

    // Map lookups for instant O(1) matching
    const categoryOfferMap = new Map(categoryOffers.map(o => [o.category.toString(), o.discountPercentage]));
    const productOfferMap = new Map(productOffers.map(o => [o.product.toString(), o.discountPercentage]));

    return products.map(product => {
        const prodObj = product.toObject ? product.toObject() : product;
        const catDiscount = categoryOfferMap.get(prodObj.category?.toString());
        const prodDiscount = productOfferMap.get(prodObj._id.toString());

        let finalPrice = prodObj.price;
        if (catDiscount && prodDiscount) {
            finalPrice = Math.min(
                calculateDiscountedPrice(prodObj.price, catDiscount),
                calculateDiscountedPrice(prodObj.price, prodDiscount)
            );
        } else if (catDiscount) {
            finalPrice = calculateDiscountedPrice(prodObj.price, catDiscount);
        } else if (prodDiscount) {
            finalPrice = calculateDiscountedPrice(prodObj.price, prodDiscount);
        }

        prodObj.offerPrice = Math.floor(finalPrice);
        return prodObj;
    });
};
const loadHome = async (req, res) => {
    try {
        const search = req.query.search || '';
        const filter = {
            status: true,
            Name: { $regex: search, $options: "i" }
        };

        const pagination = await getPagination(Product, req.query.page, req.query.itemsPerPage, filter);

        let [products, categories, categoryOffers] = await Promise.all([
            Product.find(filter).skip(pagination.skip).limit(pagination.itemsPerPage),
            Category.find(),
            CategoryOffer.find().populate("category")
        ]);
        console.log(categoryOffers)
        products = await attachOfferPrices(products);

        res.render("./users/userHome", {
            products,
            categories,
            categoryOffer: categoryOffers,
            totalPages: pagination.totalPages,
            currentPage: pagination.currentPage
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const filterProducts = async (req, res) => {
    try {
        const type = req.params.type;
        let sort = {};
        switch (type) {
            case "latest": sort = { createdAt: -1 }; break;
            case "lowPrice": sort = { price: 1 }; break;
            case "highPrice": sort = { price: -1 }; break;
            default: sort = {};
        }

        const pagination = await getPagination(Product, req.query.page, req.query.itemsPerPage, { status: true });

        let [products, categories, categoryOffers] = await Promise.all([
            Product.find({ status: true }).sort(sort).skip(pagination.skip).limit(pagination.itemsPerPage),
            Category.find(),
            CategoryOffer.find().populate("category")
        ]);

        products = await attachOfferPrices(products);

        res.render("./users/userHome", {
            products,
            categories,
            categoryOffer: categoryOffers,
            totalPages: pagination.totalPages,
            currentPage: pagination.currentPage
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const loadProducts = async (req, res) => {
    try {
        const search = req.query.search || '';
        const filter = { status: true, Name: { $regex: search, $options: "i" } };

        const pagination = await getPagination(Product, req.query.page, req.query.itemsPerPage, filter);
        const [products, categories] = await Promise.all([
            Product.find(filter).skip(pagination.skip).limit(pagination.itemsPerPage),
            Category.find()
        ]);

        res.render("./users/products", {
            products,
            categories,
            totalPages: pagination.totalPages,
            currentPage: pagination.currentPage
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const ProductsByCategory = async (req, res) => {
    try {
        const cat = req.params.category.toUpperCase();
        const categoryDoc = await Category.findOne({ categoryName: cat }).select("_id");
        if (!categoryDoc) {
            return res.render("./users/products", { products: [], categories: await Category.find(), totalPages:0,currentPage :1 });
        }
        const filter = {
            status: true,
            category: categoryDoc._id
        }
        const pagination = await getPagination(
            Product,
            req.query.page,
            req.query.itemsPerPage,
            filter
        );
        const [products,categories] = await Promise.all([
            Product.find(filter).populate('category').skip(pagination.skip).limit(pagination.itemsPerPage),
            Category.find(),
        ]);

        res.render("./users/products", { products, categories,totalPages:pagination.totalPages,currentPage:pagination.currentPage });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};



const loadLogin = async (req, res) => {
    try { res.render('./users/login'); } catch (error) { res.status(500).send("Internal Server Error"); }
};

const registerUser = async (req, res) => {
    try { res.render('./users/register'); } catch (error) { res.status(500).send("Internal Server Error"); }
};

const insertUser = async (req, res) => {
    try {
        const { name, email, mobile, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render("./users/register", { message: "Email already exists." });
        }

        const hashedPassword = await securePassword(password);
        const user = new User({
            name,
            email,
            mobile,
            password: hashedPassword,
            isAdmin: false,
            isVerified: false
        });

        const userData = await user.save();
        req.session.email = userData.email;

        const sent = await sendVerifyMail(userData.name, userData.email);
        if (!sent) {
            return res.render("./users/register", { message: "Unable to send OTP." });
        }
        res.render('./users/otpVerify', { email: userData.email });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const checkOTP = async (req, res) => {
    try {
        const otpReceived = req.body.OTP;
        const email = req.session.email; // Keep matching session key variable consistent

        if (!email) return res.render("./users/otpVerify", { message: "Session expired, request a new OTP." });

        const otpRecord = await OtpVerification.findOne({ email });
        if (!otpRecord) {
            return res.render("./users/otpVerify", { message: "OTP expired." });
        }
        if (otpReceived !== otpRecord.otp) {
            return res.render("./users/otpVerify", { message: "Invalid OTP." });
        }

        const user = await User.findOneAndUpdate(
            { email },
            { $set: { isVerified: true } },
            { new: true }
        );

        req.session.user_id = user._id;
        await OtpVerification.deleteOne({ email });
        res.redirect("/home");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const loginVerification = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render("./users/login", { message: "Invalid email or password." });
        }
        if (!user.isActive) {
            return res.render("./users/login", { message: "Your account has been blocked." });
        }

        req.session.email = user.email;
        req.session.user_id = user._id;
        res.redirect("/home");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const productOverview = async (req, res) => {
    try {
        const product = req.query.product;
        const productData = await Product.findOne({ Name: product });
        if (!productData) return res.status(404).send("Product not found");

        const category = await Category.findById(productData.category);
        const [updatedProduct] = await attachOfferPrices([productData]);

        res.render("./users/productDetail", { productData: updatedProduct, category });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const userProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user_id);
        res.render('./users/user_profile', { user });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const editProfile = async (req, res) => {
    try {
        const user = await User.findById(req.query.id);
        res.render('./users/edit_profile', { user });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const updateProfile = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.session.user_id, {
            $set: { name: req.body.name, email: req.body.email, mobile: req.body.mobile }
        });
        res.redirect('/user_profile');
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const manageAddress = async (req, res) => {
    try {
        const [addressData, user] = await Promise.all([
            Address.findOne({ userId: req.session.user_id }),
            User.findById(req.session.user_id)
        ]);
        const address = addressData ? addressData.addresses : [];
        res.render('./users/user_address', { address, user });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const deleteAddress = async (req, res) => {
    try {
        await Address.updateOne(
            { userId: req.session.user_id },
            { $pull: { addresses: { _id: req.query.id } } }
        );
        res.redirect('/manage_address');
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const managePassword = async (req, res) => {
    try {
        const user = await User.findById(req.session.user_id);
        res.render('./users/changePassword', { user });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const changePassword = async (req, res) => {
    try {
        const user = await User.findById(req.query.id);
        const matches = await bcrypt.compare(req.body.currentPassword, user.password);

        if (matches) {
            const spassword = await securePassword(req.body.newPassword);
            await User.findByIdAndUpdate(req.query.id, { $set: { password: spassword } });
            res.render('./users/changePassword', { user, message: "Successfully changed password" });
        } else {
            res.render('./users/changePassword', { user, message: "You need to enter the current password correctly to change it" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const logOut = async (req, res) => {
    try {
        req.session.destroy((error) => {
            if (error) return res.status(500).send("Logout Failed");
            res.clearCookie("connect.sid");
            res.redirect("/login");
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const loadForgotPassword = async (req, res) => {
    try { res.render('./users/forgotPassword'); } catch (error) { res.status(500).send("Internal Server Error"); }
};

const forgotPassword = async (req, res) => {
    try {
        const email = req.body.email;
        req.session.email = email;
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('forgotpassword', { message: "No user with this email exists." });
        }
        await sendVerifyMail(user.name, email);
        res.render('./users/resetPassword', { message: "New password sent via email. Login with it." });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const loadWallet = async (req, res) => {
    try {
        const user = await User.findById(req.session.user_id).populate("walletTransactions");
        if (!user) return res.status(404).json({ message: "No such user found" });

        // Clone and sort transactions securely
        const walletTransaction = [...user.walletTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        const pageNumber = parseInt(req.query.page) || 1;
        const itemsPerPage = 5;
        const totalPages = Math.ceil(walletTransaction.length / itemsPerPage);

        const startIndex = (pageNumber - 1) * itemsPerPage;
        const currentTransactions = walletTransaction.slice(startIndex, startIndex + itemsPerPage);

        res.render('./users/userWallet', {
            user,
            currentTransactions,
            totalPages,
            currentPage: pageNumber
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    loadLogin,
    registerUser,
    insertUser,
    checkOTP,
    loginVerification,
    resendOtp,
    loadHome,
    loadProducts,
    ProductsByCategory,
    filterProducts,
    productOverview,
    userProfile,
    editProfile,
    updateProfile,
    manageAddress,
    deleteAddress,
    managePassword,
    changePassword,
    logOut,
    loadForgotPassword,
    forgotPassword,
    loadWallet
};