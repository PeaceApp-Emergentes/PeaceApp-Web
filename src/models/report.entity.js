export class Report {

    constructor(
        title = "",
        description = "",
        type = "",
        userId = 0,
        imageUrl = "https://picsum.photos/1600/900",
        location = "",
        state = "PENDING",
        rejectionReason = ""
    ) {
        this.title = title;
        this.description = description;
        this.type = type;
        this.userId = userId;
        this.imageUrl = imageUrl;
        this.location = location;
        this.state = state;
        this.rejectionReason = rejectionReason;
    }

}
