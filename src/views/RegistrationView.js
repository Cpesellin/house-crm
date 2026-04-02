/**
 * RegistrationView – composes RegistrationWizard
 * onto the existing multi-step form containers (#fsl, #fdt, #fc, #fp, #fn).
 */
import { iForm } from '../features/property-registration/index.js';

export function mountRegistrationView() {
  // The wizard targets existing DOM elements:
  //   #fsl  – step list / sidebar
  //   #fdt  – detail step
  //   #fc   – characteristics step
  //   #fp   – pricing step
  //   #fn   – notes / final step
  // iForm() initialises and mounts everything internally.
  iForm();
}

window.mountRegistrationView = mountRegistrationView;
