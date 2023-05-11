import { TimeTracker } from "./timetracker";
import { VideoInformation } from "./video";
import { VideoEntry } from "./videoentry";
import { TimeEntry } from "./timeentry";

let timeTracker = TimeTracker.getInstance(
  "YouTube Time Tracker",
  "Tracks watch time on YouTube"
);

let activeTabs: { id: number; url: string }[] = []; // the tabs that are currently open
let playingVideos: { title: string | null; url: string }[] = [];
//let url: string | undefined; // the url of the tab that is currently being viewed

chrome.runtime.onInstalled.addListener(function () {
  saveExists(function (exists) {
    if (!exists) {
      createSave();
    } else {
      try {
        loadTimeTracker();
      } catch (error) {
        console.log(error);
        deleteSave();
        createSave();
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

function handleTabClosed() {
  chrome.tabs.query({}, function (tabs) {
    // check if any of the playingVideos have been closed
    const urls = getActiveTabsUrls();
    for (let i = 0; i < playingVideos.length; i++) {
      if (!urls.includes(playingVideos[i].url)) {
        // none of the active tabs have the url of the video, so it must have been closed
        timeTracker.getVideoEntryByURL(playingVideos[i].url)?.stop();
        playingVideos.splice(i, 1);
      }
    }
  });
}

function updateActiveTabs(): void {
  activeTabs = [];
  chrome.tabs.query({}, function (tabs) {
    tabs.forEach((tab) => {
      if (tab.url && isYouTube(tab.url)) {
        addToActiveTabs(tab.id!, tab.url);
      }
    });
  });
}

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
      const playingVideoKey = playingVideos.find((video) => url.includes(video.url))?.url;
      playingVideoKey ? timeTracker.getVideoEntryByKey(playingVideoKey)?.stop() : null;  // stop the video that was playing
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
  chrome.storage.local.set({ timeTracker: TimeTracker.toJSON(timeTracker) });
  console.log(JSON.parse(TimeTracker.toJSON(timeTracker)));
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
  chrome.storage.local.set({ timeTracker: TimeTracker.toJSON(timeTracker) });
  console.log("created save");
}

function loadTimeTracker(): void {
  try {
    chrome.storage.local.get(["timeTracker"], function (result) {
      timeTracker = TimeTracker.fromJSON(result.timeTracker);
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
      startTimer();
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
