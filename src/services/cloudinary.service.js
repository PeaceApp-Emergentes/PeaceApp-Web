// src/services/cloudinary.service.js
import axios from 'axios';

const cloudName = 'dynfr1idx'; // Make sure this is correct
const uploadPreset = 'peaceapppresset'; // Must be an unsigned preset

const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

export default class CloudinaryService {
    /**
     * Uploads an image file to Cloudinary using an unsigned preset.
     * @param {File} file - Image file from input
     * @returns {Promise<{ secure_url: string, public_id: string }>}
     */
    static async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        console.log('Uploading to Cloudinary with:', cloudName, uploadPreset); // Debug

        try {
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { secure_url, public_id } = response.data;
            return { secure_url, public_id };
        } catch (error) {
            console.error('Cloudinary upload failed:', error);
            throw error;
        }
    }
}
