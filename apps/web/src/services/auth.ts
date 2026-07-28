import { api } from "./api";

export type ErpFlexLoginResponse = {
  token: string;
  user: {
    id: number;
    username: string;
    name: string;
    email: string | null;
  };
};

export const authApi = {
  async loginWithErpFlex(username: string, password: string) {
    const response = await api.post<ErpFlexLoginResponse>("/auth/erp-flex", {
      username,
      password,
    });

    return response.data;
  },
};