import { TimeTracker } from "./timetracker";
import { Options } from "./trackingoptions";
import saveManager from "./savemanager";

/**
 * Class that encapsulates the logic for tracking videos.
 * It has a TimeTracker instance that tracks the time spent watching videos,
 * and stores information about videos currently playing, as well as the
 * target language of the user.
 */
export class VideoTracker {
  trackingOptions: Options = new Options();
  timeTracker: TimeTracker;
  activeTabs: { id: number; url: string }[] = []; // tabs with videos playing
  playingVideos: { url: string; videoName: string | null; videoId: string }[] =
    []; // videos that are playing

  constructor() {
    this.timeTracker = TimeTracker.getInstance(
      "Immersion Time Tracker",
      "Tracks time immersing in a language"
    );
  }

  /**
   * Checks if a save exists, and if not, creates one.
   */
  public checkForSave() {
    saveManager.saveExists((exists) => {
      if (!exists) {
        saveManager.saveTimeTracker(this.timeTracker); // Access timeTracker using this.timeTracker
      } else {
        try {
          this.timeTracker =
            saveManager.loadTimeTrackerFromStorage() || this.timeTracker; // Access timeTracker using this.timeTracker
        } catch (error) {
          console.error("Error loading save: ");
          console.log(error);
          /* saveManager.deleteSave();
          saveManager.saveTimeTracker(this.timeTracker); // Access timeTracker using this.timeTracker */
        }
      }
    });
  }

  /**
   * Adds listeners to chrome events such as tab closing, video playing, etc,
   * and handles the events.
   */
  public initListeners(): void {
    chrome.runtime.onInstalled.addListener(() => {
      this.checkForSave();
    });

    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      console.log("tab closed: " + tabId);
      this.removeFromActiveTabs(tabId);
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // listen for messages sent from video.ts
      console.log(request);

      if (request.message === "what_url") {
        sendResponse({ message: "url", url: sender.tab?.url });
      }

      if (request.message === "update") {
        const title = request.title;
        const url = request.url;
        const isPlaying = JSON.parse(request.isPlaying);
        const videoId = request.id;
        if (url) {
          this.handleUpdate(title, url, isPlaying, sender.tab?.id, videoId);
        }
      }

      if (request.message === "get_popup_info") {
        const recentActivity: { url: string; title: string }[] =
          this.timeTracker.getRecentActivity();
        let now = new Date();
        let watchtimeToday: number = this.timeTracker.getTimeWatchedByPeriod(60*60*24);
        let watchtimeTotal: number = this.timeTracker.getTotalTimeWatched();
        const playingState: boolean = this.playingVideos.length > 0;
        sendResponse({
          message: "popup_info",
          recentActivity: recentActivity,
          watchtimeToday: watchtimeToday,
          watchtimeTotal: watchtimeTotal,
          playingState: playingState,
        });
      }

      if (request.message === "get_options") {
        this.trackingOptions.loadOptions();
        sendResponse({
          message: "options",
          options: this.trackingOptions,
        });
      }

      if (request.message === "set_options") {
        this.trackingOptions = new Options(request.options);
        this.trackingOptions.saveOptions();
        sendResponse({
          message: "options_saved",
        });
      }
    });
  }

  private removeFromActiveTabs(tabId: number): void {
    const tab = this.activeTabs.find((tab) => tab?.id === tabId);
    if (!tab) return;
    this.timeTracker.getVideoEntryByKey(tab.url)?.stop();
    if (this.playingVideos.some((video) => tab.url.includes(video.url))) {
      // stop video playing
      this.timeTracker.getVideoEntryByKey(tab.url)?.stop();
      this.playingVideos = this.playingVideos.filter(
        (video) => !video.url.includes(tab.url)
      );
    }
    this.activeTabs = this.activeTabs.filter((tab) => tab?.id !== tabId);
    this.timeTracker.getLastTimeEntry()?.setEndTime(new Date());
  }

  private langMatchesOptions(
    result: chrome.i18n.LanguageDetectionResult,
    videoName: string | null
  ): boolean {
    if (!this.trackingOptions.getTargetLangSet()) return true;
    if (!videoName) return true;
    if (
      this.trackingOptions
        .getBlacklistedKeywords()
        .some((keyword) => videoName.includes(keyword))
    ) {
      console.log("blacklisted keyword found in video name");
      return false;
    }
    return (
      result.languages[0].language === this.trackingOptions.getTargetLanguage()
    );
  }

  private handleUpdate(
    videoName: string | null,
    url: string,
    isPlaying: boolean,
    tabId: number | undefined,
    videoId: string
  ): void {
    console.log("handling update");
    console.log("isPlaying: " + isPlaying);

    const videoInformation = { videoName, url, videoId };

    if (
      isPlaying &&
      this.playingVideos.some((video) => video.videoId === videoId)
    ) {
      console.log("video is already playing");
      return;
    }

    chrome.i18n.detectLanguage(videoName + "", (result) => {
      console.log(result);

      if (!this.langMatchesOptions(result, videoName)) return; // if video language doesn't match target language, ignore
      if (!videoInformation.videoName)
        videoInformation.videoName = videoInformation.url; // if video name is null, use url as name

      switch (isPlaying) {
        case true:
          this.videoPlaying(videoInformation, tabId);
          break;
        case false:
          this.videoNotPlaying(videoInformation, tabId);
          break;
      }
    });

    saveManager.saveTimeTracker(this.timeTracker);
  }

  private videoPlaying(
    videoInformation: {
      videoName: string | null;
      url: string;
      videoId: string;
    },
    tabId: number | undefined
  ) {
    console.log("video is playing");
    this.timeTracker.addVideoEntryByUrl(
      videoInformation.url,
      videoInformation.videoName,
      new Date()
    );
    this.playingVideos.push(videoInformation);
    console.log("playing videos: " + this.playingVideos.length);
    if (tabId) this.activeTabs.push({ id: tabId, url: videoInformation.url });
  }

  private videoNotPlaying(
    videoInformation: {
      videoName: string | null;
      url: string;
      videoId: string;
    },
    tabId: number | undefined
  ) {
    console.log("video is not playing");
    // find video in playingVideos
    const stoppedVideoEntry = this.playingVideos.find(
      (video: { url: string }) => {
        return video.url === videoInformation.url;
      }
    );
    if (!stoppedVideoEntry) {
      return;
    }
    // add end time to video entry
    this.timeTracker
      .getVideoEntryByUrl(videoInformation.url)
      ?.setLastTimeEntryEndTime(new Date());
    this.timeTracker.updateTotalTimeWatched();

    // remove video from playingVideos
    this.playingVideos = this.playingVideos.filter((video: { url: string }) => {
      return video.url !== videoInformation.url;
    });
    if (tabId) this.removeFromActiveTabs(tabId);
    else console.error("tabId is undefined");
  }

  /**
   * Starts an interval that saves the time tracker every 10 seconds
   * and logs the time tracker instance to the console.
   */
  public startSaveInterval(): void {
    const updateEndTimePlayingVideos = () => {
      if (this.playingVideos.length === 0) return;
      this.playingVideos.forEach((video) => {
        this.timeTracker.getVideoEntryByURL(video.url)?.stop();
      });
      this.timeTracker.getLastTimeEntry()?.setEndTime(new Date());
    };

    setInterval(() => {
      console.log(this.timeTracker);
      updateEndTimePlayingVideos();
    }, 10000);
  }

  public saveOptions(options: Options): void {
    this.trackingOptions = options;
    this.trackingOptions.saveOptions();
  }

  public getOptions(): Options {
    return this.trackingOptions;
  }
}
