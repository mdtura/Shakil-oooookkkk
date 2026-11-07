const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || "এখানে_টোকেন_বসান";
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "shakil123";
const PORT = process.env.PORT || 3000;
const OWNER = "shakil";

// ---------- ডেটা ----------
const DB_FILE = "./data.json";
let db = { users: {} };
try {
  if (fs.existsSync(DB_FILE)) {
    const l = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    if (l.users) db = l;
  }
} catch (e) {}
const saveDB = () => { try { fs.writeFileSync(DB_FILE, JSON.stringify(db)); } catch (e) {} };

const START_COINS = 1000, MIN_BET = 50, DAILY_MIN = 200, DAILY_MAX = 300, COOLDOWN_MS = 2000;
const fmt = (n) => Number(n).toLocaleString("en-IN");
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const bnToEn = (s) => s.replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));

function getUser(uid) {
  if (!db.users[uid]) db.users[uid] = { name: "", coins: START_COINS, lastDaily: 0, played: 0, wins: 0, losses: 0, biggestWin: 0 };
  return db.users[uid];
}
async function fetchName(uid) {
  const u = getUser(uid);
  if (u.name) return;
  try {
    const r = await axios.get(`https://graph.facebook.com/v21.0/${uid}`, { params: { fields: "first_name,name", access_token: PAGE_ACCESS_TOKEN } });
    u.name = r.data.first_name || r.data.name || "";
    saveDB();
  } catch (e) {}
}
const label = (u, uid) => u.name || `ইউজার ${uid.slice(-4)}`;

// ---------- হার-জিত (৯০% হার, ১০% জয়) ----------
const OUTCOMES = [
  { mult: 0,   weight: 9000, label: "😭 হেরে গেলেন!" },
  { mult: 2,   weight: 500,  label: "👍 জিতলেন! (২x)" },
  { mult: 3,   weight: 300,  label: "💰 ভালো জয়! (৩x)" },
  { mult: 5,   weight: 140,  label: "🤑 বড় জয়! (৫x)" },
  { mult: 10,  weight: 50,   label: "🔥 মেগা জয়! (১০x)" },
  { mult: 100, weight: 10,   label: "🚀👑 মহা জ্যাকপট!!! (১০০x)" },
];
function roll() {
  const total = OUTCOMES.reduce((s, o) => s + o.weight, 0);
  let r = Math.random() * total;
  for (const o of OUTCOMES) { if (r < o.weight) return o; r -= o.weight; }
  return OUTCOMES[0];
}

function parseBet(u, arg) {
  if (u.coins < MIN_BET) return { err: `😅 কয়েন শেষ! ব্যালেন্স: ${fmt(u.coins)}\n"daily" লিখে ফ্রি কয়েন নিন।` };
  if (!arg) return { bet: MIN_BET };
  const a = bnToEn(arg.toLowerCase());
  const bet = a === "all" ? u.coins : parseInt(a.replace(/,/g, ""), 10);
  if (!Number.isFinite(bet) || bet < MIN_BET) return { err: `⚠️ সর্বনিম্ন বেট ${MIN_BET} কয়েন।\nউদাহরণ: spin 500` };
  if (bet > u.coins) return { err: `⚠️ আপনার কাছে মাত্র ${fmt(u.coins)} কয়েন আছে।` };
  return { bet };
}

function applyResult(u, bet, o) {
  const win = bet * o.mult;
  u.coins = u.coins - bet + win;
  u.played++;
  if (o.mult > 0) { u.wins++; if (win - bet > u.biggestWin) u.biggestWin = win - bet; }
  else u.losses++;
  saveDB();
}

function summary(u, uid, bet, o) {
  const win = bet * o.mult, net = win - bet;
  const line = o.mult === 0 ? `❌ হারলেন: -${fmt(bet)} কয়েন` : `✅ জিতলেন: +${fmt(net)} কয়েন লাভ (পেলেন ${fmt(win)})`;
  const big = o.mult >= 10 ? "\n🎉🎉🎉 অভিনন্দন! ভাগ্য আপনার সাথে! 🎉🎉🎉" : "";
  return `${o.label}\n${line}${big}\n\n👤 ${label(u, uid)}\n💰 আপনার ব্যালেন্স: ${fmt(u.coins)} কয়েন`;
}

const balance = (u, uid) => `👤 ${label(u, uid)}\n💰 আপনার ব্যালেন্স: ${fmt(u.coins)} কয়েন`;

function stats(u, uid) {
  const rate = u.played ? ((u.wins / u.played) * 100).toFixed(1) : "0";
  return `📊 ${label(u, uid)}-এর হিসাব\n\n💰 ব্যালেন্স: ${fmt(u.coins)}\n🎮 মোট খেলা: ${u.played}\n✅ জিতেছেন: ${u.wins}\n❌ হেরেছেন: ${u.losses}\n📈 জেতার হার: ${rate}%\n🏅 সবচেয়ে বড় লাভ: ${fmt(u.biggestWin)} কয়েন`;
}

function daily(u) {
  const left = 86400000 - (Date.now() - u.lastDaily);
  if (left > 0) {
    const h = Math.floor(left / 3600000), m = Math.ceil((left % 3600000) / 60000);
    return `⏳ আজকের ফ্রি কয়েন নেওয়া হয়ে গেছে!\nআবার পাবেন ${h} ঘণ্টা ${m} মিনিট পর।\n\n💰 ব্যালেন্স: ${fmt(u.coins)}`;
  }
  const amount = randInt(DAILY_MIN, DAILY_MAX);
  u.lastDaily = Date.now();
  u.coins += amount;
  saveDB();
  return `🎁 ডেইলি বোনাস: +${amount} কয়েন!\n💰 আপনার ব্যালেন্স: ${fmt(u.coins)} কয়েন`;
}

function spin(u, uid, arg) {
  const p = parseBet(u, arg);
  if (p.err) return p.err;
  const o = roll();
  applyResult(u, p.bet, o);
  return `🎡 হুইল ঘুরছে... 🌀 (বেট: ${fmt(p.bet)})\n\n` + summary(u, uid, p.bet, o);
}

const SYMBOLS = ["🍒", "🍋", "🍇", "⭐", "💎", "7️⃣"];
const TRIPLE = { 3: "🍇", 5: "⭐", 10: "💎", 100: "7️⃣" };
function slotReels(mult) {
  const sh = [...SYMBOLS].sort(() => Math.random() - 0.5);
  if (mult === 0) return sh.slice(0, 3);
  if (mult === 2) { const [a, b] = sh; return [a, a, b].sort(() => Math.random() - 0.5); }
  const s = TRIPLE[mult];
  return [s, s, s];
}
function slot(u, uid, arg) {
  const p = parseBet(u, arg);
  if (p.err) return p.err;
  const o = roll();
  applyResult(u, p.bet, o);
  return `🎰 ${slotReels(o.mult).join(" | ")}  (বেট: ${fmt(p.bet)})\n\n` + summary(u, uid, p.bet, o);
}

function leaderboard() {
  const top = Object.entries(db.users).sort((a, b) => b[1].coins - a[1].coins).slice(0, 5);
  if (!top.length) return "এখনো কেউ খেলেনি!";
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  return "🏆 লিডারবোর্ড\n" + top.map(([id, u], i) => `${medals[i]} ${label(u, id)}: ${fmt(u.coins)} কয়েন`).join("\n");
}

function help() {
  return `🎮 গেম বট | অ্যাডমিন: ${OWNER}\n\nspin / spin 1000 - লাকি হুইল\nslot / slot 500 - স্লট\nspin all - সব কয়েন বেট 😎\ndaily - ফ্রি ${DAILY_MIN}-${DAILY_MAX} কয়েন\nbalance - ব্যালেন্স\nstats - জয়-হারের হিসাব\nleaderboard - সেরা ৫ জন\n\n🎯 জেতার চান্স ১০%, ভাগ্য চাই!\n⚠️ কয়েন শুধু মজার জন্য, আসল টাকা নয়।`;
}

// ---------- কমান্ড ----------
const lastUse = {};
const BAL = ["balance", "bal", "coins", "coin", "ব্যালেন্স", "কয়েন"];

function handleCommand(uid, text) {
  const u = getUser(uid);
  const parts = text.trim().split(/\s+/);
  const cmd = parts[0].replace(/^\/+/, "").toLowerCase();
  const arg = parts[1] ? parts[1].toLowerCase() : undefined;

  if ((cmd === "slot" || cmd === "spin") && arg && BAL.includes(arg)) return balance(u, uid);

  if (["spin", "slot", "daily"].includes(cmd)) {
    if (Date.now() - (lastUse[uid] || 0) < COOLDOWN_MS) return "⏱️ একটু ধীরে! ২ সেকেন্ড পর আবার চেষ্টা করুন।";
    lastUse[uid] = Date.now();
  }
  if (BAL.includes(cmd)) return balance(u, uid);

  switch (cmd) {
    case "spin": return spin(u, uid, arg);
    case "slot": return slot(u, uid, arg);
    case "daily": return daily(u);
    case "stats": case "me": case "profile": return stats(u, uid);
    case "leaderboard": case "top": return leaderboard();
    case "owner": return `👑 বটের অ্যাডমিন: ${OWNER}`;
    case "help": case "hi": case "hello": case "start": return help();
    default: return "কমান্ড বুঝিনি 😅\n\n" + help();
  }
}

// ---------- মেসেজ পাঠানো ----------
async function sendMessage(psid, text) {
  try {
    await axios.post("https://graph.facebook.com/v21.0/me/messages",
      { recipient: { id: psid }, message: { text } },
      { params: { access_token: PAGE_ACCESS_TOKEN } });
  } catch (e) { console.error("মেসেজ পাঠানো যায়নি:", e.response?.data || e.message); }
}

// ---------- ওয়েবহুক ----------
app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === VERIFY_TOKEN)
    return res.status(200).send(req.query["hub.challenge"]);
  res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
  if (req.body.object !== "page") return res.sendStatus(404);
  res.status(200).send("EVENT_RECEIVED");
  for (const entry of req.body.entry || []) {
    for (const ev of entry.messaging || []) {
      if (ev.message && ev.message.text && !ev.message.is_echo) {
        const uid = ev.sender.id;
        sendMessage(uid, handleCommand(uid, ev.message.text));
        fetchName(uid);
      }
    }
  }
});

app.get("/", (req, res) => res.send("Bot is running ✅"));
app.listen(PORT, () => console.log(`Bot চলছে পোর্ট ${PORT}-এ`));
