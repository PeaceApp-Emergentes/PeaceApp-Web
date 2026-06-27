import axios from "axios";
import { environment } from "../environments/environment.js";

export class PaymentApiService {
    baseUrl = "";

    constructor() {
        this.baseUrl = environment.baseUrl;
    }

    async createCheckoutSession(data) {
        try {
            return await axios.post(`${this.baseUrl}/payments/checkout-session`, data);
        } catch (e) {
            console.error("createCheckoutSession error", e);
            return e.response;
        }
    }

    async getSession(sessionId) {
        try {
            return await axios.get(`${this.baseUrl}/payments/session/${sessionId}`);
        } catch (e) {
            console.error("getSession error", e);
            return e.response;
        }
    }

    async getSubscription(email) {
        try {
            return await axios.get(`${this.baseUrl}/payments/subscription`, { params: { email } });
        } catch (e) {
            console.error("getSubscription error", e);
            return e.response;
        }
    }

    async cancelSubscription(email) {
        try {
            return await axios.post(`${this.baseUrl}/payments/subscription/cancel`, { email });
        } catch (e) {
            console.error("cancelSubscription error", e);
            return e.response;
        }
    }

    async reactivateSubscription(email) {
        try {
            return await axios.post(`${this.baseUrl}/payments/subscription/reactivate`, { email });
        } catch (e) {
            console.error("reactivateSubscription error", e);
            return e.response;
        }
    }
}
