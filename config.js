require('dotenv').config();

const requiredEnv = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'AMOCRM_SUBDOMAIN',
    'AMOCRM_ACCESS_TOKEN'
];

requiredEnv.forEach(name => {
    if (!process.env[name]) {
        console.error(`❌ Ошибка: Переменная окружения ${name} не задана`);

    }
});

module.exports = {
    port: process.env.PORT || 3000,
    supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_KEY
    },
    amo: {
        subdomain: process.env.AMOCRM_SUBDOMAIN,
        accessToken: process.env.AMOCRM_ACCESS_TOKEN,
        clientId: process.env.AMOCRM_CLIENT_ID,
        clientSecret: process.env.AMOCRM_CLIENT_SECRET,
        redirectUri: process.env.AMOCRM_REDIRECT_URI
    },
    fields: {
        UZS: 1597573,
        RUB: 1597575,
        KZT: 1597577
    },
    pipelines: {
        RU: 10848590,
        KZ: 10863006
    }
};