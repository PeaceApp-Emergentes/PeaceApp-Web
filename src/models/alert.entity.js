export class Alert {
    constructor(location, type, description, userId, imageUrl, idReport) {
        this.location = location;
        this.type = type;
        this.description = description;
        this.userId = userId;
        this.imageUrl = imageUrl;
        this.reportId = idReport;
    }
}
