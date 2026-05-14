import axios from "axios";
import { environment } from "../environments/environment.js";

export class LocationApiService {
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

    // GET all locations
    async getAll() {
        try {
            return await axios.get(`${this.baseUrl}/locations`, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error fetching all locations", error);
            return error.response;
        }
    }

    // GET dangerous locations
    async getDangerous() {
        try {
            return await axios.get(`${this.baseUrl}/locations/dangerous`, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error fetching dangerous locations", error);
            return error.response;
        }
    }

    // POST create a new location
    async createLocation(locationData) {
        try {
            return await axios.post(`${this.baseUrl}/locations`, locationData, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error creating location", error);
            return error.response;
        }
    }
}
