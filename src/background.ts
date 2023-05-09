//import { SaveLoader } from "./saveloader";
import { create } from "domain";
import { TimeTracker } from "./timetracker";
import { VideoInformation } from "./video";
import { VideoEntry } from "./videoentry";
import { TimeEntry } from "./timeentry";

let timeTracker = TimeTracker.getInstance(
  "YouTube Time Tracker",
  "Tracks watch time on YouTube"
);

let playingVideos: VideoInformation[] = [];


console.log(TimeTracker.toJSON(timeTracker));
loadTimeTracker();
console.log(TimeTracker.toJSON(timeTracker));

chrome.runtime.onInstalled.addListener(function () {
  // create indexedDB
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

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // listen for messages sent from content.ts
  if (request.message === "update") {
    const videoInformation: VideoInformation = request.videoInformation;
    const isPlaying = request.isPlaying;
    if (videoInformation && isPlaying) {
      const videoName = videoInformation.getTitle();
      const videoUrl = videoInformation.getUrl();
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

function handleVideoUpdate(videoInformation: VideoInformation, isPlaying: boolean): void {
  switch (isPlaying) {
    case true:
      const videoEntry: VideoEntry = new VideoEntry(videoInformation.getUrl(), videoInformation.getTitle());
      videoEntry.addTimeEntry(new TimeEntry(new Date()));
      playingVideos.push(videoInformation);
      break;
    case false:
      // find video in playingVideos
      const searchedVideoEntry = playingVideos.find((video) => {
        return video.getUrl() === videoInformation.getUrl();
      });

      if (!searchedVideoEntry) {
        console.error(`Expected to find video entry with url ${videoInformation.getUrl()}`);
        return;
      }

      // add end time to video entry
      



      // remove video from playingVideos
      playingVideos = playingVideos.filter((video) => {
        return video.getUrl() !== videoInformation.getUrl();
      });
      break;
  }
  if (playingVideos.length === 0) {
    // no videos are playing
    return;
  }
}