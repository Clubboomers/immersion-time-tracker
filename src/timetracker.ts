import "reflect-metadata";
import {
  Expose,
  Type,
  instanceToPlain,
  plainToInstance,
} from "class-transformer";
import { VideoEntry } from "./videoentry";
import { TimeEntry } from "./timeentry";

export class TimeTracker {
  private static instance: TimeTracker; // singleton instance
  @Expose({ name: "name" })
  private name: string;
  @Expose({ name: "description" })
  private description: string;
  @Type(() => VideoEntry)
  private videoEntries: VideoEntry[]; // more detailed information videos watched
  /**
   * as opposed to videoEntries, timeEntries only tracks the time you're watching one or more videos,
   * so can't have multiple entries during the same period of time
   */
  @Expose({ name: "timeEntries" })
  @Type(() => TimeEntry)
  private timeEntries: TimeEntry[];
  @Expose({ name: "lastVideoEntry" })
  @Type(() => VideoEntry)
  private lastVideoEntry: VideoEntry | null;
  @Expose({ name: "totalTimeWatched" })
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

  public getLastTimeEntry(): TimeEntry | null {
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
    if (lastTimeEntry && !lastTimeEntry.getEndTime()) {
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
    this.updateTotalTimeWatched();
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
    this.updateTotalTimeWatched();
    return this.totalTimeWatched;
  }

  public setTotalTimeWatched(totalTimeWatched: number): void {
    this.totalTimeWatched = totalTimeWatched;
  }

  public setTimeEntries(timeEntries: TimeEntry[]): void {
    this.timeEntries = timeEntries;
  }

  public getTimeEntries(): TimeEntry[] {
    return this.timeEntries;
  }

  public addTimeEndToVideoEntry(url: string, endTime: Date): void {
    const videoEntry = this.getVideoEntryByURL(url);
    if (!videoEntry) {
      return;
    }
    //videoEntry.getLastTimeEntry()?.setEndTime(endTime);
    videoEntry.setLastTimeEntryEndTime(endTime);
    this.updateTotalTimeWatched();
  }

  public getVideoEntryByURL(url: string): VideoEntry | null {
    for (const videoEntry of this.videoEntries) {
      if (videoEntry.getUrl() === url) {
        return videoEntry;
      }
    }
    return null;
  }

  public getVideoEntryByKey(key: string): VideoEntry | null {
    for (const videoEntry of this.videoEntries) {
      if (videoEntry.getUrl().includes(key)) {
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
    this.updateTotalTimeWatched();
  }

  /**
   * Adds a new video entry to the time tracker
   * If the last time entry is still running, it will be stopped.
   * @param url url of the video
   * @param title title of the video
   * @param date time when the timer was started
   */
  public addVideoEntryByUrl(
    url: string,
    title: string | null,
    date: Date
  ): void {
    if (this.videoEntryWithUrlExists(url)) {
      const videoEntry = this.getVideoEntryByUrl(url)!;
      videoEntry.addTimeEntry(new TimeEntry(date));
      return;
    }
    this.videoEntries.push(new VideoEntry(url, title, [new TimeEntry(date)]));
    this.lastVideoEntry = this.videoEntries[this.videoEntries.length - 1];
    this.updateTotalTimeWatched();
  }

  private videoEntryWithUrlExists(url: string): boolean {
    for (const videoEntry of this.videoEntries) {
      if (videoEntry.getUrl() === url) {
        return true;
      }
    }
    return false;
  }

  private getAllDates(): { dateStart: Date; dateEnd: Date }[] {
    const dates: { dateStart: Date; dateEnd: Date }[] = [];
    this.videoEntries.forEach((videoEntry) => {
      videoEntry.getTimeEntries().forEach((timeEntry) => {
        dates.push({
          dateStart: timeEntry.getStartTime(),
          dateEnd: timeEntry.getEndTime() || new Date(),
        });
      });
    });
    return dates;
  }

  public updateTotalTimeWatched(): void {
    console.log("updateTotalTimeWatched called");
    this.totalTimeWatched = 0;
    let dates: { dateStart: Date; dateEnd: Date }[] = this.getAllDates();
    // sort times
    dates = dates.sort((a, b) => a.dateStart.getTime() - b.dateStart.getTime());
    // merge overlapping times
    for (let i = 0; i < dates.length - 1; i++) {
      if (dates[i].dateEnd.getTime() > dates[i + 1].dateStart.getTime()) {
        dates[i].dateEnd = dates[i + 1].dateEnd;
        dates.splice(i + 1, 1);
        i--;
      }
    }
    // calculate total time
    dates.forEach((date) => {
      this.totalTimeWatched += date.dateEnd.getTime() - date.dateStart.getTime();
    });

    this.totalTimeWatched = Math.round(this.totalTimeWatched / 1000);
  }

  public getVideoEntryByUrl(url: string): VideoEntry | null {
    for (const videoEntry of this.videoEntries) {
      if (videoEntry.getUrl() === url) {
        return videoEntry;
      }
    }
    return null;
  }

  /**
   * Returns the time entries of the last hour
   */
  public getRecentActivity(): { url: string; title: string }[] {
    if (this.videoEntries.length === 0) return [];
    const recentActivity: { url: string; title: string }[] = [];
    for (const videoEntry of this.videoEntries) {
      if (videoEntry.wasRecent()) {
        const url = videoEntry.getUrl();
        const title = videoEntry.getVideoName() || "";
        recentActivity.push({ url, title });
      }
    }
    return recentActivity;
  }

  /**
   *
   * @param range in hours
   * @returns the watch time in the last range hours in milliseconds
   */
  public getWatchTimeMillis(range: number): number {
    let watchTime = 0;
    const videoEntriesInRange = this.getVideoEntriesInRange(range);
    for (const videoEntry of videoEntriesInRange) {
      watchTime += videoEntry.getWatchtimeMillis(range);
    }
    return Math.floor(watchTime);
  }

  private getVideoEntriesInRange(range: number): VideoEntry[] {
    const videoEntriesInRange: VideoEntry[] = [];
    for (const videoEntry of this.videoEntries) {
      const lastTimeEntry = videoEntry.getLastTimeEntry();
      if (!lastTimeEntry) continue;
      if (
        lastTimeEntry.getEndTime()?.getTime()! >=
          new Date().getTime() - range * 3600000 ||
        lastTimeEntry.getStartTime().getTime() >=
          new Date().getTime() - range * 3600000
      ) {
        // video was watched in the last range hours
        videoEntriesInRange.push(videoEntry);
      }
    }
    return videoEntriesInRange;
  }
}
