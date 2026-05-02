// Главный компонент приложения

const { useState: uS, useEffect: uE, useMemo: uM, useCallback: uCB, useRef: uR } = React;

const STORAGE_KEY = 'prompt-builder-state-v2';
const PRESETS_KEY = 'prompt-builder-presets-v1';

const DEFAULT_STATE = {
  referenceTypes: ['product'],
  productPhotoCount: '2',
  modelPhotoCount: '1',
  gender: '', ageGroup: '', ethnicity: '', bodyType: '',
  hairLength: '', hairColor: '', facialHair: '', features: [], featuresOverride: '',
  productGender: '',
  productCategories: [],
  productItems: {},    // { [catId]: { sub, color, material } }
  productDetails: '',
  fitNotes: [], supportingItems: [], customStyling: '',
  moodReference: '', locationMode: 'auto',
  locationType: '', locationSpecific: '', season: '', timeOfDay: '',
  framing: 'full_body', aspectRatio: 'portrait_3_4',
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_STATE }; }
}
function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ---------- Icons ----------
const Icon = {
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12l6 6L20 6"/></svg>,
  reset: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>,
  book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 0 2 2h12"/></svg>,
  arrowUpRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>,
};

const GEN_MODELS = [
  { name: 'AI Generator', url: 'https://wavespeed.ai/image-generator' },
  { name: 'Nano Banana 2', url: 'https://wavespeed.ai/models/google/nano-banana-2/edit' },
  { name: 'GPT-Image 2', url: 'https://wavespeed.ai/models/openai/gpt-image-2/edit' },
  { name: 'Seedream v5.0 Lite', url: 'https://wavespeed.ai/models/bytedance/seedream-v5.0-lite' },
  { name: 'Qwen-Image v2.0 Pro', url: 'https://wavespeed.ai/models/wavespeed-ai/qwen-image-2.0-pro/edit' },
  { name: 'Wan v2.7', url: 'https://wavespeed.ai/models/alibaba/wan-2.7/image-edit-pro' },
];

// ---------- Header ----------
function Header({ progress, onOpenPresets, onResetAll }) {
  const [genOpen, setGenOpen] = uS(false);
  const genRef = uR(null);

  uE(() => {
    if (!genOpen) return;
    const handler = (e) => { if (genRef.current && !genRef.current.contains(e.target)) setGenOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [genOpen]);

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" />
        <span>Prompt Builder</span>
        <span className="brand-slash">/</span>
        <span className="brand-sub">fashion marketplace</span>
      </div>
      <div className="header-progress">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress.total ? (progress.filled / progress.total) * 100 : 0}%` }} />
        </div>
        <div className="progress-text">{progress.filled}/{progress.total} обязательных</div>
      </div>
      <div className="header-actions">
        <button className="hbtn" onClick={onResetAll}>{Icon.reset} Сбросить всё</button>
        <button className="hbtn" onClick={onOpenPresets}>{Icon.book} Пресеты</button>
        <div className="gen-wrap" ref={genRef}>
          <button className="hbtn hbtn-accent" onClick={() => setGenOpen(v => !v)}>
            {Icon.arrowUpRight} Перейти к генерации
          </button>
          {genOpen && (
            <div className="gen-dropdown">
              <div className="gen-dropdown-head">Выберите модель</div>
              {GEN_MODELS.map(m => (
                <a key={m.url} href={m.url} target="_blank" rel="noopener noreferrer" className="gen-item" onClick={() => setGenOpen(false)}>
                  <span>{m.name}</span>
                  {Icon.arrowUpRight}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ---------- Outline ----------
function Outline({ sections, state, activeSection }) {
  const counts = sections.map((sec) => {
    let filled = 0, total = 0;
    sec.steps.forEach((id) => {
      if (!window.isStepVisible(id, state)) return;
      const step = window.FILTERS[id];
      if (!step || step.optional) return;
      total++;
      const v = state[id];
      if (Array.isArray(v) ? v.length : v) filled++;
    });
    // product section: count per-category items
    if (sec.id === 'product') {
      (state.productCategories || []).forEach((catId) => {
        total += 2; // sub + color
        const item = (state.productItems || {})[catId] || {};
        if (item.sub) filled++;
        if (item.color) filled++;
      });
    }
    return { id: sec.id, filled, total };
  });
  return (
    <aside className="outline-col">
      <nav className="outline" aria-label="Секции">
        {sections.map((sec, i) => {
          const c = counts.find((x) => x.id === sec.id);
          const isActive = activeSection === sec.id;
          return (
            <a key={sec.id} href={`#sec-${sec.id}`} className={isActive ? 'is-active' : ''}>
              <span>{String(i).padStart(2, '0')} {sec.title}</span>
              {c.total > 0 && <span className="outline-count">{c.filled}/{c.total}</span>}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

// ---------- ColResizer ----------
function ColResizer({ onResize }) {
  const [dragging, setDragging] = uS(false);
  uE(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const w = Math.min(Math.max(window.innerWidth - e.clientX, 360), Math.min(900, window.innerWidth - 520));
      document.documentElement.style.setProperty('--right-col', w + 'px');
      onResize && onResize(w);
    };
    const onUp = () => { setDragging(false); document.body.classList.remove('is-col-dragging'); };
    document.body.classList.add('is-col-dragging');
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, onResize]);
  return (
    <div
      className={`col-resizer ${dragging ? 'is-dragging' : ''}`}
      onMouseDown={(e) => { e.preventDefault(); setDragging(true); }}
      title="Перетащите, чтобы изменить ширину превью"
    />
  );
}

// ---------- Inputs Section ----------
function InputsSection({ state, setValue, flash }) {
  const F = window.FILTERS;
  const types = state.referenceTypes || ['product'];

  const handleTypesChange = (newTypes) => {
    const withProduct = newTypes.length === 0 ? ['product'] : newTypes.includes('product') ? newTypes : ['product', ...newTypes.filter(t => t !== 'product')];
    setValue('referenceTypes', withProduct);
  };

  return (
    <>
      <StepCard
        stepId="referenceTypes"
        step={F.referenceTypes}
        value={types}
        options={window.getVisibleOptions('referenceTypes', state)}
        onChange={handleTypesChange}
        onClear={() => setValue('referenceTypes', ['product'])}
        flash={flash === 'referenceTypes'}
      />
      {types.includes('product') && (
        <StepCard
          stepId="productPhotoCount"
          step={F.productPhotoCount}
          value={state.productPhotoCount || '2'}
          options={window.getVisibleOptions('productPhotoCount', state)}
          onChange={(v) => setValue('productPhotoCount', v)}
          onClear={() => setValue('productPhotoCount', '2')}
          flash={flash === 'productPhotoCount'}
        />
      )}
      {types.includes('model') && (
        <StepCard
          stepId="modelPhotoCount"
          step={F.modelPhotoCount}
          value={state.modelPhotoCount || '1'}
          options={window.getVisibleOptions('modelPhotoCount', state)}
          onChange={(v) => setValue('modelPhotoCount', v)}
          onClear={() => setValue('modelPhotoCount', '1')}
          flash={flash === 'modelPhotoCount'}
        />
      )}
    </>
  );
}

// ---------- Product Section ----------
function ProductSection({ state, setValue, setRaw, flash }) {
  const F = window.FILTERS;
  const cats = state.productCategories || [];

  // category labels map
  const catLabel = (catId) => (F.productCategories?.options || F.productCategory?.options || []).find((o) => o.id === catId)?.labelRu || catId;

  const handleCategoryChange = (newCats) => {
    setRaw((prev) => {
      const removed = (prev.productCategories || []).filter((id) => !newCats.includes(id));
      const newItems = { ...prev.productItems };
      removed.forEach((id) => delete newItems[id]);
      return { ...prev, productCategories: newCats, productItems: newItems };
    });
  };

  const setItemField = (catId, field, val) => {
    setRaw((prev) => ({
      ...prev,
      productItems: {
        ...prev.productItems,
        [catId]: { ...(prev.productItems?.[catId] || {}), [field]: val },
      },
    }));
  };

  const catOptions = window.getVisibleOptions('productCategories', state);
  const colorOptions = window.getVisibleOptions('productColor', state);
  const materialOptions = window.getVisibleOptions('productMaterial', state);

  return (
    <>
      {/* Кому товар */}
      <StepCard
        stepId="productGender"
        step={F.productGender}
        value={state.productGender}
        options={window.getVisibleOptions('productGender', state)}
        onChange={(v) => setValue('productGender', v)}
        onClear={() => setValue('productGender', '')}
        flash={flash === 'productGender'}
      />

      {/* Категория (мульти) */}
      <StepCard
        stepId="productCategories"
        step={F.productCategories}
        value={state.productCategories}
        options={catOptions}
        onChange={handleCategoryChange}
        onClear={() => setRaw((prev) => ({ ...prev, productCategories: [], productItems: {} }))}
        flash={flash === 'productCategories'}
      />

      {/* Подсекции по каждой выбранной категории */}
      {cats.map((catId) => {
        const item = state.productItems?.[catId] || {};
        const subOptions = (F.productSub?.byParent?.[catId]) || [];
        const label = catLabel(catId);

        return (
          <div key={catId} className="product-group">
            <div className="product-group-head">{label}</div>

            <StepCard
              stepId={`pSub_${catId}`}
              step={{ label: `Тип изделия`, kind: 'grid', required: true }}
              value={item.sub || ''}
              options={subOptions}
              onChange={(v) => setItemField(catId, 'sub', v)}
              onClear={() => setItemField(catId, 'sub', '')}
              flash={false}
            />

            <StepCard
              stepId={`pColor_${catId}`}
              step={{ label: `Цвет`, kind: 'swatches', required: true }}
              value={item.color || ''}
              options={colorOptions}
              onChange={(v) => setItemField(catId, 'color', v)}
              onClear={() => setItemField(catId, 'color', '')}
              flash={false}
            />

            <StepCard
              stepId={`pMaterial_${catId}`}
              step={{ label: `Материал`, kind: 'grid', optional: true }}
              value={item.material || ''}
              options={materialOptions}
              onChange={(v) => setItemField(catId, 'material', v)}
              onClear={() => setItemField(catId, 'material', '')}
              flash={false}
            />
          </div>
        );
      })}

      {/* Своё уточнение */}
      {cats.length > 0 && (
        <StepCard
          stepId="productDetails"
          step={F.productDetails}
          value={state.productDetails}
          options={[]}
          onChange={(v) => setValue('productDetails', v)}
          onClear={() => setValue('productDetails', '')}
          flash={flash === 'productDetails'}
        />
      )}
    </>
  );
}

// ---------- ResetConfirm ----------
function ResetConfirm({ onConfirm, onCancel }) {
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h3>Сбросить всё?</h3></div>
        <div className="sheet-body" style={{ color: 'var(--muted)', fontSize: 13.5 }}>
          Все текущие выборы будут очищены. Сохранённые пресеты останутся на месте.
        </div>
        <div className="sheet-foot">
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onCancel}>Отмена</button>
          <button className="btn btn-primary" style={{ flex: '0 0 auto', background: 'var(--danger)' }} onClick={onConfirm}>Сбросить</button>
        </div>
      </div>
    </div>
  );
}

// ---------- App ----------
function App() {
  uE(() => {
    const saved = localStorage.getItem('prompt-builder-right-col');
    if (saved) document.documentElement.style.setProperty('--right-col', saved + 'px');
  }, []);
  const handleResize = uCB((w) => { localStorage.setItem('prompt-builder-right-col', String(Math.round(w))); }, []);

  const [state, setState] = uS(loadState);
  const [toasts, setToasts] = uS([]);
  const [flashed, setFlashed] = uS(null);
  const [copied, setCopied] = uS(false);
  const [previewMode, setPreviewMode] = uS('pretty');
  const [manualText, setManualText] = uS('');
  const [showStatic, setShowStatic] = uS(false);
  const [activeSection, setActiveSection] = uS('model');
  const [presetsOpen, setPresetsOpen] = uS(false);
  const [resetConfirm, setResetConfirm] = uS(false);
  const [presets, setPresets] = uS(loadPresets);
  const toastId = uR(0);

  uE(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  uE(() => { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); }, [presets]);

  const pushToast = uCB((msg, opts = {}) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  // Стандартный setValue — с каскадной очисткой
  const setValue = uCB((stepId, newVal) => {
    setState((prev) => {
      const next = { ...prev, [stepId]: newVal };
      // Двусторонняя синхронизация: referenceTypes.model ↔ gender.from_reference
      if (stepId === 'referenceTypes') {
        const newHasModel = Array.isArray(newVal) && newVal.includes('model');
        const prevHasModel = (prev.referenceTypes || []).includes('model');
        if (newHasModel && !prevHasModel) {
          next.gender = 'from_reference';
          window.cleanupAfterChange(next, 'gender');
        } else if (!newHasModel && prevHasModel && prev.gender === 'from_reference') {
          next.gender = '';
        }
      }
      if (stepId === 'gender') {
        const rt = prev.referenceTypes || ['product'];
        if (newVal === 'from_reference') {
          if (!rt.includes('model')) next.referenceTypes = [...rt, 'model'];
        } else if (prev.gender === 'from_reference') {
          const filtered = rt.filter(t => t !== 'model');
          next.referenceTypes = filtered.length ? filtered : ['product'];
        }
      }
      // При изменении features — авто-заполняем featuresOverride собранным текстом
      if (stepId === 'features' && Array.isArray(newVal)) {
        const texts = newVal
          .map((id) => (window.FILTERS.features.options.find((o) => o.id === id)?.promptText || ''))
          .filter(Boolean);
        next.featuresOverride = texts.join(', ');
      }
      const cleared = window.cleanupAfterChange(next, stepId);
      if (cleared.length) pushToast(`Обновлены связанные поля: ${cleared.join(', ')}`, { warn: true });
      return next;
    });
    setFlashed(stepId);
    setTimeout(() => setFlashed((f) => (f === stepId ? null : f)), 220);
  }, [pushToast]);

  // Прямой доступ к setState для продуктовой секции
  const setRaw = uCB((updater) => { setState(updater); }, []);

  const isSectionFilled = (sec) => {
    if (sec.id === 'inputs') {
      const types = state.referenceTypes || ['product'];
      return types.includes('model') || state.productPhotoCount !== '2';
    }
    if (sec.id === 'product') {
      return !!state.productGender || (state.productCategories || []).length > 0 || !!state.productDetails;
    }
    return sec.steps.some((stepId) => {
      const v = state[stepId];
      const def = DEFAULT_STATE[stepId];
      if (Array.isArray(v)) return v.length > 0;
      if (def === undefined || def === '') return !!v;
      return v !== def;
    });
  };

  const resetSection = uCB((sec) => {
    setState((prev) => {
      const next = { ...prev };
      sec.steps.forEach((stepId) => {
        const def = DEFAULT_STATE[stepId];
        next[stepId] = def !== undefined ? def : (window.FILTERS[stepId]?.multi ? [] : '');
      });
      if (sec.id === 'product') next.productItems = {};
      if (sec.id === 'inputs' && prev.gender === 'from_reference') next.gender = '';
      return next;
    });
  }, []);

  const clearStep = uCB((stepId) => {
    const step = window.FILTERS[stepId];
    setValue(stepId, step?.multi ? [] : '');
  }, [setValue]);

  const progress = uM(() => window.countRequired(state), [state]);
  const prompt = uM(() => window.buildPrompt(state), [state]);
  const parts = uM(() => window.getDynamicParts(state), [state]);
  const finalText = previewMode === 'edit' ? manualText : prompt;

  uE(() => {
    if (previewMode === 'edit') setManualText(prompt);
  }, [previewMode]);

  const copyPrompt = uCB(async () => {
    try { await navigator.clipboard.writeText(finalText); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = finalText; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    pushToast('Промт скопирован в буфер обмена');
  }, [finalText, pushToast]);

  const savePreset = uCB((name) => {
    const id = 'p_' + Date.now().toString(36);
    setPresets((list) => [{ id, name, state, updatedAt: Date.now() }, ...list]);
    pushToast(`Пресет «${name}» сохранён`);
  }, [state, pushToast]);

  const loadPreset = uCB((id) => {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setState({ ...DEFAULT_STATE, ...p.state });
    setPresetsOpen(false);
    pushToast(`Загружен пресет «${p.name}»`);
  }, [presets, pushToast]);

  const deletePreset = uCB((id) => {
    const p = presets.find((x) => x.id === id);
    setPresets((list) => list.filter((x) => x.id !== id));
    if (p) pushToast(`Пресет «${p.name}» удалён`);
  }, [presets, pushToast]);

  const exportPresets = uCB(() => {
    const blob = new Blob([JSON.stringify({ version: 1, presets }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `prompt-presets-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    pushToast(`Экспортировано пресетов: ${presets.length}`);
  }, [presets, pushToast]);

  const importPresets = uCB((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const list = Array.isArray(data) ? data : data.presets;
        if (!Array.isArray(list)) throw new Error('invalid');
        const normalized = list
          .filter((p) => p && p.state && p.name)
          .map((p) => ({ id: p.id || 'p_' + Math.random().toString(36).slice(2, 9), name: p.name, state: p.state, updatedAt: p.updatedAt || Date.now() }));
        setPresets((cur) => [...normalized, ...cur]);
        pushToast(`Импортировано пресетов: ${normalized.length}`);
      } catch { pushToast('Не удалось прочитать файл пресетов', { warn: true }); }
    };
    reader.readAsText(file);
  }, [pushToast]);

  const resetAll = uCB(() => {
    setState({ ...DEFAULT_STATE });
    setManualText(''); setPreviewMode('pretty'); setResetConfirm(false);
    pushToast('Все поля сброшены');
  }, [pushToast]);

  uE(() => {
    const handler = () => {
      for (const sec of window.SECTIONS) {
        const el = document.getElementById(`sec-${sec.id}`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top < 140 && r.bottom > 140) { setActiveSection(sec.id); break; }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return React.createElement(React.Fragment, null,
    <Header progress={progress} onOpenPresets={() => setPresetsOpen(true)} onResetAll={() => setResetConfirm(true)} />,

    <div className="app-body">
      <Outline sections={window.SECTIONS} state={state} activeSection={activeSection} />

      <main className="left-col">
        <div className="hero">
          <div className="hero-eyebrow">PROMPT BUILDER · fashion marketplace cards</div>
          <h1>Конструктор промтов для генерации карточек одежды</h1>
          <p className="hero-lead">Выбирайте параметры на русском — готовый английский промт собирается справа в реальном времени. Динамические вставки подсвечены оливковым.</p>
        </div>

        {window.SECTIONS.map((sec, i) => (
          <section key={sec.id} id={`sec-${sec.id}`} className="section" data-screen-label={`0${i} ${sec.title}`}>
            <div className="section-head">
              <span className="section-num">{String(i).padStart(2, '0')}</span>
              <h2 className="section-title">{sec.title}</h2>
              {isSectionFilled(sec) && (
                <button className="section-reset-btn" onClick={() => resetSection(sec)}>Сбросить раздел</button>
              )}
              <span className="section-caption">{sec.caption}</span>
            </div>

            {/* Секции ВХОДНЫЕ ДАННЫЕ и ПРОДУКТ рендерятся отдельно */}
            {sec.id === 'inputs' ? (
              <InputsSection
                state={state}
                setValue={setValue}
                flash={flashed}
              />
            ) : sec.id === 'product' ? (
              <ProductSection
                state={state}
                setValue={setValue}
                setRaw={setRaw}
                flash={flashed}
              />
            ) : (
              sec.steps.map((stepId) => {
                if (!window.isStepVisible(stepId, state)) return null;
                const step = window.FILTERS[stepId];
                if (!step) return null;
                const options = step.kind === 'text' ? [] : window.getVisibleOptions(stepId, state);
                return (
                  <StepCard
                    key={stepId}
                    stepId={stepId}
                    step={step}
                    value={state[stepId]}
                    options={options}
                    onChange={(v) => setValue(stepId, v)}
                    onClear={() => clearStep(stepId)}
                    flash={flashed === stepId}
                  />
                );
              })
            )}
          </section>
        ))}

        <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          Всё готово. Нажмите «Скопировать промт» справа и вставьте в Wavespeed / Nano Banana 2 / GPT-Image-2 вместе с референсными фото одежды.
        </div>
      </main>

      <ColResizer onResize={handleResize} />

      <aside className="right-col">
        <div className="preview-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="preview-tabs">
              <button className={`preview-tab ${previewMode === 'pretty' ? 'is-active' : ''}`} onClick={() => setPreviewMode('pretty')}>Превью</button>
              <button className={`preview-tab ${previewMode === 'edit' ? 'is-active' : ''}`} onClick={() => { setManualText(prompt); setPreviewMode('edit'); }}>Ручное редактирование</button>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
              {finalText.length.toLocaleString('ru-RU')} СИМВ
            </div>
          </div>
          <div className="preview-meta">
            <span className="preview-meta-dot" />
            <span>Заполнено <span className="num">{progress.filled}</span> из <span className="num">{progress.total}</span> обязательных шагов</span>
          </div>
        </div>

        {previewMode === 'pretty' ? (
          <PromptPreview
            promptText={prompt}
            parts={parts}
            state={state}
            showStatic={showStatic}
            onToggleStatic={() => setShowStatic((v) => !v)}
          />
        ) : (
          <textarea
            className="preview-textarea"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            spellCheck={false}
          />
        )}

        <div className="preview-actions">
          <button className={`btn btn-primary ${copied ? 'is-copied' : ''}`} onClick={copyPrompt}>
            {copied ? Icon.check : Icon.copy}
            {copied ? 'Скопировано' : 'Скопировать промт'}
          </button>
          {previewMode === 'edit' && (
            <button className="btn btn-outline" onClick={() => { setManualText(prompt); pushToast('Правки отменены'); }}>
              Сбросить правки
            </button>
          )}
        </div>
      </aside>
    </div>,

    <div className="toast-stack">
      {toasts.map((t) => <div key={t.id} className={`toast ${t.warn ? 'warn' : ''}`}>{t.msg}</div>)}
    </div>,

    <PresetsSheet
      open={presetsOpen}
      presets={presets}
      onClose={() => setPresetsOpen(false)}
      onSave={savePreset}
      onLoad={loadPreset}
      onDelete={deletePreset}
      onExport={exportPresets}
      onImport={importPresets}
      currentState={state}
    />,

    resetConfirm && <ResetConfirm onConfirm={resetAll} onCancel={() => setResetConfirm(false)} />
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
