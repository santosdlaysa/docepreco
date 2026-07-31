const DOMAIN_CORRECTIONS: Record<string, string> = {
  // .com.br typos
  'cim.br': 'com.br',
  'con.br': 'com.br',
  'cm.br': 'com.br',
  'vom.br': 'com.br',
  'xom.br': 'com.br',
  'com.be': 'com.br',
  'com.bt': 'com.br',
  'com.vr': 'com.br',
  'com.nr': 'com.br',
  'comr.br': 'com.br',
  'com.b': 'com.br',
  'co.br': 'com.br',
  // .com typos
  'cim': 'com',
  'con': 'com',
  'cm': 'com',
  'vom': 'com',
  'xom': 'com',
  'ocm': 'com',
  'co': 'com',
  // gmail.com typos
  'gamil.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.vom': 'gmail.com',
  'gmail.cim': 'gmail.com',
  'gmaul.com': 'gmail.com',
  // hotmail.com typos
  'hotmai.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'hotamil.com': 'hotmail.com',
  'homail.com': 'hotmail.com',
  // outlook.com typos
  'outloo.com': 'outlook.com',
  'outlok.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.cm': 'outlook.com',
  // yahoo.com typos
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  // icloud.com typos
  'iclod.com': 'icloud.com',
  'icloud.con': 'icloud.com',
  'icloud.co': 'icloud.com',
  'iclould.com': 'icloud.com',
};

const LOCAL_PART = "[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*";
const DOMAIN_LABEL = '[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?';
const EMAIL_REGEX = new RegExp(`^${LOCAL_PART}@(?:${DOMAIN_LABEL}\\.)+[a-zA-Z]{2,}$`);

/**
 * Validates an email address. Stricter than the usual `[^\s@]+@[^\s@]+\.[^\s@]+`,
 * which accepted broken domains like `fulano@.gmail.com` — those only got rejected
 * later by Stripe/Mercado Pago, leaving the account unable to subscribe.
 * Keep in sync with backend/src/domain/services/email.ts.
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_REGEX.test(trimmed);
}

/**
 * Checks if an email domain has a common typo and returns the suggested correction.
 * Returns the full corrected email or null if no typo detected.
 */
export function getEmailTypoSuggestion(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.indexOf('@');
  if (atIndex === -1) return null;

  const localPart = trimmed.substring(0, atIndex);
  const domain = trimmed.substring(atIndex + 1);

  // Check full domain first (e.g. gamil.com -> gmail.com)
  if (DOMAIN_CORRECTIONS[domain]) {
    return `${localPart}@${DOMAIN_CORRECTIONS[domain]}`;
  }

  // Check domain suffix (e.g. empresa.cim.br -> empresa.com.br)
  const dotIndex = domain.indexOf('.');
  if (dotIndex !== -1) {
    const suffix = domain.substring(dotIndex + 1);
    if (DOMAIN_CORRECTIONS[suffix]) {
      const prefix = domain.substring(0, dotIndex);
      return `${localPart}@${prefix}.${DOMAIN_CORRECTIONS[suffix]}`;
    }
  }

  return null;
}
