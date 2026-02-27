# Руководство по настройке Supabase для DChat

## Шаг 1: Создание проекта Supabase

1. Перейдите на https://supabase.com
2. Нажмите "New Project"
3. Введите название проекта: `DChat`
4. Выберите регион: **West Europe (Frankfurt)** для лучшей работы в России
5. Выберите бесплатный тариф (Free Tier)
6. Нажмите "Create new project"

## Шаг 2: Получение API ключей

1. Дождитесь создания проекта (1-2 минуты)
2. Перейдите в **Project Settings** → **API**
3. Скопируйте:
   - `URL` (например: `https://xxxxxxxxxxxx.supabase.co`)
   - `anon public` ключ (длинная строка)

## Шаг 3: Настройка базы данных

1. Перейдите в **SQL Editor** (в боковом меню)
2. Нажмите **New query**
3. Скопируйте содержимое файла `supabase/migrations/001_initial_schema.sql`
4. Вставьте в редактор
5. Нажмите **Run**
6. Убедитесь, что все команды выполнились без ошибок

## Шаг 4: Включение Realtime

1. Перейдите в **Database** → **Replication**
2. Найдите раздел **Realtime**
3. Нажмите **Add table**
4. Выберите таблицу `messages`
5. Включите переключатель **Realtime**

## Шаг 5: Настройка Storage для файлов

1. Перейдите в **Storage** (в боковом меню)
2. Нажмите **New bucket**
3. Введите название: `chat-files`
4. ✅ Включите **Public bucket**
5. Нажмите **Save**
6. Нажмите на созданный bucket
7. Перейдите в **Policies** → **Add Policies**
8. Создайте политику:
   - Name: `Public Access`
   - Allowed operations: SELECT ✅
   - Target roles: anon, authenticated
   - Policy definition: `bucket_id = 'chat-files'`

### Настройка загрузки файлов:

9. В bucket перейдите в **Configuration**
10. File size limit: `52428800` (50MB в байтах)
11. Allowed MIME types: `image/*, application/*`

## Шаг 6: Настройка Authentication

### Email Auth:

1. Перейдите в **Authentication** → **Providers**
2. Найдите **Email** и нажмите на него
3. ✅ Включите **Enable Email provider**
4. ✅ Включите **Confirm email** (это защита от ботов!)
5. Сохраните

### Настройка URL для редиректа:

1. Перейдите в **Authentication** → **URL Configuration**
2. **Site URL**: `https://ваш-username.github.io/DChat`
   - Замените `ваш-username` на ваш GitHub username
3. **Redirect URLs**:
   - Добавьте: `https://ваш-username.github.io/DChat/auth/callback`
   - Добавьте: `http://localhost:3000/auth/callback` (для локальной разработки)
4. Сохраните

## Шаг 7: Настройка Email шаблонов

1. Перейдите в **Authentication** → **Email Templates**
2. Выберите **Confirm signup**
3. Отредактируйте шаблон на русском языке:

```
<h2>Подтвердите ваш email</h2>

<p>Здравствуйте!</p>

<p>Спасибо за регистрацию в DChat. Нажмите на ссылку ниже, чтобы подтвердить ваш email:</p>

<p><a href="{{ .ConfirmationURL }}">Подтвердить email</a></p>

<p>Если вы не регистрировались в DChat, проигнорируйте это письмо.</p>

<p>С уважением,<br>Команда DChat</p>
```

## Шаг 8: Локальная разработка

1. В проекте создайте файл `.env.local`:

```bash
cd my-app
cp .env.example .env.local
```

2. Отредактируйте `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Замените значения на ваши из Supabase Dashboard

4. Запустите проект:

```bash
npm run dev
```

## Шаг 9: Настройка GitHub Secrets для деплоя

1. Откройте ваш репозиторий на GitHub
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **New repository secret**
4. Добавьте два секрета:

- Name: `NEXT_PUBLIC_SUPABASE_URL`
- Value: ваш URL из Supabase

- Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Value: ваш anon ключ из Supabase

## Шаг 10: Деплой на GitHub Pages

### Включение GitHub Pages:

1. На GitHub откройте **Settings** → **Pages**
2. **Source**: GitHub Actions
3. Сохраните

### Первый деплой:

```bash
# Закоммитьте и запушьте все изменения
git add .
git commit -m "Initial DChat setup"
git push origin main
```

GitHub Actions автоматически запустит сборку и деплой!

## Проверка работы

1. Откройте ваш сайт: `https://ваш-username.github.io/DChat`
2. Зарегистрируйтесь с реальным email
3. Проверьте почту и подтвердите email
4. Войдите в систему
5. Добавьте друзей
6. Создайте чат
7. Отправьте сообщение и файл

## Устранение неполадок

### Ошибка: "Invalid API key"
- Проверьте, что ключи в `.env.local` или GitHub Secrets правильные
- Убедитесь, что нет лишних пробелов

### Ошибка: "Table does not exist"
- Убедитесь, что SQL скрипт выполнен без ошибок
- Проверьте таблицы в Database → Tables

### Не работает real-time
- Проверьте, что Realtime включен для таблицы messages
- Перезагрузите страницу после включения

### Email не приходит
- Проверьте спам
- Убедитесь, что email введен правильно
- Проверьте настройки Email provider в Supabase

## Дополнительная безопасность

1. Включите 2FA для вашего Supabase аккаунта
2. Регулярно обновляйте зависимости проекта
3. Используйте сильные пароли
4. Не коммитьте `.env.local` в git

## Полезные ссылки

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [GitHub Pages Docs](https://docs.github.com/en/pages)

---

**Готово!** Теперь ваш DChat полностью настроен и готов к работе!
