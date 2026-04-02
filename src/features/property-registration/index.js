/**
 * HOUSE CRM — Property Registration Module (barrel export)
 */

// Store
export { registration, STEP_LABELS, PROPERTY_TYPES, AMENITIES_PRIMARY, AMENITIES_EXTRA, CARACTERISTICAS } from './registrationStore.js';

// Service
export { submitProperty } from './registrationService.js';

// Components
export { RegistrationWizard, iForm, rFS, fPr, fNx } from './components/RegistrationWizard.js';
export { renderStep1 } from './components/steps/Step1Essential.js';
export { renderStep2 } from './components/steps/Step2Owner.js';
export { renderStep3 } from './components/steps/Step3Features.js';
export { renderStep4 } from './components/steps/Step4Amenities.js';
export { renderStep5 } from './components/steps/Step5Review.js';
