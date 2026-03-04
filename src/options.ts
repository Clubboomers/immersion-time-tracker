import { Options } from "./trackingoptions";

function addElementToList(parentElement: HTMLDivElement, text: string): void {
  const pElement: HTMLParagraphElement = document.createElement("p");
  pElement.innerHTML = text;
  const removeButton: HTMLButtonElement = document.createElement("button");

  const listItem: HTMLDivElement = document.createElement("div");
  listItem.classList.add("listItem");
  listItem.appendChild(pElement);
  listItem.appendChild(removeButton);

  removeButton.classList.add("button");
  removeButton.classList.add("listButton");
  removeButton.innerHTML = "Remove";
  removeButton.addEventListener("click", () => {
    listItem.remove();
  });
  parentElement.appendChild(listItem);
}

function saveOptions(): void {
  const options: Options = new Options();
  try {
    const prefLangEnabled: boolean = prefLangSwitch?.checked ?? false;
    let prefLang: string = "";
    if (prefLangEnabled) prefLang = dropdown?.value ?? "";

    const domainsToTrack: { [key: string]: boolean } = {};
    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      '#domainsToTrack input[type="checkbox"]'
    );
    checkboxes.forEach((checkbox) => {
      const domain: string = checkbox.value;
      const checked: boolean = checkbox.checked;
      domainsToTrack[domain] = checked;
    });

    const domainsToAlwaysTrack: string[] = [];
    const domainsToAlwaysTrackElements =
      document.querySelectorAll<HTMLInputElement>(
        "#domainsToAlwaysTrack .listItem p"
      );
    domainsToAlwaysTrackElements.forEach((domainElement) => {
      const domain: string = domainElement.innerHTML;
      domainsToAlwaysTrack.push(domain);
    });

    const blacklistedKeywords: string[] = [];
    const blacklistedKeywordsElements =
      document.querySelectorAll<HTMLInputElement>(
        "#blacklistedKeywords .listItem p"
      );
    blacklistedKeywordsElements.forEach((keywordElement) => {
      const keyword: string = keywordElement.innerHTML;
      blacklistedKeywords.push(keyword);
    });

    console.log({
      prefLangEnabled,
      prefLang,
      domainsToTrack,
      domainsToAlwaysTrack,
      blacklistedKeywords,
    });

    options.setTargetLangSet(prefLangEnabled);
    options.setTargetLanguage(prefLang);
    options.setDomainsToTrack(domainsToTrack);
    options.setDomainsToAlwaysTrack(domainsToAlwaysTrack);
    options.setBlacklistedKeywords(blacklistedKeywords);
  } catch (error) {
    alert("Error saving options. Refresh the page and try again.");
    return;
  }

  const { isValid, fault } = validOptions(options);
  if (!isValid) {
    alert(fault);
    return;
  }

  chrome.runtime.sendMessage({ message: "set_options", options: options });
}

function validOptions(options: Options): { isValid: boolean; fault: string } {
  if (options.getTargetLangSet() && options.getTargetLanguage() === "") {
    return {
      isValid: false,
      fault: "Preferred language is enabled but no language is selected.",
    };
  } else if (
    Object.keys(options.getDomainsToTrack()).length === 0 &&
    options.getDomainsToAlwaysTrack().length === 0
  ) {
    return {
      isValid: false,
      fault: "There are no websites or domains with enabled tracking.",
    };
  }
  return { isValid: true, fault: "" };
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

async function getOptions(): Promise<{ options: Options }> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ message: "get_options" }, (response) => {
      if (response && response.message == "options") {
        console.log(response);
        clearTimeout(timeoutId);

        const options: Options = new Options();
        options.setTargetLangSet(response.options.targetLangSet);
        options.setTargetLanguage(response.options.targetLanguage);
        options.setDomainsToTrack(response.options.domainsToTrack);
        options.setDomainsToAlwaysTrack(response.options.domainsToAlwaysTrack);
        options.setBlacklistedKeywords(response.options.blacklistedKeywords);

        resolve({ options });
      }
    });
    // make promise expire after not receiving a response for 5 seconds
    const timeoutId = setTimeout(() => {
      reject("Timed out");
    }, 5000);
  });
}

/**
 * Populates the options page with an options object
 * @param options Options object to load into the options page
 */
function loadOptions(options: Options): void {
  prefLangSwitch!.checked = options.getTargetLangSet();
  togglePrefLangEnabled();

  dropdown!.value = options.getTargetLanguage();

  const domainsToTrack: { [key: string]: boolean } =
    options.getDomainsToTrack();
  console.log("domains to track: ", domainsToTrack);
  const checkboxes = document.querySelectorAll(
    "#domainsToTrack input[type='checkbox']"
  );
  for (let i = 0; i < checkboxes.length; i++) {
    const checkbox: HTMLInputElement = checkboxes[i] as HTMLInputElement;
    const domain: string = checkbox.value;
    const checked: boolean = domainsToTrack[domain];
    checkbox.checked = checked;
  }

  const domainsToAlwaysTrack: string[] = options.getDomainsToAlwaysTrack();
  let parentDiv: HTMLDivElement = document.querySelector(
    "#domainsToAlwaysTrack"
  ) as HTMLDivElement;
  for (let i = 0; i < domainsToAlwaysTrack.length; i++) {
    const domain: string = domainsToAlwaysTrack[i];
    addElementToList(parentDiv, domain);
  }

  const blacklistedKeywords: string[] = options.getBlacklistedKeywords();
  parentDiv = document.querySelector("#blacklistedKeywords") as HTMLDivElement;
  for (let i = 0; i < blacklistedKeywords.length; i++) {
    const keyword: string = blacklistedKeywords[i];
    addElementToList(parentDiv, keyword);
  }

  console.log("options loaded", options);
}

/**
 * Hide or show the preferred language dropdown based on the preferred language switch
 */
function togglePrefLangEnabled(): void {
  const prefLangEnabled: boolean = prefLangSwitch?.checked ?? false;
  const dropdown: HTMLSelectElement | null = document.querySelector(
    "#preferredLanguage"
  ) as HTMLSelectElement;
  if (prefLangEnabled) {
    prefLangList?.classList.remove("hidden");
    dropdown.required = true;
  } else {
    prefLangList?.classList.add("hidden");
    dropdown.required = false;
  }
}

//
// main
//

const prefLangSwitch: HTMLInputElement | null =
  document.querySelector("#prefLangEnabled");
if (!prefLangSwitch) {
  throw new Error("Could not find preferred language switch.");
}
const prefLangList: HTMLLabelElement | null = document.querySelector(
  "#preferredLanguageField"
);
if (!prefLangList) {
  throw new Error("Could not find preferred language list.");
}
const dropdown: HTMLSelectElement | null =
  document.querySelector("#preferredLanguage");
if (!dropdown) {
  throw new Error("Could not find preferred language dropdown.");
}

window.onload = () => {
  togglePrefLangEnabled();
  prefLangSwitch.addEventListener("change", () => {
    togglePrefLangEnabled();
  });

  const addToListButtons: {
    parentElement: HTMLDivElement;
    buttonElement: HTMLButtonElement;
  }[] = [];
  // populate addToListButtons array
  document.querySelectorAll("#addToList").forEach((button) => {
    const parentElement = button.parentElement?.parentElement as HTMLDivElement;
    const textField: HTMLInputElement = parentElement.querySelector(
      "input"
    ) as HTMLInputElement;
    const childElement = button as HTMLButtonElement;
    childElement.addEventListener("click", () => {
      let text: string = textField.value.trim();
      if (parentElement.id === "domainsToAlwaysTrack") {
        text = extractDomain(text);
      }
      if (text === "") {
        return;
      }
      addElementToList(parentElement, text);
      textField.value = "";
    });
    addToListButtons.push({ parentElement, buttonElement: childElement });
  });

  /**
   * Fetches the options from storage and populates
   * the options page with the values.
   */
  getOptions().then((result) => {
    console.log("Options retrieved from storage: ", result.options);
    loadOptions(new Options(result.options));
  });

  const form = document.getElementById("optionsForm") as HTMLFormElement;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveOptions();
  });
};
