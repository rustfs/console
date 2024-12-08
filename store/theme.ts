import { defineStore } from "pinia";

export const useThemeStore = defineStore(
  "theme",
  () => {
    const appTheme = ref();

    const setTheme = (theme: "dark" | "light") => {
      appTheme.value = theme;
    };

    const isDarkTheme = () => {
      return appTheme.value === "dark";
    };

    watch(appTheme, (value, oldValue) => {
      document.body.setAttribute("data-theme", value);
      document.body.classList.remove(oldValue);
      document.body.classList.add(value);
    });

    return { appTheme, setTheme, isDarkTheme };
  }
);
