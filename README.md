# Аттестация директоров ДЦ

Next.js (App Router) + Supabase (Auth + Postgres + Row Level Security).

## 1. Настройка Supabase

Проект уже подключён (см. `.env.local`, не коммитится в git):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Если разворачиваете с нуля — создайте проект на [supabase.com](https://supabase.com) и возьмите
из Settings → API: Project URL, anon/publishable key и **service_role (secret) key**.

`SUPABASE_SERVICE_ROLE_KEY` — серверный секрет, полностью обходит RLS. Используется только в
Server Actions (`app/dashboard/actions.ts`, функция `assignDirector`) для приглашения новых
директоров через Supabase Auth Admin API. **Никогда** не добавляйте к нему префикс
`NEXT_PUBLIC_` и не коммитьте в git — иначе он попадёт в браузерный бандл и любой сможет
обойти защиту базы данных.

### Применить схему и RLS

Файлы миграций лежат в `supabase/migrations/`:

- `0001_schema.sql` — таблицы `branches`, `profiles`, `cycles`, `attestations`, `ipr_items`
- `0002_rls.sql` — функция `is_owner()` и политики Row Level Security

**Вариант А — Supabase CLI:**

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

**Вариант Б — вручную:** откройте в Supabase проекте SQL Editor и по очереди выполните
содержимое `supabase/migrations/0001_schema.sql`, затем `0002_rls.sql`.

### Создать пользователей (Фаза 3)

**Владельца** заводим один раз вручную (курицу и яйцо не обойти — назначать роли пока некому):

1. Authentication → Users → **Add user** (email + пароль, без письма — быстрее для первого
   входа) или **Invite user** (письмо со ссылкой на установку пароля).
2. Table Editor → `profiles` → добавить строку: `id` — скопировать id только что созданного
   пользователя, `role = 'owner'`.

**Директоров** дальше можно назначать прямо в приложении — на странице `/dashboard` в колонке
«Директор» есть кнопка «Назначить» / «Изменить»: вводите email и ФИО, приложение через
Supabase Auth Admin API отправляет директору письмо-приглашение и сразу создаёт для него
профиль (`role='director'`, привязка к филиалу). Это работает только если задан
`SUPABASE_SERVICE_ROLE_KEY` (см. выше) — без него кнопка вернёт ошибку с понятным текстом.

## 2. Запуск локально

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000). Неавторизованный пользователь
перенаправляется на `/login`. После входа `/` перенаправляет:

- владельца (`role = 'owner'`) → `/dashboard` (обзор всех филиалов)
- директора (`role = 'director'`) → `/branch/<его branch_id>` (карточка своего филиала)

Доступ разграничивается на уровне базы данных (RLS), а не в интерфейсе: даже если директор
откроет в адресной строке `/branch/<id-чужого-филиала>`, запросы к `attestations`/`ipr_items`
от его имени вернут пустой результат.

## 3. Структура проекта

```
app/
  login/page.tsx        — форма входа (email + пароль)
  dashboard/page.tsx     — обзор владельца (список филиалов, статистика, кварталы)
  branch/[id]/page.tsx   — карточка филиала: вкладки «Аттестация» / «ИПР»
  page.tsx               — редирект на основании роли из profiles
lib/
  supabase/client.ts      — Supabase-клиент для браузера
  supabase/server.ts      — Supabase-клиент для серверных компонентов
  supabase/proxy.ts       — обновление сессии + защита маршрутов (используется в proxy.ts)
  competencies.ts         — справочник 13 компетенций / 4 блоков и расчёт итогового балла
  types.ts                — типы таблиц базы данных
supabase/migrations/      — SQL для схемы и RLS (Фаза 1 и 2)
proxy.ts                  — Next.js 16 Proxy (бывший middleware): редирект на /login
```

> Next.js 16 переименовал `middleware.ts` → `proxy.ts` (см. `AGENTS.md`, автогенерируется
> `next dev` и указывает на версионную документацию в `node_modules/next/dist/docs/`).

## 4. Деплой на Vercel

1. Запушить код в GitHub-репозиторий.
2. В Vercel — Import Project → выбрать репозиторий.
3. Settings → Environment Variables — добавить `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` и `SUPABASE_SERVICE_ROLE_KEY` (без `NEXT_PUBLIC_` —
   должна остаться серверной).
4. Deploy.

## 5. Проверка разграничения доступа (Фаза 6)

1. Войдите под тестовым директором филиала А.
2. Убедитесь, что видно только филиал А (`/branch/<id-А>`).
3. Откройте в адресной строке `/branch/<id-Б>` — данные аттестации и ИПР филиала Б не
   загрузятся (RLS вернёт пустой набор строк), несмотря на то что страница технически
   рендерится.
