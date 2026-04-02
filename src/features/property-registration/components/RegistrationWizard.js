/**
 * HOUSE CRM — RegistrationWizard Component
 *
 * Container for the 5-step property registration wizard.
 * Replaces: iForm(), rFS(), fPr(), fNx()
 */

import { registration, STEP_LABELS } from '../registrationStore.js';
import { submitProperty } from '../registrationService.js';
import { renderStep1 } from './steps/Step1Essential.js';
import { renderStep2 } from './steps/Step2Owner.js';
import { renderStep3 } from './steps/Step3Features.js';
import { renderStep4 } from './steps/Step4Amenities.js';
import { renderStep5 } from './steps/Step5Review.js';

const STEP_RENDERERS = [null, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

class RegistrationWizard {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.stepLabel    - The #fsl element (step indicator text)
   * @param {HTMLElement} opts.dotsContainer - The #fdt element (progress dots)
   * @param {HTMLElement} opts.contentArea   - The #fc element (step content)
   * @param {HTMLElement} opts.prevButton    - The #fp button (back)
   * @param {HTMLElement} opts.nextButton    - The #fn button (next/publish)
   * @param {Function}    [opts.onComplete]  - Called after successful submit
   */
  constructor(opts = {}) {
    this._stepLabel = opts.stepLabel || document.getElementById('fsl');
    this._dots = opts.dotsContainer || document.getElementById('fdt');
    this._content = opts.contentArea || document.getElementById('fc');
    this._prevBtn = opts.prevButton || document.getElementById('fp');
    this._nextBtn = opts.nextButton || document.getElementById('fn');
    this._onComplete = opts.onComplete || (() => { if (window.go) window.go('inv'); });
    this._unsub = null;
  }

  mount() {
    registration.init();
    this._bindButtons();
    this._unsub = registration.subscribe(() => this.render());
    this.render();
  }

  unmount() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }

  render() {
    const step = registration.getStep();
    const status = registration.getState().status;

    // Step label
    if (this._stepLabel) {
      this._stepLabel.textContent = `Paso ${step}/5 · ${STEP_LABELS[step - 1]}`;
    }

    // Progress dots
    if (this._dots) {
      let d = '';
      for (let i = 1; i <= 5; i++) {
        d += `<div class="pd ${i === step ? 'act' : i < step ? 'dn' : ''}"></div>`;
      }
      this._dots.innerHTML = d;
    }

    // Prev button visibility
    if (this._prevBtn) {
      this._prevBtn.style.display = step > 1 ? 'flex' : 'none';
    }

    // Next button text and state
    if (this._nextBtn) {
      if (status === 'submitting') {
        this._nextBtn.disabled = true;
        this._nextBtn.textContent = 'Enviando...';
      } else {
        this._nextBtn.disabled = false;
        this._nextBtn.textContent = step < 5 ? 'Continuar →' : '✓ Publicar';
      }
    }

    // Step content
    if (this._content && STEP_RENDERERS[step]) {
      STEP_RENDERERS[step](this._content);
    }
  }

  _bindButtons() {
    if (this._prevBtn) {
      this._prevBtn.addEventListener('click', () => registration.prevStep());
    }
    if (this._nextBtn) {
      this._nextBtn.addEventListener('click', () => this._handleNext());
    }
  }

  async _handleNext() {
    const step = registration.getStep();

    // Validate before advancing
    if (!registration.canAdvance(step)) {
      const errors = registration.getValidationErrors(step);
      if (typeof window !== 'undefined' && window.toast) {
        window.toast(errors[0] || 'Completa los campos obligatorios', 'twarn');
      }
      return;
    }

    if (step < 5) {
      registration.nextStep();
      return;
    }

    // Step 5: Submit
    const result = await submitProperty();
    if (result.success) {
      if (typeof window !== 'undefined' && window.toast) {
        window.toast('✅ Inmueble registrado');
      }
      this._onComplete(result);
    } else {
      if (typeof window !== 'undefined' && window.toast) {
        window.toast(result.error || 'Error', 'terr');
      }
    }
  }
}

// ── Backward compat: iForm/rFS/fPr/fNx replacements ─────────────

let _wizardInstance = null;

function iForm() {
  _wizardInstance = new RegistrationWizard();
  _wizardInstance.mount();
}

function rFS() {
  if (_wizardInstance) _wizardInstance.render();
}

function fPr() {
  registration.prevStep();
}

async function fNx() {
  if (_wizardInstance) {
    await _wizardInstance._handleNext();
  }
}

if (typeof window !== 'undefined') {
  window.RegistrationWizard = RegistrationWizard;
  window.iForm = iForm;
  window.rFS = rFS;
  window.fPr = fPr;
  window.fNx = fNx;
}

export { RegistrationWizard, iForm, rFS, fPr, fNx };
export default RegistrationWizard;
