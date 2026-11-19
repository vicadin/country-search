# DESIGN.md

## 1. Отмена устаревших запросов (`AbortController`)

В `createSearchController` (`src/state/searchController.ts`) при каждом изменении ввода в `handleInput` (и при очистке поля) немедленно вызываются `debouncedSearch.cancel()` и `activeController.abort()`, не дожидаясь срабатывания нового `debounce`.

В `searchCountries` (`src/api/searchCountries.ts`) внешний сигнал объединяется с таймаутом через `AbortSignal.any([callerSignal, AbortSignal.timeout(timeoutMs)])`. В `catch` функция `classifySearchError` (`src/api/classifySearchError.ts`) различает:

- `AbortError` — тихая отмена пользователем, UI не показывает ошибку;
- `TimeoutError`, `HttpError` (кроме `404`) и сетевые сбои — реальная ошибка с кнопкой «Повторить»;
- `404` — пустой результат (`[]`), состояние «Ничего не найдено».

**Почему не флаг актуальности:** флаг лишь игнорирует ответ в UI постфактум, оставляя сетевое соединение открытым и выполняя лишний парсинг JSON. `AbortController` реально прерывает `fetch` на уровне браузера (статус `canceled` в Network tab).

## 2. Задержка `debounce` (`350 мс`)

В `src/state/searchController.ts` задана задержка `DEFAULT_DEBOUNCE_MS = 350`.

- **Почему 350 мс:** пауза между клавишами при обычном наборе составляет ~120–250 мс, поэтому 350 мс объединяет промежуточные префиксы в один запрос и сохраняет ощущение мгновенного отклика.
- **Если убрать (`0 мс`):** на каждую букву уходит лишний запрос и немедленный `abort()`, растёт нагрузка на API и мелькает индикатор загрузки.
- **Если сильно увеличить (`1000+ мс`):** после окончания ввода интерфейс выглядит «зависшим» больше секунды до начала поиска.

## 3. Сложность (Big O) для `mapCountryResponse`

В `src/utils/mapCountryResponse.ts` `mapCountryResponse(raw)` обходит $N$ стран одним проходом `raw.map(mapCountry)`. Для каждой страны `mapCountry` линейно проходит по `languages` ($L$), `currencies` ($C$) и `borders` ($B$).

- **Время:** $O(N \cdot (L + C + B))$. Так как у одной страны число языков, валют и границ ограничено малой константой, практически **$O(N)$**.
- **Память:** $O(N \cdot (L + C + B))$ (практически **$O(N)$**) на создание нового массива `Country[]` без мутации входных данных.

## 4. Принципы чистого кода

- **Single Responsibility:**
  - `src/utils/debounce.ts` (`debounce`) — только таймер и `.cancel()`;
  - `src/api/errors.ts` (`HttpError`) и `src/api/searchCountries.ts` (`searchCountries`) — только `fetch`, проверка `response.ok`, обработка `404` и композиция сигналов;
  - `src/api/classifySearchError.ts` (`classifySearchError`) — классификация ошибок;
  - `src/utils/mapCountryResponse.ts` (`mapCountryResponse`, `mapCountry`) — чистый маппинг JSON в модель;
  - `src/state/searchController.ts` (`createSearchController`) — управление состоянием и отменой запросов без DOM;
  - `src/ui/dom.ts` (`el`, `createSvgIcon`) и `src/ui/renderApp.ts` (`mountCountrySearchApp`) — только DOM-слой.
- **Чистые функции и иммутабельность:** `mapCountryResponse` и `classifySearchError` не имеют побочных эффектов и не мутируют входные объекты; `getState` возвращает копию состояния.
- **Изоляция от браузера:** `src/api/*`, `src/utils/*` и `src/state/*` не зависят от `document`/`window` и тестируются в Vitest без браузера.
- **Безопасный DOM:** в `src/ui/*` не используются `innerHTML` и `insertAdjacentHTML`, контент вставляется через `textContent`.
