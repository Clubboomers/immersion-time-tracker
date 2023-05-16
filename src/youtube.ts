import { get } from "http";

let videoElement: HTMLVideoElement | null;
let videoTitle: string | null;
let thisUrl: string = getWindowUrl();
let lastUrl: string = thisUrl;
let videoIsPlaying: boolean | undefined = false;
let videoHasListeners: boolean = false;
let hasPlayed: boolean = false;
const validVideoUrls: string[] = ["youtube.com/watch", "netflix.com/watch", "nicovideo.jp/watch"];
const invalidVideoUrls: string[] = ["music.youtube.com"];

function getWindowUrl(): string {
  let url: string = window.location.href;
  if (url.includes("?") || url.includes("&")) {
    if (url.includes("youtube.com") && url.includes("&")) {
      url = url.split("&")[0];
    } else if (url.includes("netflix.com") && url.includes("?")) {
      url = url.split("?")[0];
    }
  }
  return url;
}

console.log("Content script loaded");
if (isVideoUrl(thisUrl)) {
  initVideo();
}

async function initVideo() {
  hasPlayed = false;
  videoHasListeners = false;
  videoElement = null;
  videoTitle = null;
  videoIsPlaying = undefined;
  videoElement = await getVideoElement();
  if (thisUrl.includes("youtube.com/watch")) {
    videoTitle = await getVideoTitleYoutube().then((title) => {
      if (title) {
        console.log("title: " + title);
        return title;
      } else {
        return "";
      }
    });
  } else if (thisUrl.includes("netflix.com/watch")) {
    videoTitle = await getVideoTitleNetflix().then((title) => {
      if (title) {
        console.log("title: " + title);
        return title;
      } else {
        return "";
      }
    });
  } else if (thisUrl.includes("nicovideo.jp/watch")) {
    videoTitle = await getVideoTitleNico().then((title) => {
      if (title) {
        console.log("title: " + title);
        return title;
      } else {
        return "";
      }
    });
  }
  if (videoElement) {
    hasPlayed = videoIsPlaying = isPlaying();
    await sendUpdateToBackground(videoTitle, thisUrl, isPlaying());
    addEventListeners(videoElement);
  }
  console.log(!!videoElement);
}

function updatedUrl(): void {
  if (videoIsPlaying) {
    // if video was still playing before url changed
    console.log("video is playing");
    videoIsPlaying = false;
    sendUpdateToBackground(videoTitle, lastUrl, videoIsPlaying);
  }
  console.log("url has changed");
  if (isVideoUrl(thisUrl)) {
    initVideo();
  }
}

/**
 * check if url has changed every second
 * for some reason you get an error
 */
let intervalId = setInterval(() => {
  if (thisUrl !== getWindowUrl()) {
    lastUrl = thisUrl;
    thisUrl = getWindowUrl();
    updatedUrl();
  }
}, 1000);

function isVideoUrl(url: string | undefined): boolean {
  if (!url) return false;
  const validVideoUrl: boolean =
    validVideoUrls.find((str) => url.includes(str)) !== undefined;
  const invalidVideoUrl: boolean =
    invalidVideoUrls.find((str) => url.includes(str)) !== undefined;
  if (validVideoUrl && !invalidVideoUrl) {
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

function sendUpdateToBackground(
  videoTitle: string | null,
  url: string,
  isPlaying: boolean
): void {
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
    if (videoElement && videoElement.hasAttribute("src")) {
      resolve(videoElement);
    } else {
      const observer = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
          if (mutation.type === "childList") {
            const videoElement = document.querySelector("video");
            if (videoElement && videoElement.hasAttribute("src")) {
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

async function getVideoTitleYoutube(): Promise<string | null> {
  // select the title element
  let titleElement = document.querySelector(
    "#container > h1 > yt-formatted-string"
  );

  return new Promise((resolve, reject) => {
    if (titleElement) {
      resolve(titleElement.innerHTML);
    }

    let totalTimeout = 0;
    let intervalId = setInterval(() => {
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

async function getVideoTitleNetflix(): Promise<string | null> {
  const videoKey: string = getVideoKey()!;
  let titleElement = document.querySelector(".id"+videoKey);

  return new Promise((resolve, reject) => {
    if (titleElement) {
      resolve(titleElement.getAttribute("data-title"));
    }
    let totalTimeout = 0;
    let intervalId = setInterval(() => {
      titleElement = document.querySelector(".id"+videoKey);
      if (titleElement) {
        clearInterval(intervalId);
        resolve(titleElement.getAttribute("data-title"));
      }
      totalTimeout += 100;
      if (totalTimeout > 5000) {
        clearInterval(intervalId);
        resolve(null);
      }
    }, 100);
  });
}

async function getVideoTitleNico(): Promise<string | null> {
  let titleElement = document.querySelector(".VideoTitle");

  return new Promise((resolve, reject) => {
    if (titleElement) {
      resolve(titleElement.textContent);
    }

    let totalTimeout = 0;
    let intervalId = setInterval(() => {
      titleElement = document.querySelector(".VideoTitle");
      if (titleElement) {
        clearInterval(intervalId);
        resolve(titleElement.textContent);
      }
      totalTimeout += 100;
      if (totalTimeout > 5000) {
        clearInterval(intervalId);
        resolve(null);
      }
    }, 100);
  });
}

/**
 * get the video key for the current video using the url
 * @returns the video key for the current video
 */
function getVideoKey(): string | null {
  if (thisUrl.includes("netflix.com/watch")) {
    if (thisUrl.includes("?")) {
      return thisUrl.substring(
        thisUrl.indexOf("/watch/") + 7,
        thisUrl.indexOf("?")
      );
    }
    return thisUrl.substring(thisUrl.indexOf("/watch/") + 7);
  } else if (thisUrl.includes("youtube.com/watch")) {
    if (thisUrl.includes("&")) {
      return thisUrl.split("?v=")[1].split("&")[0];
    }
    return thisUrl.split("?v=")[1];
  }
  return null;
}

function isPlaying(): boolean {
  if (videoElement) {
    console.log("video is playing: " + !videoElement.paused);
    return !videoElement.paused && document.visibilityState === "visible";
  }
  return false;
}
