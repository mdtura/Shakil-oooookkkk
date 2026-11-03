const fs = require('fs');
const path = require('path');

// টেক্সট ফাইল থেকে রেন্ডমলি লাইন রিড করার ফাংশন
function getRandomLineFromDatabase() {
  try {
    const filePath = path.join(__dirname, '../../database/gf_texts.txt');
    
    if (!fs.existsSync(filePath)) {
      return "আরে! database ফোল্ডারে gf_texts.txt ফাইলটি খুঁজে পাচ্ছি না! 😾";
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) return "ফাইল তো একদম খালি! কিছু ডায়লগ লিখে রাখো ভেতরে। 🥱";

    return lines[Math.floor(Math.random() * lines.length)];
  } catch (e) {
    return "কোথাও একটা গড়মিল হয়েছে! মাথা কাজ করছে না। 😵‍💫";
  }
}

module.exports = {
  config: {
    name: "gf", // <── কমান্ডের নাম এখানে "gf" করে দেওয়া হয়েছে
    version: "4.1.0",
    author: "Shakil",
    countDown: 3,
    role: 0,
    shortDescription: {
      en: "GF-BF chatting command with database text",
      bn: "ডাটাবেজ থেকে জিএফ-বিএফ স্টাইলে চ্যাট করার কমান্ড"
    },
    longDescription: {
      en: "Reads massive chat dialogues dynamically from a text file when using !gf command.",
      bn: "!gf কমান্ড দিলেই টেক্সট ফাইল থেকে রেন্ডমলি রোমান্টিক, ফানি ও ঝগড়ার ডায়লগ পাঠাবে।"
    },
    category: "fun",
    guide: {
      en: "{p}gf",
      bn: "{p}gf"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const randomText = getRandomLineFromDatabase();

    const responseLayout = 
`╔═══════════════════╗
   💖 **GF-BF CHAT MODE**
╚═══════════════════╝
 ➢ ${randomText}
 ═════════════════════
 💡 Reply to continue chatting! 🫠`;

    return message.reply(responseLayout, (err, info) => {
      if (!err) {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          author: event.senderID
        });
      }
    });
  },

  onReply: async function ({ api, event, message, Reply }) {
    const { body, senderID } = event;
    if (senderID !== Reply.author) return;

    // ইউজার রিপ্লাই দিলেও ফাইল থেকে রেন্ডমলি অন্য লাইন পিক করবে
    const randomReplyText = getRandomLineFromDatabase();

    const replyLayout = 
`╭─────────────╮
  💬 **CHATTING...**
╰─────────────╯
 ➢ ${randomReplyText}
──────────────`;

    return message.reply(replyLayout, (err, info) => {
      if (!err) {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          author: senderID
        });
      }
    });
  }
};
