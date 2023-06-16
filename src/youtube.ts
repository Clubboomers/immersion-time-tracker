import { Options } from "./trackingoptions";
import { SmartVideoObject } from "./smartvideoobject";
import websiteUtils from "./contentscripts/utility/websiteutils";

/**
 * 
 * @returns
 */
function updatedUrl(videos: SmartVideoObject[]): boolean {
  videos.forEach((video) => {
    if (video.getVideoIsPlaying()) {
      // if video was still playing before url changed
      console.log("video is playing");
      video.setVideoIsPlaying(false);
      video.reportToBackground();
    }
  });

  console.log("url has changed");
  if (!isValidUrl(options, thisUrl)) {
    return false;
  }
  return true;
}

function isValidUrl(options: Options, url: string): boolean {
  const domain = websiteUtils.extractDomain(url);
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

function videoObjectsHasVideo(
  videoObjects: SmartVideoObject[],
  htmlVideo: HTMLVideoElement
): boolean {
  return videoObjects.some((videoObject) => {
    return videoObject.getVideo() === htmlVideo;
  });
}

// main

let videoObjects: SmartVideoObject[] = [];
let thisUrl: string = websiteUtils.processUrl(window.location.href);
let lastUrl: string = thisUrl;
let validVideoUrls: string[] = [];
let blacklistedUrls: string[] = ["music.youtube.com"];

console.log("Content script loaded");
let options: Options;

/**
 * TODO: make this work
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "update_options") {
    // update options and reinitalize settings
    options = new Options(request.options);
    clearSettings();
    initSettings();
  }
});

chrome.runtime.sendMessage({ message: "get_options" }, (response) => {
  if (!response.options) {
    throw new Error("No response with options from background script.");
  }
  console.log("options received");
  options = new Options(response.options);
  initSettings();

  // main loop of the script
  setInterval(() => {
    // check if url has changed
    if (thisUrl !== websiteUtils.processUrl(window.location.href)) {
      lastUrl = thisUrl;
      thisUrl = websiteUtils.processUrl(window.location.href);
      const validUrl = updatedUrl(videoObjects);
      if (!validUrl) return; // if url is invalid, don't do anything
    } 

    // check if videos are still on page
    videoObjects.forEach((video) => {
      const htmlVideo = video.getVideo();
      if (!htmlVideo || !websiteUtils.htmlVideoExistsOnPage(htmlVideo)) {
        video.clearData();
        video.reportToBackground();
        videoObjects = videoObjects.filter((videoObject) => {
          return videoObject !== video;
        });
      }
    });

    // check if videos are still playing
    videoObjects.forEach((video) => {
      const playingState = video.getVideoIsPlaying();
      if (playingState !== video.getVideoIsPlaying() && !video.getVideoIsPlaying()) {
        video.reportToBackground();
        videoObjects = videoObjects.filter((videoObject) => {
          return videoObject !== video;
        });
      }
    });

    // look for new videos on page
    const videos = websiteUtils.findVideoElements(videoObjects);
    videos.forEach((video) => {
      if (!videoObjectsHasVideo(videoObjects, video)) {
        const videoObject = new SmartVideoObject(video);
        videoObjects.push(videoObject);
        websiteUtils.initVideo(thisUrl, videoObject);
      }
    });
  }, 1000);
});
