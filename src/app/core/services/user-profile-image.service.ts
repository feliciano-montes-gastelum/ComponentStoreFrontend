import { Injectable } from '@angular/core';

import { ApiPaths } from '../api-paths';
import { ImageApiBase } from './image-api.base';

@Injectable({ providedIn: 'root' })
export class UserProfileImageService extends ImageApiBase {
  protected collectionUrl(userInformationId: string): string {
    return ApiPaths.userProfileImages.collection(userInformationId);
  }

  protected uploadUrl(userInformationId: string): string {
    return ApiPaths.userProfileImages.upload(userInformationId);
  }

  protected itemUrl(userInformationId: string, imageId: string): string {
    return ApiPaths.userProfileImages.item(userInformationId, imageId);
  }
}
