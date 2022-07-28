/* eslint-disable no-extra-parens */
/* eslint-disable camelcase */
require('dotenv').config()
const fetch = require('node-fetch');
const log = require('log-beautify');
const { Telegraf } = require('telegraf');
const JSONdb = require('simple-json-db');
const capitalize = (s) => (s && s[0].toUpperCase() + s.slice(1)) || '';

log.useSymbols = true
log.useLabels = true

let botToken = process.env.BOTTOKEN, 
    channelID = process.env.CHANNELID;

const bot = new Telegraf(botToken);
const bounties = new JSONdb('data/bounties.json');
const query = new JSONdb('data/query.json');

const BaseApi = 'https://beta.layer3.xyz/api/graphql';
const headers = { 
    accept: 'application/json',
    'content-type': 'application/json',
    origin: 'https://beta.layer3.xyz',
    referer: 'https://beta.layer3.xyz',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36' 
};

(async () => {
    const activeBounties = await fetch(`${BaseApi}`, { method: 'POST', headers, body: JSON.stringify(query.get('GetAllTasks')) }).then((res) => res.json());
    const bountiesDetails = (slug) => fetch(`${BaseApi}`, { method: 'POST', headers, body: JSON.stringify(query.get('GetTaskFromSlug')).replace('change-this-text', slug) }).then((res) => res.json());

    const { tasks } = activeBounties.data
    
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const slug = task.namespace
        const taskdetail = await bountiesDetails(slug)
        log.info(`Checking ${slug}...`)

        const isExist = bounties.has(slug) 
        if (isExist) {
            log.warning(`${slug} already exist and posted`)
        } else { // save and post
            log.success(`${task.title} with reward ${task.rewardType}, Available for ${task.numberOfWinners === null ? 'Unlimited' : task.numberOfWinners} partisipant (${task.totalBountyClaimersCount} Claimers)`);
            const data = taskdetail.data.task
            const rewardtype = data.rewardType == 'ONLY_XP' ? 'XP' : data.rewardType
            const rewardamount = data.rewardType == 'ONLY_XP' ? '-' : data.rewardType == 'NFT' ? `1 ${data.rewardNft.name}` : `${data.rewardAmount} ${data.rewardToken.symbol}`
            const text = `#Layer3 - *Bounty*\n\n*${data.title}* By _${data.Dao.name}_\n\nReward Type: *${rewardtype}*\nReward Amount: *${rewardamount}* | *${data.xp} XP*\nWinners: *${data.numberOfWinners ? data.numberOfWinners : 'Unlimited'}* _Participant_\n\nTask: \n${data.BountySteps.map((x) => `- \`${capitalize(x.title ? x.title : x.bountyActionKey.replaceAll('_', ' ').toLowerCase())}\``).toString().replaceAll(',', '\n')}`
            const sendMessage = await bot.telegram.sendMessage(channelID, text, { protect_content: true, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: `${data.title} - ${data.Dao.name}`, url: `https://beta.layer3.xyz/bounties/${slug}` }]] } })
            if (sendMessage.message_id) {
                log.success(`Success Send Bounty to ${sendMessage.chat.type} ${sendMessage.chat.title}`)
                bounties.set(slug, taskdetail.data.task)
            }
        }
    }
})()