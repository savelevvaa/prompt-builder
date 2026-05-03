// Сборщик промта и логика каскада.

(function () {
  const F = window.FILTERS;

  function opt(stepId, id) {
    if (!id) return null;
    const step = F[stepId];
    if (!step || step.byParent) return null;
    return (step.options || []).find((o) => o.id === id) || null;
  }
  function subOpt(catId, subId) {
    if (!catId || !subId) return null;
    const step = F.productSub;
    if (!step || !step.byParent) return null;
    return (step.byParent[catId] || []).find((o) => o.id === subId) || null;
  }

  // ---- Видимость шагов ----
  window.isStepVisible = function (stepId, state) {
    const isRef = state.gender === 'from_reference';
    switch (stepId) {
      // Параметры модели — скрыты при «С референса»
      case 'ageGroup':
      case 'ethnicity':
      case 'skinColor':
      case 'eyeColor':
      case 'bodyType':
      case 'hairLength':
      case 'features':
        return !isRef;
      case 'hairColor':
        return !isRef && !!state.hairLength && state.hairLength !== 'bald';
      case 'productPhotoCount':
        return (state.referenceTypes || ['product']).includes('product');
      case 'modelPhotoCount':
        return (state.referenceTypes || ['product']).includes('model');
      case 'facialHair':
        return state.gender === 'male';
      case 'featuresOverride':
        return !isRef && (state.features || []).length > 0;
      // Продукт
      case 'productDetails':
        return (state.productCategories || []).length > 0;
      // Локация
      case 'locationType':
        return state.locationMode === 'explicit';
      case 'locationSpecific':
        return state.locationMode === 'explicit' && !!state.locationType;
      case 'timeOfDay':
        return state.locationMode === 'explicit' && !!state.locationType && !!state.locationSpecific;
      case 'season':
        return (
          state.locationMode === 'explicit' &&
          !!state.locationType &&
          state.locationType.startsWith('outdoor_') &&
          !!state.locationSpecific
        );
      default:
        return true;
    }
  };

  // ---- Доступные опции ----
  window.getVisibleOptions = function (stepId, state) {
    const step = F[stepId];
    if (!step) return [];
    let options;
    if (step.byParent) {
      const parent = state[step.dependsOn];
      options = (parent && step.byParent[parent]) || [];
    } else {
      options = step.options || [];
    }
    return options.filter((o) => {
      if (o.onlyGender && state.gender !== o.onlyGender) return false;
      if (o.needsProductGender && !o.needsProductGender.includes(state.productGender)) return false;
      if (o.onlyOutdoor && !(state.locationType && state.locationType.startsWith('outdoor_'))) return false;
      if (o.onlyLocationTypes && !o.onlyLocationTypes.includes(state.locationType)) return false;
      return true;
    });
  };

  // ---- Каскадная очистка ----
  window.cleanupAfterChange = function (state, changedKey) {
    const cleared = [];
    const check = (key) => {
      const curVal = state[key];
      if (curVal == null || curVal === '' || (Array.isArray(curVal) && !curVal.length)) return;
      if (!window.isStepVisible(key, state)) {
        cleared.push(F[key]?.label || key);
        state[key] = Array.isArray(curVal) ? [] : '';
        return;
      }
      const step = F[key];
      if (!step) return;
      const visOpts = window.getVisibleOptions(key, state);
      if (step.multi) {
        const allowed = new Set(visOpts.map((o) => o.id));
        const filtered = curVal.filter((v) => allowed.has(v));
        if (filtered.length !== curVal.length) { cleared.push(step.label); state[key] = filtered; }
      } else if (step.kind !== 'text' && curVal && !visOpts.find((o) => o.id === curVal)) {
        cleared.push(step.label); state[key] = '';
      }
    };

    const dependents = {
      gender: ['ageGroup', 'ethnicity', 'skinColor', 'eyeColor', 'bodyType', 'hairLength', 'hairColor', 'facialHair', 'features', 'featuresOverride'],
      hairLength: ['hairColor'],
      features: ['featuresOverride'],
      locationMode: ['locationType', 'locationSpecific', 'season', 'timeOfDay'],
      locationType: ['locationSpecific', 'season', 'timeOfDay'],
      locationSpecific: ['season', 'timeOfDay'],
    };
    (dependents[changedKey] || []).forEach(check);
    return cleared;
  };

  // ---- Сборка INPUT_BLOCK ----
  function buildInputBlock(s) {
    const types = s.referenceTypes || ['product'];
    const hasModel = types.includes('model');
    const hasProduct = types.includes('product');
    const mc = parseInt(s.modelPhotoCount || '1', 10);
    const pc = parseInt(s.productPhotoCount || '2', 10);

    const lines = [];
    let idx = 1;

    if (hasModel) {
      const end = idx + mc - 1;
      const range = mc === 1 ? `Image ${idx}` : `Images ${idx}–${end}`;
      const noun = mc === 1 ? 'a reference photo' : 'reference photos';
      lines.push(`- ${range}: ${noun} of the fashion model whose appearance should be used.`);
      idx = end + 1;
    }

    if (hasProduct) {
      const end = idx + pc - 1;
      const range = pc === 1 ? `Image ${idx}` : `Images ${idx}–${end}`;
      const noun = pc === 1 ? 'a photo' : 'photos';
      const angles = pc === 1 ? '' : ' from different angles';
      lines.push(`- ${range}: ${noun} of the SAME garment/product${angles}.`);
      lines.push(`- The garment may be shown on a person, mannequin, hanger, or flat lay.`);
    }

    if (!lines.length) {
      return `- Images 1–2: photos of the SAME garment/product from different angles.\n- The garment may be shown on a person, mannequin, hanger, or flat lay.`;
    }

    return lines.join('\n');
  }

  // ---- Сборка MODEL_TYPE ----
  function buildModelType(s) {
    if (s.gender === 'from_reference') {
      return 'Use the exact appearance of the model shown in the reference images — including face, age, ethnicity, body type, hair, and all physical characteristics. Treat the reference person as the fashion model for this shoot.';
    }

    const gender = opt('gender', s.gender);
    const age = opt('ageGroup', s.ageGroup);
    const ethn = opt('ethnicity', s.ethnicity);
    const skinC = opt('skinColor', s.skinColor);
    const eyeC  = opt('eyeColor',  s.eyeColor);
    const body = opt('bodyType', s.bodyType);
    const hairL = opt('hairLength', s.hairLength);
    const hairC = opt('hairColor', s.hairColor);
    const facial = opt('facialHair', s.facialHair);
    const features = (s.features || []).map((id) => opt('features', id)).filter(Boolean);

    if (!gender) return null;

    const parts = [];
    if (age) parts.push(age.promptText);
    if (ethn) parts.push(ethn.promptText);
    parts.push(gender.promptText);

    const extras = [];
    if (body) extras.push(body.promptText);

    // skin + eyes grouped naturally
    if (skinC && eyeC) extras.push(`with ${skinC.promptText} and ${eyeC.promptText}`);
    else if (skinC)    extras.push(`with ${skinC.promptText}`);
    else if (eyeC)     extras.push(`with ${eyeC.promptText}`);

    if (hairL) {
      if (hairL.id === 'bald') extras.push('with a shaved head');
      else if (hairC) extras.push(`with ${hairC.promptText} ${hairL.promptText}`);
      else extras.push(`with ${hairL.promptText}`);
    }

    if (facial && facial.id !== 'clean_shaven' && s.gender === 'male') {
      extras.push(facial.promptText);
    }
    if (features.length) {
      const override = (s.featuresOverride || '').trim();
      extras.push(override || features.map((f) => f.promptText).join(', '));
    }

    return parts.join(' ') + (extras.length ? ', ' + extras.join(', ') : '');
  }

  // ---- Сборка PRODUCT (мульти-категория) ----
  function buildProduct(s) {
    const pg = opt('productGender', s.productGender);
    const cats = s.productCategories || [];
    if (!pg || !cats.length) return null;

    const items = [];
    for (const catId of cats) {
      const itemState = (s.productItems || {})[catId] || {};
      const sub = subOpt(catId, itemState.sub);
      const color = opt('productColor', itemState.color);
      const material = opt('productMaterial', itemState.material);

      if (!sub || !color) return null; // обязательные поля ещё не заполнены

      const bits = [color.promptText];
      if (material) bits.push(material.promptText);
      bits.push(pg.promptText);
      bits.push(sub.promptText);
      let str = bits.join(' ');
      if (sub.components) str += ` (${sub.components})`;
      items.push(str);
    }

    if (!items.length) return null;

    let result;
    if (items.length === 1) result = items[0];
    else if (items.length === 2) result = items.join(' and ');
    else result = items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];

    if (s.productDetails && s.productDetails.trim()) result += ` (${s.productDetails.trim()})`;
    return result;
  }

  // ---- Сборка SCENE_DESCRIPTION_BLOCK ----
  function buildSceneBlock(s) {
    const fit = (s.fitNotes || []).map((id) => opt('fitNotes', id)).filter(Boolean);
    const supp = (s.supportingItems || []).map((id) => opt('supportingItems', id)).filter(Boolean);
    const custom = (s.customStyling || '').trim();
    if (!fit.length && !supp.length && !custom) return '';
    const lines = ['SCENE DESCRIPTION:'];
    if (fit.length) lines.push('- ' + fit.map((o) => o.promptText).join('; '));
    if (supp.length) lines.push('- ' + supp.map((o) => o.promptText).join('; '));
    if (custom) lines.push('- ' + custom);
    return lines.join('\n') + '\n\n';
  }

  // ---- Сборка LOCATION_BLOCK ----
  function buildLocationBlock(s) {
    const mood = opt('moodReference', s.moodReference);
    const moodLine = mood ? `Reference mood:\n- ${mood.promptText}` : 'Reference mood:\n- {{MOOD}}';

    if (s.locationMode === 'explicit') {
      const locStep = F.locationSpecific;
      let locSpec = null;
      if (s.locationType && s.locationSpecific && locStep && locStep.byParent) {
        locSpec = (locStep.byParent[s.locationType] || []).find((o) => o.id === s.locationSpecific);
      }
      const time = opt('timeOfDay', s.timeOfDay);
      const season = opt('season', s.season);

      const lines = ['LOCATION:'];
      lines.push('- ' + (locSpec ? locSpec.promptText : '{{LOCATION}}'));
      lines.push('- ' + (time ? time.promptText : '{{TIME_OF_DAY}}'));
      if (s.locationType && s.locationType.startsWith('outdoor_')) {
        lines.push('- ' + (season ? season.promptText + ' season' : '{{SEASON}} season'));
      }
      return lines.join('\n') + '\n\n' + moodLine + '\n\n';
    }

    const autoBlock = `LOCATION SELECTION RULE:
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
- logically connected to the clothing`;
    return autoBlock + '\n\n' + moodLine + '\n\n';
  }

  // ---- Полный промт ----
  window.buildPrompt = function (state) {
    const model = buildModelType(state) || '{{MODEL_TYPE}}';
    const product = buildProduct(state) || '{{PRODUCT}}';
    const sceneBlock = buildSceneBlock(state);
    const locationBlock = buildLocationBlock(state);
    const framing = opt('framing', state.framing);
    const ar = opt('aspectRatio', state.aspectRatio);

    return window.PROMPT_SKELETON
      .replace('{{INPUT_BLOCK}}', buildInputBlock(state))
      .replace('{{MODEL_TYPE}}', model)
      .replace('{{PRODUCT}}', product)
      .replace('{{SCENE_DESCRIPTION_BLOCK}}\n', sceneBlock)
      .replace('{{LOCATION_BLOCK}}\n', locationBlock)
      .replace('{{FRAMING}}', framing ? framing.promptText : '{{FRAMING}}')
      .replace('{{ASPECT_RATIO}}', ar ? ar.promptText : '{{ASPECT_RATIO}}');
  };

  // ---- Динамические части для подсветки ----
  window.getDynamicParts = function (state) {
    return {
      MODEL_TYPE: buildModelType(state),
      PRODUCT: buildProduct(state),
      FRAMING: opt('framing', state.framing)?.promptText || null,
      ASPECT_RATIO: opt('aspectRatio', state.aspectRatio)?.promptText || null,
      MOOD: opt('moodReference', state.moodReference)?.promptText || null,
    };
  };

  // ---- Счётчик обязательных ----
  window.countRequired = function (state) {
    const required = [];
    window.REQUIRED_STEPS_BASE.forEach((id) => {
      if (window.isStepVisible(id, state)) required.push(id);
    });
    if (state.locationMode === 'explicit') {
      required.push('locationType', 'locationSpecific', 'timeOfDay');
      if (state.locationType && state.locationType.startsWith('outdoor_')) required.push('season');
    }
    // Для каждой выбранной категории продукта — sub + color обязательны
    (state.productCategories || []).forEach((catId) => {
      required.push('pSub_' + catId, 'pColor_' + catId);
    });

    const total = required.length;
    let filled = 0;
    required.forEach((id) => {
      if (id.startsWith('pSub_') || id.startsWith('pColor_')) {
        const [prefix, catId] = id.split(/_(.+)/);
        const item = (state.productItems || {})[catId] || {};
        if (prefix === 'pSub' ? item.sub : item.color) filled++;
      } else {
        const v = state[id];
        if (Array.isArray(v) ? v.length > 0 : !!v) filled++;
      }
    });
    return { filled, total };
  };
})();
