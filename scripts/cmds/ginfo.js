
module.exports = {
    config: {
        name: "groupinfo",
        aliases: ["ginfo", "gi"],
        version: "12.2.0",
        role: 0,
        author: "Sahariya Islam Shakil",
        info: "Display clean group info with wall style frame and accurate social links",
        category: "Group",
        guide: "{pn}",
        cooldown: 5
    },

    onStart: async function ({ api, event }) {
        const { threadID, senderID } = event;

        try {
            const threadInfo = await api.getThreadInfo(threadID);
            
            if (!threadInfo.isGroup) {
                return api.sendMessage("🐸 এই কমান্ডটি শুধুমাত্র গ্রুপ চ্যাটের জন্য প্রযোজ্য!", threadID, senderID);
            }

            const groupName = threadInfo.threadName || "Unknown Group 🐸";
            const threadId = threadInfo.threadID;
            const participantCount = threadInfo.participantIDs ? threadInfo.participantIDs.length : 0;
            const totalAdmins = threadInfo.adminIDs ? threadInfo.adminIDs.length : 0;
            const totalMessages = threadInfo.messageCount || "N/A";
            const isApproved = threadInfo.approvalMode ? "Locked 🔒" : "Open 🔓";

            let adminListText = "";
            if (threadInfo.adminIDs && threadInfo.adminIDs.length > 0) {
                let count = 1;
                for (let admin of threadInfo.adminIDs) {
                    try {
                        const adminId = typeof admin === 'object' ? admin.id : admin;
                        const userInfo = await api.getUserInfo(adminId);
                        const name = userInfo[adminId]?.name || "Unknown Admin";
                        adminListText += `║   🐸 ┃ ${count++}. ${name}\n`;
                    } catch (e) {
                        adminListText += `║   🐸 ┃ ${count++}. ID: ${typeof admin === 'object' ? admin.id : admin}\n`;
                    }
                }
            } else {
                adminListText = "║   🐸 ┃ কোনো অ্যাডমিন পাওয়া যায়নি।\n";
            }

            const msg = 
`╔══════════════════════════╗
║ 🟢 🍃  𝙂𝙍𝙊𝙐𝙋  𝙄𝙉𝙁𝙊  🍃 🟢 ║
╠══════════════════════════╣
║ 📌 Name     : ${groupName}
║ 🆔 Group ID : ${threadId}
║ 👥 Members  : ${participantCount}
║ 👑 Admins   : ${totalAdmins}
║ 💬 Messages : ${totalMessages}
║ 🛡️ Status   : ${isApproved}
╠══════════════════════════╣
║ 👑 𝙁𝙍𝙊𝙂 𝘼𝘿𝙈𝙄𝙉 𝙇𝙄𝙎𝙏:
${adminListText}
╠══════════════════════════╣
║ 🤖 𝙈𝙀𝙎𝙎𝙀𝙉𝙂𝙀𝙍 𝘾𝙃𝘼𝙏𝘽𝙊𝙏 𝙊𝙒𝙉𝙀𝙍:
║  🐸 Sahariya Islam Shakil 🐸
║ • 📘 Facebook : facebook.com/profile.php?id=61583906470490
║ • 💻 GitHub   : github.com/shakilonly1ok
║ • ✈️ Telegram : Loading...
╚══════════════════════════╝`;

            return api.sendMessage(msg, threadID);

        } catch (error) {
            console.error("GroupInfo Error:", error);
            return api.sendMessage("❌ গ্রুপের তথ্য আনতে সমস্যা হয়েছে।", threadID);
        }
    }
};
