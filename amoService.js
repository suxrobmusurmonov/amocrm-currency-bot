const axios = require('axios');
const supabase = require('./supabaseClient');
const config = require('./config');

// Получить текущие настройки из БД
async function getSettings() {
    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();

    if (error) throw new Error('Ошибка получения настроек из БД: ' + error.message);
    return data;
}

// Обновить токены в БД
async function updateSettings(fields) {
    const { error } = await supabase
        .from('settings')
        .update(fields)
        .eq('id', 1);

    if (error) throw new Error('Ошибка обновления настроек: ' + error.message);
}

// Обновление токена через refresh_token
async function refreshAmoToken(refreshToken) {
    const url = `https://${config.amo.subdomain}.amocrm.ru/oauth2/access_token`;
    const payload = {
        client_id: config.amo.clientId,
        client_secret: config.amo.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        redirect_uri: config.amo.redirectUri
    };

    try {
        const response = await axios.post(url, payload);
        const data = response.data;

        // amoCRM возвращает expires_in в секундах
        const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

        await updateSettings({
            amocrm_access_token: data.access_token,
            amocrm_refresh_token: data.refresh_token,
            token_expires_at: newExpiresAt
        });

        console.log('✅ Токен amoCRM успешно обновлен');
        return data.access_token;
    } catch (error) {
        console.error('❌ Ошибка при обновлении токена amoCRM:', error.response?.data || error.message);
        throw error; // Пробрасываем ошибку дальше, чтобы логика остановилась, если токен мертв
    }
}

// Проверка валидности токена перед каждым запросом
async function getValidAccessToken() {
    const settings = await getSettings();
    const now = new Date();
    const expiresAt = new Date(settings.token_expires_at);

    // Если до истечения осталось меньше 5 минут — обновляем
    if (now.getTime() + 5 * 60 * 1000 > expiresAt.getTime()) {
        console.log('⏳ Токен истекает, запускаем обновление...');
        return await refreshAmoToken(settings.amocrm_refresh_token);
    }

    return settings.amocrm_access_token;
}

// Универсальная функция для отправки запросов в amoCRM
async function amoRequest(method, path, body = null) {
    const token = await getValidAccessToken();
    const url = `https://${config.amo.subdomain}.amocrm.ru${path}`;

    const options = {
        method: method,
        url: url,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.data = body;
    }

    try {
        const response = await axios(options);
        return { code: response.status, data: response.data };
    } catch (error) {
        console.error(`❌ Ошибка API amoCRM (${path}):`, error.response?.data || error.message);
        return { code: error.response?.status || 500, data: error.response?.data || {} };
    }
}

module.exports = { amoRequest };