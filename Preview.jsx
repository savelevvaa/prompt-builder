// Правая колонка: превью + действия + пресеты

const { useState: useStateP, useEffect: useEffectP, useRef: useRefP, useMemo: useMemoP } = React;

// Конструирует подсвеченный JSX из собранного промта.
// Берёт исходный текст и оборачивает динамические вставки в <span class="preview-dyn">.
function renderHighlightedPrompt(text, parts, state) {
  // собираем список "подсветок": { find, className }
  const highlights = [];
  const push = (find, cls) => {
    if (find) highlights.push({ find, cls });
  };

  if (parts.MODEL_TYPE) push(parts.MODEL_TYPE, 'preview-dyn');
  if (parts.PRODUCT) push(parts.PRODUCT, 'preview-dyn');
  if (parts.FRAMING) push(parts.FRAMING, 'preview-dyn');
  if (parts.ASPECT_RATIO) push(`aspect ratio ${parts.ASPECT_RATIO}`, 'preview-dyn');
  if (parts.MOOD) push(parts.MOOD, 'preview-dyn');

  // placeholders {{..}}
  const placeholders = text.match(/\{\{[A-Z_]+\}\}/g) || [];
  placeholders.forEach((p) => push(p, 'preview-placeholder'));

  // Секционные заголовки — бросаем стиль на SANS caps
  const sectionTitles = [
    'TASK:', 'INPUT:', 'MODEL TYPE:', 'PRODUCT:', 'GOAL:',
    'IMPORTANT MODEL INSTRUCTION:', 'GARMENT PRESERVATION RULES:',
    'PRESERVE ALL GARMENT DETAILS EXACTLY:',
    'SCENE DESCRIPTION:', 'LOCATION:', 'LOCATION SELECTION RULE:',
    'Reference mood:',
    'EXTRA STYLING RULE:', 'Restrictions:', 'Any added items must be:',
    'SCENE INTEGRATION:', 'Match and recalculate:',
    'SHADOWS:', 'REALISM REQUIREMENT:', 'Requirements:',
    'STYLE:', 'NEGATIVE PROMPT:', 'FINAL PRIORITY:',
    'The location must feel:',
  ];

  // Наивный токенайзер: разбиваем по секционным заголовкам и динамическим токенам
  const allTokens = [...highlights.map((h) => h.find), ...sectionTitles];
  const unique = Array.from(new Set(allTokens)).filter(Boolean);
  // сортируем по убыванию длины чтобы длинные совпадения шли первыми
  unique.sort((a, b) => b.length - a.length);

  if (!unique.length) return text;

  const pattern = unique.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'g');
  const parts2 = text.split(regex);

  return parts2.map((chunk, i) => {
    if (sectionTitles.includes(chunk)) {
      return React.createElement('span', { key: i, className: 'preview-section-title' }, chunk);
    }
    if (chunk.startsWith('{{')) {
      return React.createElement('span', { key: i, className: 'preview-placeholder' }, chunk);
    }
    const found = highlights.find((h) => h.find === chunk);
    if (found) {
      return React.createElement('span', { key: i, className: found.cls }, chunk);
    }
    return chunk;
  });
}

// ------- StaticCollapse: схлопывает большой "каркас" -------
function splitCore(text) {
  // Находим кусок от "IMPORTANT MODEL INSTRUCTION:" до перед "SCENE DESCRIPTION" или "LOCATION"
  // Это наша статика-сердцевина (preservation, realism и тд)
  const start = text.indexOf('IMPORTANT MODEL INSTRUCTION:');
  const preEnd = text.indexOf('SCENE DESCRIPTION:');
  const locStart = text.indexOf('LOCATION:');
  const locRule = text.indexOf('LOCATION SELECTION RULE:');
  const sceneIntegration = text.indexOf('EXTRA STYLING RULE:');

  if (start < 0 || sceneIntegration < 0) return { pre: text, staticBlock: '', post: '' };

  // end of "GARMENT PRESERVATION RULES" section — before SCENE or LOCATION
  let midStart = preEnd;
  if (midStart < 0) midStart = locStart;
  if (midStart < 0) midStart = locRule;

  // "каркас 1" = от IMPORTANT до midStart
  // "каркас 2" = от EXTRA STYLING RULE до NEGATIVE PROMPT end
  // Упростим: просто схлопываем всё между GARMENT PRESERVATION RULES end и STYLE end.

  const headEnd = preEnd > 0 ? preEnd : (locStart > 0 ? locStart : locRule);
  const stylesStart = text.indexOf('STYLE:');
  const negStart = text.indexOf('NEGATIVE PROMPT:');
  const finalStart = text.indexOf('FINAL PRIORITY:');

  // Статический блок #1: от IMPORTANT до headEnd (preservation + instructions)
  const core1 = text.slice(start, headEnd);
  const pre = text.slice(0, start);
  const dynamic = text.slice(headEnd, sceneIntegration);
  const core2 = text.slice(sceneIntegration, stylesStart);
  const styleBlock = text.slice(stylesStart, negStart);
  const negBlock = text.slice(negStart, finalStart);
  const finalBlock = text.slice(finalStart);

  return { pre, core1, dynamic, core2, styleBlock, negBlock, finalBlock };
}

function PromptPreview({ promptText, parts, state, showStatic, onToggleStatic }) {
  const split = useMemoP(() => splitCore(promptText), [promptText]);

  const renderWithHl = (t) => renderHighlightedPrompt(t, parts, state);

  if (!split.core1) {
    // fallback — не удалось распарсить
    return <div className="preview-body">{renderWithHl(promptText)}</div>;
  }

  return (
    <div className="preview-body">
      {renderWithHl(split.pre)}
      {showStatic ? renderWithHl(split.core1) : (
        <button
          className="preview-static-toggle"
          onClick={onToggleStatic}
        >
          <svg className="chev" width="10" height="10" viewBox="0 0 10 10"><path d="M3 2 L7 5 L3 8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          Технический каркас (сохранение, анти-копирование) — 23 строки
        </button>
      )}
      {renderWithHl(split.dynamic)}
      {showStatic ? renderWithHl(split.core2) : (
        <button
          className="preview-static-toggle is-open"
          onClick={onToggleStatic}
        >
          <svg className="chev" width="10" height="10" viewBox="0 0 10 10"><path d="M3 2 L7 5 L3 8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          Статические правила (реализм, тени, освещение) — 36 строк
        </button>
      )}
      {renderWithHl(split.styleBlock)}
      {showStatic ? renderWithHl(split.negBlock) : (
        <button
          className="preview-static-toggle"
          onClick={onToggleStatic}
        >
          <svg className="chev" width="10" height="10" viewBox="0 0 10 10"><path d="M3 2 L7 5 L3 8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          Negative prompt — 27 строк
        </button>
      )}
      {renderWithHl(split.finalBlock)}
    </div>
  );
}

window.PromptPreview = PromptPreview;

// ---------- Presets Sheet ----------
function PresetsSheet({ open, presets, onClose, onSave, onLoad, onDelete, onExport, onImport, currentState }) {
  const [name, setName] = useStateP('');
  const fileRef = useRefP(null);

  if (!open) return null;

  const handleSave = () => {
    const n = name.trim();
    if (!n) return;
    onSave(n);
    setName('');
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const presetSummary = (preset) => {
    const s = preset.state;
    const bits = [];
    const mood = s.moodReference && window.FILTERS.moodReference.options.find(o => o.id === s.moodReference);
    if (mood) bits.push(mood.labelRu);
    const cat = s.productCategory && window.FILTERS.productCategory.options.find(o => o.id === s.productCategory);
    if (cat) bits.push(cat.labelRu);
    return bits.join(' · ') || '—';
  };

  return React.createElement(React.Fragment, null,
    <div className="sheet-backdrop" onClick={onClose} />,
    <div className="sheet">
      <div className="sheet-head">
        <h3>Пресеты</h3>
        <span style={{fontSize:11.5, color:'var(--muted)'}}>{presets.length} сохранено</span>
        <button className="sheet-close" onClick={onClose} aria-label="Закрыть">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
        </button>
      </div>
      <div className="sheet-body">
        <div className="preset-form">
          <input
            className="text-input"
            placeholder="Название пресета"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>
            Сохранить текущий
          </button>
        </div>

        {presets.length === 0 ? (
          <div className="empty-presets">
            Сохранённых пресетов нет. Введите имя и сохраните текущую комбинацию.
          </div>
        ) : (
          <div className="preset-list">
            {presets.map((p) => (
              <div key={p.id} className="preset-item">
                <div>
                  <div className="preset-name">{p.name}</div>
                  <div className="preset-meta">{presetSummary(p)} · {formatDate(p.updatedAt)}</div>
                </div>
                <div className="preset-actions">
                  <button onClick={() => onLoad(p.id)}>загрузить</button>
                  <button className="del" onClick={() => onDelete(p.id)}>удалить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="sheet-foot">
        <button className="btn btn-outline" onClick={onExport} disabled={presets.length === 0}>
          Экспорт JSON
        </button>
        <button className="btn btn-outline" onClick={() => fileRef.current?.click()}>
          Импорт JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{display: 'none'}}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = '';
          }}
        />
        <div style={{flex: 1}} />
        <button className="btn btn-ghost" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
}

window.PresetsSheet = PresetsSheet;
