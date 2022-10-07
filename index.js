#!/usr/bin/env node

const Parser = require("rss-parser");
const fs = require("fs");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const argv = yargs(hideBin(process.argv)).argv;
const parser = new Parser();

const downloadsPerIteration = argv.chunkSize ? argv.chunkSize : 10;

const sliceIntoChunks = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const download = async (item) => {
  try {
    const path = argv.path ? argv.path : process.cwd();
    const res = await fetch(item.enclosure.url);
    const fileName = item.title.replace(/\//g, "");
    await fs.promises.writeFile(
      `${path}/${fileName}.${getFileExtension(item.enclosure.type)}`,
      res.body
    );
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
  console.time("time elapsed");
  const feed = await getRssFeed(argv.url);

  console.log(`Starting to download a total of ${getFeedSize(feed)}`);

  const chunks = sliceIntoChunks(feed.items, downloadsPerIteration);
  for (const [i, chunk] of chunks.entries()) {
    const promises = chunk.map((item) => download(item));
    console.log(promises.length);
    await Promise.all(promises);

    const percentageDone = Math.round(((i + 1) / chunks.length) * 100);
    console.log(`${percentageDone} %.`);
    console.timeLog("time elapsed");
  }

  console.timeEnd("time elapsed");
  console.log("Done.");
})();
