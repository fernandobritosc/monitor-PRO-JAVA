export const getLocalToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const handleTimeMask = (value: string) => {
  let cleaned = value.replace(/\D/g, '');
  if (cleaned.length > 4) cleaned = cleaned.slice(0, 4);
  if (cleaned.length >= 3) {
    cleaned = `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
  }
  return cleaned;
};

export const validateAndConvertTime = (val: string) => {
  const cleaned = val.replace(/\D/g, '');
  if (cleaned.length === 0) return 0;
  let hours = 0;
  let minutes = 0;
  if (cleaned.length <= 2) {
    minutes = parseInt(cleaned);
  } else if (cleaned.length === 3) {
    hours = parseInt(cleaned.substring(0, 1));
    minutes = parseInt(cleaned.substring(1));
  } else if (cleaned.length >= 4) {
    hours = parseInt(cleaned.substring(0, 2));
    minutes = parseInt(cleaned.substring(2));
  }
  if (minutes > 59) return null;
  return hours * 60 + minutes;
};
