const axios = require("axios");
module.exports = {
    config: {
        name: "ownerinfo",
        aliases: ["admininfo", "owner", "shakil"],
        version: "3.9.0",
        role: 0,
        author: "Sahariya Islam Shakil",
        info: "Display chatbot owner personal profile and details with text first then photo",
        category: "Owner",
        guide: "{pn}",
        cooldown: 5
    },

    onStart: async function ({ api, event }) {
        const { threadID } = event;

        const msg = 
`╔══════════════════════════╗
║ 🫠    𝑶𝑾𝑵𝑬𝑹  𝑷𝑹𝑶𝑭𝑰𝑳𝑬    🫠 ║
╠══════════════════════════╣
║ 👑 Sahariya Islam Shakil
║ 📍 Rajshahi, BD | Single 🫠
║ 💻 Developer (JS / Python)
╠══════════════════════════╣
║ 💬 "No Bug, Just Features!"
╠══════════════════════════╣
║ 🔗 𝐂𝐎𝐍𝐓𝐀𝐂𝐓 & 𝐋𝐈𝐍𝐊𝐒:
║ • 📘 Facebook Profile:
║   https://facebook.com/profile.php?id=61583906470490
║
║ • 💻 GitHub Repository:
║   https://github.com/shakilonly1ok
║
║ • ✈️ Telegram: Loading...
╚══════════════════════════╝`;

        try {
            const imageUrl = "https://files.catbox.moe/tpsqu7.jpg";
            const response = await axios.get(imageUrl, { responseType: 'stream' });

            // ১. প্রথমে স্টাইলিশ টেক্সট ও ক্লিকেবল লিংক পাঠানো
            await api.sendMessage(msg, threadID);

            // ২. ঠিক তার পরেই নিচে ছবি পাঠানো
            return api.sendMessage({
                attachment: response.data
            }, threadID);

        } catch (error) {
            console.error("OwnerInfo Error:", error);
            return api.sendMessage(msg, threadID);
        }
    }
};
