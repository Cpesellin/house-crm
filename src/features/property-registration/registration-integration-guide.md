# Registration Module — Integration Guide

## File structure

```
src/features/property-registration/
├── index.js                              ← barrel export
├── registrationStore.js                  ← form state, validation, HOUSE code gen
├── registrationService.js                ← submit + notifications
└── components/
    ├── RegistrationWizard.js             ← wizard container (replaces iForm/rFS/fPr/fNx)
    └── steps/
        ├── Step1Essential.js             ← tipo, negociacion, precios, direccion, ciudad
        ├── Step2Owner.js                 ← propietario nombre, tel, email
        ├── Step3Features.js              ← counters, area, estrato, caracteristicas
        ├── Step4Amenities.js             ← amenidades grid, foto upload, observaciones
        └── Step5Review.js                ← summary card before publish

src/config/
└── cloudinary.js                         ← upload config (shared with modal foto upload)
```

## What was extracted

| Original | New | Window compat |
|---|---|---|
| `fS` (step number) | `registration.getStep()` | `window.fS` getter/setter |
| `fD{}` (form data) | `registration.getFormData()` | `window.fD` ref |
| `_pendingFotos[]` | `registration.getPendingFotos()` | `window._pendingFotos` |
| `fTp[]` (types) | `PROPERTY_TYPES` | `window.fTp` |
| `fAP[]` (amenities) | `AMENITIES_PRIMARY` | `window.fAP` |
| `fAX[]` (extra amen.) | `AMENITIES_EXTRA` | `window.fAX` |
| `iForm()` | `RegistrationWizard.mount()` | `window.iForm` |
| `rFS()` | `RegistrationWizard.render()` | `window.rFS` |
| `rF1()-rF5()` | `renderStep1()-renderStep5()` | `window.rF1-rF5` |
| `fPr()` | `registration.prevStep()` | `window.fPr` |
| `fNx()` | `RegistrationWizard._handleNext()` | `window.fNx` |
| `tgC()` | `registration.toggleCaracteristica()` | `window.tgC` |
| `tgAm()` | `registration.toggleAmenidad()` | `window.tgAm` |
| `nextHouseCode()` | `registration.nextHouseCode()` | `window.nextHouseCode` |
| `fMem()/fSaveMem()` | `registration.init()/reset()` | auto |
| `uploadToCloudinary()` | `cloudinary.js` | `window.uploadToCloudinary` |
| `initFotoUpload()` | `cloudinary.js` | `window.initFotoUpload` |

## HOUSE code generation (INTOCABLE)

```
Logic: scan all inventory items → find max numeric part of codigo_house → +1 → pad to 3 digits
Example: if max is HOUSE-047, next is HOUSE-048
Format: 'HOUSE-' + String(maxN + 1).padStart(3, '0')
Source: registrationStore.nextHouseCode()
NOTE: Race condition exists (client-side generation). Two simultaneous registrations could collide.
```

## Validation rules

| Step | Required fields | Error messages |
|---|---|---|
| 1 | tipo, negociacion, direccion, ciudad | "Selecciona un tipo", "La dirección es obligatoria", etc. |
| 2 | nombre, telefono | "El nombre del propietario es obligatorio" |
| 3 | (none required) | — |
| 4 | (none required) | — |
| 5 | (review only) | — |

## Notification matrix on submit

```
Always:
  → noti('inmueble_nuevo', 'info', ... , null, 'all', newId)       ← to everyone
  → noti('inmueble_nuevo', 'info', ... , null, 'admin', newId)     ← to admin

If arriendo or ambas:
  → noti('inmueble_nuevo', 'info', ... , gestor.usuario, null, newId)  ← to gestor de arriendos
```

## Post-submit behavior (preserved from original)

1. Reset form but KEEP ciudad and tipo (for fast re-entry of similar properties)
2. Save ciudad/tipo to localStorage (`hcrm_fmem`)
3. Reload inventory (`window.load()`)
4. Navigate to inventory (`window.go('inv')`)
