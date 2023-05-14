function tabFunctions()  {
    let activeTabs: { id: number; url: string }[] = [];

    /**
 * Adds tab to activeTabs and sends message to content script to start tracking time
 * @param tabId
 * @param url
 */
function addToActiveTabs(
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