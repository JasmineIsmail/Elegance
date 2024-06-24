const mongoose= require("mongoose");


const connectDB = ()=>{
    try {
        const connect= mongoose.connect("mongodb+srv://jasminismail95:jasmine123@newcluster.vjn9iri.mongodb.net/eleganceDB?retryWrites=true&w=majority&appName=NewCluster");
        console.log("DB Connected")
    } catch (error) {
     console.log("error in connecting DB")  ;
   }
}

module.exports =connectDB;
//"mongodb+srv://jasminismail95:jasmine123@newcluster.vjn9iri.mongodb.net/?retryWrites=true&w=majority&appName=NewCluster"