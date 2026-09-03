const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const uploadToCloudinary = (fileBuffer, originalName) => {
    return new Promise((resolve, reject) => {

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "elegance/products",
                resource_type: "image"
            },
            (error, result) => {

                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }

            }
        );

        streamifier
            .createReadStream(fileBuffer)
            .pipe(uploadStream);
    });
};

module.exports = uploadToCloudinary;