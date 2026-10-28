const ls = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export const secure = {
  get: async (key: string) => ls()?.getItem(key) ?? null,
  set: async (key: string, value: string) => ls()?.setItem(key, value),
  remove: async (key: string) => ls()?.removeItem(key),
};
