import { TimeTracker } from "./timetracker";
import saveManager from "./savemanager";
//import saveManager from "./savemanager";

let timeTracker = TimeTracker.getInstance(
  "Immersion Time Tracker",
  "Tracks time immersing in a language"
);
let activeTabs: { id: number; url: string }[] = []; // tabs with videos playing
let playingVideos: { title: string | null; url: string }[] = [];
const targetLanguage = "ja";

checkForSave();

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // listen for messages sent from video.ts
  console.log(request);

  if (request.message === "what_url") {
    sendResponse({ message: "url", url: sender.tab?.url });
  }

  if (request.message === "update") {
    const title = request.title;
    const url = request.url;
    const isPlaying = JSON.parse(request.isPlaying);
    if (url) {
      handleUpdate(title, url, isPlaying, sender.tab?.id);
    }
  }

  if (request.message === "get_popup_info") {
    const recentActivity: { url: string; title: string }[] =
      timeTracker.getRecentActivity();
    let now = new Date();
    let watchtimeToday: number = timeTracker.getWatchTimeMillis(
      now.getHours() + now.getMinutes() / 60
    ); // hours since midnight
    const playingState: boolean = playingVideos.length > 0;
    sendResponse({
      message: "popup_info",
      recentActivity: recentActivity,
      watchtimeToday: watchtimeToday,
      playingState: playingState,
    });
  }
});

/**
 * override push method to start timer when first video is played
 */
/*playingVideos.push = function (item) {
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
};*/

/**
 * override pop method to stop timer when last video is stopped
 */
/*playingVideos.filter = function (callback: any) {
  const result = Array.prototype.filter.call(this, callback);
  if (result.length === 0) {
    stopTimer();
    chrome.runtime.sendMessage({
      message: "playing_state",
      playing_state: false,
    });
  }
  return result;
};*/

chrome.runtime.onInstalled.addListener(function () {
  checkForSave();
});

function checkForSave() {
  saveManager.saveExists(function (exists) {
    if (!exists) {
      saveManager.saveTimeTracker(timeTracker);
    } else {
      try {
        timeTracker = saveManager.loadTimeTrackerFromStorage() || timeTracker;
      } catch (error) {
        console.log(error);
        saveManager.deleteSave();
        saveManager.saveTimeTracker(timeTracker);
      }
    }
  });
}

/**
 * TODO: implement better saving
 */
setInterval(() => {
  updateEndTimePlayingVideos();
  console.log("active tabs: " + activeTabs.length);
  console.log("playing videos: " + playingVideos.length);
  //saveManager.saveTimeTracker(timeTracker);
  console.log(timeTracker);
}, 10000);

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  console.log("tab closed: " + tabId);
  removeFromActiveTabs(tabId);
});

/**
 * Adds tab to activeTabs and sends message to content script to start tracking time
 * @param tabId
 * @param url
 */
function addToActiveTabs(tabId: number, url: string): void {
  if (!url || !tabId) return;
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
    return;
  }
  activeTabs.push({ id: tabId, url: url });
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

function handleUpdate(
  title: string | null,
  url: string,
  isPlaying: boolean,
  tabId: number | undefined
): void {
  console.log("handling update");
  console.log("isPlaying: " + isPlaying);
  const videoInformation = { title, url };
  chrome.i18n.detectLanguage(title + "", function (result) {
    console.log(result);
    switch (isPlaying) {
      case true:
        if (result.languages[0].language === targetLanguage) {
          console.log("video is playing");
          timeTracker.addVideoEntryByUrl(url, title, new Date());
          playingVideos.push(videoInformation);
          console.log("playing videos: " + playingVideos.length);
          if (tabId) activeTabs.push({ id: tabId, url: url });
          break;
        }
      case false:
        if (result.languages[0].language === targetLanguage) {
          console.log("video is not playing");
          // find video in playingVideos
          const stoppedVideoEntry = playingVideos.find(
            (video: { url: string }) => {
              return video.url === videoInformation.url;
            }
          );
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
          if (tabId) removeFromActiveTabs(tabId);
          break;
        }
    }
  });
  saveManager.saveTimeTracker(timeTracker);
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

function isYoutubeVideo(url: string | undefined): boolean {
  if (!url) return false;
  if (url.includes("youtube.com/watch") && !url.includes("music.youtube")) {
    return true;
  }
  return false;
}
