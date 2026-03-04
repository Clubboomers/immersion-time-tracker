/**
 * 
 * @returns 
 */
async function init() {
  // populate the list of recent activities with videos watched the last hour
  const popupInfo = await requestPopupInfo().then((result) => {
    if (result) {
      return result;
    } else {
      return null;
    }
  });
  if (!popupInfo) return;
  popupInfo.recentActivity.forEach((activity) => {
    const newActivity = {
      listItem: addNewActivity(activity.title, activity.url),
      date: new Date(),
      url: activity.url,
      title: activity.title,
    };
    recentActivity.push(newActivity);
  });
  popupInfo.watchtimeToday ? (timer = popupInfo.watchtimeToday) : (timer = 0);
  watchtimeTotal = popupInfo.watchtimeTotal;
  updateTimer();
  popupInfo.playingState ? startTimer() : updateTimer();
}

async function requestPopupInfo(): Promise<{
  recentActivity: { url: string; title: string }[];
  watchtimeToday: number;
  watchtimeTotal: number;
  playingState: boolean;
} | null> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ message: "get_popup_info" }, (response) => {
      if (response && response.message === "popup_info") {
        clearTimeout(timeoutId);

        const recentActivity: { url: string; title: string }[] = [];
        response.recentActivity.forEach(
          (activity: { url: string; title: string }) => {
            recentActivity.push(activity);
          }
        );

        const watchtimeToday = response.watchtimeToday;
        const watchtimeTotal = response.watchtimeTotal;
        const playingState = response.playingState;

        resolve({ recentActivity, watchtimeToday, watchtimeTotal, playingState });
      } else {
        console.error("Failed to get popup info: invalid response", response);
        resolve(null);
      }
    });

    // make promise expire after not receiving a response for 5 seconds
    const timeoutId = setTimeout(() => {
      console.error("Failed to get recent activity: promise timed out");
      resolve(null);
    }, 5000);
  });
}

function updateAnimations(): void {
  const videoTitles: NodeListOf<HTMLSpanElement> =
    document.querySelectorAll(".video-title");
  if (videoTitles && videoTitles.length > 0) {
    videoTitles.forEach((videoTitle) => {
      if (0 > videoTitle.parentElement!.clientWidth - videoTitle.clientWidth) {
        console.log("video title is too long: " + videoTitle.textContent);
        videoTitle.setAttribute("data-text", videoTitle.textContent!);
        const textWidth: number = videoTitle.clientWidth;
        const animationDuration: number = textWidth / 20;
        console.log(
          `textWidth: ${textWidth}, animationDuration: ${animationDuration}`
        );
        videoTitle.style.animationDuration = animationDuration + "s";
      } else {
        videoTitle.classList.add("disable-animation");
      }
    });
  }
}

function updateTimer(): void {
  const timerElement: HTMLElement | null = document.getElementById("time");
  if (timerElement) {
    timerElement.textContent = formatTime(timer);
  }
  const watchtimeTotalElement: HTMLElement | null = document.getElementById("total-time");
  if (watchtimeTotalElement) {
    watchtimeTotalElement.textContent = formatTime(watchtimeTotal);
  }
}

function startTimer(): void {
  timerActive = true;
  chrome.runtime.sendMessage({ message: "timer_started" });
  let intervalId: any = setInterval(() => {
    if (!timerActive) intervalId.clearInterval();
    timer++;
    updateTimer();
  }, 1000);
}

function stopTimer(): void {
  timerActive = false;
  chrome.runtime.sendMessage({ message: "timer_stopped" });
}

function formatTime(seconds: number): string | null {
  let hours: number | string = Math.floor(seconds / 3600);
  let minutes: number | string = Math.floor((seconds - hours * 3600) / 60);
  let remainingSeconds: number | string = seconds - hours * 3600 - minutes * 60;

  // Add leading zeros to minutes and seconds if they are less than 10
  if (minutes < 10) {
    minutes = "0" + minutes;
  }

  if (remainingSeconds < 10) {
    remainingSeconds = "0" + remainingSeconds;
  }

  // Combine the hours, minutes, and seconds into a string
  let timeString = hours + ":" + minutes + ":" + remainingSeconds;

  return timeString;
}

function addNewActivity(title: string, url: string): HTMLLIElement {
  // li element
  const newActivity: HTMLLIElement = document.createElement("li");
  const iconSpan: HTMLSpanElement = document.createElement("span");
  iconSpan.classList.add("icon");
  newActivity.appendChild(iconSpan);
  const imgTag: HTMLImageElement = document.createElement("img");
  imgTag.src = getImgSrcByUrl(url);
  imgTag.alt = "icon";
  iconSpan.appendChild(imgTag);
  const scrollContainer: HTMLSpanElement = document.createElement("span");
  scrollContainer.classList.add("scroll-container");
  const videoTitle: HTMLSpanElement = document.createElement("span");
  videoTitle.classList.add("video-title");
  videoTitle.setAttribute("data-text", title);
  videoTitle.textContent = title;
  scrollContainer.appendChild(videoTitle);
  newActivity.appendChild(scrollContainer);
  newActivity.addEventListener("click", () => {
    chrome.tabs.create({ url: url });
  });

  const parent: HTMLUListElement = document.getElementById(
    "recent-activity"
  ) as HTMLUListElement;
  parent.insertBefore(newActivity, parent.firstChild);
  updateAnimations();
  return newActivity;
}

function getImgSrcByUrl(url: string): string {
  if (url.includes("youtube.com")) {
    return "./youtube-icon.png";
  } else if (url.includes("netflix.com")) {
    return "./netflix-icon.png";
  } else if (url.includes("nicovideo.jp")) {
    return "./nicovideo-icon.png";
  }
  return "";
}

function extractDomain(url: string): string {
  try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
  } catch (error) {
      console.error(`Invalid URL: ${url}`);
      return '';
  }
}

/* */

let timer: number;
let watchtimeTotal: number;
let timerActive: boolean = false;
let recentActivity: {
  listItem?: HTMLLIElement;
  date?: Date;
  url: string;
  title: string;
}[] = [];
init();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // listen for messages sent from background.js
  if (request.message === "playing_state") {
    const playingState = request.playingState;
    if (playingState) {
      startTimer();
    } else {
      stopTimer();
    }
  }
});