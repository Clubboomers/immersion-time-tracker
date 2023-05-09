export class TimeEntry {
    private startTime: Date;
    private endTime: Date;

    constructor(startTime: Date, endTime?: Date) {
        this.startTime = startTime;
        this.endTime = endTime ||  startTime;
    }

    public getStartTime(): Date {
        return this.startTime;
    }

    public getEndTime(): Date {
        return this.endTime;
    }

    public getDuration(): number {
        return this.endTime.getTime()/1000 - this.startTime.getTime()/1000;
    }

    public setStartTime(startTime: Date): void {
        this.startTime = startTime;
    }

    public setEndTime(endTime: Date): void {
        this.endTime = endTime;
    }
}