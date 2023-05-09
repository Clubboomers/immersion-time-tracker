let videoElement: HTMLVideoElement | null;
let thisUrl: string = window.location.href;
let videoIsPlaying: boolean | undefined;
let videoHasListeners: boolean = false;
onUrlChange();

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // listen for messages sent from background.js
  if (request.message === "new_url") {
    thisUrl = request.url;
    onUrlChange(); // new url is now in content scripts!
  }
});

function onUrlChange(): void {
  console.log(`This URL: ${thisUrl}`);
  if (urlIsVideoLink()) {
    console.log("This is a video link!");
    videoElement = document.querySelector("video");
    if (videoElement) {
      addEventListeners(videoElement);
      console.log("Added event listeners to video element");
      videoElement.play();
    }
  }
}

function urlIsVideoLink(): boolean {
  return thisUrl.includes("youtube.com/watch");
}

function addEventListeners(videoElement: HTMLVideoElement): void {
  if (!videoHasListeners) {
    videoElement.addEventListener("pause", () => {
      console.log("The video has been paused");
      videoIsPlaying = false;
      sendUpdateToBackground();
    });
    videoElement.addEventListener("play", () => {
      console.log("The video has been resumed");
      videoIsPlaying = true;
      sendUpdateToBackground();
    });
    videoHasListeners = true;
  }
}

function isPlaying(): boolean {
  if (videoIsPlaying === undefined) {
    return false;
  } else {
    return videoIsPlaying;
  }
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

function sendUpdateToBackground(): void {
  chrome.runtime.sendMessage({
    message: "update",
    title: JSON.stringify(getVideoTitle()),
    url: JSON.stringify(getUrl()),
    isPlaying: JSON.stringify(isPlaying()),
  });
}

function getVideoTitle(): string | null {
  let title: string | null = null;
  const titleElement = document.querySelector(
    "#container > h1 > yt-formatted-string"
  );
  if (titleElement) {
    title = titleElement.textContent;
  }
  return title;
}

function getUrl(): string {
  return thisUrl;
}

function getVideoInformation(): VideoInformation {
  return new VideoInformation(getVideoTitle(), getUrl());
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
