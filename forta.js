require('dotenv').config()
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
        'rewardPool': 25000
    },
    {
        'chainId': 56,
        'network': 'BSC',
        'rewardPool': 30000
    },
    {
        'chainId': 137,
        'network': 'Polygon',
        'rewardPool': 80000
    },
    {
        'chainId': 250,
        'network': 'Fantom',
        'rewardPool': 10000
    },
    {
        'chainId': 42161,
        'network': 'Arbitrum',
        'rewardPool': 25000
    },
    {
        'chainId': 43114,
        'network': 'Avalanche',
        'rewardPool': 30000
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
        body: JSON.stringify({ query: 'query Retrive {\n  getChains {\n    chainId\n    bots\n    scanners\n    __typename\n  }\n}\n' }),
        method: 'POST'
    })
    .then((res) => res.json())
    .catch((err) => err)

    chainsData = chainsData.data.getChains;
            
    for (let c = 0; c < chainsData.length; c++) {
        const chain = chainsData[c];
        delete chain.__typename
        Object.assign(scannerData[scannerData.findIndex((el) => el.chainId === chain.chainId)], chain)
    }

    let parsedData = scannerData.map((x) => `*\\#${x.network}*\nBot: ${x.bots}\nScanners: ${x.scanners}\nWeekly Reward: ${parseFloat(x.rewardPool / x.scanners).toFixed(2)} FORT (Approximately)\nWeekly Reward Pool: ${x.rewardPool} FORT`)
    // eslint-disable-next-line require-unicode-regexp
    let text = `${parsedData.toString().replaceAll(',', '\n\n')}\n\nReward Pool for __Week Ending ${getSundayOfCurrentWeek()}__ is *${totalReward.toLocaleString()}* FORT\n_Rewards per participant will depend on their relative performance to others, measured by an SLA score, and the amount of time in the week which they performed at an above minimum score (0.75). Average SLA will be the average of all the the values which were above minimum score._`.replace(/\./g, '\\.').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    // eslint-disable-next-line camelcase
    await bot.telegram.sendMessage(channelId, text, { parse_mode: 'MarkdownV2' });
})();