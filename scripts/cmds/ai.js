const axios = require('axios');

module.exports = {
    config: {
        name: "ai",
        version: "1.0.0",
        author: "Shakil",
        countDown: 5,
        role: 0,
        shortDescription: {
            bn: "AI-er sathey chat korar command"
        },
        longDescription: {
            bn: "Messenger bot theke direct AI-er sathey kotha bolar jonno."
        },
        category: "AI",
        guide: {
            bn: "{pn} [tomar message]"
        }
    },

    onStart: async function({ api, event, args }) {
        const { threadID, messageID } = event;
        const prompt = args.join(" ");

        if (!prompt) {
            return api.sendMessage("Kichu toh likhte hobe vai! \nExample: /ai kemon aso?", threadID, messageID);
        }

        api.sendMessage("Bhabchi... 🧠", threadID, async (err, info) => {
            try {
                const apiKey = "AQ.Ab8RN6ICqc0EFXulVImitO8MV0sYSRDnAjSGptjPfl16W4ca6w"; 
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

                const response = await axios.post(url, {
                    system_instruction: {
                        parts: [{ text: "Tumi amar best friend Shakil-er bot. Amake tui-kari kore banglay informal ar friendly bhabe reply debe." }]
                    },
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                });

                const candidate = response.data.candidates?.[0];
                const reply = candidate?.content?.parts?.[0]?.text || "Kono উত্তর paoa jayni!";

                api.editMessage(reply, info.messageID);

            } catch (error) {
                console.error("AI Error:", error.response?.data || error.message);
                api.editMessage("Dhur! Kothao ekta ghotola haye geche, API key ba network check koro.", info.messageID);
            }
        });
    }
};
