# Git Flow

## Основные ветки

- `master` — продакшн. Только проверенный код.
- `develop` — основная ветка разработки. Все новые фичи сливаются сюда.

---

## Feature (новая фича)

Создание ветки:

```bash
git checkout develop
git checkout -b feature/название-фичи
```

Работа:

```bash
git add -A
git commit -m "описание"
```

После завершения:

```bash
git checkout develop
git merge feature/название-фичи
git push github develop
```

После тестирования на dev-сервере — релиз в master.

---

## Bugfix (исправление бага)

Для исправления ошибок в процессе разработки используется ветка `bugfix`.

```bash
git checkout develop
git checkout -b bugfix/название-бага
```

После исправления ветка вливается обратно в develop.

```bash
А `hotfix` оставить именно для продакшена.
У тебя тогда будет логичная схема:
```

---

## Hotfix (срочное исправление бага)

Создание ветки от `master`:

```bash
git checkout master
git checkout -b hotfix/vX.Y.Z-fN
```

После исправления:

```bash
git add -A
git commit -m "hotfix: описание"
```

Выкатка:

```bash
git checkout master
git merge hotfix/vX.Y.Z-fN
git tag -a vX.Y.Z-fN -m "vX.Y.Z-fN: описание"
git push dokku-prod master
git push github master
git push github --tags
```

После хотфикса синхронизировать develop:

```bash
git checkout develop
git merge hotfix/vX.Y.Z-fN
```

---

## Релиз (выкатка в продакшн)

```bash
git checkout master
git merge develop
git tag -a vX.Y.Z -m "vX.Y.Z: описание"
git push dokku-prod master
git push github master
git push github --tags
```

После релиза синхронизировать develop:

```bash
git checkout develop
git merge master
```
