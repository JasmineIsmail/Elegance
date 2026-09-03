const cloudinary = require("../config/cloudinary");
const deleteFromCloudinary = async (imageUrl) => {

    if (!imageUrl || !imageUrl.includes("res.cloudinary.com")) {
        return;
    }

    try {

        const urlParts = imageUrl.split("/upload/");

        if (urlParts.length !== 2) {
            return;
        }

        let publicId = urlParts[1];

        // Remove version number, e.g. v123456789/
        publicId = publicId.replace(/^v\d+\//, "");

        // Remove file extension
        publicId = publicId.replace(/\.[^/.]+$/, "");

        await cloudinary.uploader.destroy(publicId);

    } catch (error) {

        console.error(
            "Error deleting image from Cloudinary:",
            error
        );
    }
};

module.exports = deleteFromCloudinary ;