import { Options } from "./trackingoptions";
import { SmartVideoObject } from "./smartvideoobject";
import websiteUtils from "./contentscripts/utility/websiteutils";

/**
 * Cleans unnecessary characters from the page url so
 * that only the base url is left (without query parameters).
 * @param url The url to clean.
 * @returns The same URL without query parameters.
 */
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

/**
 * Runs every time a new url is loaded
 * @returns
 */
function updatedUrl(videos: SmartVideoObject[]): void {
  videos.forEach((video) => {
    if (video.getVideoIsPlaying()) {
      // if video was still playing before url changed
      console.log("video is playing");
      video.setVideoIsPlaying(false);
      video.reportToBackground();
      video.removeListeners();
    }
  });

  console.log("url has changed");
  if (!isValidUrl(options, thisUrl)) {
    console.log("url is not valid");
    return;
  }

  videoObjects = websiteUtils.findVideoElements(thisUrl);
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

function clearAllVideos(videos: SmartVideoObject[]) {
  videos.forEach((video) => {
    video.clearVideo();
  });
}

// main

let videoObjects: SmartVideoObject[] = [];
let thisUrl: string = processUrl(window.location.href);
let lastUrl: string = thisUrl;
let validVideoUrls: string[] = [];
let blacklistedUrls: string[] = ["music.youtube.com"];

console.log("Content script loaded");
let options: Options;

/**
 * TODO: make this work
 */
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
      updatedUrl(videoObjects);
    }
  }, 1000);

  const validUrl: boolean = isValidUrl(options, thisUrl);
  if (!validUrl) {
    console.log("invalid url");
    return;
  }
  videoObjects = websiteUtils.findVideoElements(thisUrl);
});
