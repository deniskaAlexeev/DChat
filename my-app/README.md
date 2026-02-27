# DChat - Мессенджер

**Создатель:** Алексеев Денис

Современный веб-мессенджер с системой авторизации, друзьями, личными и групповыми чатами, отправкой файлов и push-уведомлениями.

## Функции

- 🔐 **Безопасная авторизация** - регистрация и вход с верификацией email
- 👥 **Система друзей** - добавление, поиск и управление друзьями
- 💬 **Личные чаты** - real-time обмен сообщениями
- 👨‍👩‍👧‍👦 **Групповые чаты** - создание групп с несколькими участниками
- 📎 **Файлы и фото** - отправка изображений и документов
- 🌓 **Темы** - светлая и тёмная тема
- 🔔 **Push-уведомления** - уведомления о новых сообщениях
- 🤖 **Защита от ботов** - email верификация

## Технологии

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Real-time, Storage)
- **State Management:** Zustand
- **Queries:** TanStack Query
- **Deploy:** GitHub Pages

## Быстрый старт

### 1. Создайте проект в Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Скопируйте URL и Anon Key из Project Settings → API

### 2. Настройте базу данных

1. Откройте SQL Editor в Supabase Dashboard
2. Выполните скрипт из `supabase/migrations/001_initial_schema.sql`
3. Включите Realtime для таблицы messages:
   - Database → Replication → Realtime → Добавить messages

### 3. Настройте Storage

1. Storage → Новый bucket → `chat-files`
   - Public bucket: ✅ Включено
   - File size limit: 50MB
   - Allowed MIME types: image/*, application/*

### 4. Настройте Auth

1. Authentication → Settings
2. Email provider: ✅ Включено
3. Confirm email: ✅ Включено (защита от ботов)
4. Site URL: `https://ваш-username.github.io/DChat`
5. Redirect URLs: добавьте `https://ваш-username.github.io/DChat/auth/callback`

### 5. Локальная разработка

```bash
# Клонируйте репозиторий
git clone https://github.com/ваш-username/DChat.git
cd DChat/my-app

# Установите зависимости
npm install

# Создайте .env.local файл
cp .env.example .env.local
# Отредактируйте .env.local, добавив ваши ключи Supabase

# Запустите dev сервер
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

### 6. Деплой на GitHub Pages

```bash
# Сборка
npm run build

# Деплой
npm run deploy
```

Или используйте GitHub Actions (уже настроено в .github/workflows/deploy.yml)

## Переменные окружения

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Структура проекта

```
my-app/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React компоненты
│   │   ├── auth/        # Авторизация
│   │   ├── chat/        # Чаты и сообщения
│   │   ├── friends/     # Система друзей
│   │   ├── layout/      # Layout компоненты
│   │   └── ui/          # shadcn/ui компоненты
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Утилиты и конфигурация
│   ├── store/           # Zustand store
│   └── types/           # TypeScript типы
├── supabase/
│   └── migrations/      # SQL миграции
└── .env.example         # Пример переменных окружения
```

## Безопасность

- ✅ Row Level Security (RLS) для всех таблиц
- ✅ Email верификация
- ✅ Защищенные API endpoints
- ✅ SQL injection защита через Supabase
- ✅ XSS защита через React

## Лицензия

MIT License

## Контакты

Алексеев Денис - создатель DChat

---

**Примечание:** Для работы в России без VPN используйте Supabase с регионом (Europe West) или настройте прокси.
