/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as captureSessions from "../captureSessions.js";
import type * as chat from "../chat.js";
import type * as crons from "../crons.js";
import type * as documentMutations from "../documentMutations.js";
import type * as documents from "../documents.js";
import type * as entities from "../entities.js";
import type * as events from "../events.js";
import type * as files from "../files.js";
import type * as lib_auth from "../lib/auth.js";
import type * as processingActions from "../processingActions.js";
import type * as processingJobs from "../processingJobs.js";
import type * as processingQueries from "../processingQueries.js";
import type * as search from "../search.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  captureSessions: typeof captureSessions;
  chat: typeof chat;
  crons: typeof crons;
  documentMutations: typeof documentMutations;
  documents: typeof documents;
  entities: typeof entities;
  events: typeof events;
  files: typeof files;
  "lib/auth": typeof lib_auth;
  processingActions: typeof processingActions;
  processingJobs: typeof processingJobs;
  processingQueries: typeof processingQueries;
  search: typeof search;
  usage: typeof usage;
  users: typeof users;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
