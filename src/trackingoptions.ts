export class Options {
  private prefLangEnabled: boolean = true;
  private targetLanguage: string = "ja";
  private domainsToTrack: { [key: string]: boolean } = {};
  private domainsToAlwaysTrack: string[] = [];
  private blacklistedKeywords: string[] = [];
  constructor(obj?: any) {
    this.domainsToTrack["youtube.com"] = true;
    this.domainsToTrack["netflix.com"] = true;
    this.domainsToTrack["nicovideo.jp"] = true;
    if (obj) {
      this.prefLangEnabled = obj.prefLangEnabled;
      this.targetLanguage = obj.targetLanguage;
      this.domainsToTrack = obj.domainsToTrack;
      this.domainsToAlwaysTrack = obj.domainsToAlwaysTrack;
      this.blacklistedKeywords = obj.blacklistedKeywords;
    } else {
      //this.loadOptions();
    }
  }

  public loadOptions(): void {
    chrome.storage.sync.get(
      [
        "prefLangEnabled",
        "targetLanguage",
        "domainsToTrack",
        "domainsToAlwaysTrack",
        "blacklistedKeywords",
      ],
      (result) => {
        // check if storage is empty
        if (Object.keys(result).length === 0) {
          this.saveOptions();
          return;
        }

        this.prefLangEnabled = result.prefLangEnabled;
        this.targetLanguage = result.targetLanguage;
        this.domainsToTrack = result.domainsToTrack;
        this.domainsToAlwaysTrack = result.domainsToAlwaysTrack;
        this.blacklistedKeywords = result.blacklistedKeywords;
      }
    );
  }

  public saveOptions(): void {
    chrome.storage.sync.set({
      prefLangEnabled: this.prefLangEnabled,
      targetLanguage: this.targetLanguage,
      domainsToTrack: this.domainsToTrack,
      domainsToAlwaysTrack: this.domainsToAlwaysTrack,
      blacklistedKeywords: this.blacklistedKeywords,
    });
  }

  public getPrefLangEnabled(): boolean {
    return this.prefLangEnabled;
  }

  public getTargetLanguage(): string {
    return this.targetLanguage;
  }

  public getDomainsToTrack(): { [key: string]: boolean } {
    return this.domainsToTrack;
  }

  public getDomainsToAlwaysTrack(): string[] {
    return this.domainsToAlwaysTrack;
  }

  public getBlacklistedKeywords(): string[] {
    return this.blacklistedKeywords;
  }

  public setPrefLangEnabled(prefLangEnabled: boolean): void {
    this.prefLangEnabled = prefLangEnabled;
  }

  public setTargetLanguage(targetLanguage: string): void {
    this.targetLanguage = targetLanguage;
  }

  public setDomainsToTrack(domainsToTrack: { [key: string]: boolean }): void {
    this.domainsToTrack = domainsToTrack;
  }

  public setDomainsToAlwaysTrack(domainsToAlwaysTrack: string[]): void {
    this.domainsToAlwaysTrack = domainsToAlwaysTrack;
  }

  public setBlacklistedKeywords(blacklistedKeywords: string[]): void {
    this.blacklistedKeywords = blacklistedKeywords;
  }
}
