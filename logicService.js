const supabase = require('./supabaseClient');
const { amoRequest } = require('./amoService');
const config = require('./config');

async function handleLeadChange(leadId, pipelineId, incomingFields) {
    console.log(`>>> Обработка сделки #${leadId} (Воронка: ${pipelineId})`);

    try {
        // 1. Получаем состояние сделки из Supabase
        const { data: dealState, error: stateError } = await supabase
            .from('deal_state')
            .select('*')
            .eq('deal_id', leadId)
            .maybeSingle();

        if (stateError) throw stateError;

        // 2. Проверка на зацикливание (Loop Protection)
        if (dealState && dealState.last_updated_by === 'system') {
            const isSame =
                incomingFields.uzs === dealState.last_uzs &&
                incomingFields.rub === dealState.last_rub &&
                incomingFields.kzt === dealState.last_kzt;

            if (isSame) {
                console.log(`Lead ${leadId}: Изменения идентичны системным. Пропуск.`);
                return;
            }
        }

        // 3. Получаем курсы на сегодня
        const today = new Date().toISOString().split('T')[0];
        const { data: rates, error: ratesError } = await supabase
            .from('daily_rates')
            .select('*')
            .eq('date', today);

        if (ratesError || !rates || rates.length === 0) {
            console.error(`❌ Курсы на ${today} не найдены!`);
            return;
        }

        const rubRate = rates.find(r => r.quote === 'RUB');
        const kztRate = rates.find(r => r.quote === 'KZT');

        // 4. Логика пересчета
        let updateData = { custom_fields_values: [] };
        let newState = {
            deal_id: parseInt(leadId),
            pipeline_id: parseInt(pipelineId),
            last_uzs: incomingFields.uzs,
            last_rub: incomingFields.rub,
            last_kzt: incomingFields.kzt,
            last_updated_by: 'system',
            updated_at: new Date().toISOString()
        };

        const oldRub = dealState?.last_rub;
        const oldKzt = dealState?.last_kzt;
        const oldUzs = dealState?.last_uzs;

        // А) Изменился RUB -> считаем UZS
        if (incomingFields.rub !== null && incomingFields.rub !== oldRub) {
            const calcUzs = Math.round(incomingFields.rub * rubRate.rate * (rubRate.coefficient || 1));
            updateData.custom_fields_values.push({ field_id: config.fields.UZS, values: [{ value: calcUzs }] });
            newState.last_uzs = calcUzs;
        }
        // Б) Изменился KZT -> считаем UZS
        else if (incomingFields.kzt !== null && incomingFields.kzt !== oldKzt) {
            const calcUzs = Math.round(incomingFields.kzt * kztRate.rate * (kztRate.coefficient || 1));
            updateData.custom_fields_values.push({ field_id: config.fields.UZS, values: [{ value: calcUzs }] });
            newState.last_uzs = calcUzs;
        }
        // В) Изменился UZS -> считаем RUB/KZT
        else if (incomingFields.uzs !== null && incomingFields.uzs !== oldUzs) {
            if (rubRate) {
                const calcRub = parseFloat((incomingFields.uzs / (rubRate.rate * (rubRate.coefficient || 1))).toFixed(2));
                updateData.custom_fields_values.push({ field_id: config.fields.RUB, values: [{ value: calcRub }] });
                newState.last_rub = calcRub;
            }
            if (kztRate) {
                const calcKzt = parseFloat((incomingFields.uzs / (kztRate.rate * (kztRate.coefficient || 1))).toFixed(2));
                updateData.custom_fields_values.push({ field_id: config.fields.KZT, values: [{ value: calcKzt }] });
                newState.last_kzt = calcKzt;
            }
        }

        // 5. Отправка в amoCRM и сохранение состояния
        if (updateData.custom_fields_values.length > 0) {
            const amoRes = await amoRequest('PATCH', `/api/v4/leads/${leadId}`, updateData);
            if (amoRes.code < 400) {
                await supabase.from('deal_state').upsert(newState, { onConflict: 'deal_id' });
                console.log(`✅ Сделка #${leadId} успешно обновлена.`);
            }
        }
    } catch (err) {
        console.error('❌ Ошибка в handleLeadChange:', err.message);
    }
}

module.exports = { handleLeadChange };