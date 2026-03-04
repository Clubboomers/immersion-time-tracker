import { SmartVideoObject } from "../../smartvideoobject";

function utilityFunctions() {
  async function getVideoTitleYoutube(): Promise<string | null> {
    let titleQuery: string = "h1.ytd-watch-metadata > yt-formatted-string";

    let titleElement: HTMLElement | null = document.querySelector(titleQuery);

    return new Promise((resolve, reject) => {
      if (titleElement && titleElement.textContent) {
        resolve(titleElement.textContent);
      }

      let totalTimeout = 0;
      let intervalId = setInterval(() => {
        titleElement = document.querySelector(titleQuery);
        if (titleElement && titleElement.textContent) {
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

  async function getVideoTitleNetflix(url: string): Promise<string | null> {
    const videoKey: string = getVideoKey(url)!;
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

  /**
   * get the video key for the current video using the url
   * @returns the video key for the current video
   */
  function getVideoKey(url: string): string | null {
    if (
      url.includes("netflix.com/watch") ||
      url.includes("nicovideo.jp/watch")
    ) {
      if (url.includes("?")) {
        return url.substring(url.indexOf("/watch/") + 7, url.indexOf("?"));
      }
      return url.substring(url.indexOf("/watch/") + 7);
    } else if (url.includes("youtube.com/watch")) {
      if (url.includes("&")) {
        return url.split("?v=")[1].split("&")[0];
      }
      return url.split("?v=")[1];
    }
    return null;
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
  function initYoutubeHomepage(
    thisUrl: string,
    videoObject: SmartVideoObject
  ): void {
    console.log("initYoutubeHomepage");

    // miniplayer video element
    if (
      videoObject.getVideo() === document.querySelector(".miniplayer video")
    ) {
      videoObject.setVideoTitle(
        document.querySelector(".miniplayer-title")?.textContent ?? null
      );
      const videoId =
        document.querySelector("[video-id]")?.getAttribute("video-id") ?? null;
      let videoUrl: string | null =
        "https://www.youtube.com/watch?v=" + videoId;
      if (!videoId) {
        /* throw new Error("YouTube's videoId is null"); */
        console.log("YouTube's videoId is null");
        videoUrl = "https://www.youtube.com/";
      }
      videoObject.setUrl(videoUrl);
      videoObject.updateVideoState();
      videoObject.reportToBackground();
      videoObject.addListeners();
      return;
    }
    console.log("is not miniplayer video element");

    // video is not miniplayer video element
    // video preview on homepage:
    // mediaLinkContainer is an <a> tag that contains the video title and url for preview videos on the homepage
    /* const mediaLinkContainer: HTMLAnchorElement | null = document.querySelector(
      "a#media-container-link"
    );
    console.log("mediaLinkContainer: ", mediaLinkContainer);
    console.log(videoObject.getVideo());
    if (!mediaLinkContainer) {
      throw new Error("YouTube's mediaLinkContainer is null");
    } */
    const videoUrl: string | null = thisUrl;
    /* videoObject.setVideoTitle(
      mediaLinkContainer.getAttribute("aria-label") ?? null
    ); */
    videoObject.setUrl(videoUrl);
    videoObject.setVideoTitle(null);
    if (!videoUrl) {
      throw new Error("YouTube's mediaLinkContainer's href is null");
    }
    videoObject.updateVideoState();
    videoObject.reportToBackground();
    videoObject.addListeners();
  }

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
   * Watches the video element for any changes to the src attribute or if it is removed from the DOM
   * @param videoElement
   */
  function watchVideoElement(videoObject: SmartVideoObject): void {
    const videoElement = videoObject.getVideo();
    if (!videoElement)
      throw new Error("videoElement is null in watchVideoElement");
    const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
      for (const mutation of mutationsList) {
        // If the mutated element was removed from the DOM or the `src` attribute was removed
        if (
          !document.contains(mutation.target as Node) ||
          !(mutation.target as HTMLElement).hasAttribute("src")
        ) {
          console.log("Video element or src attribute has been removed");

          // Code to be executed...
          /* videoObject.setVideoTitle(null);
          videoObject.setVideoIsPlaying(false); */
          videoObject.removeListeners();
          videoObject.setVideoIsPlaying(false);
          videoObject.reportToBackground();

          observer.disconnect(); // Stop watching for changes
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

  /**
   * Recursive function that checks for video elements with src attributes
   * every second until it finds one.
   * @returns video element with a src attribute or null if url changes while searching
   */
  function findVideoElements(): HTMLVideoElement[] {
    chrome.runtime.sendMessage({ message: "looking for video element..." });
    let videoElements: HTMLVideoElement[] = [];

    // check for <video> elements with src attributes
    document.querySelectorAll("video").forEach((videoElement) => {
      if (videoElement.hasAttribute("src") || !videoElement.paused) {
        videoElements.push(videoElement);
        console.log("found video element");
      }
    });
    // check for <video> elements inside <iframe> elements with src attributes
    document.querySelectorAll("iframe").forEach((iframeElement) => {
      iframeElement.contentDocument
        ?.querySelectorAll("video")
        .forEach((videoElement) => {
          if (videoElement.hasAttribute("src") || !videoElement.paused) {
            videoElements.push(videoElement);
            console.log("found video element inside iframe");
          }
        });
    });

    return videoElements;
  }

  async function initVideo(
    thisUrl: string,
    videoObject: SmartVideoObject
  ): Promise<void> {
    videoObject.clearData();
    if (thisUrl == "https://www.youtube.com/") {
      // special case for YouTube homepage
      initYoutubeHomepage(thisUrl, videoObject);
      return;
    }
    if (thisUrl.includes("youtube.com/watch")) {
      const videoTitle = await getVideoTitleYoutube().then((title) => {
        if (title) {
          console.log("title: " + title);
          return title;
        } else {
          return "";
        }
      });
      videoObject.setVideoTitle(videoTitle);
    } else if (thisUrl.includes("netflix.com/watch")) {
      const videoTitle = await getVideoTitleNetflix(thisUrl).then((title) => {
        if (title) {
          console.log("title: " + title);
          return title;
        } else {
          return "";
        }
      });
      videoObject.setVideoTitle(videoTitle);
    } else if (thisUrl.includes("nicovideo.jp/watch")) {
      const videoTitle = await getVideoTitleNico().then((title) => {
        if (title) {
          console.log("title: " + title);
          return title;
        } else {
          return "";
        }
      });
    }
    if (videoObject.getVideo()) {
      videoObject.setUrl(thisUrl);
      videoObject.updateVideoState(); // set playing state, hasPlayed, and videoIsPlaying
      videoObject.reportToBackground();
      videoObject.addListeners();
      watchVideoElement(videoObject);
    }
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

  function htmlVideoExistsOnPage(videoElement: HTMLVideoElement): boolean {
    return document.contains(videoElement);
  }

  return {
    getVideoTitleYoutube,
    getVideoTitleNetflix,
    getVideoTitleNico,
    initVideo,
    processUrl,
    findVideoElements,
    getVideoKey,
    initYoutubeHomepage,
    watchVideoElement,
    extractDomain,
    htmlVideoExistsOnPage,
  };
}

const websiteUtils = utilityFunctions();
export default websiteUtils;
