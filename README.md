# 🎬 Video Generator Demo

Полноценное демо-приложение для генерации видео из изображений через xAI API (Grok Imagine Video) с пост-обработкой.

## Структура

```
video-generator-demo/
├── server/          # Express backend
│   ├── server.js
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/  # Multer upload
│   │   └── lib/         # Video toolkit logic
│   └── uploads/         # Local storage (images, audio, output)
└── client/          # React + Vite frontend
    ├── src/
    │   ├── components/  # UI components
    │   └── hooks/       # API helpers
    └── vite.config.js
```

## Требования

- Node.js 18+
- **ffmpeg** установлен и доступен в PATH
- API ключ xAI (`XAI_API_KEY`)

## Быстрый старт

### 1. Backend

```bash
cd server
cp .env.example .env
# Отредактируй .env — вставь свой XAI_API_KEY
npm install
npm start
# Сервер запустится на http://localhost:3001
```

### 2. Frontend

```bash
cd client
npm install
npm run dev
# Открой http://localhost:5173
```

## Функционал

| Фича | Описание |
|------|----------|
| 📁 Image Library | Drag & drop загрузка, сетка миниатюр, выбор |
| ⚙️ Generation | Длительность 1-15с, 5 camera moves, voice, voice text |
| ⏳ Status Modal | Polling статуса xAI, прогресс, скачивание |
| 🎞️ Clip Editor | Drag & drop reorder сегментов, merge, audio, logo |
| 🎵 Audio Library | Загрузка MP3, TTS генерация (xAI voices) |
| 👁️ Preview | Видео-плеер, скачивание финального MP4 |

## API Endpoints

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/images/upload` | Загрузка изображения |
| GET | `/api/images` | Список изображений |
| POST | `/api/generate` | Создать задачу xAI |
| GET | `/api/generate/:id/status` | Статус генерации |
| GET | `/api/generate/:id/download` | Скачать готовое видео |
| POST | `/api/clips/merge` | Склеить сегменты |
| POST | `/api/clips/audio` | Наложить аудио |
| POST | `/api/clips/logo` | Наложить логотип |
| POST | `/api/clips/logo-upload` | Загрузить PNG логотип |
| GET | `/api/audio` | Список аудио |
| POST | `/api/audio/upload` | Загрузка аудио |
| POST | `/api/audio/tts` | Генерация TTS |
| GET | `/api/audio/voices` | Список 28 голосов |

## Camera Moves

1. **Slow Zoom In** — плавное приближение
2. **Slow Zoom Out** — плавное отдаление
3. **Pan Right** — движение камеры вправо
4. **Orbit Left** — облет вокруг объекта
5. **Parallax Push** — параллакс с движением вперёд

## Архитектура потока

```
Upload Image → Crop & Resize → xAI API (async) → Polling → Download MP4
                                                    ↓
                                          Clip Editor (merge/audio/logo)
                                                    ↓
                                             Preview & Download
```

## Важно

- xAI reference-to-video **максимум 720p** и **15 секунд**
- Временные файлы хранятся в `server/uploads/` и **не удаляются**
- Для production используй S3 + очередь (Redis/Bull)
