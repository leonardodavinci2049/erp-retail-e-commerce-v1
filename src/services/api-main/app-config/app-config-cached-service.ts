import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-config";
import { appConfigServiceApi } from "./app-config-service-api";
import type {
  AppConfigFindAllRequest,
  AppConfigFindByIdRequest,
  AppMenuFindByTypeRequest,
} from "./types/app-config-types";

const ONE_DAY_CACHE_LIFE = {
  stale: 60 * 60 * 24,
  revalidate: 60 * 60 * 24,
  expire: 60 * 60 * 24 * 7,
} as const;

export async function getAppConfigsCached(params: AppConfigFindAllRequest) {
  "use cache";
  cacheLife(ONE_DAY_CACHE_LIFE);
  cacheTag(CACHE_TAGS.appConfigs);

  return appConfigServiceApi.findAllAppConfigs(params);
}

export async function getAppConfigByIdCached(params: AppConfigFindByIdRequest) {
  "use cache";
  cacheLife(ONE_DAY_CACHE_LIFE);
  cacheTag(
    CACHE_TAGS.appConfigs,
    CACHE_TAGS.appConfig(String(params.pe_config_id)),
  );

  return appConfigServiceApi.findAppConfigById(params);
}

export async function getAppMenuByTypeCached(params: AppMenuFindByTypeRequest) {
  "use cache";
  cacheLife(ONE_DAY_CACHE_LIFE);
  cacheTag(CACHE_TAGS.appMenus, CACHE_TAGS.appMenuType(params.pe_type));

  return appConfigServiceApi.findAppMenuByType(params);
}
