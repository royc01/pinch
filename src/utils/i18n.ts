let languages: Record<string, any> = {};

export const setI18n = (i18n: any) => {
  languages = i18n || {};
};

export const t = (key: string, vars?: Record<string, any>): string => {
  const globalLang = (window as any).siyuan?.languages || {};
  
  const getNested = (obj: any, k: string) => {
    return k.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
  };

  let text = getNested(languages, key) || languages[key] || getNested(globalLang, key) || globalLang[key] || key;
  
  if (vars) {
    Object.keys(vars).forEach((v) => {
      if (typeof text === 'string') {
        text = text.replace(new RegExp(`\\{${v}\\}`, 'g'), vars[v]);
      }
    });
  }
  return text;
};

export const getLanguage = (): string => {
  return (window as any).siyuan?.config?.lang || 'zh_CN';
};
