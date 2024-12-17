const { $api } = useNuxtApp();
export const useUsers = () => {
  const ListUsers = async () => {
    return await $api.get('/users');
  };
  return { ListUsers };
};
