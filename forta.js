const { Telegraf } = require('telegraf');
const moment = require('moment-timezone');
const fetch = require('node-fetch');

let botToken = process.env.BOTTOKENFORTA,
    channelID = process.env.CHANNELIDFORTA;

const bot = new Telegraf(botToken);
const channelId = channelID;

const getSundayOfCurrentWeek = () => {
    const today = new Date();
    const last = today.getDate() - today.getDay() + 7;
    const sunday = new Date(today.setDate(last));
  
    return moment(sunday).format('MMMM Do');
}

const scannerData = [
    {
        'chainId': 1,
        'network': 'Ethereum',
        'rewardPool': 200000
    },
    {
        'chainId': 10,
        'network': 'Optimism',
        'rewardPool': 10000
    },
    {
        'chainId': 56,
        'network': 'BSC',
        'rewardPool': 12000
    },
    {
        'chainId': 137,
        'network': 'Polygon',
        'rewardPool': 150000
    },
    {
        'chainId': 250,
        'network': 'Fantom',
        'rewardPool': 6000
    },
    {
        'chainId': 42161,
        'network': 'Arbitrum',
        'rewardPool': 10000
    },
    {
        'chainId': 43114,
        'network': 'Avalanche',
        'rewardPool': 12000
    }
];

let totalReward = 0;
// eslint-disable-next-line no-return-assign
scannerData.forEach((el) => totalReward += el.rewardPool);

(async () => {

    let chainsData = await fetch('https://explorer-api.forta.network/graphql', {
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'Referer': 'https://explorer.forta.network/'
        },
        body: JSON.stringify({ query: 'query Retrive {\r\ngetChains {\r\nchainId\r\nupAgents\r\ntotalAgents\r\nupScanners\r\ntotalScanners\r\n}\r\n}' }),
        method: 'POST'
    })
    .then((res) => res.json())
    .catch((err) => err)

    chainsData = chainsData.data.getChains;
            
    for (let c = 0; c < chainsData.length; c++) {
        const chain = chainsData[c];
        Object.assign(scannerData[scannerData.findIndex((el) => el.chainId === chain.chainId)], chain)
    }
    
    let parsedData = scannerData.map((x) => `*\\#${x.network}*\nAgents: ${x.upAgents}\nScanners: ${x.upScanners}\nWeekly Reward: ${parseFloat(x.rewardPool / x.totalScanners).toFixed(2)} FORT (Approximately)`)
    // eslint-disable-next-line require-unicode-regexp
    let text = `${parsedData.toString().replaceAll(',', '\n\n')}\n\nReward Pool for __Week Ending ${getSundayOfCurrentWeek()}__ is *${totalReward.toLocaleString()}* FORT\n_Rewards per participant will depend on their relative performance to others, measured by an SLA score, and the amount of time in the week which they performed at an above minimum score (0.75). Average SLA will be the average of all the the values which were above minimum score._`.replace(/\./g, '\\.').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    // eslint-disable-next-line camelcase
    await bot.telegram.sendMessage(channelId, text, { parse_mode: 'MarkdownV2' });
})()