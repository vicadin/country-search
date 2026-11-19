import { createSearchController, type SearchState } from '../state/searchController.ts';
import type { Country } from '../types/country.ts';
import { createSvgIcon, el } from './dom.ts';

const SEARCH_ICON_PATHS = ['M21 21l-4.35-4.35', 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z'];
const CLOSE_ICON_PATHS = ['M18 6L6 18', 'M6 6l12 12'];
const ALERT_ICON_PATHS = [
  'M12 9v4',
  'M12 17h.01',
  'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
];

function formatPopulation(population: number): string {
  return population.toLocaleString('en-US');
}

function formatArea(area: number | null): string {
  return area !== null ? `${area.toLocaleString('en-US')} km²` : '—';
}

function createFlagMedia(country: Country, className: string): HTMLElement {
  const wrapper = el('div', { className });

  if (country.flag) {
    const img = el('img', {
      className: 'flag-image',
      attrs: {
        src: country.flag,
        alt: `Flag of ${country.name}`,
        loading: 'lazy',
        referrerpolicy: 'no-referrer',
      },
    });

    img.addEventListener('error', () => {
      img.remove();
      wrapper.appendChild(
        el('span', {
          className: 'flag-fallback',
          text: country.flagEmoji || country.id,
          attrs: { 'aria-hidden': 'true' },
        })
      );
    });

    wrapper.appendChild(img);
  } else {
    wrapper.appendChild(
      el('span', {
        className: 'flag-fallback',
        text: country.flagEmoji || country.id,
        attrs: { 'aria-hidden': 'true' },
      })
    );
  }

  return wrapper;
}

function createCountryCard(country: Country, onSelect: (id: string) => void): HTMLButtonElement {
  const card = el('button', {
    className: 'country-card',
    attrs: {
      type: 'button',
      'aria-label': `Open details for ${country.name}`,
    },
    children: [
      createFlagMedia(country, 'card-flag'),
      el('div', {
        className: 'card-body',
        children: [
          el('div', {
            className: 'card-header',
            children: [
              el('h2', { className: 'card-title', text: country.name }),
              el('span', { className: 'card-region', text: country.region }),
            ],
          }),
          el('dl', {
            className: 'card-facts',
            children: [
              el('div', {
                className: 'fact-row',
                children: [
                  el('dt', { className: 'fact-label', text: 'Capital' }),
                  el('dd', { className: 'fact-value', text: country.capital }),
                ],
              }),
              el('div', {
                className: 'fact-row',
                children: [
                  el('dt', { className: 'fact-label', text: 'Population' }),
                  el('dd', {
                    className: 'fact-value fact-numeric',
                    text: formatPopulation(country.population),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  card.addEventListener('click', () => onSelect(country.id));
  return card;
}

function createDetailRow(label: string, value: string, isNumeric = false): HTMLDivElement {
  return el('div', {
    className: 'detail-item',
    children: [
      el('dt', { className: 'detail-label', text: label }),
      el('dd', {
        className: isNumeric ? 'detail-value fact-numeric' : 'detail-value',
        text: value,
      }),
    ],
  });
}

function createDetailModal(country: Country, onClose: () => void): HTMLDivElement {
  const backdrop = el('div', {
    className: 'modal-backdrop',
    attrs: {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'country-detail-title',
    },
  });

  const closeButton = el('button', {
    className: 'modal-close',
    attrs: {
      type: 'button',
      'aria-label': 'Close country details',
    },
    children: [createSvgIcon(CLOSE_ICON_PATHS, 'icon-sm')],
  });
  closeButton.addEventListener('click', onClose);

  const languagesText = country.languages.length > 0 ? country.languages.join(', ') : '—';
  const currenciesText = country.currencies.length > 0 ? country.currencies.join(', ') : '—';
  const bordersText = country.borders.length > 0 ? country.borders.join(', ') : 'No land borders';

  const dialog = el('div', {
    className: 'modal-panel',
    children: [
      el('div', {
        className: 'modal-header',
        children: [
          el('div', {
            className: 'modal-title-group',
            children: [
              el('h2', {
                className: 'modal-title',
                text: country.name,
                attrs: { id: 'country-detail-title' },
              }),
              el('p', {
                className: 'modal-subtitle',
                text:
                  country.nativeName !== country.name
                    ? `${country.nativeName} · ${country.region}`
                    : country.region,
              }),
            ],
          }),
          closeButton,
        ],
      }),
      createFlagMedia(country, 'modal-flag'),
      el('p', { className: 'modal-description', text: country.description }),
      el('dl', {
        className: 'detail-grid',
        children: [
          createDetailRow('Capital', country.capital),
          createDetailRow('Population', formatPopulation(country.population), true),
          createDetailRow('Area', formatArea(country.area), true),
          createDetailRow('Borders', bordersText),
          createDetailRow('Languages', languagesText),
          createDetailRow('Currency', currenciesText),
        ],
      }),
    ],
  });

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      onClose();
    }
  });

  backdrop.appendChild(dialog);
  return backdrop;
}

export function mountCountrySearchApp(root: HTMLElement): () => void {
  const resultsRegion = el('section', {
    className: 'results-region',
    attrs: { 'aria-live': 'polite' },
  });

  const modalRoot = el('div', { className: 'modal-root' });

  const searchInput = el('input', {
    className: 'search-input',
    attrs: {
      id: 'country-search-input',
      type: 'text',
      placeholder: 'e.g. Spain, Japan, Brazil…',
      autocomplete: 'off',
      spellcheck: 'false',
    },
  });

  const clearButton = el('button', {
    className: 'clear-button',
    text: 'Clear',
    attrs: {
      type: 'button',
      hidden: 'true',
      'aria-label': 'Clear search',
    },
  });

  const searchForm = el('form', {
    className: 'search-form',
    attrs: { role: 'search' },
    children: [
      el('label', {
        className: 'sr-only',
        text: 'Search country by name',
        attrs: { for: 'country-search-input' },
      }),
      el('div', {
        className: 'search-box',
        children: [
          el('span', {
            className: 'search-icon',
            children: [createSvgIcon(SEARCH_ICON_PATHS, 'icon-sm')],
          }),
          searchInput,
          clearButton,
        ],
      }),
    ],
  });

  const pageShell = el('main', {
    className: 'app-shell',
    children: [
      el('header', {
        className: 'app-header',
        children: [
          el('h1', { className: 'app-title', text: 'Country Search' }),
          el('p', {
            className: 'app-lead',
            text: 'Live country directory search: capital, population, languages, borders, and currency.',
          }),
        ],
      }),
      searchForm,
      resultsRegion,
    ],
  });

  root.replaceChildren(pageShell, modalRoot);

  let lastFocusedCardTrigger: HTMLElement | null = null;

  const renderState = (state: SearchState): void => {
    clearButton.hidden = state.query.length === 0;

    if (state.status === 'idle') {
      resultsRegion.replaceChildren(
        el('div', {
          className: 'state-panel state-idle',
          children: [
            el('p', {
              className: 'state-title',
              text: 'Start typing a country name',
            }),
            el('p', {
              className: 'state-description',
              text: 'Enter a country name — matching results will appear automatically.',
            }),
          ],
        })
      );
    } else if (state.status === 'loading') {
      resultsRegion.replaceChildren(
        el('div', {
          className: 'state-panel state-loading',
          attrs: { role: 'status' },
          children: [
            el('span', { className: 'spinner', attrs: { 'aria-hidden': 'true' } }),
            el('span', { className: 'state-title', text: 'Searching countries…' }),
          ],
        })
      );
    } else if (state.status === 'empty') {
      resultsRegion.replaceChildren(
        el('div', {
          className: 'state-panel state-empty',
          children: [
            el('p', { className: 'state-title', text: 'No countries found' }),
            el('p', {
              className: 'state-description',
              text: `No matches for "${state.lastSubmittedQuery}". Try another country name.`,
            }),
          ],
        })
      );
    } else if (state.status === 'error') {
      const retryButton = el('button', {
        className: 'retry-button',
        text: 'Retry',
        attrs: { type: 'button' },
      });
      retryButton.addEventListener('click', () => {
        controller.retry();
      });

      resultsRegion.replaceChildren(
        el('div', {
          className: 'state-panel state-error',
          attrs: { role: 'alert' },
          children: [
            el('div', {
              className: 'error-header',
              children: [
                createSvgIcon(ALERT_ICON_PATHS, 'icon-error'),
                el('p', { className: 'state-title', text: 'Unable to load countries' }),
              ],
            }),
            el('p', {
              className: 'state-description',
              text:
                state.errorMessage ?? 'An unexpected error occurred while contacting the server.',
            }),
            retryButton,
          ],
        })
      );
    } else {
      const summary = el('p', {
        className: 'results-summary',
        text: `Countries found: ${state.countries.length}`,
      });

      const grid = el('div', { className: 'country-grid' });
      for (const country of state.countries) {
        grid.appendChild(
          createCountryCard(country, (id) => {
            lastFocusedCardTrigger = document.activeElement as HTMLElement | null;
            controller.selectCountry(id);
          })
        );
      }

      resultsRegion.replaceChildren(summary, grid);
    }

    if (state.selectedCountry) {
      const modal = createDetailModal(state.selectedCountry, () => {
        controller.selectCountry(null);
        lastFocusedCardTrigger?.focus();
      });
      modalRoot.replaceChildren(modal);
      const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close');
      closeBtn?.focus();
    } else {
      modalRoot.replaceChildren();
    }
  };

  const controller = createSearchController({
    onStateChange: renderState,
  });

  renderState(controller.getState());

  const handleInputEvent = (): void => {
    controller.handleInput(searchInput.value);
  };

  const handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (searchInput.value.trim()) {
      controller.retry();
    }
  };

  const handleClear = (): void => {
    searchInput.value = '';
    controller.handleInput('');
    searchInput.focus();
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && controller.getState().selectedCountry) {
      controller.selectCountry(null);
      lastFocusedCardTrigger?.focus();
    }
  };

  searchInput.addEventListener('input', handleInputEvent);
  searchForm.addEventListener('submit', handleSubmit);
  clearButton.addEventListener('click', handleClear);
  document.addEventListener('keydown', handleKeyDown);

  return (): void => {
    searchInput.removeEventListener('input', handleInputEvent);
    searchForm.removeEventListener('submit', handleSubmit);
    clearButton.removeEventListener('click', handleClear);
    document.removeEventListener('keydown', handleKeyDown);
    controller.destroy();
  };
}
