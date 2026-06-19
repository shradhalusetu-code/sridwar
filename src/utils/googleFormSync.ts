/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface SyncConfig {
  formUrl: string;
  mappedFields: {
    nameKey: string;
    emailKey: string;
    phoneKey: string;
    detailsKey: string;
    typeKey: string;
  };
  isEnabled: boolean;
}

// Fallback template values for Google Forms targeting the user's live forms
const DEFAULT_CONFIGS: Record<string, SyncConfig> = {
  darshan_certificate: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScpddw8AbreZ5TuI-mYXptnTZiJd-Yu4aWXvihaAWKXU2wFuQ/formResponse",
    mappedFields: {
      nameKey: "entry.898437491",
      emailKey: "entry.1017844880",
      phoneKey: "entry.805333581",
      detailsKey: "entry.790841631",
      typeKey: "entry.1039747104"
    },
    isEnabled: true
  },
  puja_booking: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSedSW7HeakeLf1uHMBmu7VU94q26HdjL44rFXkPse8yqGrPKw/formResponse",
    mappedFields: {
      nameKey: "entry.898437491",
      emailKey: "entry.1322524758",
      phoneKey: "entry.1568376464",
      detailsKey: "entry.1050217824",
      typeKey: "entry.1507238374"
    },
    isEnabled: true
  },
  devotee_support: {
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfBl9CoaY-CLlEhbsNZkiJTBfmyEGj23yLDAo_LpvADfOsKqQ/formResponse",
    mappedFields: {
      nameKey: "entry.898437491",
      emailKey: "entry.969380068",
      phoneKey: "entry.1486488215",
      detailsKey: "entry.1306645637",
      typeKey: "entry.943423993"
    },
    isEnabled: true
  }
};

let cachedEnv: Record<string, string> | null = null;

/**
 * Loads environment variables securely from the Express backend config registry.
 */
async function fetchEnvConfig(): Promise<Record<string, string>> {
  if (cachedEnv) return cachedEnv;
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      cachedEnv = await res.json();
      return cachedEnv || {};
    }
  } catch (error) {
    console.warn("[Google Forms Sync]: Unable to load server side variables. Falling back to defaults.", error);
  }
  return {};
}

/**
 * Helper to construct a compliant Google Form response endpoint.
 */
function buildFormResponseUrl(value: string | undefined, defaultUrl: string): string {
  if (!value || value.trim() === "") {
    return defaultUrl;
  }
  const clean = value.trim();
  if (clean.startsWith("http")) {
    const deMatch = clean.match(/\/forms\/d\/e\/([A-Za-z0-9_-]+)/);
    if (deMatch) {
      return `https://docs.google.com/forms/d/e/${deMatch[1]}/formResponse`;
    }
    const dMatch = clean.match(/\/forms\/d\/([A-Za-z0-9_-]+)/);
    if (dMatch) {
      return `https://docs.google.com/forms/d/${dMatch[1]}/formResponse`;
    }
    if (clean.endsWith("/formResponse")) {
      return clean;
    }
    if (clean.endsWith("/viewform")) {
      return clean.replace(/\/viewform$/, "/formResponse");
    }
    if (clean.includes("/edit")) {
      return clean.split("/edit")[0].replace(/\/$/, "") + "/formResponse";
    }
    return clean;
  }
  // Determine if hashed or standard form ID
  if (clean.startsWith("1FAIpQL") || clean.startsWith("1FAIp")) {
    return `https://docs.google.com/forms/d/e/${clean}/formResponse`;
  }
  return `https://docs.google.com/forms/d/${clean}/formResponse`;
}

/**
 * Ensures Google Form entry keys are formatted as "entry.<ID>"
 */
function formatEntryKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  const trimmed = key.trim();
  if (/^\d+$/.test(trimmed)) {
    return `entry.${trimmed}`;
  }
  return trimmed;
}

/**
 * Retrieves the Google Form sync configuration for a specific form type.
 */
export function getSyncConfig(formType: string): SyncConfig {
  const stored = localStorage.getItem(`gform_sync_${formType}`);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Automatically reset if cached config references the old template placeholder formUrl
      if (parsed.formUrl && parsed.formUrl.includes("1FAIpQLScXzRndWwAEvW-68XzS_B5yqS_tK-X-sV0T7U-yB3yK_Z_EHQ")) {
        localStorage.removeItem(`gform_sync_${formType}`);
        return DEFAULT_CONFIGS[formType] || DEFAULT_CONFIGS.devotee_support;
      }
      return parsed;
    } catch {
      return DEFAULT_CONFIGS[formType] || DEFAULT_CONFIGS.devotee_support;
    }
  }
  return DEFAULT_CONFIGS[formType] || DEFAULT_CONFIGS.devotee_support;
}

/**
 * Saves the custom Google Form sync configuration to LocalStorage.
 */
export function saveSyncConfig(formType: string, config: SyncConfig) {
  localStorage.setItem(`gform_sync_${formType}`, JSON.stringify(config));
}

/**
 * Programmatically posts the data to Google Forms with dynamic environmental overrides.
 */
export async function syncToGoogleForm(
  formType: string,
  data: {
    name: string;
    email: string;
    phone: string;
    details: string;
    type: string;
    // Optional specific fields for precise mapping
    temple?: string;
    age?: string | number;
    deity?: string;
    whatsapp?: string;
    city?: string;
    feedback?: string;
    contribution?: string | number;
    fee?: string | number;
    dob?: string;
    gotra?: string;
    rashi?: string;
    intent?: string;
  }
) {
  const config = getSyncConfig(formType);
  if (!config.isEnabled) {
    console.log(`[Google Forms Sync]: Skipping, disabled for ${formType}`);
    return false;
  }

  // Fetch server-side variables dynamically
  const env = await fetchEnvConfig();
  let finalFormUrl = config.formUrl;

  // Determine which environment variable matches this request type
  if (formType === "darshan_certificate") {
    finalFormUrl = buildFormResponseUrl(env.GOOGLE_FORM_ID_CERTIFICATE, config.formUrl);
  } else if (formType === "puja_booking" || formType === "puja" || formType === "seva") {
    // Determine if it's primarily a Seva or a standard Puja
    const isSeva = data.type.toLowerCase().includes("seva") || data.details.toLowerCase().includes("seva");
    if (isSeva && (env.GOOGLE_FORM_ID_SEVA || env.VITE_GOOGLE_FORM_ID_SEVA)) {
      finalFormUrl = buildFormResponseUrl(env.GOOGLE_FORM_ID_SEVA, config.formUrl);
    } else {
      finalFormUrl = buildFormResponseUrl(env.GOOGLE_FORM_ID_PUJA, config.formUrl);
    }
  } else if (formType === "devotee_support" || formType === "customer_contact") {
    // Use Google Form ID Inquiry/Support as provided
    const targetId = env.GOOGLE_FORM_ID_INQUIRY || env.GOOGLE_FORM_ID_SUPPORT;
    finalFormUrl = buildFormResponseUrl(targetId, config.formUrl);
  }

  try {
    const formData = new FormData();

    // Smart default evaluations for missing fields
    const currentDateTime = new Date().toLocaleDateString("en-IN");
    
    // Extract temple cleanly
    let extractedTemple = data.temple || "";
    if (!extractedTemple) {
      const match = data.type.match(/\(([^)]+)\)/);
      if (match) {
        extractedTemple = match[1];
      } else if (data.type.includes("Kashi")) {
        extractedTemple = "Kashi Vishwanath Temple, Varanasi";
      } else if (data.type.includes("Jagannath")) {
        extractedTemple = "Shree Jagannath Temple, Puri";
      } else if (data.type.includes("Kedarnath")) {
        extractedTemple = "Kedarnath Temple, Himalayas";
      } else if (data.type.includes("Siddhivinayak")) {
        extractedTemple = "Siddhivinayak Temple, Mumbai";
      } else {
        extractedTemple = "Shree Jagannath Temple, Puri";
      }
    }

    if (formType === "darshan_certificate") {
      const nameKey = formatEntryKey(env.ENTRY_CERT_NAME) || config.mappedFields.nameKey;
      const emailKey = formatEntryKey(env.ENTRY_CERT_EMAIL) || config.mappedFields.emailKey;
      const phoneKey = formatEntryKey(env.ENTRY_CERT_PHONE) || config.mappedFields.phoneKey;
      const detailsKey = config.mappedFields.detailsKey;
      const typeKey = config.mappedFields.typeKey;

      if (nameKey) formData.append(nameKey, data.name);
      if (emailKey) formData.append(emailKey, data.email);
      if (phoneKey) formData.append(phoneKey, data.phone);
      if (typeKey) formData.append(typeKey, data.type);

      const templeKey = formatEntryKey(env.ENTRY_CERT_TEMPLE) || "entry.1039747104";
      const ageKey = formatEntryKey(env.ENTRY_CERT_AGE) || "entry.1814348131";
      const deityKey = formatEntryKey(env.ENTRY_CERT_DEITY) || "entry.1040320665";
      const whatsappKey = formatEntryKey(env.ENTRY_CERT_WHATSAPP) || "entry.158901999";
      const cityKey = formatEntryKey(env.ENTRY_CERT_CITY) || "entry.410448525";
      const feedbackKey = formatEntryKey(env.ENTRY_CERT_FEEDBACK) || "entry.790841631";
      const contributionKey = formatEntryKey(env.ENTRY_CERT_CONTRIBUTION) || "entry.857371541";

      if (templeKey && extractedTemple) formData.append(templeKey, extractedTemple);
      if (ageKey && data.age !== undefined) formData.append(ageKey, String(data.age));
      if (deityKey && data.deity) formData.append(deityKey, data.deity);
      if (whatsappKey) formData.append(whatsappKey, data.whatsapp || data.phone);
      if (cityKey && data.city) formData.append(cityKey, data.city);
      if (feedbackKey && data.feedback) formData.append(feedbackKey, data.feedback);
      if (contributionKey && data.contribution !== undefined) formData.append(contributionKey, String(data.contribution));

      if (detailsKey) {
        formData.append(detailsKey, data.details);
      }
    } else if (formType === "puja_booking" || formType === "puja" || formType === "seva") {
      const isSeva = data.type.toLowerCase().includes("seva") || data.details.toLowerCase().includes("seva");
      if (isSeva && (env.GOOGLE_FORM_ID_SEVA || env.VITE_GOOGLE_FORM_ID_SEVA)) {
        // Seva mapping
        const nameKey = formatEntryKey(env.ENTRY_SEVA_NAME) || "entry.898437491";
        const emailKey = formatEntryKey(env.ENTRY_SEVA_EMAIL) || "entry.2024101892";
        const phoneKey = formatEntryKey(env.ENTRY_SEVA_PHONE) || "entry.1359512036";
        
        const templeKey = formatEntryKey(env.ENTRY_SEVA_TEMPLE) || "entry.1055169507";
        const typeKey = formatEntryKey(env.ENTRY_SEVA_SEVA_TYPE) || formatEntryKey(env.ENTRY_SEVA_SELECTED) || "entry.1165779906";
        const phoneVal = data.phone;
        const whatsappKey = formatEntryKey(env.ENTRY_SEVA_WHATSAPP) || "entry.1015695340";
        const cityKey = formatEntryKey(env.ENTRY_SEVA_CITY) || "entry.1364177955";
        const dateKey = formatEntryKey(env.ENTRY_SEVA_DATE) || "entry.1681028168";
        const notesKey = formatEntryKey(env.ENTRY_SEVA_NOTES) || "entry.1455477698";

        const feeKey = formatEntryKey(env.ENTRY_SEVA_FEE);
        const dobKey = formatEntryKey(env.ENTRY_SEVA_DOB);
        const gotraKey = formatEntryKey(env.ENTRY_SEVA_GOTRA);
        const rashiKey = formatEntryKey(env.ENTRY_SEVA_RASHI);
        const intentKey = formatEntryKey(env.ENTRY_SEVA_INTENT);

        if (nameKey) formData.append(nameKey, data.name);
        if (emailKey) formData.append(emailKey, data.email);
        if (phoneKey) formData.append(phoneKey, phoneVal);
        if (templeKey && extractedTemple) formData.append(templeKey, extractedTemple);
        if (typeKey) {
          const rawType = data.type.replace("Puja/Seva Booking - ", "");
          formData.append(typeKey, rawType);
        }
        if (whatsappKey) formData.append(whatsappKey, data.whatsapp || phoneVal);
        if (cityKey) formData.append(cityKey, data.city || "Online Devotee");
        if (dateKey) formData.append(dateKey, data.dob || currentDateTime);
        if (notesKey) {
          formData.append(notesKey, data.details || data.intent || "");
        }

        if (feeKey && data.fee !== undefined) formData.append(feeKey, String(data.fee));
        if (dobKey && data.dob) formData.append(dobKey, data.dob);
        if (gotraKey && data.gotra) formData.append(gotraKey, data.gotra);
        if (rashiKey && data.rashi) formData.append(rashiKey, data.rashi);
        if (intentKey && data.intent) formData.append(intentKey, data.intent);

        // Fallback for config details
        if (config.mappedFields.detailsKey && !notesKey) {
          formData.append(config.mappedFields.detailsKey, data.details);
        }
      } else {
        // Puja mapping
        const nameKey = formatEntryKey(env.ENTRY_PUJA_NAME) || config.mappedFields.nameKey;
        const emailKey = formatEntryKey(env.ENTRY_PUJA_EMAIL) || config.mappedFields.emailKey;
        const phoneKey = formatEntryKey(env.ENTRY_PUJA_PHONE) || config.mappedFields.phoneKey;

        const templeKey = formatEntryKey(env.ENTRY_PUJA_TEMPLE) || "entry.246622329";
        const typeKey = formatEntryKey(env.ENTRY_PUJA_PUJA_TYPE) || formatEntryKey(env.ENTRY_PUJA_SELECTED) || "entry.1507238374";
        const phoneVal = data.phone;
        const whatsappKey = formatEntryKey(env.ENTRY_PUJA_WHATSAPP) || "entry.1096450797";
        const cityKey = formatEntryKey(env.ENTRY_PUJA_CITY) || "entry.21123129";
        const dateKey = formatEntryKey(env.ENTRY_PUJA_DATE) || "entry.1732902395";
        const notesKey = formatEntryKey(env.ENTRY_PUJA_NOTES) || "entry.1050217824";

        const feeKey = formatEntryKey(env.ENTRY_PUJA_FEE);
        const dobKey = formatEntryKey(env.ENTRY_PUJA_DOB);
        const gotraKey = formatEntryKey(env.ENTRY_PUJA_GOTRA);
        const rashiKey = formatEntryKey(env.ENTRY_PUJA_RASHI);
        const intentKey = formatEntryKey(env.ENTRY_PUJA_INTENT);

        if (nameKey) formData.append(nameKey, data.name);
        if (emailKey) formData.append(emailKey, data.email);
        if (phoneKey) formData.append(phoneKey, phoneVal);
        if (templeKey && extractedTemple) formData.append(templeKey, extractedTemple);
        if (typeKey) {
          const rawType = data.type.replace("Puja/Seva Booking - ", "");
          formData.append(typeKey, rawType);
        }
        if (whatsappKey) formData.append(whatsappKey, data.whatsapp || phoneVal);
        if (cityKey) formData.append(cityKey, data.city || "Online Devotee");
        if (dateKey) formData.append(dateKey, data.dob || currentDateTime);
        if (notesKey) {
          formData.append(notesKey, data.details || data.intent || "");
        }

        if (feeKey && data.fee !== undefined) formData.append(feeKey, String(data.fee));
        if (dobKey && data.dob) formData.append(dobKey, data.dob);
        if (gotraKey && data.gotra) formData.append(gotraKey, data.gotra);
        if (rashiKey && data.rashi) formData.append(rashiKey, data.rashi);
        if (intentKey && data.intent) formData.append(intentKey, data.intent);

        // Fallback for config details
        if (config.mappedFields.detailsKey && !notesKey) {
          formData.append(config.mappedFields.detailsKey, data.details);
        }
      }
    } else if (formType === "devotee_support" || formType === "customer_contact") {
      const nameKey = formatEntryKey(env.ENTRY_INQUIRY_NAME) || formatEntryKey(env.ENTRY_SUPPORT_NAME) || config.mappedFields.nameKey;
      const emailKey = formatEntryKey(env.ENTRY_INQUIRY_EMAIL) || formatEntryKey(env.ENTRY_SUPPORT_EMAIL) || config.mappedFields.emailKey;
      const phoneKey = formatEntryKey(env.ENTRY_INQUIRY_PHONE) || formatEntryKey(env.ENTRY_SUPPORT_PHONE) || config.mappedFields.phoneKey;
      
      const subjectKey = formatEntryKey(env.ENTRY_INQUIRY_SUBJECT) || formatEntryKey(env.ENTRY_SUPPORT_TYPE) || config.mappedFields.typeKey;
      const messageKey = formatEntryKey(env.ENTRY_INQUIRY_MESSAGE) || formatEntryKey(env.ENTRY_SUPPORT_MESSAGE) || config.mappedFields.detailsKey;

      if (nameKey) formData.append(nameKey, data.name);
      if (emailKey) formData.append(emailKey, data.email);
      if (phoneKey) formData.append(phoneKey, data.phone);
      if (subjectKey && data.type) formData.append(subjectKey, data.type);
      if (messageKey && data.details) formData.append(messageKey, data.details);
    } else {
      // General fallback
      formData.append(config.mappedFields.nameKey, data.name);
      formData.append(config.mappedFields.emailKey, data.email);
      formData.append(config.mappedFields.phoneKey, data.phone);
      formData.append(config.mappedFields.detailsKey, data.details);
      if (config.mappedFields.typeKey) {
        formData.append(config.mappedFields.typeKey, data.type);
      }
    }

    console.log(`[Google Forms Sync]: Synchronizing form to URL: ${finalFormUrl}`);
    
    // Perform standard CORS-bypassing post
    await fetch(finalFormUrl, {
      method: "POST",
      mode: "no-cors",
      body: formData
    });
    
    console.log(`[Google Forms Sync]: Submission completed successfully to Google Drive & Forms.`);
    return true;
  } catch (error) {
    console.error(`[Google Forms Sync Error]: Failed submitting to ${finalFormUrl}`, error);
    return false;
  }
}
