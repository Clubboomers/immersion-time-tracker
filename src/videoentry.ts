import "reflect-metadata";
import { Expose, Type } from "class-transformer";
import { TimeEntry } from "./timeentry";

export class VideoEntry {
  @Expose({ name: "videoName" })
  private videoName: string | null;
  @Expose({ name: "url" })
  private url: string;
  @Expose({ name: "timeEntries" })
  @Type(() => TimeEntry)
  private timeEntries: TimeEntry[];
  @Expose({ name: "durationWatched" })
  private durationWatched: number;

  // make videoName optional, and list of timeEntries optional
  constructor(
    url: string,
    videoName: string | null,
    timeEntries?: TimeEntry[]
  ) {
    this.url = url;
    this.videoName = videoName;
    this.timeEntries = timeEntries || [];
    this.durationWatched = 0;
  }

  public getUrl(): string {
    return this.url;
  }

  public setUrl(url: string): void {
    this.url = url;
  }

  /**
   * Stops the last time entry if it is still running
   */
  public stop(): void {
    const lastTimeEntry = this.getLastTimeEntry();
    if (!lastTimeEntry) return;
    lastTimeEntry.setEndTime(new Date());
    this.updateDurationWatched();
  }

  public getVideoName(): string | null {
    return this.videoName;
  }

  public setVideoName(videoName: string): void {
    this.videoName = videoName;
  }

  public getTimeEntries(): TimeEntry[] {
    return this.timeEntries;
  }

  public setTimeEntries(timeEntries: TimeEntry[]): void {
    this.timeEntries = timeEntries;
  }

  public addTimeEntry(timeEntry: TimeEntry): void {
    this.timeEntries.push(timeEntry);
    this.updateDurationWatched();
  }

  private updateDurationWatched(): void {
    this.durationWatched = 0;
    this.timeEntries.forEach((timeEntry) => {
      this.durationWatched += timeEntry.getDuration();
    });
  }

  public getDurationWatched(): number {
    this.updateDurationWatched();
    return this.durationWatched;
  }

  /**
   * define recent using a range. Can switch out oneDayAgo for oneHourAgo 
   * @returns true if the last time entry was recent
   */
  public wasRecent(): boolean {
    console.log("wasRecent() called");
    // get the last time entry that has an end time
    const lastTimeEntry = this.getLastTimeEntry();
    if (!lastTimeEntry) return false;
    let timeStamp = lastTimeEntry.getEndTime() || lastTimeEntry.getStartTime(); // if there is no end time, get the start time
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
    return timeStamp > threeDaysAgo;
  }

  public getLastTimeEntry(): TimeEntry | null {
    if (this.timeEntries.length > 0) {
      return this.timeEntries[this.timeEntries.length - 1];
    }
    return null;
  }

  /**
   *
   * @param range The range in hours
   * @returns The number of milliseconds watched within the range
   */
  public getWatchtimeMillis(range: number): number {
    const now = new Date();
    const rangeInMilliseconds = range * 60 * 60 * 1000; // 60 minutes * 60 seconds * 1000 milliseconds
    const rangeStart = new Date(now.getTime() - rangeInMilliseconds);
    let durationWatched = 0;
    this.timeEntries.forEach((timeEntry) => {
      const startTime = timeEntry.getStartTime();
      const endTime = timeEntry.getEndTime();
      if (startTime && endTime) {
        if (startTime > rangeStart) {
          durationWatched += timeEntry.getDuration();
        }
      }
    });
    return durationWatched;
  }

  public setLastTimeEntryEndTime(endTime: Date): void {
    if (this.timeEntries.length > 0) {
      const lastTimeEntry = this.getLastTimeEntry();
      if (!lastTimeEntry)
        throw new Error("Cannot set value because lastTimeEntry is null");
      lastTimeEntry.setEndTime(endTime);
    }
    this.updateDurationWatched();
  }
}
