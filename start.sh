#!/bin/bash

# Функция для остановки всех процессов при завершении
cleanup() {
    echo -e "\nОстанавливаем все сервисы..."
    # Убиваем все фоновые процессы, запущенные из этого скрипта
    kill $(jobs -p) 2>/dev/null
    exit
}

# Перехватываем Ctrl+C (SIGINT) и завершение (SIGTERM)
trap cleanup SIGINT SIGTERM

echo "=========================================="
echo "Запуск сервисов Local AI Tasks Bot..."
echo "=========================================="

echo "Очистка старых процессов на портах..."
fuser -k 5173/tcp 5252/tcp 8001/tcp >/dev/null 2>&1
sleep 1


# 1. Запуск Frontend
echo "[1/3] Запуск Frontend (Vite)..."
cd frontend
npm run dev &
cd ..

# Активация виртуального окружения для Python сервисов
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
else
    echo "ВНИМАНИЕ: Виртуальное окружение .venv не найдено! Python-скрипты могут не запуститься."
fi

# 2. Запуск Backend (FastAPI)
echo "[2/3] Запуск Backend (FastAPI)..."
uvicorn api.main:app --reload --port 5252 &

# 3. Запуск Telegram Bot
echo "[3/3] Запуск Telegram Bot..."
python main.py &

echo "=========================================="
echo "Все сервисы успешно запущены!"
echo "🌐 Frontend:    http://localhost:5173"
echo "⚙️  Backend API: http://localhost:5252/docs"
echo "🤖 Бот:         работает в режиме polling"
echo "=========================================="
echo "Нажмите Ctrl+C для остановки всех сервисов."

# Ожидание завершения всех фоновых задач
wait
