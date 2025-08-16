// LanguageAndLocationHelper.js
(function (global) {
  "use strict";

  console.log("LanguageAndLocationHelper IIFE is executing NOW!");
  // Add these new functions after the isEnglishText function

  function hasLanguageRequirements(text) {
    if (!text || typeof text !== "string") return false;

    const languagePatterns = [
      // Direct language requirements
      /\b(german|deutsch|alemán)\b/gi,
      /\b(french|français|francés)\b/gi,
      /\b(spanish|español|castilian)\b/gi,
      /\b(italian|italiano)\b/gi,
      /\b(dutch|nederlands|neerlandés)\b/gi,
      /\b(portuguese|português|portugués)\b/gi,
      /\b(chinese|mandarin|中文|普通话)\b/gi,
      /\b(japanese|日本語|nihongo)\b/gi,
      /\b(korean|한국어|hangugeo)\b/gi,
      /\b(russian|русский|pусский)\b/gi,
      /\b(arabic|عربي|arabe)\b/gi,
      /\b(hindi|हिन्दी)\b/gi,

      // Language requirement phrases
      /\b(bilingual|multilingual|language.{0,20}required?)\b/gi,
      /\b(native.{0,10}speaker|fluent.{0,10}in)\b/gi,
      /\b(must.{0,20}speak|required?.{0,20}language)\b/gi,
      /\b(proficiency.{0,10}in.{0,20}(german|french|spanish|italian|dutch|portuguese|chinese|japanese|korean|russian|arabic|hindi))\b/gi,

      // Exclude English requirements
      /\b(?!english|inglés|anglais)(\w+).{0,20}language.{0,20}required?\b/gi,
    ];

    return languagePatterns.some((pattern) => pattern.test(text));
  }

  function checkWorkLocationPreference(text, preference) {
    if (!text || typeof text !== "string") return false;

    const remotePatterns = [
      /\b(remote|work.from.home|wfh|distributed.team|anywhere|location.independent)\b/gi,
      /\b(fully.remote|100%.remote|remote.first|remote.ok|remote.friendly)\b/gi,
      /\b(telecommute|telework|home.based|virtual.team)\b/gi,
    ];

    const localPatterns = [
      /\b(on.?site|office.based|in.person|local.candidates?)\b/gi,
      /\b(must.be.local|local.hire|no.remote|office.only)\b/gi,
      /\b(commute|daily.presence|physical.presence)\b/gi,
      /\b(hybrid.{0,20}office|partial.remote)\b/gi,
    ];

    if (preference === "remote") {
      return remotePatterns.some((pattern) => pattern.test(text));
    } else if (preference === "local") {
      return localPatterns.some((pattern) => pattern.test(text));
    }

    return false;
  }

  function hasVisaSponsorshipRequirement(text) {
    if (!text || typeof text !== "string") return false;

    const visaPatterns = [
      /\b(visa.sponsorship|sponsor.visa|h1b.sponsorship)\b/gi,
      /\b(work.authorization.required|employment.authorization)\b/gi,
      /\b(eligible.to.work|authorized.to.work)\b/gi,
      /\b(no.visa.sponsorship|cannot.sponsor.visa)\b/gi,
      /\b(must.be.authorized|legal.right.to.work)\b/gi,
      /\b(US.citizen|permanent.resident|green.card)\b/gi,
    ];

    return visaPatterns.some((pattern) => pattern.test(text));
  }

    // Expose to global scope
  global.LanguageAndLocationHelper = {
    hasLanguageRequirements: hasLanguageRequirements,
    checkWorkLocationPreference: checkWorkLocationPreference,
    hasVisaSponsorshipRequirement: hasVisaSponsorshipRequirement
  };
  
  console.log("✅ LanguageAndLocationHelper IIFE loaded successfully");
})(window);
