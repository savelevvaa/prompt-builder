# ТЗ v2: Конструктор промтов для генерации карточек одежды

> Обновлённая версия на основе реального рабочего промта. UI на русском, вывод промта на английском. Промт состоит из фиксированного каркаса и динамических вставок.

---

## 1. Цель и контекст

Локально запускаемое одностраничное веб-приложение — **конструктор промтов** для генеративных моделей (Wavespeed / Nano Banana 2 / GPT-Image-2), используемых для создания карточек товаров одежды на маркетплейсах.

Пользователь последовательно выбирает параметры в выпадающих списках/чипах **на русском языке**. Каждая опция несёт в себе английское текстовое значение, которое подставляется в нужный слот заранее заготовленного английского промта. На выходе — готовый структурированный промт на английском, который копируется в генеративный сервис.

**Архитектурный принцип:** промт делится на **статический каркас** (паста с техническими инструкциями, preservation rules, negative prompt, realism requirements) и **динамические слоты** (MODEL TYPE, PRODUCT, SCENE DESCRIPTION, Reference mood, опционально — явная локация и соотношение сторон). Статическая часть неизменна между генерациями. Динамическая собирается из выборов пользователя.

**Вне scope MVP:**

- Интеграция API Wavespeed (запланирована на v2).
- Загрузка и анализ референсных фото одежды (пользователь прикрепляет их вручную в генеративном сервисе).
- Мультипользовательский режим.
- Выбор языка UI.

---

## 2. Технологический стек

| Слой | Выбор | Обоснование |
|---|---|---|
| Фреймворк | **React 18 + TypeScript + Vite** | Быстрый старт, типизация для каскадной логики. |
| Стили | **Tailwind CSS** | Совместимо с Claude Design, быстрая разметка. |
| UI-компоненты | **shadcn/ui** | Готовые Select, Combobox, RadioGroup, Switch, Card. |
| Состояние | **Zustand** + `persist` middleware | Компактный store, автосохранение в localStorage. |
| Данные фильтров | **Локальные TS-модули** в `/src/data/` | Полная типизация, простое редактирование. |
| Сборка | **Vite dev server** (`npm run dev` → `localhost:5173`) | Один запуск, hot reload. |
| Бэкенд | **Не требуется на MVP.** | В v2 — лёгкий прокси для Wavespeed API. |

**Структура проекта:**

```
prompt-builder/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── StepCard.tsx
│   │   ├── FilterSelect.tsx
│   │   ├── FilterChips.tsx
│   │   ├── PromptPreview.tsx
│   │   ├── CopyButton.tsx
│   │   └── ResetButton.tsx
│   ├── data/
│   │   ├── filters.ts              // каталог опций (раздел 5)
│   │   ├── dependencies.ts         // правила каскада (раздел 6)
│   │   ├── promptSkeleton.ts       // статическая паста (раздел 7.1)
│   │   └── promptAssembler.ts      // сборщик (раздел 7.3)
│   ├── store/
│   │   └── usePromptStore.ts
│   ├── hooks/
│   │   └── useVisibleSteps.ts
│   └── types/
│       └── filter.ts
├── index.html
├── tailwind.config.js
└── tsconfig.json
```

---

## 3. Архитектура и поток данных

**Три сущности:**

1. **Каталог фильтров** (`filters.ts`) — для каждого `stepId`: русский label, русское описание опций, английский `promptText` для каждой опции (подставляется в промт).
2. **Правила зависимостей** (`dependencies.ts`) — условия видимости шагов и фильтрации опций.
3. **Состояние выборов** (Zustand store с `persist`) — плоский объект `{ stepId: value }` + автосохранение в localStorage.

**Поток:**

```
[клик опции]
  → store.setSelection(stepId, value)
  → автоочистка дочерних выборов, ставших невалидными
  → useVisibleSteps пересчитывает видимые шаги
  → buildPrompt() собирает английский промт (каркас + вставки)
  → UI перерисовывается (новые шаги, обновлённый превью)
  → localStorage обновляется
```

**Ключевая идея:** каждое значение в `filters.ts` — это объект вида:

```typescript
{
  id: 'young',
  labelRu: 'Молодой (20–29 лет)',
  promptText: 'young',        // то, что попадёт в английский промт
  slot: 'MODEL_TYPE'          // в какой слот промта
}
```

Это позволяет держать двуязычность данных чисто и без путаницы.

---

## 4. UI/UX концепция и требования к дизайну

### Тональность

**Аскетичный минимализм, редакторская эстетика.** Приложение работает рядом с индустрией одежды — значит, оно само должно выглядеть как инструмент фэшн-редактора: много воздуха, никакого визуального шума, типографика как главный выразительный элемент.

### Палитра

- Фон: off-white / кремовый (`#FAFAF7`) или чистый белый.
- Контент: глубокий угольно-чёрный (`#1A1A1A`) вместо чистого чёрного.
- Вторичный текст: тёплый серый (`#6B6B66`).
- Границы и разделители: очень светлый тёплый серый (`#EAEAE4`).
- Акцент (один): тёмно-оливковый (`#4A5240`) или терракотовый (`#B85C3C`). Используется только для активных состояний, кнопки «Скопировать» и прогресс-индикации.
- Никаких градиентов, никаких цветных бейджей, никаких эмодзи в UI.

### Типографика

- UI-шрифт: **Inter** или **Geist Sans**. Один шрифт на всё приложение.
- Превью промта: моноширинный — **JetBrains Mono** или **Geist Mono**.
- Иерархия размеров минимальная: заголовок шага (16–17px, medium), основной текст (14–15px, regular), вспомогательный (12–13px, regular).
- Высота строки просторная (1.55–1.7). Межбуквенное расстояние у заголовков — слегка отрицательное (-0.01em).

### Композиция

- Десктоп: двухколоночная (60/40), правая колонка sticky.
  - Левая (≈60%): поток карточек-шагов сверху вниз.
  - Правая (≈40%): превью собранного промта + кнопки действий.
- Планшет: та же двухколоночная, но 55/45.
- Мобильный: одноколоночная, превью закреплено снизу (collapsible sheet с высотой 30% экрана, разворачивается по тапу).

### Карточка шага

- Простой прямоугольник с тонкой границей (1px), радиус 6–8px.
- Минимум отступов внутри нет — наоборот, просторно (padding 20–24px).
- Заголовок шага + опциональное однострочное пояснение.
- Опции — либо компактные чипы (если 2–6 штук, строка длиной до ~6 слов), либо выпадающий Select (если >6 или длинные тексты).
- Заполненный шаг визуально «успокаивается»: граница становится чуть темнее, внутри — выбранная опция крупным текстом.
- Незаполненный активный шаг — нейтральный, но с лёгким акцентом по границе.
- Невидимый (по каскаду) шаг — не рендерится вовсе (никаких disabled-состояний).

### Анимации

- Появление шага: fade-in + slide вниз на 8–12px за 220–280мс, easing `ease-out`.
- Смена опции: микро-подсветка границы на 150мс.
- Копирование промта: чекмарк заменяет иконку копирования на 1.5 сек.
- Никаких bounce, spring, параллакса, hover-увеличений.

### Иконография

- Только тонкие линейные иконки из **lucide-react** (weight 1.5px).
- Используется 4–6 иконок на всё приложение: копировать, выполнено, сбросить, свернуть/развернуть, инфо.

### Правая колонка (превью промта)

- Фон панели чуть отличается от основного (`#F3F3EE`).
- Моноширинный текст, size 13px, высота строки 1.6.
- Текст разбит на смысловые блоки с короткими подзаголовками (жирный caps, size 11px, `letter-spacing: 0.08em`) — ровно как в исходном промте пользователя: `TASK`, `MODEL TYPE`, `PRODUCT`, `SCENE DESCRIPTION` и т.д.
- Над превью — счётчик: `Заполнено 7 из 9 обязательных шагов`.
- Под превью — две кнопки в ряд: «Скопировать промт» (primary, с акцентным цветом) и «Сбросить всё» (secondary, text-button).
- Опционально: toggle «Ручное редактирование» — превращает превью в textarea, где можно подправить перед копированием.

### Шапка

- Максимально скромная: слева название проекта (plain text, size 14px, medium), справа прогресс-бар в виде тонкой линии.
- Высота ≤48px.

### Принципы взаимодействия

1. Один шаг — один фокус. Шаги появляются сверху вниз по мере заполнения, уже заполненные остаются доступными для правки.
2. Никаких обязательных кнопок «Далее» — переход по выбору.
3. Опциональные шаги помечены тегом `не обязательно` (тонкий outline, нейтральный цвет) и имеют кнопку «Пропустить» в виде текстовой ссылки.
4. Мгновенный фидбек: превью промта обновляется на каждый клик.
5. Ничего не прыгает: если шаг появляется ниже видимой области, страница плавно скроллит к нему.

---

## 5. Каталог фильтров

Фильтры сгруппированы в 5 блоков, соответствующих слотам промта. Для каждой опции ниже указан её английский `promptText` — именно он попадает в собранный промт.

### Блок A: Модель → слот `MODEL TYPE`

Итоговая строка формата: `<age> <ethnicity?> <gender> with <hair>, <facial_hair?>, <features?>`

#### A1. `gender` — Пол (обязательно)

| id | labelRu | promptText |
|---|---|---|
| male | Мужчина | man |
| female | Женщина | woman |

#### A2. `ageGroup` — Возраст (обязательно)

| id | labelRu | promptText |
|---|---|---|
| teen | Подросток (16–19) | teenage |
| young | Молодой (20–29) | young |
| adult | Взрослый (30–45) | adult |
| mature | Зрелый (45–60) | mature |
| senior | Пожилой (60+) | senior |

#### A3. `ethnicity` — Тип внешности (обязательно)

| id | labelRu | promptText |
|---|---|---|
| slavic | Славянская | slavic |
| european | Западноевропейская | european |
| scandinavian | Скандинавская | scandinavian |
| mediterranean | Средиземноморская | mediterranean |
| asian_east | Восточноазиатская | east asian |
| asian_central | Центральноазиатская | central asian |
| south_asian | Южноазиатская | south asian |
| african | Африканская | african |
| latino | Латиноамериканская | latino |
| middle_eastern | Ближневосточная | middle eastern |
| mixed | Смешанная | mixed-race |

#### A4. `bodyType` — Телосложение (обязательно)

| id | labelRu | promptText | условие |
|---|---|---|---|
| slim | Стройное | slim build | — |
| athletic | Атлетичное | athletic build | — |
| average | Среднее | average build | — |
| curvy | С изгибами | curvy build | только female |
| muscular | Мускулистое | muscular build | только male |
| plus_size | Plus-size | plus-size | — |

#### A5. `hairLength` — Длина волос (обязательно)

| id | labelRu | promptText |
|---|---|---|
| bald | Бритый налысо | shaved head |
| very_short | Очень короткие | very short hair |
| short | Короткие | short hair |
| medium | Средние (до плеч) | medium-length hair |
| long | Длинные | long hair |
| very_long | Очень длинные | very long hair |

#### A6. `hairColor` — Цвет волос (обязательно, скрыт при `hairLength=bald`)

| id | labelRu | promptText |
|---|---|---|
| black | Чёрный | black |
| dark_brown | Тёмно-каштановый | dark brown |
| brown | Каштановый | brown |
| light_brown | Светло-русый | light brown |
| blonde | Блонд | blonde |
| platinum | Платиновый блонд | platinum blonde |
| red | Рыжий | red |
| grey | Седой | grey |
| white | Полностью белый | white |
| dyed_unusual | Крашеный яркий | unnaturally dyed |

> **Сборка hair-блока:** `"{hairColor.promptText} {hairLength.promptText}"` → например `"light brown long hair"`. Для `bald` → просто `"shaved head"`, без цвета.

#### A7. `facialHair` — Борода/усы (обязательно, только `gender=male`)

| id | labelRu | promptText |
|---|---|---|
| clean_shaven | Гладко выбрит | clean-shaven |
| stubble | Щетина | light stubble |
| short_beard | Короткая борода | a short beard |
| full_beard | Полная борода | a full beard |
| goatee | Козлиная бородка | a goatee |
| mustache | Только усы | a mustache only |

> `clean_shaven` в промт не вставляется (умолчание). Остальные варианты превращаются в `"with {promptText}"`.

#### A8. `features` — Особенности (опционально, мультивыбор)

| id | labelRu | promptText |
|---|---|---|
| visible_tattoo | Видимые татуировки | visible tattoos |
| glasses_optical | Очки | glasses |
| glasses_sun | Солнцезащитные очки | sunglasses |
| freckles | Веснушки | freckles |
| earrings | Серьги | earrings |

> Если выбрано несколько — объединяем через запятую: `"with visible tattoos, glasses"`.

**Итоговая сборка блока MODEL TYPE (пример):**

> `young slavic man, athletic build, with short dark brown hair, a full beard, visible tattoos`

---

### Блок B: Продукт → слот `PRODUCT`

Строка формата: `<color> <material?> <gender_target> <category>[ (<components?>)]`

#### B1. `productGender` — Для кого товар (обязательно)

| id | labelRu | promptText |
|---|---|---|
| men | Мужской | men's |
| women | Женский | women's |
| unisex | Унисекс | unisex |
| kids | Детский | kids' |

#### B2. `productCategory` — Категория (обязательно)

Двухуровневый выбор. Верхний уровень:

- `top` — Верх
- `bottom` — Низ
- `outerwear` — Верхняя одежда
- `dress` — Платья/юбки *(только для women/kids)*
- `full_outfit` — Комплект/костюм
- `footwear` — Обувь
- `accessory` — Аксессуар

Нижний уровень зависит от верхнего:

**Если `top`:**
| id | labelRu | promptText |
|---|---|---|
| tshirt | Футболка | t-shirt |
| polo | Поло | polo shirt |
| shirt | Рубашка | button-up shirt |
| longsleeve | Лонгслив | long-sleeve shirt |
| sweater | Свитер | sweater |
| hoodie | Худи | hoodie |
| sweatshirt | Свитшот | sweatshirt |
| tanktop | Майка | tank top |

**Если `bottom`:**
| id | labelRu | promptText |
|---|---|---|
| jeans | Джинсы | jeans |
| trousers | Брюки | trousers |
| shorts | Шорты | shorts |
| joggers | Джоггеры | joggers |
| skirt | Юбка | skirt |
| leggings | Легинсы | leggings |

**Если `outerwear`:**
| id | labelRu | promptText |
|---|---|---|
| jacket | Куртка | jacket |
| coat | Пальто | coat |
| parka | Парка | parka |
| trench | Тренч | trench coat |
| blazer | Пиджак | blazer |
| bomber | Бомбер | bomber jacket |
| windbreaker | Ветровка | windbreaker |

**Если `dress`:**
| id | labelRu | promptText |
|---|---|---|
| mini_dress | Мини-платье | mini dress |
| midi_dress | Миди-платье | midi dress |
| maxi_dress | Макси-платье | maxi dress |
| summer_dress | Летнее платье | summer dress |
| evening_dress | Вечернее платье | evening dress |

**Если `full_outfit`:**
| id | labelRu | promptText | components hint |
|---|---|---|---|
| suit | Деловой костюм | suit | blazer and trousers |
| tracksuit | Спортивный костюм | tracksuit | hoodie and joggers |
| cotton_set | Хлопковый комплект | cotton outfit set | t-shirt and pants |
| two_piece | Комплект из двух предметов | two-piece outfit | — |
| jumpsuit | Комбинезон | jumpsuit | — |

**Если `footwear`:** sneakers, boots, loafers, sandals, heels, flats, dress_shoes
**Если `accessory`:** bag, belt, hat, scarf, gloves, cap, backpack

#### B3. `productColor` — Цвет (обязательно)

| id | labelRu | promptText |
|---|---|---|
| black | Чёрный | black |
| white | Белый | white |
| off_white | Молочный | off-white |
| beige | Бежевый | beige |
| grey | Серый | grey |
| navy | Тёмно-синий | navy |
| blue | Синий | blue |
| light_blue | Голубой | light blue |
| green | Зелёный | green |
| olive | Оливковый | olive |
| khaki | Хаки | khaki |
| brown | Коричневый | brown |
| red | Красный | red |
| burgundy | Бордовый | burgundy |
| pink | Розовый | pink |
| yellow | Жёлтый | yellow |
| multicolor | Многоцветный | multicolor |
| patterned | С принтом | patterned |

#### B4. `productMaterial` — Материал (опционально)

| id | labelRu | promptText |
|---|---|---|
| cotton | Хлопок | cotton |
| linen | Лён | linen |
| wool | Шерсть | wool |
| cashmere | Кашемир | cashmere |
| silk | Шёлк | silk |
| denim | Деним | denim |
| leather | Кожа | leather |
| suede | Замша | suede |
| knit | Трикотаж | knit |
| fleece | Флис | fleece |
| nylon | Нейлон | nylon |
| polyester | Полиэстер | polyester |

#### B5. `productDetails` — Уточнение (опционально, свободный ввод)

Поле-textarea на 1–2 строки. Пользователь может дописать уточнение, которое будет добавлено в конец блока PRODUCT в скобках. Пример: `oversized fit` → `... (oversized fit)`.

> **Важно:** на MVP русский ввод здесь не переводится автоматически. Рекомендовать пользователю писать английским или дублировать (русский в скобках).

**Итоговая сборка блока PRODUCT (примеры):**

> `black cotton men's cotton outfit set (t-shirt and pants)`
> `beige women's wool coat`
> `navy patterned unisex bomber jacket`

---

### Блок C: Стайлинг → слот `SCENE DESCRIPTION`

Необязательный блок. Если ни одна опция не выбрана, слот остаётся пустым и полностью исключается из промта.

#### C1. `fitNotes` — Посадка и подача (опционально, мультивыбор)

| id | labelRu | promptText |
|---|---|---|
| tucked_in | Верх заправлен | top tucked in |
| sleeves_rolled | Рукава закатаны | sleeves rolled up |
| buttoned_up | Застёгнуто полностью | fully buttoned |
| unbuttoned | Расстёгнуто | unbuttoned casually |
| open_jacket | Куртка расстёгнута | jacket worn open |
| layered | Со слоями | styled with layering |
| oversized_look | Оверсайз-посадка | oversized styling |
| fitted_look | Облегающая посадка | fitted silhouette |

#### C2. `supportingItems` — Дополнительные элементы (опционально, мультивыбор)

Подсказки для AI, что можно добавить в look (минимально, без брендов). Уже ограничено `EXTRA STYLING RULE` в пасте, но здесь — явные намёки.

| id | labelRu | promptText |
|---|---|---|
| minimal_sneakers | Минималистичные кроссовки | minimal white sneakers |
| leather_boots | Кожаные ботинки | plain leather boots |
| dress_shoes | Классические туфли | simple dress shoes |
| neutral_bag | Нейтральная сумка | a minimal unbranded bag |
| thin_belt | Тонкий ремень | a thin leather belt |
| simple_cap | Простая кепка | a plain cap |
| scarf | Шарф | a neutral scarf |

#### C3. `customStyling` — Своё уточнение (опционально, свободный ввод, EN)

Одна строка для кастомной инструкции на английском. Пример: `shirt slightly oversized on the shoulders`.

---

### Блок D: Настроение и локация → слот `Reference mood` и опционально `LOCATION OVERRIDE`

#### D1. `moodReference` — Эстетическое настроение (обязательно)

| id | labelRu | promptText |
|---|---|---|
| fashion_magazine | Как в фэшн-журнале | like fashion magazines |
| minimalist_editorial | Минималистичная редакция | minimalist editorial |
| luxury_editorial | Люкс-редакторская | high-end luxury editorial |
| streetwear | Уличная мода | authentic streetwear |
| urban_casual | Городская повседневность | urban casual lifestyle |
| cozy_lifestyle | Уютный лайфстайл | warm cozy lifestyle |
| scandinavian | Скандинавская сдержанность | scandinavian minimalism |
| mediterranean_summer | Средиземноморское лето | mediterranean summer vibe |
| nordic_winter | Нордическая зима | crisp nordic winter mood |
| y2k | Y2K | y2k revival aesthetic |
| clean_catalog | Чистый каталог | clean commercial catalog |
| cinematic | Кинематографично | cinematic editorial |

#### D2. `locationMode` — Режим выбора локации (обязательно)

| id | labelRu | promptText-влияние |
|---|---|---|
| auto | Автовыбор по настроению | локация выбирается моделью из `LOCATION SELECTION RULE` в пасте |
| explicit | Указать явно | в промт добавляется секция `LOCATION OVERRIDE` |

**Если `locationMode=explicit`** — появляются шаги D3–D6.

#### D3. `locationType` — Тип локации (обязательно при `explicit`)

| id | labelRu | promptText |
|---|---|---|
| studio | Студия | studio setting |
| indoor | В помещении | indoor setting |
| outdoor_urban | Городская среда | urban outdoor setting |
| outdoor_nature | Природа | natural outdoor setting |

#### D4. `locationSpecific` — Конкретная локация (обязательно при `explicit`, зависит от D3)

**Если `studio`:**
white_cyclorama → `a clean white cyclorama studio`
grey_seamless → `a neutral grey seamless studio`
beige_seamless → `a warm beige seamless studio`
black_seamless → `a black seamless studio`
textured_backdrop → `a textured concrete studio backdrop`

**Если `indoor`:**
minimalist_apartment → `a minimalist light-toned apartment interior`
industrial_loft → `an industrial loft with brick and concrete`
cozy_bedroom → `a cozy warm-lit bedroom`
cafe_interior → `a stylish cafe interior`
art_gallery → `a modern art gallery with white walls`
hotel_lobby → `a refined hotel lobby`
staircase → `a modernist concrete staircase`
empty_room → `an empty sunlit room with large windows`

**Если `outdoor_urban`:**
narrow_street → `a narrow old-European city street`
modern_plaza → `a modern city plaza`
brutalist → `brutalist concrete architecture`
neon_night → `a neon-lit night street`
rooftop → `a city rooftop with skyline view`
bridge → `an urban pedestrian bridge`
metro_station → `a contemporary metro station`

**Если `outdoor_nature`:**
forest_path → `a quiet forest path`
open_field → `an open grassy field`
mountain_vista → `a mountain vista`
sandy_beach → `a sandy beach`
rocky_coast → `a rocky coastal landscape`
wheat_field → `a golden wheat field`
lake_shore → `a calm lake shore`
flower_garden → `a blooming garden`
snow_forest → `a snow-covered forest`

#### D5. `season` — Время года (только `outdoor_*`, обязательно)

spring → `spring`, summer → `summer`, autumn → `autumn`, winter → `winter`

#### D6. `timeOfDay` — Время суток (обязательно при `explicit`)

morning_soft → `soft morning light`
midday → `bright midday light`
golden_hour → `golden hour lighting`
blue_hour → `blue hour twilight`
overcast → `soft overcast daylight` *(только outdoor)*
night → `nighttime with ambient city light` *(только outdoor_urban / indoor)*

---

### Блок E: Кадр → опционально

#### E1. `framing` — Крупность (обязательно, default `full_body`)

full_body → `full body shot`
three_quarter → `three-quarter length shot`
medium → `medium shot, waist up`

#### E2. `aspectRatio` — Соотношение сторон (обязательно)

portrait_3_4 → `3:4`
portrait_2_3 → `2:3`
portrait_9_16 → `9:16`
square → `1:1`

---

## 6. Логика каскадных зависимостей

### Правила видимости

| Шаг | Показан, если |
|---|---|
| A6 `hairColor` | A5 `hairLength !== bald` |
| A7 `facialHair` | A1 `gender === male` |
| B3 subcategory | B2 category выбран |
| C1–C3 | шаги опциональные, всегда доступны после B |
| D3–D6 | D2 `locationMode === explicit` |
| D5 `season` | D2=explicit AND D3 начинается с `outdoor_` |
| D6 опция `overcast` | D3 начинается с `outdoor_` |
| D6 опция `night` | D3 ∈ {`outdoor_urban`, `indoor`} |

### Фильтрация опций

1. `bodyType`: `curvy` — только female, `muscular` — только male.
2. `productCategory` subcategory `dress` — только если `productGender ∈ {women, kids, unisex}`.
3. `locationSpecific` — показываются только опции из подгруппы, соответствующей `locationType`.
4. `season` опции остаются все 4 независимо от прочего.
5. `timeOfDay` — `night` скрыт при `locationType=outdoor_nature`, `overcast` скрыт не-outdoor.

### Автоочистка при смене родителя

При `setSelection(parentId, newValue)` проверяем все зависимые от parentId шаги:

- Если их текущее значение больше не в допустимом множестве — обнуляем.
- Показываем короткий тост: «Обновлены связанные поля: {список}».

### Порядок отображения шагов

`A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8 → B1 → B2.top → B2.sub → B3 → B4 → B5 → C1 → C2 → C3 → D1 → D2 → [D3 → D4 → D5 → D6] → E1 → E2`

---

## 7. Сборка промта

### 7.1 Статический каркас (паста)

Хранится в `promptSkeleton.ts` как одна экспортируемая строка-шаблон с плейсхолдерами `{{SLOT_NAME}}`. Текст **не меняется** между генерациями.

```text
TASK:
Create a photorealistic fashion marketplace image using the provided garment reference photos.

INPUT:
- Images 1–3: photos of the SAME garment/product from different angles.
- The garment may be shown on a person, mannequin, hanger, or flat lay.

MODEL TYPE:
- {{MODEL_TYPE}}

PRODUCT:
- {{PRODUCT}}

GOAL:
Generate a realistic commercial fashion image where a naturally looking model wears the exact garment from the reference images.

The uploaded photos must be treated as product reference only, NOT as identity reference.

IMPORTANT MODEL INSTRUCTION:
- Do NOT copy, reconstruct, or preserve the identity, face, body, pose, hairstyle, or proportions of any person visible in the reference images.
- If the garment is shown on a human in the uploaded photos, use that person only as a clothing carrier reference.
- Create a new, neutral, realistic fashion model suitable for a marketplace campaign.

GARMENT PRESERVATION RULES:
The garment is the product being sold and must remain EXACTLY the same as in the reference images.

Do NOT redesign, restyle, simplify, or reinterpret the product in any way.

PRESERVE ALL GARMENT DETAILS EXACTLY:
- garment type and overall silhouette
- fit and proportions
- color and color balance
- fabric texture and material appearance
- seams and stitching
- folds and drape behavior
- waistband, cuffs, hems, collars, sleeves, pockets
- buttons, zippers, buckles, drawstrings and other hardware
- logos, labels, patches, embroidery, graphics and prints
- trims, piping, edges and finishing details

If some parts are visible only in certain angles, use all uploaded images together to reconstruct the most accurate final product appearance.

{{SCENE_DESCRIPTION_BLOCK}}

{{LOCATION_BLOCK}}

EXTRA STYLING RULE:
The AI may add missing outfit elements only when necessary to create a complete and realistic look.

Any added items must be:
- minimal
- neutral
- unbranded
- non-distracting

Restrictions:
- no visible logos
- no text
- no branded hardware
- no monograms
- no signature patterns
- no large graphics

All additions must serve only as supportive styling, while the main garment remains fully visible and dominant in the image.

SCENE INTEGRATION:
The model must look fully native to the scene, not pasted in.

Match and recalculate:
- lighting direction
- light softness or hardness
- exposure
- color temperature
- reflections
- perspective
- depth of field
- contact with surfaces and surrounding objects

SHADOWS:
Generate realistic shadows and grounding:
- contact shadows under feet/body
- correct shadow direction
- natural light interaction with the environment
- realistic depth and dimensionality

REALISM REQUIREMENT:
The final result must look like a real professional fashion photograph shot with a real camera.

Requirements:
- ultra-photorealistic skin
- realistic fabric and folds
- natural lighting
- no CGI look
- no plastic skin
- no over-smoothing
- no fake anatomy
- no artificial fabric behavior

STYLE:
- high-end commercial fashion photography
- marketplace-ready image
- editorial quality
- natural proportions
- real camera optics
- clean composition
- premium visual presentation
- ultra-photorealistic
- {{FRAMING}}
- aspect ratio {{ASPECT_RATIO}}

NEGATIVE PROMPT:
- copying the original model identity
- same face as reference person
- preserving the person from the source images
- altered garment design
- wrong fit
- changed length
- changed color
- modified fabric
- missing details
- simplified seams
- missing hardware
- removed logos
- inaccurate prints
- unrealistic folds
- poor draping
- floating body
- pasted subject
- bad perspective
- incorrect shadows
- over-smoothed skin
- CGI
- 3D render look
- cartoon style
- distorted anatomy
- extra limbs
- blurry image
- low resolution
- artifacts

FINAL PRIORITY:
1. Preserve the garment exactly as uploaded.
2. Do not preserve the identity of the original person from the reference photos.
3. Make the final image look like a real premium marketplace fashion photoshoot.
```

### 7.2 Динамические слоты

| Слот | Источник | Что туда подставляется |
|---|---|---|
| `{{MODEL_TYPE}}` | Блок A | Одна строка: `"young slavic man, athletic build, with short dark brown hair, a full beard, visible tattoos"` |
| `{{PRODUCT}}` | Блок B | Одна строка: `"black cotton men's cotton outfit set (t-shirt and pants)"` |
| `{{SCENE_DESCRIPTION_BLOCK}}` | Блок C | Полный секционный блок или пустая строка (см. 7.3) |
| `{{LOCATION_BLOCK}}` | Блок D | Секция `LOCATION SELECTION RULE` (auto) либо `LOCATION OVERRIDE` (explicit) + `Reference mood` |
| `{{FRAMING}}` | E1 | `"full body shot"` и т.п. |
| `{{ASPECT_RATIO}}` | E2 | `"3:4"` и т.п. |

### 7.3 Правила сборки блоков

**MODEL_TYPE:**

```
parts = []
parts.push(ageGroup.promptText)              // "young"
if ethnicity: parts.push(ethnicity.promptText) // "slavic"
parts.push(gender.promptText)                // "man"

extras = []
if bodyType !== 'average': extras.push(bodyType.promptText)

hairPart = hairLength === 'bald'
  ? 'with a shaved head'
  : `with ${hairColor.promptText} ${hairLength.promptText}`
extras.push(hairPart)

if facialHair && facialHair !== 'clean_shaven':
  extras.push(facialHair.promptText)        // "a full beard"

if features.length:
  extras.push(features.map(f => f.promptText).join(', '))

result = parts.join(' ') + (extras.length ? ', ' + extras.join(', ') : '')
// → "young slavic man, athletic build, with short dark brown hair, a full beard, visible tattoos"
```

**PRODUCT:**

```
parts = [productColor.promptText]
if productMaterial: parts.push(productMaterial.promptText)
parts.push(productGender.promptText)
parts.push(productSubcategory.promptText)

base = parts.join(' ')

if componentsHint (для full_outfit):
  base += ` (${componentsHint})`

if productDetails (custom input):
  base += ` (${productDetails})`

// → "black cotton men's cotton outfit set (t-shirt and pants)"
```

**SCENE_DESCRIPTION_BLOCK** (если есть хоть одна опция в C1/C2/C3):

```
SCENE DESCRIPTION:
- {fitNotes.promptText.join('; ')}
- {supportingItems.promptText.join('; ')}
- {customStyling}
```

Пустые строки не выводить. Если блок целиком пуст — подставить пустую строку.

**LOCATION_BLOCK:**

Если `locationMode=auto`:

```
LOCATION SELECTION RULE:
Choose the location automatically based on:
- the style
- mood
- season
- purpose
- visual character of the garment

The location must feel:
- natural
- stylish
- commercially attractive
- logically connected to the clothing

Reference mood:
- {moodReference.promptText}
```

Если `locationMode=explicit`:

```
LOCATION:
- {locationSpecific.promptText}
- {timeOfDay.promptText}
{season ? `- ${season.promptText} season` : ''}

Reference mood:
- {moodReference.promptText}
```

---

## 8. Пример полного сгенерированного промта

**Выборы пользователя (в русском UI):**

- Пол: Мужчина / Возраст: Молодой (20–29) / Внешность: Славянская / Телосложение: Атлетичное
- Волосы: Короткие, Тёмно-каштановый / Борода: Полная борода / Особенности: Видимые татуировки
- Продукт: Мужской / Комплект / Хлопковый комплект (футболка и брюки) / Чёрный / Хлопок
- Стайлинг: Верх заправлен / Минималистичные кроссовки
- Настроение: Как в фэшн-журнале / Локация: Автовыбор
- Кадр: Полноростовой / 3:4

**Собранный промт (английский, копируется одной кнопкой):**

```
TASK:
Create a photorealistic fashion marketplace image using the provided garment reference photos.

INPUT:
- Images 1–3: photos of the SAME garment/product from different angles.
- The garment may be shown on a person, mannequin, hanger, or flat lay.

MODEL TYPE:
- young slavic man, athletic build, with dark brown short hair, a full beard, visible tattoos

PRODUCT:
- black cotton men's cotton outfit set (t-shirt and pants)

GOAL:
Generate a realistic commercial fashion image where a naturally looking model wears the exact garment from the reference images.

[... вся статическая паста без изменений ...]

SCENE DESCRIPTION:
- top tucked in
- minimal white sneakers

LOCATION SELECTION RULE:
Choose the location automatically based on:
- the style
- mood
- season
- purpose
- visual character of the garment

The location must feel:
- natural
- stylish
- commercially attractive
- logically connected to the clothing

Reference mood:
- like fashion magazines

[... паста EXTRA STYLING RULE, SCENE INTEGRATION, SHADOWS, REALISM REQUIREMENT ...]

STYLE:
- high-end commercial fashion photography
- marketplace-ready image
- editorial quality
- natural proportions
- real camera optics
- clean composition
- premium visual presentation
- ultra-photorealistic
- full body shot
- aspect ratio 3:4

NEGATIVE PROMPT:
[... неизменна ...]

FINAL PRIORITY:
1. Preserve the garment exactly as uploaded.
2. Do not preserve the identity of the original person from the reference photos.
3. Make the final image look like a real premium marketplace fashion photoshoot.
```

---

## 9. Функциональные требования MVP

**Обязательно:**

1. Все шаги из раздела 5 с каскадом из раздела 6.
2. Живой превью собранного промта в правой колонке, с секционными подзаголовками (TASK, MODEL TYPE, PRODUCT, LOCATION и т.д.).
3. Кнопка «Скопировать промт» с визуальным подтверждением (смена иконки на 1.5с).
4. Кнопка «Сбросить всё» с подтверждением.
5. Счётчик `Заполнено X из Y обязательных шагов` и тонкий прогресс-бар в шапке.
6. Возможность в любой момент вернуться и изменить заполненный шаг.
7. Автоочистка дочерних выборов при смене родителя, с тостом.
8. Автосохранение состояния в localStorage.
9. Правильная обработка пустых опциональных блоков — не выводить пустые секции в промт.

**Желательно:**

10. Пресеты: сохранить текущую комбинацию под именем, загрузить одним кликом, удалить.
11. Toggle «Ручное редактирование» — превращает превью в редактируемый textarea.
12. Экспорт/импорт пресетов JSON.

**В v2:**

13. Интеграция Wavespeed API — генерация прямо из интерфейса.
14. Режим «Вариации» — первая генерация становится референсом, основные фильтры (модель/продукт) блокируются, активны только `pose/framing/angle` (которые нужно будет добавить в этот режим).
15. Галерея результатов с историей промтов.

---

## 10. Критерии приёмки

1. `npm install && npm run dev` → приложение поднимается на `localhost:5173` без ошибок.
2. Все шаги раздела 5 отображаются в правильном порядке, каскад работает: при смене `gender` обнуляется `facialHair`, при смене `hairLength=bald` скрываются `hairColor/hairStyle`, при смене `locationMode` скрываются/появляются D3–D6.
3. Превью промта обновляется синхронно с каждым выбором и содержит правильные английские подстановки.
4. Статическая паста выводится без изменений между генерациями (побайтовое сравнение прогонов с разными выборами).
5. Кнопка «Скопировать» кладёт в буфер обмена ровно тот текст, что виден в превью.
6. После перезагрузки страницы состояние восстанавливается из localStorage.
7. Невидимые по каскаду шаги не рендерятся в DOM.
8. Дизайн соответствует разделу 4: только заявленные цвета, только два шрифта, без эмодзи, без градиентов.
9. Десктоп ≥1280px, планшет ≥768px, мобильный ≥360px — все три разрешения корректны.

---

## 11. Что передать в Claude Design

Для генерации дизайна достаточно этого ТЗ + краткого брифа:

- **Тон:** аскетичный минимализм, редакторская фэшн-эстетика.
- **Палитра:** off-white (`#FAFAF7`), угольный (`#1A1A1A`), тёплый серый (`#6B6B66`), светло-серые границы (`#EAEAE4`), один акцент — тёмно-оливковый (`#4A5240`) или терракотовый (`#B85C3C`).
- **Шрифты:** Inter/Geist Sans для UI, JetBrains/Geist Mono для превью промта.
- **Плотность:** просторная, много воздуха.
- **Анимации:** только fade+slide (220–280мс), никаких spring и bounce.
- **Иконки:** только lucide-react, тонкие (weight 1.5px).
- **Макет:** десктоп 60/40, правая колонка sticky; мобильный — одноколоночный с нижним collapsible sheet для превью.
- **Приоритет:** функциональность и читаемость выше декоративности. Никаких эмодзи, цветных бейджей, гради­ентов, иллюстраций.
