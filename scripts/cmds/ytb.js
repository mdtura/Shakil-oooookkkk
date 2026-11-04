const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: "yt",
    version: "2.0.0",
    hasPermission: 0,
    credits: "Shakil",
    description: "Search and download YouTube videos using Apify API with full error handling",
    commandCategory: "media",
    usages: "[video title / search query]",
    cooldowns: 5
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const query = args.join(" ");

    if (!query) {
      return api.sendMessage("❌ অনুগ্রহ করে কোনো ইউটিউব ভিডিওর নাম লিখুন!\nউদাহরণ: .yt shape of you", threadID, messageID);
    }

    // তোমার Apify API Token
    const APIFY_TOKEN = process.env.APIFY_TOKEN || "Apify_api_Dywvd3IDunzJKjfKuPIBELrvxP3YQZ0cqWHy";

    const waitMsg = await api.sendMessage(`🔍 "${query}" খোঁজা হচ্ছে এবং প্রসেস করা হচ্ছে, একটু অপেক্ষা করুন...`, threadID);

    try {
      // Step 1: Apify YouTube Scraper Actor কল করা
      const actorRunResponse = await axios.post(
        `https://api.apify.com/v2/acts/stream-scraper~youtube-scraper/runs?token=${APIFY_TOKEN}`,
        {
          searchKeywords: query,
          maxResults: 1
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const datasetId = actorRunResponse.data?.data?.defaultDatasetId;

      if (!datasetId) {
        throw new Error("Apify actor run শুরু করতে ব্যর্থ হয়েছে।");
      }

      // Step 2: ডেটা প্রসেস হওয়ার জন্য কয়েক সেকেন্ড অপেক্ষা (Polling)
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Step 3: ডেটাসেট থেকে রেজल्ट ফেচ করা
      const datasetResponse = await axios.get(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
      );

      const videoData = datasetResponse.data?.[0];

      if (!videoData || (!videoData.url && !videoData.webpageUrl)) {
        api.unsendMessage(waitMsg.messageID);
        return api.sendMessage("❌ এই নামের কোনো ভিডিও পাওয়া যায়নি!", threadID, messageID);
      }

      const videoUrl = videoData.url || videoData.webpageUrl;
      const title = videoData.title || query;
      const downloadUrl = videoData.downloadUrl || videoData.formats?.[0]?.url;

      // পুরনো ওয়েটিং মেসেজ রিমুভ করা
      try { await api.unsendMessage(waitMsg.messageID); } catch (e) {}

      // Step 4: যদি সরাসরি ডাউনলোডেবল লিংক পাওয়া যায়, তবে ক্যাশ ফোল্ডারে সেভ করে পাঠানো
      if (downloadUrl) {
        const cacheDir = path.join(__dirname, 'cache');
        await fs.ensureDir(cacheDir);
        const cachePath = path.join(cacheDir, `${Date.now()}_yt.mp4`);

        const videoStream = await axios({
          method: 'get',
          url: downloadUrl,
          responseType: 'stream',
          timeout: 30000
        });

        const writer = fs.createWriteStream(cachePath);
        videoStream.data.pipe(writer);

        return new Promise((resolve, reject) => {
          writer.on('finish', async () => {
            // ফাইলের সাইজ চেক করা (মেসেঞ্জার লিমিটের জন্য, যেমন ২৫ এমবির বেশি হলে শুধু লিংক পাঠাবে)
            const stats = await fs.stat(cachePath);
            const fileSizeInMB = stats.size / (1024 * 1024);

            if (fileSizeInMB > 45) {
              fs.unlinkSync(cachePath);
              return api.sendMessage(
                `🎬 **শিরোনাম:** ${title}\n🔗 **ভিডিও লিংক:** ${videoUrl}\n\n⚠️ ভিডিওর সাইজ অনেক বড় (${fileSizeInMB.toFixed(1)}MB) হওয়ায় সরাসরি পাঠানো সম্ভব হলো না, লিংক দেওয়া হলো।`,
                threadID,
                messageID
              );
            }

            await api.sendMessage({
              body: `🎬 **${title}**\n\n✅ সফলভাবে ডাউনলোড করা হয়েছে!`,
              attachment: fs.createReadStream(cachePath)
            }, threadID, () => {
              try { fs.unlinkSync(cachePath); } catch (err) {}
            }, messageID);
            
            resolve();
          });

          writer.on('error', (err) => {
            try { fs.unlinkSync(cachePath); } catch (e) {}
            reject(err);
          });
        });

      } else {
        // ডিরেক্ট স্ট্রিম লিংক না থাকলে ইনফো ও ভিডিও লিংক সেন্ড করবে
        return api.sendMessage(
          `🎬 **শিরোনাম:** ${title}\n🔗 **ভিডিও লিংক:** ${videoUrl}\n\n💡 *Apify থেকে সফলভাবে সার্চ সম্পন্ন হয়েছে!*`,
          threadID,
          messageID
        );
      }

    } catch (error) {
      console.error("YT Command Error:", error);
      try { await api.unsendMessage(waitMsg.messageID); } catch (e) {}
      return api.sendMessage(`❌ ভিডিও প্রসেস করতে সমস্যা হয়েছে: ${error.message || "Unknown error"}`, threadID, messageID);
    }
  }
};
