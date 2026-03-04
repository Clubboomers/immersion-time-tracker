export class SmartVideoObject {
  private video: HTMLVideoElement | null = null;
  private videoTitle: string | null;
  private url: string;
  private videoIsPlaying: boolean | undefined = false;
  private videoHasListeners: boolean = false;
  private hasPlayed: boolean = false;
  public static idCounter: number = 0;
  public id: number;
  constructor(
    video?: HTMLVideoElement,
    url?: string,
    videoTitle?: string | null
  ) {
    this.url = url || "";
    this.videoTitle = videoTitle || null;
    this.id = SmartVideoObject.idCounter++;
    if (video) this.setVideo(video);
  }

  public reportToBackground(): void {
    if (!this.hasPlayed) return; // don't send update if video hasn't played yet
    console.log("sending update to background");
    chrome.runtime.sendMessage({
      message: "update",
      title: this.videoTitle,
      url: this.url,
      isPlaying: JSON.stringify(!this.video!.paused),
      id: this.id,
    });
  }

  public setVideo(video: HTMLVideoElement): void {
    this.video = video;
    this.videoIsPlaying = !video.paused;
    this.hasPlayed = true;
    this.videoHasListeners = true;
    this.addListeners();
  }

  public clearVideo(): void {
    this.video = null;
    this.videoIsPlaying = false;
    if (this.videoHasListeners) {
      this.videoHasListeners = false;
    }
  }

  public clearData(): void {
    this.hasPlayed = false;
    this.videoHasListeners = false;
    this.videoTitle = null;
    this.videoIsPlaying = false;
  }

  public addListeners(): void {
    if (!this.videoHasListeners && this.video) {
      this.video.addEventListener("pause", async () => {
        if (!this.videoIsPlaying) return; // prevent double counting
        this.videoIsPlaying = false;
        console.log("video paused");
        this.reportToBackground();
      });
      this.video.addEventListener("play", async () => {
        if (this.videoIsPlaying) return; // prevent double counting
        this.videoIsPlaying = true;
        this.hasPlayed = true;
        console.log("video played");
        this.reportToBackground();
      });
      this.videoHasListeners = true;
      return;
    }
  }

  public removeListeners(): void {
    if (this.videoHasListeners && this.video) {
      this.video.removeEventListener("pause", () => {
        if (!this.videoIsPlaying) return; // prevent double counting
        this.videoIsPlaying = false;
        console.log("video paused");
        this.reportToBackground();
      });
      this.video.removeEventListener("play", () => {
        if (this.videoIsPlaying) return; // prevent double counting
        this.videoIsPlaying = true;
        this.hasPlayed = true;
        console.log("video played");
        this.reportToBackground();
      });
      this.videoHasListeners = false;
      return;
    }
  }

  public updateVideoState(): void {
    const playing: boolean = this.isPlaying();
    this.hasPlayed = playing;
    this.videoIsPlaying = playing;
  }

  public isPlaying(): boolean {
    if (!this.video) return false;
    if (this.video) {
      return !this.video.paused && document.visibilityState === "visible";
    }
    return false;
  }

  public updatePlayingState(): boolean {
    this.videoIsPlaying = this.isPlaying();
    return this.videoIsPlaying;
  }

  public initializeVideo(): void {}

  public getVideo(): HTMLVideoElement | null {
    return this.video;
  }

  public getVideoTitle(): string | null {
    return this.videoTitle;
  }

  public getUrl(): string {
    return this.url;
  }

  public getVideoIsPlaying(): boolean | undefined {
    return this.videoIsPlaying;
  }

  public getVideoHasListeners(): boolean {
    return this.videoHasListeners;
  }

  public getHasPlayed(): boolean {
    return this.hasPlayed;
  }

  public setVideoTitle(videoTitle: string | null): void {
    this.videoTitle = videoTitle;
  }

  public setUrl(url: string): void {
    this.url = url;
  }

  public setVideoIsPlaying(videoIsPlaying: boolean | undefined): void {
    this.videoIsPlaying = videoIsPlaying;
  }

  public setVideoHasListeners(videoHasListeners: boolean): void {
    this.videoHasListeners = videoHasListeners;
  }

  public setHasPlayed(hasPlayed: boolean): void {
    this.hasPlayed = hasPlayed;
  }
}
