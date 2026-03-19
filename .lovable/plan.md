

## Plan: Update Auth & Public Pages to Light Theme

### Problem
Multiple pages still use the old dark navy (`#040042`) styling with glassmorphism effects, `bg-[#F2F9FF]` inputs, `h-12` heights, and gradient accents. These were not updated in the previous overhaul.

### Pages Requiring Updates

**Auth Pages (partially updated but inconsistent):**
1. **Login.tsx** — Inputs still use `bg-[#F2F9FF]`, `border-[#040042]/10`, `h-12 rounded-xl`, divider uses `#040042` opacity colors, labels use `#040042/80`
2. **Signup.tsx** — Same input issues, `#040042` text colors throughout, verify-email view uses gradients and glassmorphism (`bg-gradient-to-br`, `backdrop-blur-sm`, `shadow-2xl`)

**Public Pages (still fully dark navy):**
3. **Onboarding.tsx** — Entire page is `bg-[#040042]` with white text, progress dots on dark bg. Card inside is white but text uses `#040042`
4. **LicenseSuccess.tsx** — Shell component uses `min-h-screen bg-[#040042]`, glassmorphism cards (`bg-white/5 backdrop-blur-sm`), white text on dark
5. **LicensePublicCheckout.tsx** — Left panel `bg-[#040042]`, loading/error states dark navy, serif fonts
6. **LicenseVerify.tsx** — Likely same dark navy pattern
7. **Licenses.tsx** (Buyer Portal) — Likely dark navy
8. **LicenseByUrl.tsx** — Dark navy background

### Changes Per File

**1. Login.tsx**
- Replace input classes: `bg-[#F2F9FF] border-[#040042]/10 text-[#040042] placeholder:text-[#040042]/40 h-12 rounded-xl` → standard `h-10` with default Input styles
- Labels: `text-[#040042]/80` → `text-[#6B7280]`
- Divider: `bg-[#040042]/10`, `text-[#040042]/40` → `bg-[#E5E7EB]`, `text-[#9CA3AF]`
- Footer text: `text-[#040042]/50` → `text-[#6B7280]`

**2. Signup.tsx**
- Same input standardization as Login
- All `#040042` text references → proper design tokens
- Verify-email view: remove gradients/glassmorphism, use white card with border, solid purple button instead of gradient, remove `animate-pulse` ring
- Select dropdown: update colors to match design system

**3. Onboarding.tsx**
- Change page background from `bg-[#040042]` to `bg-[#F7F8FA]`
- Progress bar: dark-on-light instead of light-on-dark
- Header: white bg with border instead of dark
- Card: already white, fix text colors from `#040042` to `#111827`
- Remove `shadow-2xl` → `shadow-sm`

**4. LicenseSuccess.tsx**
- Shell: `bg-[#040042]` → `bg-[#F7F8FA]` with white centered card
- Replace all `text-white/XX` → proper light-theme text colors
- Cards: `bg-white/5 backdrop-blur-sm` → `bg-white border border-[#E5E7EB] shadow-sm`
- Buttons: solid styles instead of transparent-on-dark
- Keep Opedd branding prominent

**5. LicensePublicCheckout.tsx**
- Left panel: `bg-[#040042]` → `bg-[#4A26ED]` (brand purple, matching login left panel)
- Right panel: standardize inputs and form to design system
- Loading/error states: light background
- Remove serif font override

**6. LicenseVerify.tsx**
- Same dark-to-light conversion pattern

**7. Licenses.tsx** (Buyer Portal)
- Convert from dark navy to light theme with white cards

**8. LicenseByUrl.tsx**
- Convert from dark navy to light theme

### Approach
- All changes are styling-only — no logic, API calls, or routing changes
- Use the established design tokens consistently
- Maintain the split-panel layout for auth pages (purple left, white right)
- Public buyer-facing pages get the clean white/gray treatment

