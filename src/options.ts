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

    options.setPrefLangEnabled(prefLangEnabled);
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

  chrome.runtime.sendMessage(
    { message: "set_options", options: options },
    (response) => {
      if (response && response.message == "options_saved") {
        window.location.reload();
      }
    }
  );
}

function validOptions(options: Options): { isValid: boolean; fault: string } {
  if (options.getPrefLangEnabled() && options.getTargetLanguage() === "") {
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

async function getOptions(): Promise<{ options: Options }> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ message: "get_options" }, (response) => {
      if (response && response.message == "options") {
        console.log(response);
        clearTimeout(timeoutId);

        const options: Options = new Options();
        options.setPrefLangEnabled(response.options.prefLangEnabled);
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
  prefLangSwitch!.checked = options.getPrefLangEnabled();
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

const supportedLanguages = [
  { value: "af", text: "Afrikaans" },
  { value: "am", text: "Amharic" },
  { value: "ar", text: "Arabic" },
  { value: "bg", text: "Bulgarian" },
  { value: "bn", text: "Bangla" },
  { value: "bs", text: "Bosnian" },
  { value: "ca", text: "Catalan" },
  { value: "ceb", text: "Cebuano" },
  { value: "co", text: "Corsican" },
  { value: "cs", text: "Czech" },
  { value: "cy", text: "Welsh" },
  { value: "da", text: "Danish" },
  { value: "de", text: "German" },
  { value: "el", text: "Greek" },
  { value: "en", text: "English" },
  { value: "eo", text: "Esperanto" },
  { value: "es", text: "Spanish" },
  { value: "et", text: "Estonian" },
  { value: "eu", text: "Basque" },
  { value: "fa", text: "Persian" },
  { value: "fi", text: "Finnish" },
  { value: "fil", text: "Filipino" },
  { value: "fr", text: "French" },
  { value: "fy", text: "Western Frisian" },
  { value: "ga", text: "Irish" },
  { value: "gd", text: "Scottish Gaelic" },
  { value: "gl", text: "Galician" },
  { value: "gu", text: "Gujarati" },
  { value: "ha", text: "Hausa" },
  { value: "haw", text: "Hawaiian" },
  { value: "hi", text: "Hindi" },
  { value: "hmn", text: "Hmong" },
  { value: "hr", text: "Croatian" },
  { value: "ht", text: "Haitian Creole" },
  { value: "hu", text: "Hungarian" },
  { value: "hy", text: "Armenian" },
  { value: "id", text: "Indonesian" },
  { value: "ig", text: "Igbo" },
  { value: "is", text: "Icelandic" },
  { value: "it", text: "Italian" },
  { value: "iw", text: "Hebrew" },
  { value: "ja", text: "Japanese" },
  { value: "jv", text: "Javanese" },
  { value: "ka", text: "Georgian" },
  { value: "kk", text: "Kazakh" },
  { value: "km", text: "Khmer" },
  { value: "kn", text: "Kannada" },
  { value: "ko", text: "Korean" },
  { value: "ku", text: "Kurdish" },
  { value: "ky", text: "Kyrgyz" },
  { value: "la", text: "Latin" },
  { value: "lb", text: "Luxembourgish" },
  { value: "lo", text: "Lao" },
  { value: "lt", text: "Lithuanian" },
  { value: "lv", text: "Latvian" },
  { value: "mg", text: "Malagasy" },
  { value: "mi", text: "Maori" },
  { value: "mk", text: "Macedonian" },
  { value: "ml", text: "Malayalam" },
  { value: "mn", text: "Mongolian" },
  { value: "mr", text: "Marathi" },
  { value: "ms", text: "Malay" },
  { value: "mt", text: "Maltese" },
  { value: "my", text: "Burmese" },
  { value: "ne", text: "Nepali" },
  { value: "nl", text: "Dutch" },
  { value: "no", text: "Norwegian" },
  { value: "ny", text: "Nyanja" },
  { value: "pa", text: "Punjabi" },
  { value: "pl", text: "Polish" },
  { value: "ps", text: "Pashto" },
  { value: "pt", text: "Portuguese" },
  { value: "ro", text: "Romanian" },
  { value: "ru", text: "Russian" },
  { value: "sd", text: "Sindhi" },
  { value: "si", text: "Sinhala" },
  { value: "sk", text: "Slovak" },
  { value: "sl", text: "Slovenian" },
  { value: "sm", text: "Samoan" },
  { value: "sn", text: "Shona" },
  { value: "so", text: "Somali" },
  { value: "sq", text: "Albanian" },
  { value: "sr", text: "Serbian" },
  { value: "st", text: "Southern Sotho" },
  { value: "su", text: "Sundanese" },
  { value: "sv", text: "Swedish" },
  { value: "sw", text: "Swahili" },
  { value: "ta", text: "Tamil" },
  { value: "te", text: "Telugu" },
  { value: "tg", text: "Tajik" },
  { value: "th", text: "Thai" },
  { value: "tr", text: "Turkish" },
  { value: "uk", text: "Ukrainian" },
  { value: "ur", text: "Urdu" },
  { value: "uz", text: "Uzbek" },
  { value: "vi", text: "Vietnamese" },
  { value: "xh", text: "Xhosa" },
  { value: "yi", text: "Yiddish" },
  { value: "yo", text: "Yoruba" },
  { value: "zh", text: "Chinese" },
  { value: "zu", text: "Zulu" },
];

// sort alphabetically by text field
supportedLanguages.sort((a, b) => {
  const textA = a.text.toUpperCase();
  const textB = b.text.toUpperCase();
  return textA < textB ? -1 : textA > textB ? 1 : 0;
});

window.onload = () => {
  if (dropdown) {
    supportedLanguages.forEach((language) => {
      const optionElement = document.createElement("option");
      optionElement.value = language.value;
      optionElement.text = language.text;
      dropdown.appendChild(optionElement);
    });
  } else {
    throw new Error("Could not find preferred language dropdown.");
  }

  togglePrefLangEnabled();
  prefLangSwitch.addEventListener("change", () => {
    togglePrefLangEnabled();
  });

  const addToListButtons: {
    parentElement: HTMLDivElement;
    childElement: HTMLButtonElement;
  }[] = [];
  // populate addToListButtons array
  document.querySelectorAll("#addToList").forEach((button) => {
    const parentElement = button.parentElement?.parentElement as HTMLDivElement;
    const textField: HTMLInputElement = parentElement.querySelector(
      "input"
    ) as HTMLInputElement;
    const childElement = button as HTMLButtonElement;
    childElement.addEventListener("click", () => {
      const text: string = textField.value.trim();
      if (text === "") {
        return;
      }
      addElementToList(parentElement, text);
      textField.value = "";
    });
    addToListButtons.push({ parentElement, childElement });
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
