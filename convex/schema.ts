import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const now = v.number();
const documentEmbeddingDimensions = 768;

const role = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
  v.literal("viewer"),
);

const membershipStatus = v.union(
  v.literal("active"),
  v.literal("invited"),
  v.literal("disabled"),
);

const entityKind = v.union(
  v.literal("business"),
  v.literal("property"),
  v.literal("vehicle"),
  v.literal("personal"),
);

const entityStatus = v.union(
  v.literal("active"),
  v.literal("archived"),
);

const ingestionSource = v.union(
  v.literal("camera"),
  v.literal("upload"),
  v.literal("email"),
  v.literal("whatsapp"),
  v.literal("drive"),
);

const captureStatus = v.union(
  v.literal("draft"),
  v.literal("uploading"),
  v.literal("processing"),
  v.literal("needs_review"),
  v.literal("filed"),
  v.literal("failed"),
);

const documentCategory = v.union(
  v.literal("finance"),
  v.literal("tax"),
  v.literal("utilities"),
  v.literal("legal"),
  v.literal("insurance"),
  v.literal("fines"),
  v.literal("people"),
  v.literal("operations"),
  v.literal("other"),
);

const documentStatus = v.union(
  v.literal("processing"),
  v.literal("needs_review"),
  v.literal("due_soon"),
  v.literal("overdue"),
  v.literal("scheduled"),
  v.literal("done"),
  v.literal("archived"),
);

const processingKind = v.union(
  v.literal("document_ingest"),
  v.literal("extract"),
  v.literal("classify"),
  v.literal("embed"),
  v.literal("summarize"),
  v.literal("reminder_scan"),
  v.literal("chat_answer"),
);

const processingStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("cancelled"),
);

const usageFeature = v.union(
  v.literal("document_upload"),
  v.literal("document_processed"),
  v.literal("openrouter_chat"),
  v.literal("openrouter_extract"),
  v.literal("openrouter_embed"),
  v.literal("storage_byte"),
);

const usageUnit = v.union(
  v.literal("count"),
  v.literal("token"),
  v.literal("byte"),
  v.literal("usd_micros"),
);

const bookkeepingType = v.union(
  v.literal("income"),
  v.literal("expense"),
);

const paymentMethod = v.union(
  v.literal("cash"),
  v.literal("card"),
  v.literal("bank"),
  v.literal("other"),
);

const eventKind = v.union(
  v.literal("deadline"),
  v.literal("reminder"),
  v.literal("appointment"),
  v.literal("renewal"),
  v.literal("task"),
);

const eventStatus = v.union(
  v.literal("scheduled"),
  v.literal("done"),
  v.literal("cancelled"),
);

const reminderChannel = v.union(
  v.literal("in_app"),
  v.literal("email"),
  v.literal("whatsapp"),
);

const reminderStatus = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("dismissed"),
  v.literal("failed"),
);

const chatRole = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

const address = v.object({
  line1: v.optional(v.string()),
  line2: v.optional(v.string()),
  city: v.optional(v.string()),
  region: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),
});

const money = v.object({
  amountMinor: v.number(),
  currency: v.string(),
});

const extractedValue = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
);

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    defaultWorkspaceId: v.optional(v.id("workspaces")),
    onboardingComplete: v.boolean(),
    isAdmin: v.optional(v.boolean()),
    createdAt: now,
    updatedAt: now,
    lastSeenAt: v.optional(now),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("business")),
    timezone: v.string(),
    defaultCurrency: v.string(),
    ownerUserId: v.id("users"),
    onboardingComplete: v.boolean(),
    createdAt: now,
    updatedAt: now,
  })
    .index("by_slug", ["slug"])
    .index("by_ownerUserId", ["ownerUserId"]),

  memberships: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.optional(v.id("users")),
    invitedEmail: v.optional(v.string()),
    role,
    status: membershipStatus,
    createdAt: now,
    updatedAt: now,
  })
    .index("by_workspaceId_and_status", ["workspaceId", "status"])
    .index("by_workspaceId_and_userId", ["workspaceId", "userId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_invitedEmail_and_status", ["invitedEmail", "status"]),

  entities: defineTable({
    workspaceId: v.id("workspaces"),
    kind: entityKind,
    status: entityStatus,
    name: v.string(),
    normalizedName: v.string(),
    subtitle: v.optional(v.string()),
    icon: v.string(),
    color: v.string(),
    identifiers: v.record(v.string(), v.string()),
    address: v.optional(address),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: now,
    updatedAt: now,
  })
    .index("by_workspaceId_and_status", ["workspaceId", "status"])
    .index("by_workspaceId_and_kind", ["workspaceId", "kind"])
    .index("by_workspaceId_and_normalizedName", ["workspaceId", "normalizedName"]),

  folders: defineTable({
    workspaceId: v.id("workspaces"),
    entityId: v.id("entities"),
    parentFolderId: v.optional(v.id("folders")),
    name: v.string(),
    normalizedName: v.string(),
    color: v.optional(v.string()),
    systemKey: v.optional(v.string()),
    sortOrder: v.number(),
    createdBy: v.id("users"),
    createdAt: now,
    updatedAt: now,
  })
    .index("by_workspaceId_and_entityId", ["workspaceId", "entityId"])
    .index("by_entityId_and_parentFolderId", ["entityId", "parentFolderId"])
    .index("by_entityId_and_normalizedName", ["entityId", "normalizedName"]),

  captureSessions: defineTable({
    workspaceId: v.id("workspaces"),
    source: ingestionSource,
    status: captureStatus,
    createdBy: v.id("users"),
    entityId: v.optional(v.id("entities")),
    category: v.optional(documentCategory),
    intakeCategory: v.optional(v.string()),
    pageCount: v.number(),
    currentJobId: v.optional(v.id("processingJobs")),
    errorMessage: v.optional(v.string()),
    createdAt: now,
    updatedAt: now,
    submittedAt: v.optional(now),
    completedAt: v.optional(now),
  })
    .index("by_workspaceId_and_status", ["workspaceId", "status"])
    .index("by_createdBy_and_status", ["createdBy", "status"]),

  documents: defineTable({
    workspaceId: v.id("workspaces"),
    entityId: v.optional(v.id("entities")),
    folderId: v.optional(v.id("folders")),
    captureSessionId: v.optional(v.id("captureSessions")),
    source: ingestionSource,
    status: documentStatus,
    category: documentCategory,
    intakeCategory: v.optional(v.string()),
    documentType: v.string(),
    title: v.string(),
    issuer: v.optional(v.string()),
    reference: v.optional(v.string()),
    summary: v.optional(v.string()),
    actionSummary: v.optional(v.string()),
    outcomeMessage: v.optional(v.string()),
    draftResponse: v.optional(v.string()),
    draftReason: v.optional(v.string()),
    amount: v.optional(money),
    issuedAt: v.optional(now),
    dueAt: v.optional(now),
    paidAt: v.optional(now),
    capturedAt: now,
    confidence: v.optional(v.number()),
    entityConfidence: v.optional(v.number()),
    needsReviewReason: v.optional(v.string()),
    extractedFields: v.record(v.string(), extractedValue),
    tags: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: now,
    updatedAt: now,
  })
    .index("by_workspaceId_and_status", ["workspaceId", "status"])
    .index("by_workspaceId_and_dueAt", ["workspaceId", "dueAt"])
    .index("by_workspaceId_and_category", ["workspaceId", "category"])
    .index("by_entityId_and_status", ["entityId", "status"])
    .index("by_folderId", ["folderId"])
    .index("by_captureSessionId", ["captureSessionId"]),

  documentFiles: defineTable({
    workspaceId: v.id("workspaces"),
    documentId: v.optional(v.id("documents")),
    captureSessionId: v.optional(v.id("captureSessions")),
    storageId: v.id("_storage"),
    thumbnailStorageId: v.optional(v.id("_storage")),
    fileName: v.string(),
    contentType: v.string(),
    byteSize: v.number(),
    pageNumber: v.number(),
    sha256: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: now,
  })
    .index("by_documentId_and_pageNumber", ["documentId", "pageNumber"])
    .index("by_captureSessionId_and_pageNumber", ["captureSessionId", "pageNumber"])
    .index("by_storageId", ["storageId"]),

  documentTextChunks: defineTable({
    workspaceId: v.id("workspaces"),
    entityId: v.optional(v.id("entities")),
    documentId: v.id("documents"),
    documentCategory,
    chunkIndex: v.number(),
    text: v.string(),
    embeddingModel: v.string(),
    embedding: v.array(v.float64()),
    createdAt: now,
  })
    .index("by_documentId_and_chunkIndex", ["documentId", "chunkIndex"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_entityId", ["workspaceId", "entityId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: documentEmbeddingDimensions,
      filterFields: ["workspaceId", "entityId", "documentId", "documentCategory"],
    }),

  bookkeepingRecords: defineTable({
    workspaceId: v.id("workspaces"),
    entityId: v.id("entities"),
    documentId: v.optional(v.id("documents")),
    type: bookkeepingType,
    paymentMethod,
    recordDate: now,
    amount: money,
    description: v.string(),
    category: v.optional(v.string()),
    source: v.union(
      v.literal("manual"),
      v.literal("document"),
      v.literal("capture"),
    ),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: now,
    updatedAt: now,
  })
    .index("by_workspaceId_and_recordDate", ["workspaceId", "recordDate"])
    .index("by_entityId_and_recordDate", ["entityId", "recordDate"])
    .index("by_documentId", ["documentId"]),

  processingJobs: defineTable({
    workspaceId: v.id("workspaces"),
    kind: processingKind,
    status: processingStatus,
    captureSessionId: v.optional(v.id("captureSessions")),
    documentId: v.optional(v.id("documents")),
    promptVersionId: v.optional(v.id("promptVersions")),
    provider: v.string(),
    model: v.string(),
    attempts: v.number(),
    nextRunAt: v.optional(now),
    lockedAt: v.optional(now),
    completedAt: v.optional(now),
    errorMessage: v.optional(v.string()),
    outputSummary: v.optional(v.string()),
    createdAt: now,
    updatedAt: now,
  })
    .index("by_status_and_nextRunAt", ["status", "nextRunAt"])
    .index("by_workspaceId_and_status", ["workspaceId", "status"])
    .index("by_captureSessionId", ["captureSessionId"])
    .index("by_documentId", ["documentId"]),

  promptVersions: defineTable({
    key: v.string(),
    version: v.number(),
    active: v.boolean(),
    provider: v.string(),
    model: v.string(),
    systemPrompt: v.string(),
    userTemplate: v.string(),
    outputSchema: v.string(),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: now,
  })
    .index("by_key_and_active", ["key", "active"])
    .index("by_key_and_version", ["key", "version"]),

  events: defineTable({
    workspaceId: v.id("workspaces"),
    entityId: v.optional(v.id("entities")),
    documentId: v.optional(v.id("documents")),
    kind: eventKind,
    status: eventStatus,
    title: v.string(),
    notes: v.optional(v.string()),
    startAt: now,
    endAt: v.optional(now),
    allDay: v.boolean(),
    createdBy: v.id("users"),
    createdAt: now,
    updatedAt: now,
  })
    .index("by_workspaceId_and_startAt", ["workspaceId", "startAt"])
    .index("by_entityId_and_startAt", ["entityId", "startAt"])
    .index("by_documentId", ["documentId"]),

  reminders: defineTable({
    workspaceId: v.id("workspaces"),
    entityId: v.optional(v.id("entities")),
    documentId: v.optional(v.id("documents")),
    eventId: v.optional(v.id("events")),
    channel: reminderChannel,
    status: reminderStatus,
    remindAt: now,
    title: v.string(),
    body: v.string(),
    sentAt: v.optional(now),
    failureReason: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: now,
    updatedAt: now,
  })
    .index("by_status_and_remindAt", ["status", "remindAt"])
    .index("by_workspaceId_and_status", ["workspaceId", "status"])
    .index("by_documentId", ["documentId"])
    .index("by_eventId", ["eventId"]),

  chatThreads: defineTable({
    workspaceId: v.id("workspaces"),
    createdBy: v.id("users"),
    title: v.string(),
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
  })
    .index("by_workspaceId_and_lastMessageAt", ["workspaceId", "lastMessageAt"])
    .index("by_createdBy_and_lastMessageAt", ["createdBy", "lastMessageAt"]),

  chatMessages: defineTable({
    workspaceId: v.id("workspaces"),
    threadId: v.id("chatThreads"),
    role: chatRole,
    content: v.string(),
    citedDocumentIds: v.array(v.id("documents")),
    citedEntityIds: v.array(v.id("entities")),
    model: v.optional(v.string()),
    promptVersionId: v.optional(v.id("promptVersions")),
    createdAt: now,
  })
    .index("by_threadId_and_createdAt", ["threadId", "createdAt"])
    .index("by_workspaceId_and_createdAt", ["workspaceId", "createdAt"]),

  notifications: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    reminderId: v.optional(v.id("reminders")),
    documentId: v.optional(v.id("documents")),
    title: v.string(),
    body: v.string(),
    readAt: v.optional(now),
    createdAt: now,
  })
    .index("by_userId_and_createdAt", ["userId", "createdAt"])
    .index("by_userId_and_readAt", ["userId", "readAt"]),

  integrations: defineTable({
    workspaceId: v.id("workspaces"),
    kind: v.union(v.literal("email"), v.literal("whatsapp"), v.literal("drive")),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("error")),
    displayName: v.string(),
    externalAccountId: v.optional(v.string()),
    cursor: v.optional(v.string()),
    lastSyncAt: v.optional(now),
    errorMessage: v.optional(v.string()),
    createdAt: now,
    updatedAt: now,
  })
    .index("by_workspaceId_and_kind", ["workspaceId", "kind"])
    .index("by_status", ["status"]),

  usageEvents: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.optional(v.id("users")),
    entityId: v.optional(v.id("entities")),
    documentId: v.optional(v.id("documents")),
    feature: usageFeature,
    quantity: v.number(),
    unit: usageUnit,
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    costMicros: v.optional(v.number()),
    metadata: v.record(v.string(), extractedValue),
    occurredAt: now,
    createdAt: now,
  })
    .index("by_workspaceId_and_occurredAt", ["workspaceId", "occurredAt"])
    .index("by_workspaceId_and_feature", ["workspaceId", "feature"])
    .index("by_entityId_and_occurredAt", ["entityId", "occurredAt"]),

  auditLogs: defineTable({
    workspaceId: v.id("workspaces"),
    actorUserId: v.optional(v.id("users")),
    action: v.string(),
    targetTable: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadata: v.record(v.string(), extractedValue),
    createdAt: now,
  })
    .index("by_workspaceId_and_createdAt", ["workspaceId", "createdAt"])
    .index("by_actorUserId_and_createdAt", ["actorUserId", "createdAt"]),
});
