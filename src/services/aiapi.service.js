import axios from "axios";
import { environment } from "../environments/environment.js";

export class AiApiService {
    baseUrl = "";

    constructor() {
        this.baseUrl = environment.baseUrl;
    }

    getAuthHeaders() {
        const token = sessionStorage.getItem('authToken');
        return { Authorization: `Bearer ${token}` };
    }

    async chatbot(message, context = "") {
        try {
            return await axios.post(`${this.baseUrl}/ai/chatbot`, { message, context }, { headers: this.getAuthHeaders() });
        } catch (e) {
            console.error('AI chatbot error', e);
            return e.response;
        }
    }

    async classifyIncident(description, location, district) {
        try {
            return await axios.post(`${this.baseUrl}/ai/classify-incident`,
                { description, location, district }, { headers: this.getAuthHeaders() });
        } catch (e) {
            console.error('AI classify error', e);
            return e.response;
        }
    }

    async analyzeEvidence(evidenceUrl, evidenceType, description) {
        try {
            return await axios.post(`${this.baseUrl}/ai/analyze-evidence`,
                { evidenceUrl, evidenceType, description }, { headers: this.getAuthHeaders() });
        } catch (e) {
            console.error('AI analyze error', e);
            return e.response;
        }
    }
}
