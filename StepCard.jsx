// UI компоненты для шагов

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ---------- Step header ----------
function StepHead({ step, value, onClear }) {
  const filled = Array.isArray(value) ? value.length > 0 : !!value;
  return (
    <div className="step-head">
      <span className="step-label">{step.label}</span>
      {step.hint && <span className="step-hint">{step.hint}</span>}
      {step.optional ? (
        <span className="step-tag">не обязательно</span>
      ) : null}
      {filled && !step.optional && (
        <button className="step-clear" onClick={onClear} title="Сбросить">сбросить</button>
      )}
      {filled && step.optional && (
        <button className="step-clear" onClick={onClear} title="Очистить">очистить</button>
      )}
    </div>
  );
}

// ---------- Chips ----------
function Chips({ options, value, multi, onChange }) {
  const active = (id) => multi ? (value || []).includes(id) : value === id;
  const toggle = (id) => {
    if (multi) {
      const next = (value || []).includes(id)
        ? value.filter((v) => v !== id)
        : [...(value || []), id];
      onChange(next);
    } else {
      onChange(value === id ? '' : id);
    }
  };
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          key={o.id}
          className={`chip ${active(o.id) ? 'is-active' : ''}`}
          onClick={() => toggle(o.id)}
        >
          {o.labelRu}
          {o.sub && <span className="chip-sub">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- Grid tiles ----------
function GridTiles({ options, value, multi, onChange, compact }) {
  const active = (id) => multi ? (value || []).includes(id) : value === id;
  const toggle = (id) => {
    if (multi) {
      const next = (value || []).includes(id)
        ? value.filter((v) => v !== id)
        : [...(value || []), id];
      onChange(next);
    } else {
      onChange(value === id ? '' : id);
    }
  };
  return (
    <div className={`grid ${compact ? 'compact' : ''}`}>
      {options.map((o) => (
        <button
          key={o.id}
          className={`tile ${active(o.id) ? 'is-active' : ''}`}
          onClick={() => toggle(o.id)}
        >
          {o.swatch && (
            <span
              className="tile-swatch"
              style={{ background: o.swatch.includes('gradient') ? o.swatch : o.swatch }}
            />
          )}
          <span>{o.labelRu}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- Swatches (colors) ----------
function Swatches({ options, value, onChange }) {
  return (
    <div className="swatches">
      {options.map((o) => {
        const isActive = value === o.id;
        return (
          <button
            key={o.id}
            className={`swatch ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange(isActive ? '' : o.id)}
            title={o.labelRu}
          >
            <span
              className="swatch-dot"
              style={{ background: o.swatch }}
            />
            <span className="swatch-label">{o.labelRu}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Aspect ratios ----------
function AspectPicker({ options, value, onChange }) {
  const maxDim = 48;
  return (
    <div className="aspect-row">
      {options.map((o) => {
        const scale = maxDim / Math.max(o.w, o.h);
        return (
          <button
            key={o.id}
            className={`aspect ${value === o.id ? 'is-active' : ''}`}
            onClick={() => onChange(value === o.id ? '' : o.id)}
          >
            <span
              className="aspect-box"
              style={{
                width: Math.max(12, o.w * scale),
                height: Math.max(12, o.h * scale),
              }}
            />
            <span className="aspect-label">{o.labelRu}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Text input ----------
function TextField({ value, onChange, placeholder, multiline }) {
  if (multiline) {
    return (
      <textarea
        className="text-input"
        rows="2"
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      className="text-input"
      type="text"
      placeholder={placeholder}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ---------- StepCard dispatcher ----------
function StepCard({ stepId, step, value, options, onChange, onClear, flash }) {
  const isDisabledAll = step.kind !== 'text' && (!options || options.length === 0);

  let control = null;
  if (step.kind === 'chips') {
    control = <Chips options={options} value={value} multi={step.multi} onChange={onChange} />;
  } else if (step.kind === 'grid') {
    control = <GridTiles options={options} value={value} multi={step.multi} onChange={onChange} />;
  } else if (step.kind === 'swatches') {
    control = <Swatches options={options} value={value} onChange={onChange} />;
  } else if (step.kind === 'aspect') {
    control = <AspectPicker options={options} value={value} onChange={onChange} />;
  } else if (step.kind === 'text') {
    control = <TextField value={value} onChange={onChange} placeholder={step.placeholder} multiline={stepId === 'productDetails'} />;
  }

  const filled = Array.isArray(value) ? value.length > 0 : !!value;

  return (
    <div className={`step ${filled ? 'is-filled' : ''} ${flash ? 'is-flash' : ''}`}>
      <StepHead step={step} value={value} onClear={onClear} />
      {control}
    </div>
  );
}

window.StepCard = StepCard;
