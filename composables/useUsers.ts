export const useUsers = () => {
  const { $api } = useNuxtApp();
  const ListUsers = async () => {
    return await $api.get('/users');
  };
  return { ListUsers };
};
