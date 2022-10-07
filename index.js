const Parser = require("rss-parser");
const fs = require("fs");

const parser = new Parser();

const downloadsPerIteration = 20;

const sliceIntoChunks = (arr, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    chunks.push(chunk);
  }
  return chunks;
};

const download = async (item) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await fetch(item.enclosure.url);
      const fileName = item.title.replace(/\//g, "");
      await fs.promises.writeFile(`files/${fileName}.mp3`, res.body);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

(async () => {
  const feed = await parser.parseURL("http://localhost:8888/feed.rss");
  const chunks = sliceIntoChunks(feed.items, downloadsPerIteration);

  for (const [i, chunk] of chunks.entries()) {
    const promises = chunk.map((item) => download(item));
    await Promise.all(promises);
    const percentageDone = Math.round(((i + 1) / chunks.length) * 100);
    console.log(`${percentageDone} %.`);
  }
})();
