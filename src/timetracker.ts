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

  public static getInstance(name: string, description: string): TimeTracker {
    if (!TimeTracker.instance) {
      TimeTracker.instance = new TimeTracker(name, description);
    }
    return TimeTracker.instance;
  }

  public getName(): string {
    return this.name;
  }

  public setName(name: string): void {
    this.name = name;
  }

  public getDescription(): string {
    return this.description;
  }

  public setDescription(description: string): void {
    this.description = description;
  }

  public getVideoEntries(): VideoEntry[] {
    return this.videoEntries;
  }

  public setVideoEntries(videoEntries: VideoEntry[]): void {
    this.videoEntries = videoEntries;
    this.updateTotalTimeWatched();
  }

  public getLastVideoEntry(): VideoEntry | null {
    return this.lastVideoEntry;
  }

  public setLastVideoEntry(lastVideoEntry: VideoEntry): void {
    this.lastVideoEntry = lastVideoEntry;
  }

  public getTotalTimeWatched(): number {
    return this.totalTimeWatched;
  }

  public setTotalTimeWatched(totalTimeWatched: number): void {
    this.totalTimeWatched = totalTimeWatched;
  }

  public addTimeEndToVideoEntry(url: string, endTime: Date): void {
    const videoEntry = this.getVideoEntryByURL(url);
    if (!videoEntry) {
      return;
    }
    videoEntry.getLastTimeEntry()?.setEndTime(endTime);
  }

  public getVideoEntryByURL(url: string): VideoEntry | null {
    for (const videoEntry of this.videoEntries) {
      if (videoEntry.getUrl() === url) {
        return videoEntry;
      }
    }
    return null;
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

  public static fromJSON(json: string): TimeTracker {
    const parsedJSON = JSON.parse(json);
    const timeTracker = new TimeTracker(
      parsedJSON.name,
      parsedJSON.description
    );
    timeTracker.setVideoEntries(parsedJSON.videoEntries);
    timeTracker.setLastVideoEntry(parsedJSON.lastVideoEntry);
    timeTracker.setTotalTimeWatched(parsedJSON.totalTimeWatched);
    return timeTracker;
  }

  public static toJSON(timeTracker: TimeTracker): string {
    return JSON.stringify(timeTracker);
  }
}
