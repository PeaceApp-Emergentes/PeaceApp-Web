import axios from "axios";
import { environment } from "../environments/environment.js";

export class UserApiService {
    baseUrl = "";

    constructor() {
        this.baseUrl = environment.baseUrl;
    }

    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            Authorization: `Bearer ${token}`
        };
    }

    async getAllUsers() {
        try {
            return await axios.get(`${this.baseUrl}/users`, {
                headers: this.getAuthHeaders()
            });
        } catch (e) {
            console.error('Error getting users', e);
            return e.response;
        }
    }

    async getUserByEmail(email) {
        try {
            return await axios.get(`${this.baseUrl}/users/email/${email}`, {
                headers: this.getAuthHeaders()
            });
        } catch (e) {
            console.error('Error getting user by email', e);
            return e.response;
        }
    }

    async createUser(data) {
        try {
            return await axios.post(`${this.baseUrl}/users`, data, {
                headers: this.getAuthHeaders()
            });
        } catch (e) {
            console.error('Error creating user', e);
            return e.response;
        }
    }

    async updateUser(id, data) {
        try {
            return await axios.put(`${this.baseUrl}/users/${id}`, data, {
                headers: this.getAuthHeaders()
            });
        } catch (e) {
            console.error('Error updating user', e);
            return e.response;
        }
    }

    async deleteUser(id) {
        try {
            return await axios.delete(`${this.baseUrl}/users/${id}`, {
                headers: this.getAuthHeaders()
            });
        } catch (e) {
            console.error('Error deleting user', e);
            return e.response;
        }
    }

    async changeUserPassword(id, data) {
        try {
            const token = localStorage.getItem('authToken');
            return await axios.put(`${this.baseUrl}/users/change-password/${id}`, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (e) {
            console.error('Error changing user password', e);
            return e.response;
        }
    }

}
