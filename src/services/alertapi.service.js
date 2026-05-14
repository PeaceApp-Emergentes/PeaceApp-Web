import axios from "axios";
import { environment } from "../environments/environment.js";

export class AlertApiService {
    constructor() {
        this.baseUrl = environment.baseUrl;
    }

    getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        };
    }

    // GET all alerts
    async getAll() {
        try {
            return await axios.get(`${this.baseUrl}/alerts`, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error fetching all alerts", error);
            return error.response;
        }
    }

    // GET alert by ID
    async getById(id) {
        try {
            return await axios.get(`${this.baseUrl}/alerts/${id}`, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error fetching alert by ID", error);
            return error.response;
        }
    }

    // GET alerts by user ID
    async getByUserId(userId) {
        try {
            return await axios.get(`${this.baseUrl}/alerts/user/${userId}`, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error fetching alerts by user ID", error);
            return error.response;
        }
    }

    // POST create new alert
    async create(data) {
        try {
            return await axios.post(`${this.baseUrl}/alerts`, data, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error creating alert", error);
            return error.response;
        }
    }

    // DELETE all alerts
    async deleteByUserId(userId) {
        try {
            return await axios.delete(`${this.baseUrl}/alerts/user/${userId}`, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error deleting all alerts", error);
            return error.response;
        }
    }
}
