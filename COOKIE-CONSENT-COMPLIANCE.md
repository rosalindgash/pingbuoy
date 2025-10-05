# Cookie Consent Compliance Documentation

## Overview

This document verifies PingBuoy's cookie consent implementation and compliance with applicable regulations in the United States.

## Regulatory Landscape (USA)

### Federal Level
**No federal cookie consent law** - Unlike the EU's GDPR or ePrivacy Directive, the United States does not have a comprehensive federal law requiring cookie consent banners.

### State Level
The following state privacy laws have cookie/tracking requirements:

1. **California (CCPA/CPRA)** - Requires notice and opt-out for sale of personal information
2. **Virginia (VCDPA)** - Requires opt-out for targeted advertising
3. **Colorado (CPA)** - Requires opt-out for targeted advertising and profiling
4. **Connecticut (CTDPA)** - Requires opt-out for targeted advertising
5. **Utah (UCPA)** - Requires opt-out for targeted advertising

### Key Differences from EU (GDPR)
- **USA**: Generally opt-out model (users can refuse after being notified)
- **EU**: Opt-in model (users must actively consent before cookies are set)
- **USA**: No requirement for cookie banner IF you don't sell data or do targeted advertising
- **EU**: Cookie banner required for all non-essential cookies

## PingBuoy's Cookie Usage

### Current Implementation

**File**: `src/components/CookieBanner.tsx` (269 lines)
**Location**: Rendered in `src/app/layout.tsx:48`

### Cookie Categories

1. **Essential Cookies** ✅
   - Authentication (Supabase auth tokens)
   - Session management
   - Security (CSRF tokens)
   - **Always Active**: Cannot be disabled (necessary for functionality)

2. **Analytics Cookies** 🎯
   - Google Analytics (GA4): `G-50TZPFM28P`
   - Core Web Vitals tracking (LCP, INP, CLS, FCP, TTFB)
   - **User Consent Required**: Default OFF, user must opt-in

3. **Marketing Cookies** 📢
   - Third-party advertising (currently not used)
   - Ad personalization (currently not used)
   - **User Consent Required**: Default OFF, user must opt-in

### Consent Mechanism

**Storage**: `localStorage` with key `cookie-consent`

**Data Structure**:
```json
{
  "preferences": {
    "necessary": true,
    "analytics": false,
    "marketing": false
  },
  "timestamp": "2025-10-05T12:00:00.000Z",
  "version": "1.0"
}
```

**Integration with Google Analytics**:
```javascript
// Before consent
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied'
})

// After user accepts analytics
gtag('consent', 'update', {
  analytics_storage: 'granted'
})

// After user accepts marketing
gtag('consent', 'update', {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted'
})
```

## Compliance Assessment

### ✅ COMPLIANT - United States

#### Why PingBuoy is Compliant

1. **Transparency** ✅
   - Clear notice of cookie usage in banner
   - Link to Privacy Policy provided
   - Detailed descriptions of each cookie category

2. **User Control** ✅
   - Three options provided: "Accept All", "Essential Only", "Customize"
   - Granular controls for analytics and marketing cookies
   - Can change preferences anytime

3. **Opt-Out Mechanism** ✅
   - Users can reject analytics and marketing cookies
   - "Essential Only" button provides easy opt-out
   - Preferences are persisted in localStorage

4. **Default Settings** ✅
   - Analytics cookies: Default OFF (conservative approach)
   - Marketing cookies: Default OFF
   - More privacy-protective than required by US law

5. **No Sale of Personal Data** ✅
   - PingBuoy does not sell user data to third parties
   - Google Analytics data is not shared/sold
   - Stripe payment data subject to Stripe's privacy policy (not sold)

6. **Consent Mode Integration** ✅
   - Google Consent Mode v2 implemented
   - Respects user preferences in Google Analytics
   - Prevents tracking before consent granted

### Specific State Compliance

#### California (CCPA/CPRA)
- ✅ **Compliant**: Do Not Sell notice not required (we don't sell data)
- ✅ **Compliant**: User can opt out of analytics tracking
- ✅ **Compliant**: Privacy Policy accessible via link

#### Virginia, Colorado, Connecticut, Utah
- ✅ **Compliant**: Opt-out available for targeted advertising
- ✅ **Compliant**: Marketing cookies disabled by default
- ✅ **Compliant**: Clear notice provided

## Cookie Banner UI/UX

### Main Banner Features
- Fixed position at bottom of screen
- Visible on first visit only (dismissed after choice)
- Clear language (not legal jargon)
- Three action buttons: Customize, Essential Only, Accept All
- Link to Privacy Policy

### Preferences Panel Features
- Backdrop overlay (modal-like experience)
- Detailed descriptions of each cookie type
- Toggle switches for analytics/marketing
- "Essential Cookies" marked as "Always Active"
- Save Preferences button
- Link to Cookie Policy

### Accessibility
- Keyboard navigable
- ARIA labels on close button
- Screen reader friendly
- Clear focus states on interactive elements

## Recommendations

### ✅ Current Implementation is Sufficient

**No changes required for US compliance**. PingBuoy's implementation exceeds minimum requirements by:
- Using opt-in (more protective than opt-out)
- Defaulting to privacy-friendly settings
- Providing granular controls
- Integrating Google Consent Mode

### Optional Enhancements (Low Priority)

1. **Cookie Policy Page** (LOW)
   - Current link to `/cookies` (mentioned in CookieBanner.tsx:252)
   - Should create dedicated cookie policy page
   - List all cookies by name, purpose, duration

2. **Preference Management in Settings** (LOW)
   - Allow authenticated users to change preferences in dashboard
   - Store preferences server-side (in addition to localStorage)
   - Sync across devices

3. **Audit Log** (VERY LOW)
   - Track consent/rejection events for compliance audit
   - Store in database with user_id and timestamp
   - Only needed if you expand to EU markets

## EU/UK Compliance (Future Consideration)

If PingBuoy expands to European markets, additional changes required:

### Required Changes for GDPR/ePrivacy
- ❌ **Cookie banner must block scripts** until consent given
  - Current: Google Analytics loads immediately via `<head>` script
  - Required: Delay GA script injection until user accepts

- ❌ **Consent must be freely given**
  - Current: Site works without accepting (compliant ✅)
  - Note: This is already compliant

- ❌ **Consent must be specific and informed**
  - Current: General categories (analytics, marketing)
  - Required: List specific third parties (Google Analytics, etc.)

- ❌ **Cookie Policy required**
  - Current: Link exists but page doesn't
  - Required: Dedicated cookie policy with all cookies listed

- ❌ **Consent records required**
  - Current: Stored in localStorage only
  - Required: Server-side audit trail

**Estimated effort for EU compliance**: 8-16 hours of development

## Testing Checklist

### Manual Testing ✅
- [x] Banner appears on first visit
- [x] Banner dismisses after accepting all
- [x] Banner dismisses after accepting essential only
- [x] Preferences panel opens and closes
- [x] Analytics toggle works
- [x] Marketing toggle works
- [x] Preferences persist in localStorage
- [x] Google Analytics respects consent choices
- [x] Privacy Policy link works

### Automated Testing (Not Yet Implemented)
- [ ] Unit tests for CookieBanner component
- [ ] Integration tests for consent flow
- [ ] E2E tests for cookie banner interactions
- [ ] Verify GA script behavior based on consent

## References

### US Privacy Laws
- [CCPA (California)](https://oag.ca.gov/privacy/ccpa)
- [VCDPA (Virginia)](https://law.lis.virginia.gov/vacode/title59.1/chapter53/)
- [CPA (Colorado)](https://coag.gov/resources/colorado-privacy-act/)
- [CTDPA (Connecticut)](https://portal.ct.gov/AG/Sections/Privacy/The-Connecticut-Data-Privacy-Act)
- [UCPA (Utah)](https://le.utah.gov/~2022/bills/static/SB0227.html)

### Google Consent Mode
- [Google Consent Mode v2 Documentation](https://developers.google.com/tag-platform/security/guides/consent)
- [Google Analytics Data Privacy](https://support.google.com/analytics/answer/6004245)

### Best Practices
- [IAPP Cookie Consent Guide](https://iapp.org/resources/article/cookie-consent-guide/)
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework)

## Decision Record

**Status**: ✅ COMPLIANT for US operations
**Last Reviewed**: 2025-10-05
**Next Review**: 2026-01-01 (or when expanding to EU markets)

### Rationale

PingBuoy's cookie consent implementation is **compliant with all applicable US privacy laws** because:

1. We provide clear notice of cookie usage
2. We offer opt-out mechanisms for non-essential cookies
3. We default to privacy-friendly settings (analytics OFF by default)
4. We do not sell personal data to third parties
5. We respect user preferences via Google Consent Mode

The current implementation is **more privacy-protective than required** by US law, which is intentional to build user trust and prepare for potential future regulations.

### Future Triggers for Review

1. Expansion to European markets (GDPR/ePrivacy compliance required)
2. Addition of third-party advertising (may trigger additional disclosure requirements)
3. Sale/sharing of user data with third parties (would require CCPA opt-out notices)
4. New US federal privacy law enacted
5. Changes to state privacy laws (annual review recommended)

---

*Last Updated: 2025-10-05*
*Author: Claude (via security audit compliance review)*
*Status: Active*
