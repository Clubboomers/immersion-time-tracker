export class TimeEntry {
  private startTime: Date;
  private endTime: Date | null = null;

  constructor(startTime: Date, endTime?: Date) {
    this.startTime = startTime;
    this.endTime = endTime || null;
  }

  public getStartTime(): Date {
    return this.startTime;
  }

  public getEndTime(): Date | null {
    return this.endTime;
  }

  public endTimeSet(): boolean {
    return this.endTime !== null;
  }

  public getDuration(): number {
    if (!this.endTime) return 0;
    return this.endTime.getTime() / 1000 - this.startTime.getTime() / 1000;
  }

  public setStartTime(startTime: Date): void {
    this.startTime = startTime;
  }

  public setEndTime(endTime: Date): void {
    this.endTime = endTime;
  }
}
