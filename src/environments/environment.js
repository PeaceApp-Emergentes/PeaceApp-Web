export const environment = {
    production: true,
    // Backend de PRODUCCION (gateway detras del dominio, HTTPS).
    baseUrl: "https://peaceapp-backend.duckdns.org/api/v1",
    websocketUrl: "wss://peaceapp-backend.duckdns.org/ws/alerts"

    // Desarrollo local:
    // production: false,
    // baseUrl: "http://localhost:8080/api/v1",
    // websocketUrl: "ws://localhost:8083/ws/alerts"
};
