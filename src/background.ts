import "reflect-metadata";
import {
  instanceToPlain,
  plainToInstance,
} from "class-transformer";
import { TimeTracker } from "./timetracker";

let timeTracker = TimeTracker.getInstance(
  "Immersion Time Tracker",
  "Tracks time immersing in a language"
);

let activeTabs: { id: number; url: string }[] = []; // the tabs that are currently open
let playingVideos: { title: string | null; url: string }[] = [];

/**
 * override push method to start timer when first video is played
 */
playingVideos.push = function (item) {
  if (this.length === 0) {
    startTimer();
    chrome.runtime.sendMessage({
      message: "playing_state",
      playing_state: true,
      url: item.url,
      string: item.title,
    });
  }
  return Array.prototype.push.call(this, item);
};

//let url: string | undefined; // the url of the tab that is currently being viewed

chrome.runtime.onInstalled.addListener(function () {
  saveExists(function (exists) {
    if (!exists) {
      saveTimeTracker(timeTracker);
    } else {
      try {
        timeTracker = loadTimeTrackerFromStorage() || timeTracker;
      } catch (error) {
        console.log(error);
        deleteSave();
        saveTimeTracker(timeTracker);
      }
    }
  });
});

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  if (isYouTube(tab.url) && changeInfo.status === "complete") {
    // tab is on YouTube and has finished loading
    addToActiveTabs(tabId, tab.url);
  }
});

export function isYouTube(url: string | undefined): boolean {
  if (!url) return false;
  if (url.includes("youtube.com/watch") && !url.includes("music.youtube")) {
    return true;
  }
  return false;
}

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  console.log("tab closed: " + tabId);
  removeFromActiveTabs(tabId);
});

/**
 * Adds tab to activeTabs and sends message to content script to start tracking time
 * @param tabId
 * @param url
 */
function addToActiveTabs(
  tabId: number | undefined,
  url: string | undefined
): void {
  if (!url || !tabId) return;
  if (!isYouTube(url)) return;
  if (activeTabsContain(tabId)) {
    // tab is already in activeTabs

    if (playingVideos.some((video) => url.includes(video.url))) {
      // video is already playing
      const playingVideoKey = playingVideos.find((video) =>
        url.includes(video.url)
      )?.url;
      playingVideoKey
        ? timeTracker.getVideoEntryByKey(playingVideoKey)?.stop()
        : null; // stop the video that was playing
      return;
    }

    changeActiveTabUrl(tabId, url);
    sendMessage(tabId, "new_url", url);
    return;
  }
  activeTabs.push({ id: tabId, url: url });
  sendMessage(tabId, "new_url", url);
}

/**
 * Changes the url of the tab in activeTabs
 * @param tabId
 * @param newUrl
 */
function changeActiveTabUrl(
  tabId: number | undefined,
  newUrl: string | undefined
): void {
  if (!newUrl || !tabId) return;
  activeTabs = activeTabs.map((tab) => {
    if (tab?.id === tabId) {
      if (tab.url === newUrl) return tab;
      tab.url = newUrl;
    }
    return tab;
  });
}

function updateEndTimePlayingVideos(): void {
  if (playingVideos.length === 0) return;
  playingVideos.forEach((video) => {
    timeTracker.getVideoEntryByURL(video.url)?.stop();
  });
  timeTracker.getLastTimeEntry()?.setEndTime(new Date());
}

function removeFromActiveTabs(tabId: number): void {
  const tab = activeTabs.find((tab) => tab?.id === tabId);
  if (!tab) return;
  timeTracker.getVideoEntryByKey(tab.url)?.stop();
  if (playingVideos.some((video) => tab.url.includes(video.url))) {
    // stop video playing
    timeTracker.getVideoEntryByKey(tab.url)?.stop();
    playingVideos = playingVideos.filter(
      (video) => !video.url.includes(tab.url)
    );
  }
  activeTabs = activeTabs.filter((tab) => tab?.id !== tabId);
  timeTracker.getLastTimeEntry()?.setEndTime(new Date());
}

function activeTabsContain(tabId: number): boolean {
  return activeTabs.some((tab) => tab?.id === tabId);
}

function getActiveTabsUrls(): string[] {
  return activeTabs.map((tab) => tab?.url);
}

/*function addToTimeTracker(videoUrl: string, videoName: string | null): void {
  timeTracker.addVideoEntry(new VideoEntry(videoUrl, videoName));
}*/

function sendMessage(
  tabId: number,
  message: string,
  url: string | undefined
): void {
  console.log("sending message to tab " + tabId);
  if (!url) return;
  chrome.tabs.sendMessage(tabId, {
    message: message,
    url: url,
  });
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
  updateEndTimePlayingVideos();
  console.log(activeTabs);
  console.log(playingVideos);
  saveTimeTracker(timeTracker);
  console.log(timeTracker);
}, 10000);

function saveExists(callback: (exists: boolean) => void): void {
  chrome.storage.local.get(["timeTracker"], function (result) {
    if (!!result && !!result.timeTracker) {
      callback(true);
    } else {
      callback(false);
    }
  });
}

function createSave(): void {
  chrome.storage.local.set({ timeTracker: TimeTracker.toJson(timeTracker) });
  console.log("created save");
}

function loadTimeTracker(): void {
  try {
    chrome.storage.local.get(["timeTracker"], function (result) {
      timeTracker = TimeTracker.fromJson(result.timeTracker);
      console.log("loaded save");
    });
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
    const title = request.title;
    const url = request.url;
    const isPlaying = JSON.parse(request.isPlaying);
    if (url) {
      handleUpdate(title, url, isPlaying);
    }
  }

  if (request.message === "get_popup_info") {
    const recentActivity = timeTracker.getRecentActivity();
    let now = new Date();
    let watchtimeToday = timeTracker.getWatchTimeMillis(now.getHours() + now.getMinutes() / 60); // hours since midnight
    const playingState = playingVideos.length > 0;
    sendResponse({
      message: "popup_info",
      recentActivity: recentActivity,
      watchtimeToday: watchtimeToday,
      playingState: playingState,
    });
  }

  if (request.message === "get_recent_activity") {
    const recentActivity = timeTracker.getRecentActivity();
    sendResponse({
      message: "recent_activity",
      recentActivity: recentActivity,
    });
  }

  if (request.message === "get_watchtime_today") {
    const watchtimeToday = timeTracker.getWatchTimeMillis(24);
    sendResponse({
      message: "watchtime_today",
      watchtimeToday: watchtimeToday,
    });
  }

  if (request.message === "get_playing_state") {
    const playingState = playingVideos.length > 0;
    sendResponse({ message: "playing_state", playingState: playingState });
  }
});

function handleUpdate(
  title: string | null,
  url: string,
  isPlaying: boolean
): void {
  console.log("handling update");
  console.log("isPlaying: " + isPlaying);
  const videoInformation = { title, url };
  switch (isPlaying) {
    case true:
      console.log("video is playing");
      timeTracker.addVideoEntryByUrl(url, title, new Date());
      playingVideos.push(videoInformation);
      console.log("playing videos: " + playingVideos.length);
      break;
    case false:
      console.log("video is not playing");
      // find video in playingVideos
      const stoppedVideoEntry = playingVideos.find((video: { url: string }) => {
        return video.url === videoInformation.url;
      });

      if (!stoppedVideoEntry) {
        /*console.error(
          `Expected to find video entry with url ${videoInformation.url} in playingVideos list`
        );*/
        return;
      }

      // add end time to video entry
      timeTracker
        .getVideoEntryByUrl(videoInformation.url)
        ?.setLastTimeEntryEndTime(new Date());

      // remove video from playingVideos
      playingVideos = playingVideos.filter((video: { url: string }) => {
        return video.url !== videoInformation.url;
      });
      stopTimer();
      break;
  }
  createSave();
}

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

export function saveTimeTracker(timeTracker: TimeTracker): void {
  chrome.storage.local.set({
    timeTracker: JSON.stringify(instanceToPlain(timeTracker)),
  });
}

export function loadTimeTrackerFromStorage(): TimeTracker | null {
  chrome.storage.local.get(["timeTracker"], function (result) {
    const timeTracker = plainToInstance(
      TimeTracker,
      JSON.parse(result.timeTracker)
    );
    return timeTracker;
  });
  return null;
}
