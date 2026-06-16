export const environment = {
    production: false,
    baseUrl: "http://localhost:8080/api/v1",
    // US36: WebSocket directo al ReportService (NO pasa por el Gateway).
    // El ReportService corre en el puerto 8083 y expone /ws/alerts.
    websocketUrl: "ws://localhost:8083/ws/alerts"
};
