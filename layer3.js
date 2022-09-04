/* eslint-disable init-declarations */
/* eslint-disable no-extra-parens */
/* eslint-disable camelcase */
require('dotenv').config()
const fetch = require('node-fetch');
const log = require('log-beautify');
const minify = require('jsonminify')
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

const BaseGraphqlApi = 'https://beta.layer3.xyz/api/graphql';
const BaseApi = 'https://beta.layer3.xyz/api/trpc';
const headers = { 
    accept: 'application/json',
    'content-type': 'application/json',
    origin: 'https://beta.layer3.xyz',
    referer: 'https://beta.layer3.xyz',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36' 
};

let tasksQuery = (q = 0) => encodeURI(JSON.minify(JSON.stringify({
    0: {
        json: {
            taskType: [
                'BOUNTY',
                'QUEST'
            ],
            onlyUnavailable: null,
            onlyCompleted: null,
            includeFeatured: true,
            includeClaimed: false,
            includeExpired: false,
            cursor: q
        },
        meta: {
            values: {
                onlyUnavailable: ['undefined'],
                onlyCompleted: ['undefined'],
                includeFeatured: ['undefined']
            }
        }
    }
})));



(async () => {
    let next,
        tasks = [];
        
    do {
        const getTask = await fetch(`${BaseApi}/task.getTasks?batch=1&input=${tasksQuery(next || 0)}`, { method: 'GET', headers }).then((res) => res.json());
        const { items, nextCursor } = getTask[0].result.data.json
        tasks = [...tasks, ...items]
        next = nextCursor || 0
    } while (next > 0);

    const bountiesDetails = (slug) => fetch(`${BaseGraphqlApi}`, { method: 'POST', headers, body: JSON.stringify(query.get('GetTaskFromSlug')).replace('change-this-text', slug) }).then((res) => res.json());

    log.info('Found:', tasks.length, 'Bounties')
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
            const missionDoc = task?.missionDoc?.content[0].content[0].text
            const data = taskdetail.data.task
            let rewardamount, rewardtype
            if (data.rewardType == 'ONLY_XP') {
                rewardtype = 'XP'
                rewardamount = 0
            } else if (data.rewardType == 'NFT') {
                rewardtype = data.rewardType
                rewardamount = `1 ${data.rewardNft.name}`
            } else if (data.rewardType == 'TOKEN') {
                rewardtype = data.rewardType
                rewardamount = `${data?.rewardAmount || 0} ${data.rewardToken?.symbol || ''}`.trim()
            }
            let tasklist = data.BountySteps.map((x) => `- \`${capitalize(x.title ? x.title : x.bountyActionKey.replaceAll('_', ' ').toLowerCase()).trim()}\``)
            if (data.GatingAchievement) {
                let achievement = data.GatingAchievement
                tasklist.unshift(`- \`${capitalize(achievement.name)}\``)
            }
            const text = `#Layer3 - *Bounty*\n\n*${data.title}* By _${data.Dao.name}_\n\n${missionDoc}\n\nReward Type: *${rewardtype}*\nReward Amount: *${rewardamount}* | *${data.xp || 0} XP*\nWinners: *${data.numberOfWinners ? data.numberOfWinners : 'Unlimited'}* _Participant_\n\nTasks: \n${tasklist.length == 0 ? '- `Check on Web`' : tasklist.toString().replaceAll(',', '\n')}`
            const sendMessage = await bot.telegram.sendMessage(channelID, text, { protect_content: true, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: `${data.title} - ${data.Dao.name}`, url: `https://beta.layer3.xyz/bounties/${slug}` }]] } })
            if (sendMessage.message_id) {
                log.success(`Success Send Bounty to ${sendMessage.chat.type} ${sendMessage.chat.title}`)
                bounties.set(slug, taskdetail.data.task)
            }
        }
    }
})()