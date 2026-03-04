/*function tabFunctions() {
  let activeTabs: { id: number; url: string }[] = [];

  function activeTabsContain(tabId: number): boolean {
    return activeTabs.some((tab) => tab?.id === tabId);
  }

  /**
   * Changes the url of the tab in activeTabs
   * @param tabId
   * @param newUrl
   */
  /*function changeActiveTabUrl(
    tabId: number | undefined,
    newUrl: string | undefined
  ): void {
    if (!newUrl || !tabId) return;
    activeTabs = activeTabs.map((tab) => {
      if (tab?.id === tabId) {
        if (tab.url === newUrl) return tab;
        tab.url = newUrl;
      }
      return tab;
    });
  }

  /**
   * Adds tab to activeTabs and sends message to content script to start tracking time
   * @param tabId
   * @param url
   */
  /*function addToActiveTabs(
    playingVideos: { url: string; videoName: string }[],
    tabId: number | undefined,
    url: string | undefined
  ): void {
    if (!url || !tabId) return;
    if (!isYouTube(url)) return;
    if (activeTabsContain(tabId)) {
      // tab is already in activeTabs

      if (playingVideos.some((video) => url.includes(video.url))) {
        // video is already playing
        const playingVideoKey = playingVideos.find((video) =>
          url.includes(video.url)
        )?.url;
        playingVideoKey
          ? timeTracker.getVideoEntryByKey(playingVideoKey)?.stop()
          : null; // stop the video that was playing
        return;
      }

      changeActiveTabUrl(tabId, url);
      sendMessage(tabId, "new_url", url);
      return;
    }
    activeTabs.push({ id: tabId, url: url });
    sendMessage(tabId, "new_url", url);
  }
}
*/