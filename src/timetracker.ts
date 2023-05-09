import { VideoEntry } from "./videoentry";

export class TimeTracker {
    private static instance: TimeTracker; // singleton instance

    private name: string;
    private description: string;
    private videoEntries: VideoEntry[];
    private lastVideoEntry: VideoEntry | null;
    private totalTimeWatched: number;

    constructor(name: string, description: string) {
        this.name = name;
        this.description = description;
        this.videoEntries = [];
        this.lastVideoEntry = null;
        this.totalTimeWatched = 0;
    }

    public static getInstance(): TimeTracker {
        if (!TimeTracker.instance) {
            TimeTracker.instance = new TimeTracker("YouTube Time Tracker", "Tracks watch time on YouTube");
        }
        return TimeTracker.instance;
    }

    public getName(): string {
        return this.name;
    }

    public getDescription(): string {
        return this.description;
    }

    public getVideoEntries(): VideoEntry[] {
        return this.videoEntries;
    }

    public getLastVideoEntry(): VideoEntry | null {
        return this.lastVideoEntry;
    }

    public getTotalTimeWatched(): number {
        return this.totalTimeWatched;
    }

    public addVideoEntry(videoEntry: VideoEntry): void {
        this.videoEntries.push(videoEntry);
        this.lastVideoEntry = videoEntry;
    }

    public updateTotalTimeWatched(): void {
        this.totalTimeWatched = 0;
        this.videoEntries.forEach((videoEntry) => {
            this.totalTimeWatched += videoEntry.getDurationWatched();
        });
    }

    public getVideoEntryByUrl(url: string): VideoEntry | null {
        for (const videoEntry of this.videoEntries) {
            if (videoEntry.getUrl() === url) {
                return videoEntry;
            }
        }
        return null;
    }
}