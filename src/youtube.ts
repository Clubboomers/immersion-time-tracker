import { Options } from "./trackingoptions";

function processUrl(url: string): string {
  if (url.includes("?") || url.includes("&")) {
    if (url.includes("youtube.com") && url.includes("&")) {
      url = url.split("&")[0];
    } else if (url.includes("netflix.com") && url.includes("?")) {
      url = url.split("?")[0];
    }
  }
  return url;
}

async function initVideo(video: HTMLVideoElement): Promise<void> {
  hasPlayed = false;
  videoHasListeners = false;
  videoElement = null;
  videoTitle = null;
  videoIsPlaying = undefined;
  videoElement = video;
  if (thisUrl == "https://www.youtube.com/") {
    // special case for YouTube homepage
    initYoutubeHomepage(videoElement);
    return;
  }

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
    hasPlayed = videoIsPlaying = isPlaying(videoElement);
    sendUpdateToBackground(videoTitle, thisUrl, isPlaying(videoElement));
    addEventListeners(videoElement);
  }
  console.log(!!videoElement);
}

/**
 * YouTube homepage has two special video elements that are not accounted for
 * in the normal video element search. This function checks for those two
 * special video elements and handles them accordingly.
 *
 * Special cases:
 * 1. The miniplayer video element is the video that plays in the bottom right
 * corner of the screen when you minimize the video player.
 *
 * 2. The mediaLinkContainer video element is the video that plays when you
 * hover over a video on the homepage.
 */
function initYoutubeHomepage(videoElement: HTMLVideoElement): void {
  console.log("initYoutubeHomepage");

  // miniplayer video element
  if (videoElement === document.querySelector(".miniplayer video")) {
    videoTitle =
      document.querySelector(".miniplayer-title")?.textContent ?? null;
    const videoId =
      document.querySelector("[video-id]")?.getAttribute("video-id") ?? null;
    let videoUrl: string | null = "https://www.youtube.com/watch?v=" + videoId;
    if (!videoId) {
      /* throw new Error("YouTube's videoId is null"); */
      console.log("YouTube's videoId is null");
      videoUrl = "https://www.youtube.com/";
    }
    hasPlayed = videoIsPlaying = isPlaying(videoElement);
    sendUpdateToBackground(videoTitle, videoUrl, isPlaying(videoElement));
    addEventListeners(videoElement);
    return;
  }

  console.log("is not miniplayer video element");
  // video preview on homepage
  // mediaLinkContainer is an <a> tag that contains the video title and url for preview videos on the homepage
  const mediaLinkContainer: HTMLAnchorElement | null = document.querySelector(
    "a#media-container-link"
  );
  if (!mediaLinkContainer) {
    throw new Error("YouTube's mediaLinkContainer is null");
  }
  const videoUrl: string | null = processUrl(mediaLinkContainer.href);
  videoTitle = mediaLinkContainer.getAttribute("aria-label") ?? null;
  if (!videoUrl) {
    throw new Error("YouTube's mediaLinkContainer's href is null");
  }
  hasPlayed = videoIsPlaying = isPlaying(videoElement);
  sendUpdateToBackground(videoTitle, videoUrl, true);
  addEventListeners(videoElement);
  watchVideoElement(videoElement, videoUrl, videoTitle);
}

/**
 * Runs every time a new url is loaded
 * @returns
 */
function updatedUrl(): void {
  if (videoIsPlaying) {
    // if video was still playing before url changed
    console.log("video is playing");
    videoIsPlaying = false;
    sendUpdateToBackground(videoTitle, lastUrl, videoIsPlaying);
  }
  console.log("url has changed");
  if (!isValidUrl(options, thisUrl)) {
    console.log("url is not valid");
    return;
  }
  tryForVideoElementLoop().then((videoElement) => {
    if (videoElement) {
      console.log("video element found");
      initVideo(videoElement);
    } else {
      console.log("video element not found");
    }
  });
}

/**
 * Recursive function that checks for video elements with src attributes
 * every second until it finds one.
 * @returns video element with a src attribute or null if url changes while searching
 */
async function tryForVideoElementLoop(
  currentUrl?: string
): Promise<HTMLVideoElement | null> {
  chrome.runtime.sendMessage({ message: "looking for video element..." });
  if (!currentUrl) {
    currentUrl = thisUrl;
  }
  if (currentUrl !== thisUrl) {
    return null;
  }
  const videoElements: NodeListOf<HTMLVideoElement> =
    document.querySelectorAll("video");
  if (videoElements.length === 0) {
    const iframeElements: NodeListOf<HTMLIFrameElement> = document.querySelectorAll("iframe");
    for (let i = 0; i < iframeElements.length; i++) {
      const iframeVideoElement: HTMLVideoElement | null = iframeElements[i].contentDocument?.querySelector("video") ?? null;
      if (iframeVideoElement && (iframeVideoElement.hasAttribute("src") || !iframeVideoElement.paused)) {
        return iframeVideoElement;
      }
    }
  }

  // check if any of the video elements have a src attribute or are playing
  for (let i = 0; i < videoElements.length; i++) {
    if (videoElements[i].hasAttribute("src") || !videoElements[i].paused) {
      return videoElements[i];
    }
  }

  // delay before recursive call
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return tryForVideoElementLoop(currentUrl);
}

/**
 * Watches the video element for any changes to the src attribute or if it is removed from the DOM
 * @param videoElement
 */
function watchVideoElement(
  videoElement: HTMLVideoElement,
  videoUrl: string,
  videoTitle: string | null
) {
  const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
    for (const mutation of mutationsList) {
      // If the mutated element was removed from the DOM or the `src` attribute was removed
      if (
        !document.contains(mutation.target as Node) ||
        !(mutation.target as HTMLElement).hasAttribute("src")
      ) {
        console.log("Video element or src attribute has been removed");

        // Code to be executed...
        videoTitle = null;
        sendUpdateToBackground(videoTitle, videoUrl, false);

        observer.disconnect(); // Stop watching for changes

        // Try to find a new video element
        tryForVideoElementLoop().then((videoElement) => {
          if (videoElement) {
            console.log("video element found");
            initVideo(videoElement);
          } else {
            console.log("video element not found");
          }
        });

        return;
      }
    }
  });

  // Start observing the videoElement for attribute and childList changes
  observer.observe(videoElement, {
    attributes: true,
    childList: true,
    subtree: true,
  });
}

function isVideoUrl(url: string | undefined): boolean {
  if (!url) return false;
  const validUrl: boolean =
    validVideoUrls.find((str) => url.includes(str)) !== undefined;
  const bannedUrl: boolean =
    blacklistedUrls.find((str) => url.includes(str)) !== undefined;
  if (validUrl && !bannedUrl) {
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
      sendUpdateToBackground(videoTitle, thisUrl, isPlaying(videoElement));
    });
    videoElement.addEventListener("play", async () => {
      if (videoIsPlaying) return; // prevent double counting
      videoIsPlaying = true;
      hasPlayed = true;
      console.log("video played");
      sendUpdateToBackground(videoTitle, thisUrl, isPlaying(videoElement));
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
      }, 100000);
    }
  });
}

async function getVideoTitleYoutube(): Promise<string | null> {
  // select the title element
  let titleElement = document.querySelector("h1 > yt-formatted-string");

  return new Promise((resolve, reject) => {
    if (titleElement) {
      resolve(titleElement.innerHTML);
    }

    let totalTimeout = 0;
    let intervalId = setInterval(() => {
      titleElement = document.querySelector("h1 > yt-formatted-string");
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
  let titleElement = document.querySelector(".id" + videoKey);

  return new Promise((resolve, reject) => {
    if (titleElement) {
      resolve(titleElement.getAttribute("data-title"));
    }
    let totalTimeout = 0;
    let intervalId = setInterval(() => {
      titleElement = document.querySelector(".id" + videoKey);
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
  if (
    thisUrl.includes("netflix.com/watch") ||
    thisUrl.includes("nicovideo.jp/watch")
  ) {
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

function isPlaying(videoElement?: HTMLVideoElement | null): boolean {
  if (!videoElement) {
    videoElement = document.querySelector("video");
  }
  if (videoElement) {
    console.log("video is playing: " + !videoElement.paused);
    return !videoElement.paused && document.visibilityState === "visible";
  }
  return false;
}

function isValidUrl(options: Options, url: string): boolean {
  const domain = extractDomain(url);
  if (
    options.getDomainsToTrack()[domain] ||
    (options.getDomainsToAlwaysTrack().includes(domain) &&
      blacklistedUrls.every((blacklistedUrl) => !blacklistedUrl.includes(url)))
  ) {
    return true;
  }
  console.log(`Invalid URL: ${url}`, options.getDomainsToTrack(), domain);
  return false;
}

function extractDomain(url: string): string {
  if (!url.startsWith("http")) {
    url = "https://" + url;
  }
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    console.error(`Invalid URL: ${url}`);
    return "";
  }
}

function initSettings() {
  Object.keys(options.getDomainsToTrack()).forEach((domain) => {
    validVideoUrls.push(domain);
  });
  options.getDomainsToAlwaysTrack().forEach((domain) => {
    validVideoUrls.push(domain);
  });
}

function clearSettings() {
  validVideoUrls = [];
}

// main

let videoElement: HTMLVideoElement | null;
let videoTitle: string | null;
let thisUrl: string = processUrl(window.location.href);
let lastUrl: string = thisUrl;
let videoIsPlaying: boolean | undefined = false;
let videoHasListeners: boolean = false;
let hasPlayed: boolean = false;
let validVideoUrls: string[] = [];
let blacklistedUrls: string[] = ["music.youtube.com"];

console.log("Content script loaded");
let options: Options;
let validUrl: boolean;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message && request.message === "update_options") {
    // update options and reinitalize settings
    options = new Options(request.options);
    clearSettings();
    initSettings();
  }
});

chrome.runtime.sendMessage({ message: "get_options" }, async (response) => {
  if (!response.options) {
    throw new Error("No response with options from background script.");
  }
  console.log("options received");
  options = new Options(response.options);
  initSettings();

  /**
   * check if url has changed every second
   */
  let intervalId = setInterval(() => {
    if (thisUrl !== processUrl(window.location.href)) {
      lastUrl = thisUrl;
      thisUrl = processUrl(window.location.href);
      updatedUrl();
    }
  }, 1000);

  validUrl = isValidUrl(options, thisUrl);
  if (!validUrl) {
    console.log("invalid url");
    return;
  }
  tryForVideoElementLoop().then((videoElement) => {
    if (videoElement) {
      console.log("video element found");
      initVideo(videoElement);
    } else {
      console.log("video element not found");
    }
  });
});
