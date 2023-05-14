import { TimeTracker } from "./timetracker";
import { instanceToPlain, plainToInstance } from "class-transformer";

function saveManagerFunctions() {

  const timeTrackerSave = "timeTracker";
  
  function saveExists(callback: (exists: boolean) => void): void {
    chrome.storage.local.get([timeTrackerSave], function (result) {
      if (!!result && !!result.timeTracker) {
        callback(true);
      } else {
        callback(false);
      }
    });
  }

  function deleteSave(): void {
    chrome.storage.local.remove([timeTrackerSave], function () {
      console.log("deleted save");
    });
  }

  function saveTimeTrackerToStorage(timeTracker: TimeTracker): void {
    chrome.storage.local.set({
      timeTracker: JSON.stringify(instanceToPlain(timeTracker)),
    });
  }
  
  function loadTimeTrackerFromStorage(): TimeTracker | null {
    chrome.storage.local.get([timeTrackerSave], function (result) {
      const timeTracker = plainToInstance(
        TimeTracker,
        JSON.parse(result.timeTracker)
      );
      return timeTracker;
    });
    return null;
  }

  return { saveExists, deleteSave, saveTimeTracker: saveTimeTrackerToStorage, loadTimeTrackerFromStorage};
}

const saveManager = saveManagerFunctions();
export default saveManager;