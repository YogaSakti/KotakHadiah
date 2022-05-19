/* eslint-disable max-lines */
/* eslint-disable camelcase */
/* eslint-disable no-prototype-builtins */
/* eslint-disable sort-vars */
/* eslint-disable no-return-assign */
/* eslint-disable no-sequences */
/* eslint-disable no-loop-func */
/* eslint-disable no-continue */
require('dotenv').config()
const fetch = require('node-fetch');
const log = require('log-beautify');
const Table = require('cli-table3');
const TelegramBot = require('node-telegram-bot-api');
const JSONdb = require('simple-json-db');

log.useSymbols = true
log.useLabels = true

let botToken = process.env.BOTTOKEN, 
    channelID = process.env.CHANNELID, 
    clientAuth = process.env.CLIENTAUTH;

const bot = new TelegramBot(botToken);
const giftbox = new JSONdb('storage.json');

const headers = {
    Accept: 'application/json',
    Client: clientAuth,
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; M2012K11AC Build/SKQ1.211006.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/98.0.4758.87 Mobile Safari/537.36'
};

const BaseApi = Buffer.from('aHR0cHM6Ly9zLmlzYWZlcGFsLmNvbS9zYXBpL3YxL2dpZnRib3g=', 'base64').toString('ascii');

(async () => {

    const event = await fetch(`${BaseApi}/lists`, { method: 'GET', headers }).then((res) => res.json())

    const eventLists = event.data
    const liveEvents = eventLists.find((data) => data.title == 'Coming Soon' || data.title == 'Ongoing Event(s)')
    // const liveEvents = eventLists.find((data) => data.title == 'Coming Soon')
    if (!liveEvents) return log.error('No Event!');

    const eventData = liveEvents.data.reverse()
    for (let index = 0; index < eventData.length; index++) {
        const data = eventData[index];

        let { name, title, banner, start_time, end_time, challenge } = data
        let start = new Date(start_time * 1e3)
        let end = new Date(end_time * 1e3)
        log.info(`New Event: ${title} has ${challenge}, start at ${start.toLocaleDateString()} ${start.toLocaleTimeString()} until ${end.toLocaleDateString()} ${end.toLocaleTimeString()}`);


        let task_name = `${name}_question`,
            questions = [],
            quest = []

        for (let i = 0; i < 10; i++) {
            await fetch(`${BaseApi}/question?task_name=${task_name}&activity_name=${name}`, { method: 'GET', headers })
            .then((res) => res.json())
            .then((result) => result.data.question.map((y) => questions.push(y)))
            .catch((err) => log.error(err));
        }

        quest = Object.values(questions.reduce((a, c) => (a[`${c.topic}`] = c, a), {}));
        const qnaTable = new Table({ head: ['No', 'Label', `Question and Answers ${title}`] });
        quest.map((x, i) => qnaTable.push([{ rowSpan: 2, content: i + 1, vAlign: 'center' }, 'Question', x.topic.trim()], ['Answer  ', x.options[x.answer].trim()]))

        log.show(qnaTable.toString());

        const isGiftboxExist = giftbox.has(title) 
        if (isGiftboxExist) return log.warning(`QnA ${title} already exist and posted`)
    
        // post telegram
        let text = quest.map((x) => `Question:<u>${x.topic.trim()}</u>\nAnswer: <b>${x.options[x.answer]}</b>\n\n`)
        text = text.toString().replaceAll(',Question:', '').replace('Question:', '')
        const text_final = `<b>Question and Answers <i>${title}</i></b>\n\n${text}`
        await bot.sendPhoto(channelID, banner)
        const sendMessage = await bot.sendMessage(channelID, text_final, { protect_content: true, parse_mode: 'HTML' })
        if (sendMessage.message_id) {
            log.success(`Success Send QnA to ${sendMessage.chat.type} ${sendMessage.chat.title}`)
            data.post = true
            data.post_at = sendMessage.date
            data.post_id = sendMessage.message_id
            giftbox.set(title, data)
        }
    }
    
})()
