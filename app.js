const express = require("express");
const adminRoute = require("./routes/adminRoute");
const path=require("path");
const bodyParser = require('body-parser');
const connectDB = require("./config/connectDB");
const userRoute = require("./routes/userRoute");

const swal=require('sweetalert');
//require('dotenv').config();

const app=express();
app.set("view engine", "ejs");
app.set("views","./views")

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static("public"));
app.use( express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
//db connection

connectDB();


app.use('/admin',adminRoute);
app.use('/users',userRoute);



app.listen(process.env.PORT || 3000,()=>{
    console.log("server started");
})