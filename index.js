#!/usr/bin/env node

const Parser = require("rss-parser");
const fs = require("fs");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const cliProgress = require("cli-progress");
const colors = require("ansi-colors");

const progress = new cliProgress.SingleBar(
  {
    format:
      colors.cyan("{bar}") +
      "| {percentage}% || {value}/{total} episodes || {downloaded}/{totalSize}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
  },
  cliProgress.Presets.shades_classic
);

const argv = yargs(hideBin(process.argv)).argv;
const parser = new Parser();

const threads = argv.threads ? argv.threads : 10;
let totalDownloaded = 0;

const sliceIntoChunks = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const download = async (item) => {
  const saveDir = argv.path ? argv.path : process.cwd();
  const fileName = item.title.replace(/\//g, "");
  const ext = getFileExtension(item.enclosure.type);
  const output = `${saveDir}/${fileName}.${ext}`;

  const incrementProgress = () => {
    totalDownloaded = Math.abs(totalDownloaded + Number(item.enclosure.length));
    progress.increment({
      downloaded: formatBytes(totalDownloaded),
    });
  };

  if (!argv.force && fs.existsSync(output)) {
    console.log(
      `File ${fileName}.${ext} exists. Skipping. If you want to force download episodes, supply the --force flag.`
    );
    incrementProgress();
    return;
  }

  try {
    const res = await fetch(item.enclosure.url);
    await fs.promises.writeFile(output, res.body);
    incrementProgress();
  } catch (e) {
    console.error(e);
  }
};

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const getRssFeed = async (url) => {
  if (!argv.url)
    throw new Error(
      "Missing RSS feed URL. Provide it with --url http://example.com/feed.rss"
    );

  try {
    return await parser.parseURL(url);
  } catch (e) {
    throw new Error(e);
  }
};

const getFileExtension = (mimeType) => {
  return {
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/flac": ".flac",
    "audio/ogg": ".ogg",
    "audio/vorbis": ".ogg",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/aac": ".aac",
  }[mimeType];
};

const getFeedSize = (feed) => {
  const totalBytes = feed.items.reduce((prev, curr) => {
    return prev + Number(curr.enclosure.length);
  }, 0);

  return formatBytes(totalBytes);
};

(async () => {
  const feed = await getRssFeed(argv.url);
  progress.start(feed.items.length, 0, {
    downloaded: formatBytes(totalDownloaded),
    totalSize: getFeedSize(feed),
  });

  const chunks = sliceIntoChunks(
    feed.items,
    threads > feed.length ? feed.length : threads
  );

  for (const chunk of chunks) {
    const promises = chunk.map((item) => download(item));
    await Promise.all(promises);
  }

  progress.stop();
  console.log("Done.");
})();
