require('dotenv').config();
const cron = require('node-cron');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_IDS = process.env.CHAT_IDS
  ? process.env.CHAT_IDS.split(',').map(id => id.trim()).filter(Boolean)
  : [];
const TIMEZONE = process.env.TIMEZONE || 'Europe/London';

if (!TELEGRAM_TOKEN || CHAT_IDS.length === 0) {
  console.error('❌ Please set TELEGRAM_TOKEN and CHAT_ID in .env');
  process.exit(1);
}

console.log(`📡 Bot will send reminders to ${CHAT_IDS.length} chat(s): ${CHAT_IDS.join(', ')}`);

// ==============================================
//  EDIT YOUR TIME SLOTS + MESSAGE POOLS HERE
// ==============================================

const waterSlots = [
  {
    start: '07:45',
    end: '10:30',
    messages: [
      '🌞 Good morning. Drink water before your bloodstream turns into iced coffee.',
      '💧 Rise and hydrate, sexy. Your kidneys are fighting for their lives.',
      '☀️ You can’t survive on caffeine, delusion, and my attention alone.',
      '💦 Drink water before your body screenshots this abuse for evidence.',
      '❤️ Hydrate first. Looking cute during organ failure is not a flex.',
      '🌅 Morning reminder: your lips are drier than my texting style. Drink some water.'
    ]
  },
  {
    start: '11:30',
    end: '13:30',
    messages: [
      '🍎 Lunch time. Eat something and drink water before you become medically interesting.',
      '💧 Midday hydration check because apparently self-preservation isn’t your thing.',
      '☀️ Drink water, babe. Your headaches are getting too confident.',
      '💦 Quick reminder: surviving purely out of spite still requires hydration.',
      '❤️ Your body called. It said “please… just one glass.”',
      '🌿 Hydrate yourself before your organs start a group protest.'
    ]
  },
  {
    start: '14:30',
    end: '16:30',
    messages: [
      '💧 Afternoon reminder: dehydration is not the personality trait you think it is.',
      '💦 Water , water everywhere and not a drop for Priya(s) kidneys.',
      '💦 Drink water before your brain starts buffering in real life.',
      '✨ You’re cute, but not “hospital visit from lack of water” cute.',
      '❤️ Hydrate right now or I’ll start flirting with someone who values electrolytes.',
      '🌞 Your body is currently running on stress, caffeine, and unresolved issues. Add water.'
    ]
  },
  {
    start: '18:00',
    end: '20:30',
    messages: [
      '🌙 Evening hydration check before you spend 4 hours rotting peacefully online.',
      '💧 One more glass of water so your organs don’t unfollow you overnight.',
      '❤️ Drink water, gorgeous. We’re aiming for “thriving,” not “surviving somehow.”',
      '💦 Hydrate before dinner and stop acting like Diet coke fixes everything.',
      '🌿 Your body deserves water after carrying your attractive dumbass all day.',
      '✨ Fun fact: water improves mood, skin, and your chances of not becoming dust.'
    ]
  },
  {
    start: '21:00',
    end: '22:30',
    messages: [
      '🌙 Late-night reminder: drink water before you enter corpse mode for 8 hours.',
      '💧 Hydrate before bed so tomorrow-you suffer slightly less.',
      '❤️ Goodnight, you dehydrated little disaster. Go drink water.',
      '💦 One glass of water won’t kill you. Probably.',
      '🔥 Imagine being hydrated & hot. You’re halfway there already.',
      '😍 🌿 Go sip some water, you beautiful disaster.',
      '💧 Drink water. Being cute won’t save you forever.'
    ]
  }
];

const medicineSlot = {
  start: '17:00',
  end: '19:30',
  messages: [
    '💊 Take your supplements before your immune system submits its resignation letter.',
    '❤️ Reminder: vitamins only work if they actually enter your body, babe.',
    '💀 Your supplements are sitting there feeling ignored… kinda like me.',
    '✨ Take your pills, hot stuff. We’re trying to maintain “alive and attractive.”',
    '💊 Your body is running on caffeine and unresolved trauma. Add nutrients.',
    '🌿 Go take your supplements before your organs start gossiping about you.',
    '☀️ Friendly reminder that “I forgot” is not a medically approved wellness plan.',
    '💦 Take your vitamins, you adorable little health hazard.',
    '💀 If you skip your supplements again, your body might actually factory reset.',
    '❤️ Take your supplements so you can continue being pretty AND operational.']
};

// ==============================================
//  HELPER FUNCTIONS
// ==============================================
function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getRandomTimeInSlot(startStr, endStr) {
  const start = parseTimeToMinutes(startStr);
  const end = parseTimeToMinutes(endStr);
  const randomMin = Math.floor(Math.random() * (end - start + 1)) + start;
  const h = Math.floor(randomMin / 60);
  const m = randomMin % 60;
  return { hour: h, minute: m, timeStr: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}` };
}

function getRandomMessage(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ==================== SENDER ====================
async function sendTelegramMessage(text) {
  for (const chatId of CHAT_IDS) {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
      });

      if (res.ok) {
        console.log(`📤 Sent to ${chatId} | ${new Date().toLocaleTimeString()}`);
      } else {
        console.error(`❌ HTTP ${res.status} to ${chatId}`);
      }
    } catch (e) {
      console.error(`❌ Send error:`, e.message);
    }
  }
}

// ==================== DAILY SCHEDULER ====================
function scheduleTodaysReminders() {
  console.log(`\n🗓️ [${new Date().toLocaleString()}] Planning today's random reminders...`);

  // Water reminders
  waterSlots.forEach((slot, i) => {
    const { hour, minute, timeStr } = getRandomTimeInSlot(slot.start, slot.end);
    const message = "💧 WATER :  " + getRandomMessage(slot.messages);

    const cronExpr = `${minute} ${hour} * * *`;

    cron.schedule(cronExpr, () => {
      sendTelegramMessage(message);
    }, {
      timezone: TIMEZONE,
      name: `water-${i}`
    });

    console.log(`${timeStr} → W: ${message}`);
  });

  // Medicine reminder
  const { hour: medHour, minute: medMinute, timeStr: medTime } = getRandomTimeInSlot(medicineSlot.start, medicineSlot.end);
  const medMessage = "💊 MEDICINE :  " + getRandomMessage(medicineSlot.messages);

  cron.schedule(`${medMinute} ${medHour} * * *`, () => {
    sendTelegramMessage(medMessage);
  }, {
    timezone: TIMEZONE,
    name: `medicine`
  });

  console.log(`${medTime} → M: ${medMessage}`);
}

// ==================== RUN EVERY DAY ====================
cron.schedule('0 0 * * *', scheduleTodaysReminders, { timezone: TIMEZONE });

// Initial run
console.log('🚀 Random Reminder Bot Started (using node-cron only)');

if (process.argv[2] === 'test') {
  sendTelegramMessage('🧪 TEST message — bot is working with node-cron!');
} else {
  scheduleTodaysReminders();
  // sendTelegramMessage('✅ Bot is live! Random reminders scheduled for today.');
}