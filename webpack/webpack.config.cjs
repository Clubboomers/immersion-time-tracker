const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
module.exports = {
   mode: "production",
   devtool: "inline-source-map",
   entry: {
      background: path.resolve(__dirname, "..", "src", "background.ts"),
      video: path.resolve(__dirname, "..", "src", "video.ts"),
      timetracker: path.resolve(__dirname, "..", "src", "timetracker.ts"),
      videoentry: path.resolve(__dirname, "..", "src", "videoentry.ts"),
      timeentry: path.resolve(__dirname, "..", "src", "timeentry.ts"),
      popup: path.resolve(__dirname, "..", "src", "popup.ts"),
      youtube: path.resolve(__dirname, "..", "src", "youtube.ts"),
   },
   output: {
      path: path.join(__dirname, "../dist"),
      filename: "[name].js",
   },
   resolve: {
      extensions: [".ts", ".js"],
   },
   module: {
      rules: [
         {
            test: /\.tsx?$/,
            loader: "ts-loader",
            exclude: /node_modules/,
         },
      ],
   },
   plugins: [
      new CopyPlugin({
         patterns: [{ from: ".", to: ".", context: "public" }]
      }),
   ],
};