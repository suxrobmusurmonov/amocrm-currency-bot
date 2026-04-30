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
        time: new Date().toISOString(),
        env: process.env.NODE_ENV
    });
});

app.post('/webhook', async (req, res) => {
    console.log("=== ПОЛУЧЕН ВЕБХУК ===");

    const body = req.body;

    try {

        const leadsUpdate = body.leads?.update || body.leads?.add;

        if (!leadsUpdate || !leadsUpdate[0]) {
            console.log("⚠️ Вебхук не содержит данных о сделках");
            return res.status(200).send('ok');
        }

        const lead = leadsUpdate[0];
        const leadId = lead.id;
        const pipelineId = parseInt(lead.pipeline_id);

        console.log(`🔎 Обработка сделки #${leadId} в воронке ${pipelineId}`);


        const customFields = { uzs: null, rub: null, kzt: null };

        if (lead.custom_fields) {
            lead.custom_fields.forEach(field => {
                const fieldId = parseInt(field.id);
                const rawValue = field.values?.[0]?.value;
                const value = parseFloat(String(rawValue).replace(/[^0-9.]/g, ''));

                if (fieldId === config.fields.UZS) customFields.uzs = value;
                if (fieldId === config.fields.RUB) customFields.rub = value;
                if (fieldId === config.fields.KZT) customFields.kzt = value;
            });
        }

        console.log("📊 Извлеченные поля:", customFields);


        if (customFields.uzs || customFields.rub || customFields.kzt) {

            await handleLeadChange(leadId, pipelineId, customFields);
            console.log("✅ Логика успешно выполнена");
        } else {
            console.log("ℹ️ Поля валют пусты, расчет не требуется");
        }

        res.status(200).send('ok');
    } catch (err) {
        console.error("❌ Ошибка вебхука:", err);

        res.status(500).json({ error: err.message });
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

if (process.env.NODE_ENV !== 'production') {
    app.listen(config.port, () => {
        console.log(`Локальный сервер запущен на порту ${config.port}`);
    });
}

module.exports = app;