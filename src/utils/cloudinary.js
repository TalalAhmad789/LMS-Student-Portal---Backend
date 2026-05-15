import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs/promises'

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

export const uploadOnCloudinary = async (localFilePath, folderPath) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: folderPath
        })
        await fs.unlink(localFilePath)
        return response
    } catch (error) {
        await fs.unlink(localFilePath)
        return null
    }
}

export const deleteFromCloudinary = async (Public_Id) => {

    if (!Public_Id) return null;

    try {
        const response = await cloudinary.uploader.destroy(Public_Id);
        return response;
    } catch (error) {
        return null
    }

}


