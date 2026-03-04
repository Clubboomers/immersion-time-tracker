export class Options {
  private targetLangSet: boolean = true;
  private targetLanguage: string = "ja";
  private domainsToTrack: { [key: string]: boolean } = {};
  private domainsToAlwaysTrack: string[] = [];
  private blacklistedKeywords: string[] = [];
  constructor(obj?: any) {
    this.domainsToTrack["www.youtube.com"] = true;
    this.domainsToTrack["www.netflix.com"] = true;
    this.domainsToTrack["www.nicovideo.jp"] = true;
    if (obj) {
      this.targetLangSet = obj.targetLangSet;
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
        "targetLangSet",
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

        this.targetLangSet = result.targetLangSet;
        this.targetLanguage = result.targetLanguage;
        this.domainsToTrack = result.domainsToTrack;
        this.domainsToAlwaysTrack = result.domainsToAlwaysTrack;
        this.blacklistedKeywords = result.blacklistedKeywords;
      }
    );
  }

  public saveOptions(): void {
    chrome.storage.sync.set({
      targetLangSet: this.targetLangSet,
      targetLanguage: this.targetLanguage,
      domainsToTrack: this.domainsToTrack,
      domainsToAlwaysTrack: this.domainsToAlwaysTrack,
      blacklistedKeywords: this.blacklistedKeywords,
    });
  }

  public getTargetLangSet(): boolean {
    return this.targetLangSet;
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

  public setTargetLangSet(prefLangEnabled: boolean): void {
    this.targetLangSet = prefLangEnabled;
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
