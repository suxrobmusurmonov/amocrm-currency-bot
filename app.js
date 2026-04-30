const express = require('express');
const config = require('./config');
const { fetchAndStoreRates } = require('./ratesService');
const { handleLeadChange } = require('./logicService');

const app = express();

// amoCRM присылает данные в формате urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Проверка работоспособности (вместо doGet)
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'amoCRM Currency Service is running',
        time: new Date().toISOString()
    });
});

// 2. Маршрут для вебхуков (вместо doPost)
app.post('/webhook', async (req, res) => {
    console.log("--- ВХОДЯЩИЙ ВЕБХУК ---");

    try {
        const params = req.body;
        let type = '';

        if (params['leads[update][0][id]']) type = 'update';
        else if (params['leads[add][0][id]']) type = 'add';

        if (!type) {
            return res.status(200).send('ok');
        }

        const leadId = params[`leads[${type}][0][id]`];
        const pipelineId = params[`leads[${type}][0][pipeline_id]`];

        // Парсим кастомные поля
        const customFields = extractCustomFields(params, type);

        // Запускаем логику (не ждем завершения, чтобы быстро ответить amoCRM)
        handleLeadChange(leadId, pipelineId, customFields);

        res.status(200).send('ok');
    } catch (err) {
        console.error("Ошибка в обработчике вебхука:", err.message);
        res.status(500).send('error');
    }
});

// 3. Маршрут для обновления курсов (для Cron-задач)
app.get('/cron/update-rates', async (req, res) => {
    await fetchAndStoreRates();
    res.send('Rates updated');
});

// Хелпер для парсинга полей (как в твоем doPost.gs)
function extractCustomFields(params, type) {
    const fields = { uzs: null, rub: null, kzt: null };
    const prefix = `leads[${type}][0][custom_fields_values]`;

    for (let key in params) {
        if (key.includes(prefix) && key.includes('[id]')) {
            const fieldId = parseInt(params[key]);
            const valueKey = key.replace('[id]', '[values][0][value]');
            const value = parseFloat(params[valueKey]);

            if (fieldId === config.fields.UZS) fields.uzs = value;
            if (fieldId === config.fields.RUB) fields.rub = value;
            if (fieldId === config.fields.KZT) fields.kzt = value;
        }
    }
    return fields;
}

app.listen(config.port, () => {
    console.log(`🚀 Сервер запущен на порту ${config.port}`);
});