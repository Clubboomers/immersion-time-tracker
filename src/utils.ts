function utilityFunctions() {

    function isYouTube(url: string | undefined): boolean {
        if (!url) return false;
        if (url.includes("youtube.com/watch") && !url.includes("music.youtube")) {
          return true;
        }
        return false;
      }

      function otherFunction() {
        console.log("other function");
      }

    return { isYouTube, otherFunction }
}

export default utilityFunctions;