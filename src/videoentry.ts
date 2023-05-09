import { TimeEntry } from "./timeentry";

export class VideoEntry {
    private videoName: string | null;
    private url: string;
    private timeEntries: TimeEntry[];
    private durationWatched: number;

    // make videoName optional
    constructor(url: string, videoName: string | null) {
        this.url = url;
        this.videoName = videoName;
        this.timeEntries = [];
        this.durationWatched = 0;
    }

    public getVideoName(): string | null {
        return this.videoName;
    }

    public setVideoName(videoName: string): void {
        this.videoName = videoName;
    }

    public getUrl(): string {
        return this.url;
    }

    public addTimeEntry(startTime: Date, endTime: Date): void {
        const timeEntry = new TimeEntry(startTime, endTime);
        this.timeEntries.push(timeEntry);
        this.durationWatched += timeEntry.getDuration();
    }

    public updateDurationWatched(): void {
        this.durationWatched = 0;
        this.timeEntries.forEach((timeEntry) => {
            this.durationWatched += timeEntry.getDuration();
        });
    }

    public getDurationWatched(): number {
        return this.durationWatched;
    }

    public getTimeEntries(): TimeEntry[] {
        return this.timeEntries;
    }

    public setTimeEntries(timeEntries: TimeEntry[]): void {
        this.timeEntries = timeEntries;
    }

    public getLastTimeEntry(): TimeEntry | null {
        if (this.timeEntries.length > 0) {
            return this.timeEntries[this.timeEntries.length - 1];
        }
        return null;
    }
}