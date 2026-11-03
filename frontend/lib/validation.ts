export function isAdult(isoDate: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return false;
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) {
    return false;
  }
  const limit = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return birth <= limit;
}

export type PersonaIssue = "name" | "city" | "age" | "photo" | "email" | "height" | "weight" | "fee";

export function personaIssue(input: {
  name: string;
  city: string;
  age: string;
  email: string;
  heightCm: string;
  weightKg: string;
  fee: string;
  photoCount: number;
}): PersonaIssue | null {
  if (!input.name.trim()) return "name";
  if (!input.city.trim()) return "city";
  if (!/^\d+$/.test(input.age.trim()) || Number(input.age) < 18 || Number(input.age) > 120) return "age";
  if (input.photoCount < 1) return "photo";
  const email = input.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "email";
  if (input.heightCm.trim() && (!/^\d+$/.test(input.heightCm.trim()) || Number(input.heightCm) < 120 || Number(input.heightCm) > 230)) return "height";
  if (input.weightKg.trim() && (!/^\d+$/.test(input.weightKg.trim()) || Number(input.weightKg) < 35 || Number(input.weightKg) > 200)) return "weight";
  if (input.fee.trim() && (Number.isNaN(Number(input.fee)) || Number(input.fee) < 0)) return "fee";
  return null;
}

export function passwordIssue(password: string): "short" | "weak" | null {
  if (password.length < 8) {
    return "short";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "weak";
  }
  return null;
}
