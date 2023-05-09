import { TimeTracker } from "./timetracker";
import { VideoInformation } from "./video";
import { VideoEntry } from "./videoentry";

const timeTracker = TimeTracker.getInstance();

let url: string | undefined; // the url of the tab that is currently being viewed

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  console.log(changeInfo);
  if (!changeInfo.status) return;
  // if the link is not youtube, then return
  if (changeInfo.status === "loading" && changeInfo.url && !(isYouTube(changeInfo.url))) return;

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

function addToTimeTracker(videoUrl: string, videoName: string | null): void {
  timeTracker.addVideoEntry(new VideoEntry(videoUrl, videoName));
}

function sendMessage(tabId: number, message: string, url: string | undefined): void {
  if (!url) return;
  chrome.tabs.sendMessage(tabId, {
    message: message,
    url: url,
  });
  url = undefined; // reset url
}

function getTabById(tabId: number): chrome.tabs.Tab | undefined {
  chrome.tabs.get(tabId, function(tab) {
    return tab;
  })
  return undefined;
}

