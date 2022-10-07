# POD-DL

Quick and dirty podcast downloader

## Example usage

```bash
npx pod-dl --url http://example.com/feed.rss
```

## Flags

### --url

Provide a rss feed url to the podcast

### --path

Optional. Specify where to download the files. If not provided the current directory will be used.

### --threads

Optional. Number of concurrent downloads. Default is 10, and if there are less than 10 episodes in total, all episodes will be downloaded concurrently.
