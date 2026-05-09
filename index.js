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
      '🌅 Morning reminder: your cells are drier than my texting style.'
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
      '☕ Another coffee? Your kidneys just fell to their knees dramatically.',
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
      '💦 Hydrate before dinner and stop acting like garlic bread fixes everything.',
      '🌿 Your body deserves water after carrying your attractive dumbass all day.',
      '✨ Fun fact: water improves mood, skin, and your chances of not becoming dust.'
    ]
  },
  {
    start: '21:00',
    end: '22:30',
    messages: [
      '🌙 Late-night reminder: drink water before you enter corpse mode for 8 hours.',
      '💧 Hydrate before bed so tomorrow-you suffers slightly less.',
      '❤️ Goodnight, you dehydrated little disaster. Go drink water.',
      '💦 One last sip before your body files a complaint against you.',
      '🌿 Imagine being hydrated AND hot. You’re halfway there already.',
      '✨ Sleep well. Try not to wake up feeling like expired beef jerky.'
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
  const startMin = parseTimeToMinutes(startStr);
  const endMin = parseTimeToMinutes(endStr);
  const randomMin = Math.floor(Math.random() * (endMin - startMin + 1)) + startMin;
  const hour = Math.floor(randomMin / 60);
  const minute = randomMin % 60;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function getRandomMessage(messagesArray) {
  return messagesArray[Math.floor(Math.random() * messagesArray.length)];
}

function scheduleReminderAt(timeStr, message) {
  const now = new Date();
  const [hour, minute] = timeStr.split(':').map(Number);
  let target = new Date(now);
  target.setHours(hour, minute, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const delayMs = target.getTime() - now.getTime();

  setTimeout(() => sendTelegramMessage(message), delayMs);
  console.log(`✅ Scheduled: ${timeStr} → ${message.substring(0, 50)}...`);
}

// ====================== TEST FUNCTION ======================
async function sendTestMessage() {
  const testMsg = '🧪 This is a TEST message from your reminder bot!\n\nRandom surprise mode is active ✅';
  await sendTelegramMessage(testMsg);
}

// Main send function
async function sendTelegramMessage(text) {
  for (const chatId of CHAT_IDS) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status} for chat ${chatId}`);
      console.log(`📤 Message sent to ${chatId} at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error(`❌ Failed to send to ${chatId}:`, error.message);
    }
  }
}

// ==============================================
//  DAILY PLANNER
// ==============================================

function runDailyPlanner() {
  console.log('🗓️ Running daily random reminder planner...');

  // Water reminders with random message from pool
  waterSlots.forEach(slot => {
    const randomTime = getRandomTimeInSlot(slot.start, slot.end);
    const randomMessage = getRandomMessage(slot.messages);
    scheduleReminderAt(randomTime, randomMessage);
  });

  // Medicine (single random message)
  const medRandomTime = getRandomTimeInSlot(medicineSlot.start, medicineSlot.end);
  const medRandomMessage = getRandomMessage(medicineSlot.messages);
  scheduleReminderAt(medRandomTime, medRandomMessage);
}

// Schedule planner at midnight
cron.schedule('0 0 * * *', runDailyPlanner, { timezone: TIMEZONE });

// ==============================================
//  STARTUP
// ==============================================

console.log('🚀 Random-reminder bot started on Laptop!');

if (process.argv[2] === 'test') {
  console.log('🧪 Test mode activated...');
  sendTestMessage();
} else {
  runDailyPlanner();
  sendTelegramMessage('✅ Woho!! Get ready for your daily reminders.');
}