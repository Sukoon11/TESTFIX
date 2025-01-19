const AppData = [
  { name: "DmWin-App", link: "https://www.dmwin1.com/#/register?invitationCode=", giftCode: "FREE100-DMW", description: "DmWin-App Color Prediction and Number Prediction Robot" },
  { name: "Tiranga", link: "https://tirangaclub.net/#/register?invitationCode=", giftCode: "FREE100-TIR", description: "Tiranga Color Prediction and Number Prediction Robot" }
];
// Add above new apps in array like format shown and you are ready to go

// this is a basic bot you can modify this to add advanced features or customizations


const enternt = answerHandler('enternt');
function generateAppMenu(actionPrefix) {
  return AppData.map(app => ({ text: app.name, callback_data: `${actionPrefix}_${app.name}` }));
}


async function handleColorPrediction(ctx, appName) {
    const app = AppData.find(a => a.name === appName);
    if (!app) return ctx.reply("App not found.");

    const period = await fetch1MinIssueNumber();
    if (!period) return ctx.reply("Failed to fetch the current period.");

    // Check if the result for this period already exists
    const existingResult = await db.operation.findOne('predictions', { appName, period, type: 'color' });

    let result;
    if (existingResult) {
        result = existingResult.result; // Use the stored result
    } else {
        result = Math.random() < 0.5 ? "RED🎈" : "GREEN🎈"; // Generate a new result

        // Store the result in the database
        await db.operation.insertOne('predictions', {
            appName,
            period,
            type: 'color',
            result,
            createdAt: new Date()
        });
    }

    await ctx.replyWithMarkdown(`🎲 Color Prediction for ${appName}\n\n🎯 Period: ${period}\n🎰 Result: ${result}\n\n🚀 Register here: ${app.link}`);
}

async function handleNumberPrediction(ctx, appName) {
    const app = AppData.find(a => a.name === appName);
    if (!app) return ctx.reply("App not found.");

    const period = await fetch1MinIssueNumber();
    if (!period) return ctx.reply("Failed to fetch the current period.");

    // Check if the result for this period already exists
    const existingResult = await db.operation.findOne('predictions', { appName, period, type: 'number' });

    let number, size;
    if (existingResult) {
        number = existingResult.result.number; // Use the stored result
        size = existingResult.result.size;
    } else {
        number = Math.floor(Math.random() * 10);
        size = number <= 4 ? "Small" : "Big";

        // Store the result in the database
        await db.operation.insertOne('predictions', {
            appName,
            period,
            type: 'number',
            result: { number, size },
            createdAt: new Date()
        });
    }

    await ctx.replyWithMarkdown(`🎲 Number Prediction for ${appName}\n\n🎯 Period: ${period}\n🎰 Result: ${number} (${size})\n\n🚀 Register here: ${app.link}`);
}


async function viewResults(ctx) {
  const results = await getColorPredictionResults();
  const latestResults = results.slice(0, 5);
  const inlineKeyboard = latestResults.map(r => {
    const period = r.issueNumber;
    const color = r.emoji;
    const size = r.number <= 4 ? "Small" : "Big";
    return [
      { text: `${period}`, callback_data: `period_${period}` },
      { text: `Result: ${color} (${size})`, callback_data: `result_${period}` }
    ];
  });
  await ctx.reply("🎰 *Last Five Results Are:*", {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
}

bot.action(/^color_prediction_(.+)$/, async (ctx) => {
  await handleColorPrediction(ctx, ctx.match[1]);
});

bot.action(/^number_prediction_(.+)$/, async (ctx) => {
  await handleNumberPrediction(ctx, ctx.match[1]);
});

bot.action(/^gift_code_(.+)$/, async (ctx) => {
  const app = AppData.find(a => a.name === ctx.match[1]);
  if (!app) return ctx.reply("App not found.");
  const giftCode = `${app.giftCode}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  await ctx.replyWithMarkdown(`🎁 *Your Gift Code for ${app.name}:*\n\n\`${app.giftCode}\`\n\nUse it in the app to redeem!`);
});

bot.action('view_results', async (ctx) => {
  await viewResults(ctx);
});

bot.action('level_funds', async (ctx) => {
  await ctx.replyWithMarkdown('*🎯 Enter Your Current Wallet Balance*', { reply_markup: { force_reply: true } });
  await ctx.scene.enter('enternt');
});

enternt.on('text', async (ctx) => {
  try {
    const userBalance = parseInt(ctx.message.text);
    const n = 5;
    let sum = 0; for (let i = 1; i <= n; i++) sum += i;
    let base = userBalance / sum, rem = userBalance, allocations = [];
    for (let i = 1; i <= n; i++) {
      let amt = Math.floor(base * i);
      if (i === n) amt = rem;
      allocations.push(amt);
      rem -= amt;
    }
    const keys = allocations.map((x,i)=>[
      { text: `🎯 Level ${i+1}`, callback_data: `level_${i+1}` },
      { text: `Rs. ${x}`, callback_data: `amount_${x}` }
    ]);
    keys.push([
      { text: `Total Funds Needed`, callback_data: `total_funds` },
      { text: `Rs. ${userBalance}`, callback_data: `total_amount` }
    ]);
    await ctx.replyWithMarkdown("*🎯 Level Funds Allocation:*", { reply_markup: { inline_keyboard: keys } });
    await ctx.scene.leave('enternt');
  } catch {
    await ctx.reply("Error processing request.");
  }
});

bot.action('support_center', async (ctx) => {
  await ctx.replyWithHTML('<b>💬 Support Center</b>\n\n@Support_Handle');
});

bot.command('start', async (ctx) => {
  const menu = [
    [{ text: '🎲 Color Predictions', callback_data: 'show_color_prediction' }, { text: '🔢 Number Predictions', callback_data: 'show_number_prediction' }],
    [{ text: '🎁 Gift Codes', callback_data: 'show_gift_code' }],
    [{ text: '🎰 View Results', callback_data: 'view_results' }],
    [{ text: '🎯 Level Fund Manager', callback_data: 'level_funds' }, { text: 'Support 💬', callback_data: 'support_center' }]
  ];
  await ctx.replyWithMarkdown('*🎉 Welcome to the App Prediction Bot!*\n\nSelect an option below:', {
    reply_markup: { inline_keyboard: menu }
  });
});

bot.action('show_color_prediction', async (ctx) => {
  const btns = generateAppMenu("color_prediction").map(a=>[{ text: a.text, callback_data: a.callback_data }]);
  btns.push([{ text: '🔙 Back', callback_data: 'back_to_main' }]);
  await ctx.editMessageText('*🎲 Select an App for Color Prediction:*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: btns } });
});

bot.action('show_number_prediction', async (ctx) => {
  const btns = generateAppMenu("number_prediction").map(a=>[{ text: a.text, callback_data: a.callback_data }]);
  btns.push([{ text: '🔙 Back', callback_data: 'back_to_main' }]);
  await ctx.editMessageText('*🔢 Select an App for Number Prediction:*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: btns } });
});

bot.action('show_gift_code', async (ctx) => {
  const btns = generateAppMenu("gift_code").map(a=>[{ text: a.text, callback_data: a.callback_data }]);
  btns.push([{ text: '🔙 Back', callback_data: 'back_to_main' }]);
  await ctx.editMessageText('*🎁 Select an App to Generate a Gift Code:*', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: btns } });
});

bot.action('back_to_main', async (ctx) => {
  const menu = [
    [{ text: '🎲 Color Predictions', callback_data: 'show_color_prediction' }, { text: '🔢 Number Predictions', callback_data: 'show_number_prediction' }],
    [{ text: '🎁 Gift Codes', callback_data: 'show_gift_code' }],
    [{ text: '🎰 View Results', callback_data: 'view_results' }],
    [{ text: '🎯 Level Fund Manager', callback_data: 'level_funds' }, { text: 'Support 💬', callback_data: 'support_center' }]
  ];
  await ctx.editMessageText('*🎉 Welcome to the App Prediction Bot!*\n\nSelect an option below:', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: menu }
  });
});