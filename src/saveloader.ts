import { TimeTracker } from "./timetracker";
class SaveLoader {
  private static instance: SaveLoader;
  private timeTracker: TimeTracker;
  private request: IDBOpenDBRequest;
  constructor(TimeTracker: TimeTracker) {
    this.timeTracker = TimeTracker;
    this.request = indexedDB.open("immersionTimeTracker", 1);

    // create the database if it doesn't exist
    this.request.onupgradeneeded = () => {
      const db = this.request.result;
      db.createObjectStore("timeTracker", { keyPath: "url" });
    };
  }
}
