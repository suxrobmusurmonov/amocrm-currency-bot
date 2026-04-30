# 💱 amoCRM Multi-Currency Automator

Профессиональное решение для автоматического пересчета и синхронизации валютных полей (UZS, RUB, KZT) в сделках amoCRM с использованием актуальных курсов Центрального Банка.

## 🚀 Особенности (Features)
*   **Автоматический пересчет**: При изменении любой из трех валют (RUB, KZT или UZS), остальные поля обновляются мгновенно.
*   **Защита от зацикливания (Loop Protection)**: Интеллектуальная проверка `deal_state` в базе данных предотвращает бесконечные срабатывания вебхуков.
*   **Автономное обновление курсов**: Настроенный Cron Job ежедневно запрашивает свежие данные у ЦБ и сохраняет их в Supabase.
*   **Безопасный OAuth 2.0**: Система автоматического обновления (refresh) токенов amoCRM без участия пользователя.
*   **Масштабируемая архитектура**: Разделение на сервисы (Amo, Supabase, Rates, Logic) для чистоты кода.

## 🛠 Стек технологий (Tech Stack)
*   **Runtime**: Node.js (v24+)
*   **Backend Framework**: Express.js
*   **Database & State Management**: Supabase (PostgreSQL)
*   **API Clients**: Axios
*   **Deployment**: Vercel

## 📦 Установка и запуск (Installation)

1. **Клонируйте репозиторий:**
   ```bash
   git clone [https://github.com/ваш-логин/amocrm-currency-bot.git](https://github.com/ваш-логин/amocrm-currency-bot.git)
   cd amocrm-currency-bot