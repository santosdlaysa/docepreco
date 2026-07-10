export interface CustomerProfile {
  phone: string;
  name: string;
  address: string;
}

const PROFILE_KEY = 'dpeco_customer_profile';

const EMPTY: CustomerProfile = { phone: '', name: '', address: '' };

export function getCustomerProfile(): CustomerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw);
    return {
      phone: parsed.phone ?? '',
      name: parsed.name ?? '',
      address: parsed.address ?? '',
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveCustomerProfile(profile: Partial<CustomerProfile>) {
  const current = getCustomerProfile();
  const merged = { ...current, ...profile };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
  return merged;
}

export function clearCustomerProfile() {
  localStorage.removeItem(PROFILE_KEY);
}
