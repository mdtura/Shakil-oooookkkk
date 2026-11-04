const axios = require("axios");
const fs = require("fs");
const path = require("path");

async function downloadFile(url, fileName) {
  const response = await axios({
    url,
    method: "GET",
    responseType: "arraybuffer",
    timeout: 120000
  });
  fs.writeFileSync(fileName, Buffer.from(response.data));
  return fs.createReadStream(fileName);
}

async function getThumbnailStream(url) {
  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 15000
  });
  return response.data;
}

module.exports = {
  config: {
    name: "ytb",
    version: "3.4",
    author: "Shakil",
    role: 0,
    description: { en: "🎬 YTB Audio/Video Downloader via Apify" },
    category: "media"
  },

  onStart: async ({ api, args, event, commandName }) => {
    if (!args.length)
      return api.sendMessage(
        "Usage:\n#ytb -v name\n#ytb -a name\n#ytb -v -l name\n#ytb -a -l name",
        event.threadID,
        event.messageID
      );

    const isVideo = args.includes("-v");
    const isAudio = args.includes("-a");
    const isList = args.includes("-l");

    if (!isVideo && !isAudio)
      return api.sendMessage("❌ Use -v (video) or -a (audio)", event.threadID, event.messageID);

    const keyword = args.filter(a => !a.startsWith("-")).join(" ");
    if (!keyword)
      return api.sendMessage("Please type a name.", event.threadID, event.messageID);

    try {
      const APIFY_TOKEN = process.env.APIFY_TOKEN || "Apify_api_Dywvd3IDunzJKjfKuPIBELrvxP3YQZ0cqWHy";

      api.setMessageReaction("🌷", event.messageID, () => {}, true);

      // Apify YouTube Scraper Actor কল করা
      const actorRunResponse = await axios.post(
        `https://api.apify.com/v2/acts/stream-scraper~youtube-scraper/runs?token=${APIFY_TOKEN}`,
        {
          searchKeywords: keyword,
          maxResults: 6
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const datasetId = actorRunResponse.data?.data?.defaultDatasetId;
      if (!datasetId) throw new Error("Failed to start Apify actor.");

      // ডেটা রেডি হওয়ার জন্য ৫ সেকেন্ড অপেক্ষা
      await new Promise(resolve => setTimeout(resolve, 5000));

      const datasetResponse = await axios.get(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
      );

      const items = datasetResponse.data;
      if (!items || !items.length)
        return api.sendMessage("❌ No results found.", event.threadID, event.messageID);

      const results = items.slice(0, 6).map(v => ({
        id: v.id || v.videoId,
        title: v.title,
        url: v.url || v.webpageUrl,
        timestamp: v.duration || "N/A",
        author: { name: v.channelName || v.author || "Unknown" },
        thumbnail: v.thumbnailUrl || v.thumbnail,
        downloadUrl: v.downloadUrl || v.formats?.[0]?.url
      }));

      if (isList) {
        let text = "╭───────────────❍\n";
        text += isVideo ? "│   🎬 𝑽𝒊𝒅𝒆𝒐 𝑳𝒊𝒔𝒕\n" : "│   🎵 𝑨𝒖𝒅𝒊𝒐 𝑳𝒊𝒔𝒕\n";
        text += "╰───────────────❍\n\n";

        for (let i = 0; i < results.length; i++) {
          const v = results[i];
          text += `╭─❍\n`;
          text += `┊  ${i + 1}. ${v.title}\n`;
          text += `┊  ⏳ ${v.timestamp}\n`;
          text += `┊  📺 ${v.author.name}\n`;
          text += `╰───────────────❍\n\n`;
        }

        text += "╭───────────────❍\n";
        text += "│   🔢 Reply with number (1–6)\n";
        text += "╰───────────────❍";

        const thumbs = await Promise.all(
          results.map(v => v.thumbnail ? getThumbnailStream(v.thumbnail).catch(() => null) : null)
        ).then(res => res.filter(Boolean));

        return api.sendMessage(
          { body: text, attachment: thumbs.length ? thumbs : undefined },
          event.threadID,
          (err, info) => {
            global.GoatBot.onReply.set(info.messageID, {
              commandName,
              messageID: info.messageID,
              author: event.senderID,
              results,
              isVideo
            });
          },
          event.messageID
        );
      }

      const video = results[0];
      const directUrl = video.downloadUrl || video.url;
      const fileName = isVideo ? "video.mp4" : "audio.mp3";

      await downloadFile(directUrl, fileName);

      api.sendMessage(
        {
          body:
`╭───────────────❍
│ ${isVideo ? "🎬" : "🎧"} 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑺𝒖𝒄𝒄𝒆𝒔𝒔
├───────────────❍
│ ${isVideo ? "🎥" : "🎵"} ${video.title}
╰───────────────❍`,
          attachment: fs.createReadStream(fileName)
        },
        event.threadID,
        () => {
          try { fs.unlinkSync(fileName); } catch (e) {}
          api.setMessageReaction("🎀", event.messageID, () => {}, true);
        },
        event.messageID
      );

    } catch (err) {
      console.log("YTB ERROR:", err.message);
      api.sendMessage("❌ Failed to fetch media via Apify.", event.threadID, event.messageID);
    }
  },

  onReply: async ({ event, api, Reply }) => {
    try {
      const { results, author, isVideo } = Reply;
      if (event.senderID !== author) return;

      const choice = parseInt(event.body);
      if (isNaN(choice) || choice < 1 || choice > results.length)
        return api.sendMessage("❌ Enter valid number (1–6).", event.threadID, event.messageID);

      const video = results[choice - 1];
      const directUrl = video.downloadUrl || video.url;
      const fileName = isVideo ? "video.mp4" : "audio.mp3";

      api.setMessageReaction("🌷", event.messageID, () => {}, true);

      await downloadFile(directUrl, fileName);
      try { await api.unsendMessage(Reply.messageID); } catch (e) {}

      api.sendMessage(
        {
          body:
`╭───────────────❍
│ ${isVideo ? "🎬" : "🎧"} 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅 𝑺𝒖𝒄𝒄𝒆𝒔𝒔
├───────────────❍
│ ${isVideo ? "🎥" : "🎵"} ${video.title}
╰───────────────❍`,
          attachment: fs.createReadStream(fileName)
        },
        event.threadID,
        () => {
          try { fs.unlinkSync(fileName); } catch (e) {}
          api.setMessageReaction("🎀", event.messageID, () => {}, true);
        },
        event.messageID
      );

    } catch (err) {
      console.log("YTB REPLY ERROR:", err.message);
      api.sendMessage("❌ Download failed.", event.threadID, event.messageID);
    }
  }
};
