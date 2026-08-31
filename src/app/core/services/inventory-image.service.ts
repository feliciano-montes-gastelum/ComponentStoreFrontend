import { Injectable } from '@angular/core';

import { ApiPaths } from '../api-paths';
import { ImageApiBase } from './image-api.base';

@Injectable({ providedIn: 'root' })
export class InventoryImageService extends ImageApiBase {
  protected collectionUrl(inventoryId: string): string {
    return ApiPaths.inventoryImages.collection(inventoryId);
  }

  protected uploadUrl(inventoryId: string): string {
    return ApiPaths.inventoryImages.upload(inventoryId);
  }

  protected itemUrl(inventoryId: string, imageId: string): string {
    return ApiPaths.inventoryImages.item(inventoryId, imageId);
  }
}
