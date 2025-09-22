export default defineI18nConfig(() => {
  return {
    missingWarn: true,
    missingWarnHandler: (key: string, locale: string) => {
      console.warn(`Missing translation for key: ${key} in locale: ${locale}`);
    },
  };
});
