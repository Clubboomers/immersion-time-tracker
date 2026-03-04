import { VideoTracker } from "./videotracker";

let videotracker = new VideoTracker();

videotracker.checkForSave();
videotracker.initListeners();
videotracker.startSaveInterval();