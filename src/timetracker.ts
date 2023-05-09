import { VideoEntry } from "./videoentry";
import { TimeEntry } from "./timeentry";

export class TimeTracker {
  private static instance: TimeTracker; // singleton instance

  private name: string;
  private description: string;
  private videoEntries: VideoEntry[]; // more detailed information videos watched
  /**
   * as opposed to videoEntries, timeEntries only tracks the time you're watching one or more videos,
   * so can't have multiple entries during the same period of time
   */
  private timeEntries: TimeEntry[];
  private lastVideoEntry: VideoEntry | null;
  private totalTimeWatched: number;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.videoEntries = [];
    this.timeEntries = [];
    this.lastVideoEntry = null;
    this.totalTimeWatched = 0;
  }

  public static getInstance(name: string, description: string): TimeTracker {
    if (!TimeTracker.instance) {
      TimeTracker.instance = new TimeTracker(name, description);
    }
    return TimeTracker.instance;
  }

  private getLastTimeEntry(): TimeEntry | null {
    if (this.timeEntries.length === 0) {
      return null;
    }
    return this.timeEntries[this.timeEntries.length - 1];
  }

  /**
   * Adds a new time entry to the time tracker
   * If the last time entry is still running, it will be stopped.
   */
  public startTimer(): void {
    const lastTimeEntry = this.getLastTimeEntry();
    if (lastTimeEntry && lastTimeEntry.getEndTime()) {
      // last time entry is still running
      this.stopTimer();
      return;
    }
    this.timeEntries.push(new TimeEntry(new Date()));
  }

  public stopTimer(): void {
    const lastTimeEntry = this.getLastTimeEntry();
    if (!lastTimeEntry) return;
    lastTimeEntry.setEndTime(new Date());
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
    if (this.videoEntryWithUrlExists(videoEntry.getUrl())) {
      videoEntry = this.getVideoEntryByUrl(videoEntry.getUrl())!;
      videoEntry.addTimeEntry(new TimeEntry(new Date()));
      return;
    }
    this.videoEntries.push(videoEntry);
    this.lastVideoEntry = videoEntry;
  }

  private videoEntryWithUrlExists(url: string): boolean {
    for (const videoEntry of this.videoEntries) {
      if (videoEntry.getUrl() === url) {
        return true;
      }
    }
    return false;
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
