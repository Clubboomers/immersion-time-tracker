//import { SaveLoader } from "./saveloader";
import { TimeTracker } from "./timetracker";
import { VideoInformation } from "./video";
import { VideoEntry } from "./videoentry";
import { TimeEntry } from "./timeentry";

let timeTracker = TimeTracker.getInstance(
  "YouTube Time Tracker",
  "Tracks watch time on YouTube"
);

let playingVideos:any = [];

chrome.runtime.onInstalled.addListener(function () {
  // create indexedDB
  if (!saveExists()) {
    createSave();
    return;
  }
  try {
    loadTimeTracker();
  } catch (error) {
    console.log(error);
    deleteSave();
    createSave();
  }
});

let url: string | undefined; // the url of the tab that is currently being viewed

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  console.log(changeInfo);
  if (!changeInfo.status) return;
  // if the link is not youtube, then return
  if (
    changeInfo.status === "loading" &&
    changeInfo.url &&
    !isYouTube(changeInfo.url)
  )
    return;

  // if the status is loading, then set url to changeInfo.url
  if (changeInfo.status === "loading" && changeInfo.url) {
    url = changeInfo.url;
  } else if (changeInfo.status === "complete" && url) {
    if (isYouTube(url)) {
      console.log("going to youtube link");
      sendMessage(tabId, "new_url", url);
    }
  }
});

function isYouTube(url: string | undefined): boolean {
  if (url && url.includes("youtube.com")) {
    return true;
  }
  return false;
}

/*function addToTimeTracker(videoUrl: string, videoName: string | null): void {
  timeTracker.addVideoEntry(new VideoEntry(videoUrl, videoName));
}*/

function sendMessage(
  tabId: number,
  message: string,
  url: string | undefined
): void {
  if (!url) return;
  chrome.tabs.sendMessage(tabId, {
    message: message,
    url: url,
  });
  url = undefined; // reset url
}

function getTabById(tabId: number): chrome.tabs.Tab | undefined {
  chrome.tabs.get(tabId, function (tab) {
    return tab;
  });
  return undefined;
}

/**
 * TODO: implement better saving
 */
setInterval(() => {
  chrome.storage.local.set({ timeTracker: TimeTracker.toJSON(timeTracker) });
  console.log("saved time tracker to storage");
  console.log(JSON.parse(TimeTracker.toJSON(timeTracker)));
}, 10000);

function saveExists(): boolean {
  chrome.storage.local.get(["timeTracker"], function (result) {
    if (result.timeTracker) {
      return true;
    }
    return false;
  });
  return false;
}

function createSave(): void {
  chrome.storage.local.set({ timeTracker: TimeTracker.toJSON(timeTracker) });
}

function loadTimeTracker(): void {
  try {
    if (saveExists()) {
      chrome.storage.local.get(["timeTracker"], function (result) {
        if (result.timeTracker) {
          timeTracker = TimeTracker.fromJSON(result.timeTracker);
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
}

function deleteSave(): void {
  chrome.storage.local.remove(["timeTracker"], function () {
    console.log("deleted save");
  });
}


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // listen for messages sent from video.ts
  console.log(request);
  if (request.message === "update") {
    const title = JSON.parse(request.title);
    const url = JSON.parse(request.url);
    const isPlaying = JSON.parse(request.isPlaying);
    if (url && isPlaying) {
      handleUpdate(title, url, isPlaying);
    }
  }
});

function handleUpdate(
  title: string | null,
  url: string,
  isPlaying: boolean
): void {
  console.log("handling update");
  const videoInformation = {title, url}
  switch (isPlaying) {
    case true:
      console.log("video is playing");
      const videoEntry: VideoEntry = new VideoEntry(
        url,
        title
      );
      console.log("video entry: " + videoEntry);
      videoEntry.addTimeEntry(new TimeEntry(new Date()));
      timeTracker.addVideoEntry(videoEntry);
      startTimer();
      playingVideos.push(videoInformation);
      break;
    case false:
      console.log("video is not playing");
      // find video in playingVideos
      const stoppedVideoEntry = playingVideos.find((video: { url: string; }) => {
        return video.url === videoInformation.url;
      });

      if (!stoppedVideoEntry) {
        console.error(
          `Expected to find video entry with url ${videoInformation.url} in playingVideos list`
        );
        return;
      }

      // add end time to video entry
      timeTracker
        .getVideoEntryByUrl(videoInformation.url)
        ?.getLastTimeEntry()
        ?.setEndTime(new Date());

      // remove video from playingVideos
      playingVideos = playingVideos.filter((video: { url: string; }) => {
        return video.url !== videoInformation.url;
      });
      stopTimer();
      break;
  }
}

// testing only
/*chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // listen for messages sent from video.ts
  console.log(request);
  if (request.message === "update") {
    const title = JSON.parse(request.title);
    const url = JSON.parse(request.url);
    const isPlaying = JSON.parse(request.isPlaying);
    console.log("test message received: isPlaying = " + isPlaying + " title = " + title + " url = " + url);
    if (url && isPlaying !== undefined) {
      testHandleUpdate(title, url, isPlaying);
    }
  }
});

function testHandleUpdate(title: string | null, url: string, isPlaying: boolean): void {
  console.log("handling update");
  const videoInformation = {title, url};
  switch (isPlaying) {
    case true:
      console.log("video is playing");
      playingVideos.push(videoInformation);
      console.log("Playing videos: " + playingVideos.length);
      break;
    case false:
      console.log("video is not playing");
      // find video in playingVideos
      const stoppedVideoEntry = playingVideos.find((video: { url: string; }) => {
        return video.url === url;
      });
      // remove video from playingVideos
      playingVideos = playingVideos.filter((video: { url: string; }) => {
        return video.url !== url;
      });
      console.log("Playing videos: " + playingVideos.length);
      break;
  }
}*/

/**
 * Only start the timer if there are no videos playing yet (called before adding to playingVideos)
 */
function startTimer(): void {
  if (playingVideos.length === 0) {
    // no videos are playing yet
    console.log("Starting timer");
    timeTracker.startTimer();
  }
}

/**
 * Only stop the timer if there are no videos playing
 */
function stopTimer(): void {
  if (playingVideos.length === 0) {
    // no videos are playing
    console.log("Stopping timer");
    timeTracker.stopTimer();
  }
}
