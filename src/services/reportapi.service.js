import axios from "axios";
import { environment } from "../environments/environment.js";

export class ReportApiService {
    constructor() {
        this.baseUrl = environment.baseUrl;
    }

    // Auth headers
    getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        };
    }

    // -------------------------------------------------------------
    // CREATE REPORT
    // -------------------------------------------------------------
    async create(data) {
        try {
            return await axios.post(`${this.baseUrl}/reports`, data, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error creating report", error);
            return error.response;
        }
    }

    // -------------------------------------------------------------
    // GET REPORT BY ID
    // -------------------------------------------------------------
    async getById(id) {
        try {
            return await axios.get(`${this.baseUrl}/reports/${id}`, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error fetching report by ID", error);
            return error.response;
        }
    }

    // -------------------------------------------------------------
    // CHECK IF REPORT EXISTS
    // -------------------------------------------------------------
    async exists(id) {
        try {
            return await axios.get(`${this.baseUrl}/reports/${id}/exists`, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error checking report existence", error);
            return error.response;
        }
    }

    // -------------------------------------------------------------
    // GET REPORTS BY USER ID
    // -------------------------------------------------------------
    async getByUserId(userId) {
        try {
            return await axios.get(`${this.baseUrl}/reports/user/${userId}`, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error fetching reports by user ID", error);
            return error.response;
        }
    }

    // -------------------------------------------------------------
    // GET ALL REPORTS
    // -------------------------------------------------------------
    async getAll() {
        try {
            return await axios.get(`${this.baseUrl}/reports`, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error fetching all reports", error);
            return error.response;
        }
    }

    // -------------------------------------------------------------
    // GET PUBLIC REPORTS (APPROVED)
    // -------------------------------------------------------------
    async getPublic() {
        try {
            return await axios.get(`${this.baseUrl}/reports/public`, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error fetching public reports", error);
            return error.response;
        }
    }

    // -------------------------------------------------------------
    // CHANGE STATE → IN REVIEW
    // -------------------------------------------------------------
    async markInReview(id) {
        try {
            return await axios.put(`${this.baseUrl}/reports/${id}/review`, {}, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error marking report as In Review", error);
            return error.response;
        }
    }

    // -------------------------------------------------------------
    // CHANGE STATE → APPROVED
    // -------------------------------------------------------------
    async approve(id) {
        try {
            return await axios.put(`${this.baseUrl}/reports/${id}/approve`, {}, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error approving report", error);
            return error.response;
        }
    }

    // -------------------------------------------------------------
    // CHANGE STATE → REJECTED (with reason)
    // -------------------------------------------------------------
    async reject(id, reason) {
        try {
            return await axios.put(`${this.baseUrl}/reports/${id}/reject`,
                { reason },
                { headers: this.getAuthHeaders() }
            );
        } catch (error) {
            console.error("Error rejecting report", error);
            return error.response;
        }
    }

    // -------------------------------------------------------------
    // DELETE REPORT
    // -------------------------------------------------------------
    async delete(id) {
        try {
            return await axios.delete(`${this.baseUrl}/reports/${id}`, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error("Error deleting report", error);
            return error.response;
        }
    }
}
