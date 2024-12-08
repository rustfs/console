import { defineStore } from "pinia";
import { ref, watch } from "vue";

export const useSidebarStore = defineStore(
  "sidebar",
  () => {
    const isCollapsed = ref(localStorage.getItem("sidebarCollapsed") === "true");

    const toggleSidebar = () => {
      isCollapsed.value = !isCollapsed.value;
    };

    const setSidebarState = (collapsed: boolean) => {
      isCollapsed.value = collapsed;
    };

    watch(isCollapsed, (newValue) => {
      localStorage.setItem("sidebarCollapsed", newValue.toString());
    });

    return { isCollapsed, toggleSidebar, setSidebarState };
  }
);
