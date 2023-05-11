import { TimeEntry } from "./timeentry";

export class VideoEntry {
  private videoName: string | null;
  private url: string;
  private timeEntries: TimeEntry[];
  private durationWatched: number;

  // make videoName optional, and list of timeEntries optional
  constructor(url: string, videoName: string | null, timeEntries?: TimeEntry[]) {
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
    return this.durationWatched;
  }

  private getLastTimeEntry(): TimeEntry | null {
    if (this.timeEntries.length > 0) {
      return this.timeEntries[this.timeEntries.length - 1];
    }
    return null;
  }

  public setLastTimeEntryEndTime(endTime: Date): void {
    if (this.timeEntries.length > 0) {
      this.getLastTimeEntry()!.setEndTime(endTime);
    }
    this.updateDurationWatched();
  }
}
