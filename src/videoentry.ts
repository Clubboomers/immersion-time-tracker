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

  public getUrl(): string {
    return this.url;
  }

  public setUrl(url: string): void {
    this.url = url;
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
    if (!timeEntry.endTimeSet()) return;
    this.timeEntries.push(timeEntry);
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

  public getLastTimeEntry(): TimeEntry | null {
    if (this.timeEntries.length > 0) {
      return this.timeEntries[this.timeEntries.length - 1];
    }
    return null;
  }
}
