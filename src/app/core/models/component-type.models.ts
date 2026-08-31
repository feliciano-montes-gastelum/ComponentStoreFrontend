export interface ComponentTypeResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  createDate: string;
  updateDate: string;
  updateUser: string;
  version: number;
}

export interface ComponentTypeCreateRequest {
  code: string;
  name: string;
  description?: string;
  active: boolean;
}

export type ComponentTypeUpdateRequest = ComponentTypeCreateRequest;
