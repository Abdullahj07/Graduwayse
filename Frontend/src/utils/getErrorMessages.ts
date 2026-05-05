export function getErrorMessage(error: any, fallback = "Something went wrong.") {
  const data = error?.response?.data;

  if (!data) return fallback;

  if (typeof data === "string") return data;

  if (data.detail && typeof data.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data.feedback) && data.feedback.length > 0) {
    return data.feedback[0];
  }

  const firstKey = Object.keys(data)[0];
  const firstValue = data[firstKey];

  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return String(firstValue[0]);
  }

  if (typeof firstValue === "string") {
    return firstValue;
  }

  return fallback;
}