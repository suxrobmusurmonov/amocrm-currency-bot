const axios = require('axios');
const supabase = require('./supabaseClient');

async function fetchAndStoreRates() {
    try {
        const url = 'https://cbu.uz/ru/arkhiv-kursov-valyut/json/';
        const response = await axios.get(url);
        const allRates = response.data;

        const rubData = allRates.find(item => item.Ccy === 'RUB');
        const kztData = allRates.find(item => item.Ccy === 'KZT');

        const today = new Date().toISOString().split('T')[0];

        const ratesToSave = [
            {
                date: today,
                base: 'UZS',
                quote: 'RUB',
                rate: parseFloat(rubData.Rate),
                coefficient: 1.0
            },
            {
                date: today,
                base: 'UZS',
                quote: 'KZT',
                rate: parseFloat(kztData.Rate),
                coefficient: 1.0
            }
        ];

        for (const rateObj of ratesToSave) {
            // Используем возможности SDK: upsert автоматически обновит запись, если дата и валюта совпадут
            const { error } = await supabase
                .from('daily_rates')
                .upsert(rateObj, { onConflict: 'date,base,quote' });

            if (error) throw error;
            console.log(`✅ Курс ${rateObj.quote} сохранен: ${rateObj.rate}`);
        }
    } catch (error) {
        console.error('❌ Ошибка при получении курсов:', error.message);
    }
}

module.exports = { fetchAndStoreRates };