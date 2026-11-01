const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const app = express().use(bodyParser.json());
const PORT = process.env.PORT || 3000;

// Public folder configuration
app.use('/static', express.static(path.join(__dirname, 'public')));
if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public');
}

// Credentials (Apnar Token gulo ekhane ba Environment Variables-e set korun)
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || "YOUR_PAGE_ACCESS_TOKEN";
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "YOUR_VERIFY_TOKEN";
const SERVER_URL = process.env.SERVER_URL || "https://your-domain.com"; // Apnar Ngrok ba Server URL

// 1. Webhook Verification (GET)
app.get('/webhook', (req, res) => {
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 2. Webhook Event Receiver (POST)
app.post('/webhook', (req, res) => {
  let body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(entry => {
      let webhookEvent = entry.messaging[0];
      let senderPsid = webhookEvent.sender.id;

      if (webhookEvent.message) {
        handleMessage(senderPsid, webhookEvent.message);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// 3. Message Handler Logic
async function handleMessage(senderPsid, receivedMessage) {
  if (!receivedMessage.text) return;

  let messageText = receivedMessage.text.trim().toLowerCase();

  // Jodi message "!fakenews" diye shuru hoy
  if (messageText.startsWith('!fakenews')) {
    let targetPsid = senderPsid; // Default: message data sender

    // Jodi keu kono message-e reply diye command dey, tahole tar profile pic/name target hobe
    if (receivedMessage.reply_to && receivedMessage.reply_to.sender) {
      targetPsid = receivedMessage.reply_to.sender.id;
    }

    try {
      // Step A: Target user-er profile info fetch kora Facebook Graph API theke
      const userProfile = await getUserProfile(targetPsid);
      
      // Step B: Canvas diye template er upore profile picture o name adjust kora
      const imageFileName = await generateMemeImage(userProfile.name, userProfile.profile_pic);
      const imageUrl = `${SERVER_URL}/static/${imageFileName}`;

      // Step C: Messenger-e image attachment pathano
      const response = {
        "attachment": {
          "type": "image",
          "payload": {
            "url": imageUrl,
            "is_reusable": true
          }
        }
      };

      callSendAPI(senderPsid, response);
    } catch (error) {
      console.error("Meme generation error:", error);
      callSendAPI(senderPsid, { "text": "❌ Fake news image generate korte somoshsha hoyeche!" });
    }
  }
}

// 4. Fetch User Profile from Facebook Graph API
async function getUserProfile(psid) {
  try {
    const url = `https://graph.facebook.com/v18.0/${psid}?fields=first_name,last_name,profile_pic&access_token=${PAGE_ACCESS_TOKEN}`;
    const res = await axios.get(url);
    return {
      name: `${res.data.first_name} ${res.data.last_name}`,
      profile_pic: res.data.profile_pic
    };
  } catch (err) {
    console.error("Profile fetch error:", err.message);
    return {
      name: "Unknown Suspect",
      profile_pic: "https://via.placeholder.com/150"
    };
  }
}

// 5. Canvas Dynamic Image Processing
async function generateMemeImage(userName, profilePicUrl) {
  const templatePath = path.join(__dirname, 'public', 'template.jpg');
  
  let baseImage;
  try {
    baseImage = await loadImage(templatePath);
  } catch (e) {
    // Fallback jodi template.jpg na thake
    const canvas = createCanvas(800, 450);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 800, 450);
    baseImage = await loadImage(canvas.toDataURL());
  }

  const canvas = createCanvas(baseImage.width, baseImage.height);
  const ctx = canvas.getContext('2d');

  // Draw Base Template
  ctx.drawImage(baseImage, 0, 0);

  // Draw Target User Profile Picture (X, Y, Width, Height apnar template onujayi adjust kore neben)
  try {
    const userImg = await loadImage(profilePicUrl);
    ctx.save();
    ctx.beginPath();
    ctx.rect(50, 120, 200, 200); // Profile pic box coordinates
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(userImg, 50, 120, 200, 200);
    ctx.restore();

    // Border Frame for Profile Pic
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 4;
    ctx.strokeRect(50, 120, 200, 200);
  } catch (err) {
    console.log("Profile image drawing failed:", err.message);
  }

  // Draw Dynamic Text & Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`Name: ${userName}`, 280, 180);

  ctx.fillStyle = '#F59E0B';
  ctx.font = '22px sans-serif';
  ctx.fillText('Crime: Bot er maje faizlami kora!', 280, 230);

  // Save Generated Image Locally
  const fileName = `meme_${Date.now()}.png`;
  const filePath = path.join(__dirname, 'public', fileName);
  const out = fs.createWriteStream(filePath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);

  return new Promise((resolve) => {
    out.on('finish', () => resolve(fileName));
  });
}

// 6. Send API to Messenger
function callSendAPI(senderPsid, response) {
  let requestBody = {
    "recipient": { "id": senderPsid },
    "message": response
  };

  axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, requestBody)
    .then(() => console.log('Fake news meme sent successfully!'))
    .catch(err => console.error('Send API Error:', err.response ? err.response.data : err.message));
}

// Start Server
app.listen(PORT, () => console.log(`Bot server is running on port ${PORT}`));
