import axios from 'axios';
import { DEEPSEEK_API_KEY, DEEPSEEK_API_URL } from '../config/api.config';

const apiService = {
    analyzePrescription: async (base64Image, options = {}) => {
        try {
            const response = await axios.post(
                `${DEEPSEEK_API_URL}/vision/analyze`,
                {
                    image: base64Image,
                    analysis_type: 'prescription',
                    model: 'deepseek-vision-v1',
                    settings: {
                        detailed_analysis: true,
                        extract_medications: true,
                        detect_warnings: true,
                        ...options
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Other API methods can be added here
};

export default apiService;