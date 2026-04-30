const express = require('express');
const config = require('./config');
const { fetchAndStoreRates } = require('./ratesService');
const { handleLeadChange } = require('./logicService');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString()
    });
});

app.post('/webhook', async (req, res) => {
    console.log("=== ПОЛУЧЕН ВЕБХУК ===");
    console.log("ДАННЫЕ ТЕЛА:", JSON.stringify(req.body, null, 2));
    try {
        const params = req.body;
        let type = '';

        if (params['leads[update][0][id]']) type = 'update';
        else if (params['leads[add][0][id]']) type = 'add';

        if (!type) return res.status(200).send('ok');

        const leadId = params[`leads[${type}][0][id]`];
        const pipelineId = parseInt(params[`leads[${type}][0][pipeline_id]`]);

        const customFields = extractCustomFields(params, type);

        await handleLeadChange(leadId, pipelineId, customFields);

        res.status(200).send('ok');
    } catch (err) {
        console.error("Webhook error:", err.message);
        res.status(200).send('error');
    }
});

app.get('/cron/update-rates', async (req, res) => {
    try {
        await fetchAndStoreRates();
        res.send('Rates updated');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

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


if (process.env.NODE_ENV !== 'production') {
    app.listen(config.port, () => {
        console.log(`Локальный сервер запущен на порту ${config.port}`);
    });
}

module.exports = app;