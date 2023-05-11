import { get } from "http";
import { isYouTube } from "./background";
let videoElement: HTMLVideoElement | null;
let thisUrl: string = window.location.href;
let videoIsPlaying: boolean | undefined;
let videoHasListeners: boolean = false;
let hasPlayed: boolean = false; // has the video played at least once yet?

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // listen for messages sent from background.js
  if (request.message === "new_url") {
    thisUrl = request.url;
    onUrlChange(); // new url is now in content scripts!
  }
});

document.addEventListener("visibilitychange", async () => {
  console.log("document visible: " + document.visibilityState);
  if (document.visibilityState === "visible" && !hasPlayed) {
    onUrlChange();
  }
});


async function onUrlChange(): Promise<void> {
  hasPlayed = false;
  videoHasListeners = false;
  videoElement = null;
  videoIsPlaying = undefined;
  handleUnexpectedClose();
  console.log(`This URL: ${thisUrl}`);
  videoElement = await getVideoElement();
  if (videoElement) {
    hasPlayed = videoIsPlaying = isPlaying();
    await sendUpdateToBackground();
    console.log(`Video is playing: ${videoIsPlaying}`);
    //addEventListeners(videoElement);
    setVideoOnPlayPause(videoElement);
    console.log("Added event listeners to video element");
  }
}

async function getVideoElement(): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(() => {
      // wait for video to load
      if (!document.querySelector("video")) {
        console.log("Waiting for video to load...");
      } else if (document.querySelector("video")) {
        clearInterval(intervalId);
        console.log("Video has loaded");
        let videoElement = document.querySelector("video");
        if (videoElement) {
          resolve(videoElement);
        }
        reject("videoElement is null");
      }
    }, 100);
  });
}

/**
 * Called when the user closes the tab or navigates to a new page.
 */
function handleUnexpectedClose(): void {
  if (isPlaying()) {
    // if video is playing, set endTime to now
    console.log("Unexpected url change detected, stopping timer...");
    videoIsPlaying = false;
    sendUpdateToBackground();
  }
}

function addEventListeners(videoElement: HTMLVideoElement): void {
  if (!videoHasListeners && videoElement) {
    videoElement.addEventListener("pause", () => {
      if (!videoIsPlaying) return; // prevent double counting
      videoIsPlaying = false;
      console.log("sending update to background...");
      sendUpdateToBackground();
    });
    videoElement.addEventListener("play", () => {
      if (videoIsPlaying) return; // prevent double counting
      videoIsPlaying = true;
      console.log("sending update to background...");
      sendUpdateToBackground();
    });
    videoHasListeners = true;
    return;
  }
}

function setVideoOnPlayPause(videoElement: HTMLVideoElement): void {
  videoElement.onplay = reportPlayToBackground;
  videoElement.onpause = reportPauseToBackground;
}

function reportPlayToBackground(): void {
  videoIsPlaying = true;
  hasPlayed = true;
  sendUpdateToBackground();
}

function reportPauseToBackground(): void {
  videoIsPlaying = false;
  sendUpdateToBackground();
}

/**
 * When a video is loaded in the background,
 * the browser may still consider it as playing
 * even though it is not actually playing.
 * Check if the document is visible to combat this issue.
 * @returns true if video is playing, false otherwise
 */
function isPlaying(): boolean {
  if (videoElement) {
    console.log("video is playing: " + !videoElement.paused);
    return !videoElement.paused && document.visibilityState === "visible";
  }
  return false;
}

// test only
/*function sendUpdateToBackground(): void {
  chrome.runtime.sendMessage({
    message: "update",
    title: JSON.stringify(getVideoTitle()),
    url: JSON.stringify(getUrl()),
    isPlaying: JSON.stringify(isPlaying()),
  });
  console.log("sent message to background");
}*/

async function sendUpdateToBackground(): Promise<void> {
  if (!hasPlayed) return; // don't send update if video hasn't played yet
  console.log("sending update to background");
  chrome.runtime.sendMessage({
    message: "update",
    title: await getVideoTitle(),
    url: getUrl().substring(getUrl().indexOf("=") + 1), // remove "https://www.youtube.com/watch?v=" so video key is all that remains
    isPlaying: JSON.stringify(isPlaying()),
  });
  console.log("sent message to background");
}

async function getVideoTitle(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    let timeWaited = 0;
    const maxTimeToWait = 3000; // reject after 3 seconds of no title

    const intervalId = setInterval(() => {
      // wait for title to load
      const titleElement = document.querySelector(
        "#container > h1 > yt-formatted-string"
      );
      if (!titleElement && timeWaited > maxTimeToWait) {
        clearInterval(intervalId);
        resolve(null);
      } else if (titleElement) {
        clearInterval(intervalId);
        resolve(titleElement.textContent);
      }
      timeWaited += 100;
    }, 100);
  });
}

function getUrl(): string {
  return thisUrl;
}

export class VideoInformation {
  private title: string | null;
  private url: string;

  constructor(title: string | null, url: string) {
    this.title = title;
    this.url = url;
  }

  public getTitle(): string | null {
    return this.title;
  }

  public getUrl(): string {
    return this.url;
  }
}