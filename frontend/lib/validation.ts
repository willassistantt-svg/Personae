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

export function passwordIssue(password: string): "short" | "weak" | null {
  if (password.length < 8) {
    return "short";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "weak";
  }
  return null;
}
