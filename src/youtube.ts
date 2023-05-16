import { clear } from "console";

let videoElement: HTMLVideoElement | null;
let videoTitle: string | null;
let thisUrl: string = window.location.href;
let lastUrl: string = thisUrl;
let videoIsPlaying: boolean | undefined = false;
let videoHasListeners: boolean = false;
let hasPlayed: boolean = false;

console.log("Content script loaded");
if (isYoutubeVideo(thisUrl)) {
  initVideo();
}

/**
 * check if url has changed every second
 * for some reason you get an error
 */
let intervalId = setInterval(() => {
  if (thisUrl !== window.location.href) {
    lastUrl = thisUrl;
    thisUrl = window.location.href;
    updatedUrl();
  }
}, 1000);

function updatedUrl(): void {
    if (videoIsPlaying) { // if video was still playing before url changed
        console.log("video is playing");
        videoIsPlaying = false;
        sendUpdateToBackground(videoTitle, lastUrl, videoIsPlaying);
    }
  console.log("url has changed");
  if (isYoutubeVideo(thisUrl)) {
    initVideo();
  }
}

async function initVideo() {
  hasPlayed = false;
  videoHasListeners = false;
  videoElement = null;
  videoIsPlaying = undefined;
  videoElement = await getVideoElement();
  videoTitle = await getVideoTitle().then((title) => {
    if (title) {
      console.log("title: " + title);
      return title;
    } else {
      return "";
    }
  });
  if (videoElement) {
    hasPlayed = videoIsPlaying = isPlaying();
    await sendUpdateToBackground(videoTitle, thisUrl, isPlaying());
    addEventListeners(videoElement);
  }
  console.log(!!videoElement);
}

function isYoutubeVideo(url: string | undefined): boolean {
  if (!url) return false;
  if (url.includes("youtube.com/watch") && !url.includes("music.youtube")) {
    return true;
  }
  return false;
}

function addEventListeners(videoElement: HTMLVideoElement): void {
  if (!videoHasListeners && videoElement) {
    videoElement.addEventListener("pause", async () => {
      if (!videoIsPlaying) return; // prevent double counting
      videoIsPlaying = false;
      console.log("video paused");
      await sendUpdateToBackground(videoTitle, thisUrl, isPlaying());
    });
    videoElement.addEventListener("play", async () => {
      if (videoIsPlaying) return; // prevent double counting
      videoIsPlaying = true;
      hasPlayed = true;
      console.log("video played");
      await sendUpdateToBackground(videoTitle, thisUrl, isPlaying());
    });
    videoHasListeners = true;
    return;
  }
}

function sendUpdateToBackground(videoTitle: string | null, url: string, isPlaying: boolean): void {
  if (!hasPlayed) return; // don't send update if video hasn't played yet
  console.log("sending update to background");
  chrome.runtime.sendMessage({
    message: "update",
    title: videoTitle,
    url: url,
    isPlaying: JSON.stringify(isPlaying),
  });
  console.log("sent message to background");
}

async function getVideoElement(): Promise<HTMLVideoElement | null> {
  return new Promise((resolve, reject) => {
    const videoElement = document.querySelector("video");
    if (videoElement) {
      resolve(videoElement);
    } else {
      const observer = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
          if (mutation.type === "childList") {
            const videoElement = document.querySelector("video");
            if (videoElement) {
              console.log("found video element");
              clearTimeout(timeoutId);
              observer.disconnect();
              resolve(videoElement);
              break;
            }
          }
        }
      });
      observer.observe(document, { childList: true, subtree: true });

      let timeoutId = setTimeout(() => {
        observer.disconnect();
        console.error("Could not find video element");
        resolve(null);
      }, 10000);
    }
  });
}

async function getVideoTitle(): Promise<string | null> {
  // select the title element
  let titleElement = document.querySelector(
    "#container > h1 > yt-formatted-string"
  );

  if (titleElement) {
    return titleElement.innerHTML;
  }

  return new Promise((resolve, reject) => {
    let totalTimeout = 0;
    intervalId = setInterval(() => {
      titleElement = document.querySelector(
        "#container > h1 > yt-formatted-string"
      );
      if (titleElement) {
        clearInterval(intervalId);
        resolve(titleElement.innerHTML);
      }
      totalTimeout += 100;
        if (totalTimeout > 5000) {
          clearInterval(intervalId);
          resolve(null);
        }
    }, 100);
  });
}

function isPlaying(): boolean {
  if (videoElement) {
    console.log("video is playing: " + !videoElement.paused);
    return !videoElement.paused && document.visibilityState === "visible";
  }
  return false;
}
