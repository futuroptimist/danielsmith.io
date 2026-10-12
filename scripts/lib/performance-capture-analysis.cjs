// Supplemental diagnostic evidence only; never writes controlled-result v1.
const { createHash } = require('node:crypto');
const MAX_BYTES = 16 * 1024 * 1024;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
function fail(code = 'invalid_input') {
  throw Object.assign(new Error(code), { code });
}
function check(ok, code) {
  if (!ok) fail(code);
}
const definitions = {
  toolchain: {
    type: 'object',
    additionalProperties: false,
    required: ['helperSha256', 'probeSha256', 'analyzerSha256'],
    properties: {
      helperSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      probeSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      analyzerSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    },
  },
  source: {
    type: 'object',
    additionalProperties: false,
    required: [
      'repository',
      'commit',
      'servedBuild',
      'artifactId',
      'artifactReceiptState',
      'routeContractSha256',
    ],
    properties: {
      repository: { const: 'futuroptimist/danielsmith.io' },
      commit: {
        anyOf: [
          { type: 'string', pattern: '^[a-f0-9]{40}$' },
          { type: 'null' },
        ],
      },
      servedBuild: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['environment', 'tag'],
            properties: {
              environment: { enum: ['dev', 'staging', 'prod'] },
              tag: {
                type: 'string',
                maxLength: 80,
                pattern: '^[A-Za-z0-9._:-]{1,80}$',
              },
            },
          },
          { type: 'null' },
        ],
      },
      artifactId: {
        anyOf: [
          {
            type: 'string',
            maxLength: 256,
            pattern:
              '^(sha256:[a-f0-9]{64}|[A-Za-z0-9._/-]+@sha256:[a-f0-9]{64})$',
          },
          { type: 'null' },
        ],
      },
      artifactReceiptState: { enum: ['unbound', 'provided', 'verified'] },
      routeContractSha256: {
        anyOf: [
          { type: 'string', pattern: '^[a-f0-9]{64}$' },
          { type: 'null' },
        ],
      },
    },
  },
  profile: {
    type: 'object',
    additionalProperties: false,
    required: [
      'method',
      'harness',
      'browserFamily',
      'browserVersion',
      'viewportWidth',
      'viewportHeight',
      'devicePixelRatio',
      'orientation',
      'quality',
      'qualitySource',
      'rendererClass',
      'rendererContinuity',
      'deviceReceiptState',
      'displayRefreshHz',
      'headless',
      'navigatorHintsOverridden',
      'storageClearedInTestContext',
      'movement',
      'normalLaunch',
      'failoverBypassed',
    ],
    properties: {
      method: { const: 'raf_callback_cadence_v1' },
      harness: { const: 'synthetic_route_helper' },
      browserFamily: { const: 'chromium' },
      browserVersion: {
        type: 'string',
        maxLength: 80,
        pattern: '^[A-Za-z0-9._ -]{1,80}$',
      },
      viewportWidth: { type: 'integer', minimum: 1, maximum: 16384 },
      viewportHeight: { type: 'integer', minimum: 1, maximum: 16384 },
      devicePixelRatio: { type: 'number', exclusiveMinimum: 0, maximum: 16 },
      orientation: { enum: ['portrait', 'landscape', 'square', 'unknown'] },
      quality: { enum: ['performance', 'balanced', 'cinematic', 'unknown'] },
      qualitySource: { enum: ['user', 'automatic', 'harness', 'unknown'] },
      rendererClass: { enum: ['hardware', 'software', 'unknown', 'fallback'] },
      rendererContinuity: { const: 'sampled_only' },
      deviceReceiptState: { const: 'unverified' },
      displayRefreshHz: {
        anyOf: [
          { type: 'number', exclusiveMinimum: 0, maximum: 2000 },
          { type: 'null' },
        ],
      },
      headless: { const: true },
      navigatorHintsOverridden: { const: true },
      storageClearedInTestContext: { const: true },
      movement: { const: 'runtime_collision_stepping' },
      normalLaunch: { const: false },
      failoverBypassed: { const: true },
    },
  },
  bounds: {
    type: 'object',
    additionalProperties: false,
    required: [
      'maxDurationMs',
      'maxRafIntervals',
      'maxLongTasks',
      'maxMarkers',
      'maxSnapshots',
      'maxLabels',
      'maxWindows',
      'maxChunkRecords',
      'maxRawBytes',
      'maxAnalysisBytes',
      'maxFinalizationGraceMs',
      'maxPageCallMs',
    ],
    properties: {
      maxDurationMs: { type: 'integer', minimum: 1, maximum: 1200000 },
      maxRafIntervals: { type: 'integer', minimum: 1, maximum: 300000 },
      maxLongTasks: { type: 'integer', minimum: 1, maximum: 10000 },
      maxMarkers: { type: 'integer', minimum: 1, maximum: 4096 },
      maxSnapshots: { type: 'integer', minimum: 1, maximum: 512 },
      maxLabels: { type: 'integer', minimum: 1, maximum: 256 },
      maxWindows: { type: 'integer', minimum: 1, maximum: 128 },
      maxChunkRecords: { type: 'integer', minimum: 1, maximum: 4096 },
      maxRawBytes: { type: 'integer', minimum: 1, maximum: 16777216 },
      maxAnalysisBytes: { type: 'integer', minimum: 1, maximum: 16777216 },
      maxFinalizationGraceMs: { type: 'integer', minimum: 1, maximum: 15000 },
      maxPageCallMs: { const: 2000 },
    },
  },
  stream: {
    type: 'object',
    additionalProperties: false,
    required: [
      'state',
      'retainedCount',
      'observedCount',
      'unrecordedCount',
      'firstUnrecordedAtMs',
    ],
    properties: {
      state: {
        enum: [
          'complete',
          'capacity_stop',
          'unsupported',
          'clock_invalid',
          'unavailable',
        ],
      },
      retainedCount: { type: 'integer', minimum: 0, maximum: 300001 },
      observedCount: { type: 'integer', minimum: 0, maximum: 9007199254740991 },
      unrecordedCount: {
        anyOf: [
          { type: 'integer', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
      firstUnrecordedAtMs: {
        anyOf: [
          { type: 'number', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
    },
  },
  marker: {
    type: 'object',
    additionalProperties: false,
    required: ['atMs', 'type', 'labelId', 'spanId', 'spanKind'],
    properties: {
      atMs: { type: 'number', minimum: 0, maximum: 9007199254740991 },
      type: {
        enum: [
          'init',
          'application_ready',
          'assets_settled',
          'route_begin',
          'route_end',
          'checkpoint',
          'cycle_begin',
          'cycle_end',
          'visibility_hidden',
          'visibility_visible',
          'app_mode_changed',
          'span_begin',
          'span_end',
          'synthetic_pagehide',
          'real_pagehide',
          'cancel',
          'limit',
          'stop',
        ],
      },
      labelId: {
        anyOf: [
          { type: 'integer', minimum: 0, maximum: 255 },
          { type: 'null' },
        ],
      },
      spanId: {
        anyOf: [
          { type: 'integer', minimum: 0, maximum: 4095 },
          { type: 'null' },
        ],
      },
      spanKind: {
        anyOf: [
          {
            enum: [
              'helper_path_search',
              'helper_screenshot',
              'helper_snapshot',
              'helper_file_io',
              'helper_serialization',
              'route',
              'visibility',
              'interruption',
            ],
          },
          { type: 'null' },
        ],
      },
    },
  },
  snapshot: {
    type: 'object',
    additionalProperties: false,
    required: [
      'atMs',
      'rendererClass',
      'appMode',
      'quality',
      'devicePixelRatio',
      'calls',
      'triangles',
      'memoryGeometries',
      'memoryTextures',
    ],
    properties: {
      atMs: { type: 'number', minimum: 0, maximum: 9007199254740991 },
      rendererClass: { enum: ['hardware', 'software', 'unknown', 'fallback'] },
      appMode: { enum: ['immersive', 'fallback', 'unknown'] },
      quality: { enum: ['performance', 'balanced', 'cinematic', 'unknown'] },
      devicePixelRatio: { type: 'number', exclusiveMinimum: 0, maximum: 16 },
      calls: { type: 'integer', minimum: 0, maximum: 9007199254740991 },
      triangles: { type: 'integer', minimum: 0, maximum: 9007199254740991 },
      memoryGeometries: {
        type: 'integer',
        minimum: 0,
        maximum: 9007199254740991,
      },
      memoryTextures: {
        type: 'integer',
        minimum: 0,
        maximum: 9007199254740991,
      },
    },
  },
  warmth: {
    type: 'object',
    additionalProperties: false,
    required: [
      'state',
      'applicationReadyMs',
      'assetsSettledMs',
      'minimumDelayMs',
      'settleEvidenceSha256',
    ],
    properties: {
      state: {
        enum: ['unqualified', 'readiness_delay_only', 'evidence_provided'],
      },
      applicationReadyMs: {
        anyOf: [
          { type: 'number', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
      assetsSettledMs: {
        anyOf: [
          { type: 'number', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
      minimumDelayMs: { const: 5000 },
      settleEvidenceSha256: {
        anyOf: [
          { type: 'string', pattern: '^[a-f0-9]{64}$' },
          { type: 'null' },
        ],
      },
    },
  },
  coverage: {
    type: 'object',
    additionalProperties: false,
    required: [
      'state',
      'captureStartedAtMs',
      'captureStoppedAtMs',
      'firstCallbackAtMs',
      'lastCallbackAtMs',
      'leftCensoredMs',
      'rightCensoredMs',
      'plannedDeadlineAtMs',
      'deadlineOvershootMs',
      'reasons',
    ],
    properties: {
      state: { enum: ['complete', 'incomplete'] },
      captureStartedAtMs: {
        type: 'number',
        minimum: 0,
        maximum: 9007199254740991,
      },
      captureStoppedAtMs: {
        anyOf: [
          { type: 'number', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
      firstCallbackAtMs: {
        anyOf: [
          { type: 'number', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
      lastCallbackAtMs: {
        anyOf: [
          { type: 'number', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
      leftCensoredMs: {
        anyOf: [
          { type: 'number', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
      rightCensoredMs: {
        anyOf: [
          { type: 'number', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
      plannedDeadlineAtMs: {
        type: 'number',
        minimum: 0,
        maximum: 9007199254740991,
      },
      deadlineOvershootMs: {
        anyOf: [
          { type: 'number', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
      reasons: {
        type: 'array',
        items: {
          enum: [
            'no_callbacks',
            'open_tail',
            'page_lost',
            'navigation',
            'cancelled',
            'capacity',
            'deadline',
            'unmatched_span',
            'marker_loss',
            'invalid_clock',
            'export_failed',
            'unobserved_start',
            'visibility_unknown',
            'export_timeout',
          ],
        },
        maxItems: 16,
      },
    },
  },
  summary: {
    oneOf: [
      {
        type: 'object',
        additionalProperties: false,
        required: ['state', 'sampleCount', 'p50Ms', 'p95Ms', 'p99Ms', 'maxMs'],
        properties: {
          state: { const: 'available' },
          sampleCount: { type: 'integer', minimum: 1, maximum: 300000 },
          p50Ms: { type: 'number', minimum: 0, maximum: 9007199254740991 },
          p95Ms: { type: 'number', minimum: 0, maximum: 9007199254740991 },
          p99Ms: { type: 'number', minimum: 0, maximum: 9007199254740991 },
          maxMs: { type: 'number', minimum: 0, maximum: 9007199254740991 },
        },
      },
      {
        type: 'object',
        additionalProperties: false,
        required: ['state', 'reason'],
        properties: {
          state: { const: 'unavailable' },
          reason: {
            enum: [
              'no_completed_intervals',
              'invalid_clock',
              'incomplete_coverage',
              'missing_warmth',
              'unsupported',
              'capacity',
              'identity_unbound',
            ],
          },
        },
      },
    ],
  },
  indexRange: {
    type: 'object',
    additionalProperties: false,
    required: ['fromInclusive', 'toExclusive'],
    properties: {
      fromInclusive: { type: 'integer', minimum: 0, maximum: 299999 },
      toExclusive: { type: 'integer', minimum: 0, maximum: 300000 },
    },
  },
  exclusion: {
    type: 'object',
    additionalProperties: false,
    required: ['range', 'reasons', 'durationMs'],
    properties: {
      range: { $ref: '#/$defs/indexRange' },
      reasons: {
        type: 'array',
        items: {
          enum: [
            'outside_window',
            'boundary_crossing',
            'hidden',
            'helper_overlap',
            'warmth_unqualified',
            'renderer_changed',
            'missing_coverage',
          ],
        },
        maxItems: 7,
      },
      durationMs: { type: 'number', minimum: 0, maximum: 9007199254740991 },
    },
  },
  window: {
    type: 'object',
    additionalProperties: false,
    required: [
      'id',
      'kind',
      'startMs',
      'endMs',
      'requiredDurationMs',
      'selection',
      'warmthState',
      'summary',
      'eligibleRanges',
      'excludedRanges',
      'observedDurationMs',
      'excludedDurationMs',
      'censoredDurationMs',
      'coverageState',
      'hardwareQualified',
    ],
    properties: {
      id: { type: 'string', maxLength: 80, pattern: '^[A-Za-z0-9._:-]{1,80}$' },
      kind: {
        enum: [
          'full_route',
          'post_readiness_diagnostic',
          'steady_foreground_candidate',
          'prefix_120',
        ],
      },
      startMs: { type: 'number', minimum: 0, maximum: 9007199254740991 },
      endMs: { type: 'number', minimum: 0, maximum: 9007199254740991 },
      requiredDurationMs: {
        anyOf: [
          { type: 'number', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
      selection: {
        enum: [
          'all_completed_intervals',
          'wholly_contained_foreground_uncontaminated',
        ],
      },
      warmthState: {
        enum: ['unqualified', 'readiness_delay_only', 'evidence_provided'],
      },
      summary: { $ref: '#/$defs/summary' },
      eligibleRanges: {
        type: 'array',
        items: { $ref: '#/$defs/indexRange' },
        maxItems: 4096,
      },
      excludedRanges: {
        type: 'array',
        items: { $ref: '#/$defs/exclusion' },
        maxItems: 4096,
      },
      observedDurationMs: {
        type: 'number',
        minimum: 0,
        maximum: 9007199254740991,
      },
      excludedDurationMs: {
        type: 'number',
        minimum: 0,
        maximum: 9007199254740991,
      },
      censoredDurationMs: {
        type: 'number',
        minimum: 0,
        maximum: 9007199254740991,
      },
      coverageState: { enum: ['complete', 'incomplete'] },
      hardwareQualified: { const: false },
    },
  },
  gap: {
    type: 'object',
    additionalProperties: false,
    required: [
      'intervalIndex',
      'startMs',
      'endMs',
      'durationMs',
      'over100Ms',
      'atLeast1000Ms',
      'intersectingSpanIds',
      'classification',
    ],
    properties: {
      intervalIndex: { type: 'integer', minimum: 0, maximum: 299999 },
      startMs: { type: 'number', minimum: 0, maximum: 9007199254740991 },
      endMs: { type: 'number', minimum: 0, maximum: 9007199254740991 },
      durationMs: { type: 'number', minimum: 0, maximum: 9007199254740991 },
      over100Ms: { type: 'boolean' },
      atLeast1000Ms: { type: 'boolean' },
      intersectingSpanIds: {
        type: 'array',
        items: { type: 'integer', minimum: 0, maximum: 4095 },
        maxItems: 4096,
      },
      classification: {
        enum: [
          'unclassified',
          'overlaps_known_helper',
          'overlaps_interruption',
          'overlaps_helper_and_interruption',
        ],
      },
    },
  },
  capabilities: {
    type: 'object',
    additionalProperties: false,
    required: [
      'nativeFramePresentation',
      'inputToNextPaint',
      'gpuTiming',
      'wholeFramePassTotals',
      'geometryTextureBytes',
      'retainedHeap',
      'longTaskTiming',
    ],
    properties: {
      nativeFramePresentation: { const: 'not_collected' },
      inputToNextPaint: { const: 'not_collected' },
      gpuTiming: { const: 'not_collected' },
      wholeFramePassTotals: { const: 'not_collected' },
      geometryTextureBytes: { const: 'not_collected' },
      retainedHeap: { const: 'not_collected' },
      longTaskTiming: { enum: ['supported', 'unsupported', 'partial'] },
    },
  },
  qualification: {
    type: 'object',
    additionalProperties: false,
    required: ['state', 'reasons'],
    properties: {
      state: { const: 'incomplete' },
      reasons: {
        type: 'array',
        items: {
          enum: [
            'diagnostic_cadence_only',
            'synthetic_harness',
            'device_unverified',
            'native_frame_method_unvalidated',
            'identity_unbound',
            'warmth_unqualified',
            'renderer_continuity_sampled_only',
            'missing_next_paint',
            'missing_resource_bytes',
            'missing_heap',
            'missing_duration_or_coverage',
            'capture_loss',
          ],
        },
        maxItems: 12,
      },
    },
  },
  raw: {
    type: 'object',
    additionalProperties: false,
    required: [
      'kind',
      'captureSchemaVersion',
      'attemptId',
      'startedAt',
      'finishedAt',
      'captureState',
      'stopReason',
      'source',
      'toolchain',
      'profile',
      'bounds',
      'warmth',
      'streams',
      'coverage',
      'labels',
      'rafTimestampsMs',
      'longTasks',
      'markers',
      'snapshots',
      'checkpointPrefixes',
      'capabilities',
    ],
    properties: {
      kind: { const: 'route_capture_raw' },
      captureSchemaVersion: { const: 1 },
      attemptId: {
        type: 'string',
        maxLength: 80,
        pattern: '^[A-Za-z0-9._:-]{1,80}$',
      },
      startedAt: { type: 'string', format: 'date-time' },
      finishedAt: {
        anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
      },
      captureState: { enum: ['complete', 'partial', 'failed', 'cancelled'] },
      stopReason: {
        enum: [
          'finished',
          'pagehide',
          'page_closed',
          'cancelled',
          'failure',
          'capacity',
          'deadline',
        ],
      },
      source: { $ref: '#/$defs/source' },
      toolchain: { $ref: '#/$defs/toolchain' },
      profile: { $ref: '#/$defs/profile' },
      bounds: { $ref: '#/$defs/bounds' },
      warmth: { $ref: '#/$defs/warmth' },
      streams: {
        type: 'object',
        additionalProperties: false,
        required: ['raf', 'longTasks', 'markers', 'snapshots'],
        properties: {
          raf: { $ref: '#/$defs/stream' },
          longTasks: { $ref: '#/$defs/stream' },
          markers: { $ref: '#/$defs/stream' },
          snapshots: { $ref: '#/$defs/stream' },
        },
      },
      coverage: { $ref: '#/$defs/coverage' },
      labels: {
        type: 'array',
        items: {
          type: 'string',
          maxLength: 64,
          pattern: '^[A-Za-z0-9._:-]{1,64}$',
        },
        maxItems: 256,
      },
      rafTimestampsMs: {
        type: 'array',
        items: { type: 'number', minimum: 0, maximum: 9007199254740991 },
        maxItems: 300001,
      },
      longTasks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['startMs', 'durationMs'],
          properties: {
            startMs: { type: 'number', minimum: 0, maximum: 9007199254740991 },
            durationMs: {
              type: 'number',
              minimum: 0,
              maximum: 9007199254740991,
            },
          },
        },
        maxItems: 10000,
      },
      markers: {
        type: 'array',
        items: { $ref: '#/$defs/marker' },
        maxItems: 4096,
      },
      snapshots: {
        type: 'array',
        items: { $ref: '#/$defs/snapshot' },
        maxItems: 512,
      },
      checkpointPrefixes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'labelId',
            'atMs',
            'callbackCount',
            'longTaskDeliveryCount',
          ],
          properties: {
            labelId: { type: 'integer', minimum: 0, maximum: 255 },
            atMs: { type: 'number', minimum: 0, maximum: 9007199254740991 },
            callbackCount: { type: 'integer', minimum: 0, maximum: 300001 },
            longTaskDeliveryCount: {
              type: 'integer',
              minimum: 0,
              maximum: 10000,
            },
          },
        },
        maxItems: 512,
      },
      capabilities: { $ref: '#/$defs/capabilities' },
    },
  },
  analysis: {
    type: 'object',
    additionalProperties: false,
    required: [
      'kind',
      'captureSchemaVersion',
      'attemptId',
      'rawSha256',
      'toolchain',
      'analysisState',
      'metric',
      'percentileMethod',
      'source',
      'profile',
      'coverage',
      'allIntervals',
      'windows',
      'gaps',
      'invalidTimestampIndexes',
      'longTasks',
      'comparability',
      'capabilities',
      'qualification',
    ],
    properties: {
      kind: { const: 'route_capture_analysis' },
      captureSchemaVersion: { const: 1 },
      attemptId: {
        type: 'string',
        maxLength: 80,
        pattern: '^[A-Za-z0-9._:-]{1,80}$',
      },
      rawSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      toolchain: { $ref: '#/$defs/toolchain' },
      analysisState: { enum: ['complete', 'incomplete', 'rejected'] },
      metric: { const: 'raf_callback_interval_ms' },
      percentileMethod: { const: 'nearest_rank' },
      source: { $ref: '#/$defs/source' },
      profile: { $ref: '#/$defs/profile' },
      coverage: { $ref: '#/$defs/coverage' },
      allIntervals: { $ref: '#/$defs/summary' },
      windows: {
        type: 'array',
        items: { $ref: '#/$defs/window' },
        maxItems: 128,
      },
      gaps: { type: 'array', items: { $ref: '#/$defs/gap' }, maxItems: 300000 },
      invalidTimestampIndexes: {
        type: 'array',
        items: { type: 'integer', minimum: 0, maximum: 300000 },
        maxItems: 300001,
      },
      longTasks: {
        type: 'object',
        additionalProperties: false,
        required: ['state', 'count', 'totalMs', 'maxMs'],
        properties: {
          state: { enum: ['available', 'unsupported', 'partial'] },
          count: {
            anyOf: [
              { type: 'integer', minimum: 0, maximum: 10000 },
              { type: 'null' },
            ],
          },
          totalMs: {
            anyOf: [
              { type: 'number', minimum: 0, maximum: 9007199254740991 },
              { type: 'null' },
            ],
          },
          maxMs: {
            anyOf: [
              { type: 'number', minimum: 0, maximum: 9007199254740991 },
              { type: 'null' },
            ],
          },
        },
      },
      comparability: {
        type: 'object',
        additionalProperties: false,
        required: ['state', 'keySha256', 'reasons'],
        properties: {
          state: { enum: ['bound', 'unbound'] },
          keySha256: {
            anyOf: [
              { type: 'string', pattern: '^[a-f0-9]{64}$' },
              { type: 'null' },
            ],
          },
          reasons: {
            type: 'array',
            items: {
              enum: [
                'source_unknown',
                'artifact_unverified',
                'route_unbound',
                'device_unverified',
                'missing_profile',
                'incomplete_window',
                'collector_mismatch',
              ],
            },
            maxItems: 7,
          },
        },
      },
      capabilities: { $ref: '#/$defs/capabilities' },
      qualification: { $ref: '#/$defs/qualification' },
    },
  },
  manifest: {
    type: 'object',
    additionalProperties: false,
    required: [
      'kind',
      'captureSchemaVersion',
      'operationId',
      'attemptId',
      'toolchain',
      'state',
      'files',
      'unavailableFiles',
    ],
    properties: {
      kind: { const: 'route_capture_manifest' },
      captureSchemaVersion: { const: 1 },
      attemptId: {
        anyOf: [
          { type: 'string', maxLength: 80, pattern: '^[A-Za-z0-9._:-]{1,80}$' },
          { type: 'null' },
        ],
      },
      toolchain: { $ref: '#/$defs/receiptToolchain' },
      state: { enum: ['complete', 'partial', 'failed', 'cancelled'] },
      files: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'byteLength', 'sha256'],
          properties: {
            name: {
              enum: [
                'route-capture-initial-v1.json',
                'route-capture-running-v1.json',
                'route-capture-terminal-v1.json',
                'route-capture-raw-v1.json',
                'route-capture-analysis-v1.json',
              ],
            },
            byteLength: { type: 'integer', minimum: 0, maximum: 16777216 },
            sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
          },
        },
        maxItems: 5,
      },
      unavailableFiles: {
        type: 'array',
        items: {
          enum: [
            'route-capture-initial-v1.json',
            'route-capture-running-v1.json',
            'route-capture-terminal-v1.json',
            'route-capture-raw-v1.json',
            'route-capture-analysis-v1.json',
          ],
        },
        maxItems: 5,
      },
      operationId: {
        type: 'string',
        maxLength: 80,
        pattern: '^[A-Za-z0-9._:-]{1,80}$',
      },
    },
  },
  receipt: {
    type: 'object',
    additionalProperties: false,
    required: [
      'kind',
      'captureSchemaVersion',
      'operationId',
      'attemptId',
      'operation',
      'phase',
      'state',
      'reason',
      'createdAt',
      'toolchain',
      'inputSha256',
      'inputByteLength',
      'captureStoppedAtMs',
      'cleanupState',
    ],
    properties: {
      kind: { const: 'route_capture_receipt' },
      captureSchemaVersion: { const: 1 },
      operationId: {
        type: 'string',
        maxLength: 80,
        pattern: '^[A-Za-z0-9._:-]{1,80}$',
      },
      attemptId: {
        anyOf: [
          { type: 'string', maxLength: 80, pattern: '^[A-Za-z0-9._:-]{1,80}$' },
          { type: 'null' },
        ],
      },
      operation: { enum: ['capture', 'analysis'] },
      phase: { enum: ['initial', 'running', 'terminal'] },
      state: {
        enum: [
          'initialized',
          'running',
          'complete',
          'partial',
          'failed',
          'cancelled',
        ],
      },
      reason: {
        anyOf: [
          {
            enum: [
              'finished',
              'cancelled',
              'page_lost',
              'navigation',
              'capacity',
              'deadline',
              'invalid_clock',
              'invalid_input',
              'input_limit',
              'output_limit',
              'export_timeout',
              'cleanup_timeout',
              'io_error',
              'identity_invalid',
              'internal_error',
            ],
          },
          { type: 'null' },
        ],
      },
      createdAt: { type: 'string', format: 'date-time' },
      toolchain: { $ref: '#/$defs/receiptToolchain' },
      inputSha256: {
        anyOf: [
          { type: 'string', pattern: '^[a-f0-9]{64}$' },
          { type: 'null' },
        ],
      },
      inputByteLength: {
        anyOf: [
          { type: 'integer', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
      captureStoppedAtMs: {
        anyOf: [
          { type: 'number', minimum: 0, maximum: 9007199254740991 },
          { type: 'null' },
        ],
      },
      cleanupState: {
        enum: ['not_started', 'complete', 'incomplete', 'not_applicable'],
      },
    },
  },
  receiptToolchain: {
    type: 'object',
    additionalProperties: false,
    required: ['helperSha256', 'probeSha256', 'analyzerSha256'],
    properties: {
      helperSha256: {
        anyOf: [
          { type: 'string', pattern: '^[a-f0-9]{64}$' },
          { type: 'null' },
        ],
      },
      probeSha256: {
        anyOf: [
          { type: 'string', pattern: '^[a-f0-9]{64}$' },
          { type: 'null' },
        ],
      },
      analyzerSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    },
  },
};

function validateArtifact(value) {
  let bytes = 0;
  function visit(v, rule, depth = 0) {
    check(depth < 24);
    if (rule.$ref)
      return visit(v, definitions[rule.$ref.split('/').at(-1)], depth + 1);
    if (rule.oneOf || rule.anyOf) {
      for (const option of rule.oneOf || rule.anyOf) {
        const before = bytes;
        try {
          return visit(v, option, depth + 1);
        } catch {
          bytes = before;
        }
      }
      fail();
    }
    if (Object.hasOwn(rule, 'const')) check(v === rule.const);
    if (rule.enum) check(rule.enum.includes(v));
    if (rule.type === 'object') {
      check(
        v !== null &&
          typeof v === 'object' &&
          Object.getPrototypeOf(v) === Object.prototype
      );
      const keys = Reflect.ownKeys(v);
      check(keys.length === rule.required.length);
      const result = {};
      check(
        keys.every(
          (key) =>
            typeof key === 'string' && Object.hasOwn(rule.properties, key)
        )
      );
      for (const key of Object.keys(rule.properties)) {
        check(typeof key === 'string' && Object.hasOwn(rule.properties, key));
        const descriptor = Object.getOwnPropertyDescriptor(v, key);
        check(Object.hasOwn(descriptor, 'value') && descriptor.enumerable);
        bytes += Buffer.byteLength(JSON.stringify(key)) + 1;
        result[key] = visit(descriptor.value, rule.properties[key], depth + 1);
      }
      check(rule.required.every((key) => Object.hasOwn(result, key)));
      bytes += keys.length + 2;
      check(bytes <= MAX_BYTES, 'input_limit');
      return result;
    }
    if (rule.type === 'array') {
      check(
        Array.isArray(v) &&
          Object.getPrototypeOf(v) === Array.prototype &&
          v.length <= rule.maxItems
      );
      check(Reflect.ownKeys(v).length === v.length + 1);
      bytes += v.length + 2;
      check(bytes <= MAX_BYTES, 'input_limit');
      const result = [];
      for (let i = 0; i < v.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(v, String(i));
        check(descriptor && Object.hasOwn(descriptor, 'value'));
        result.push(visit(descriptor.value, rule.items, depth + 1));
      }
      return result;
    }
    if (rule.type === 'null') check(v === null);
    if (rule.type === 'string') {
      check(typeof v === 'string' && v.length <= (rule.maxLength || 80));
      if (rule.pattern) check(new RegExp(rule.pattern).test(v));
      if (rule.format)
        check(
          /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(v) &&
            Number.isFinite(Date.parse(v))
        );
    }
    if (rule.type === 'boolean') check(typeof v === 'boolean');
    if (rule.type === 'number' || rule.type === 'integer') {
      check(typeof v === 'number' && Number.isFinite(v));
      if (rule.type === 'integer') check(Number.isSafeInteger(v));
      if (rule.minimum !== undefined) check(v >= rule.minimum);
      if (rule.exclusiveMinimum !== undefined) check(v > rule.exclusiveMinimum);
      check(v <= rule.maximum);
    }
    bytes += Buffer.byteLength(JSON.stringify(v));
    check(bytes <= MAX_BYTES, 'input_limit');
    return v;
  }
  // Inspect the discriminator without invoking untrusted accessors.
  check(value && typeof value === 'object');
  const kind = Object.getOwnPropertyDescriptor(value, 'kind');
  check(kind && Object.hasOwn(kind, 'value'));
  const name = {
    route_capture_raw: 'raw',
    route_capture_analysis: 'analysis',
    route_capture_receipt: 'receipt',
    route_capture_manifest: 'manifest',
  }[kind.value];
  check(name);
  const copy = visit(value, definitions[name]);
  if (name === 'receipt') {
    check(
      copy.phase === 'initial'
        ? copy.state === 'initialized' && copy.reason === null
        : copy.phase === 'running'
          ? copy.state === 'running' && copy.reason === null
          : copy.reason === 'finished'
            ? copy.state === 'complete'
            : copy.reason === 'cancelled'
              ? copy.state === 'cancelled'
              : copy.reason !== null &&
                ['partial', 'failed'].includes(copy.state)
    );
  }
  if (name === 'manifest') {
    const names = [...copy.files.map((f) => f.name), ...copy.unavailableFiles];
    check(names.length === 5 && new Set(names).size === 5);
  }
  return copy;
}

function parseCapture(value) {
  const c = validateArtifact(value);
  check(c.kind === 'route_capture_raw');
  const b = c.bounds,
    t = c.rafTimestampsMs,
    coverage = c.coverage;
  check(
    c.labels.length <= b.maxLabels && new Set(c.labels).size === c.labels.length
  );
  check(c.checkpointPrefixes.length <= b.maxSnapshots);
  const records = {
    raf: t,
    longTasks: c.longTasks,
    markers: c.markers,
    snapshots: c.snapshots,
  };
  for (const [key, limit] of [
    ['raf', b.maxRafIntervals + 1],
    ['longTasks', b.maxLongTasks],
    ['markers', b.maxMarkers],
    ['snapshots', b.maxSnapshots],
  ]) {
    const stream = c.streams[key];
    check(
      records[key].length <= limit &&
        stream.retainedCount === records[key].length &&
        stream.observedCount >= stream.retainedCount
    );
    if (stream.state === 'unsupported' || stream.state === 'unavailable')
      check(stream.retainedCount === 0);
    if (stream.state === 'complete')
      check(
        stream.unrecordedCount === 0 &&
          stream.firstUnrecordedAtMs === null &&
          stream.observedCount === stream.retainedCount
      );
    if (stream.state === 'capacity_stop')
      check(
        stream.retainedCount === limit &&
          stream.firstUnrecordedAtMs !== null &&
          stream.unrecordedCount !== 0
      );
  }
  check(
    coverage.plannedDeadlineAtMs ===
      coverage.captureStartedAtMs + b.maxDurationMs
  );
  check(
    coverage.captureStoppedAtMs === null ||
      coverage.captureStoppedAtMs >= coverage.captureStartedAtMs
  );
  const inTime = (n) =>
    n >= coverage.captureStartedAtMs &&
    (coverage.captureStoppedAtMs === null || n <= coverage.captureStoppedAtMs);
  check(t.every(inTime));
  check(
    coverage.firstCallbackAtMs === (t[0] ?? null) &&
      coverage.lastCallbackAtMs === (t.at(-1) ?? null)
  );
  check(
    coverage.leftCensoredMs ===
      (t.length ? t[0] - coverage.captureStartedAtMs : null)
  );
  check(
    coverage.rightCensoredMs ===
      (t.length && coverage.captureStoppedAtMs !== null
        ? coverage.captureStoppedAtMs - t.at(-1)
        : null)
  );
  check(
    coverage.deadlineOvershootMs ===
      (coverage.captureStoppedAtMs === null
        ? null
        : Math.max(
            0,
            coverage.captureStoppedAtMs - coverage.plannedDeadlineAtMs
          ))
  );
  let last = -1;
  const open = new Map(),
    seen = new Set();
  for (const m of c.markers) {
    check(inTime(m.atMs) && m.atMs >= last);
    last = m.atMs;
    check(m.labelId === null || m.labelId < c.labels.length);
    if (m.type === 'span_begin') {
      check(m.spanId !== null && m.spanKind !== null && !seen.has(m.spanId));
      seen.add(m.spanId);
      open.set(m.spanId, m);
    } else if (m.type === 'span_end') {
      const begin = open.get(m.spanId);
      check(
        begin && begin.spanKind === m.spanKind && begin.labelId === m.labelId
      );
      open.delete(m.spanId);
    } else check(m.spanId === null && m.spanKind === null);
  }
  let previous = { atMs: 0, callbackCount: 0, longTaskDeliveryCount: 0 };
  for (const p of c.checkpointPrefixes) {
    check(
      p.labelId < c.labels.length &&
        inTime(p.atMs) &&
        p.atMs >= previous.atMs &&
        p.callbackCount >= previous.callbackCount &&
        p.longTaskDeliveryCount >= previous.longTaskDeliveryCount &&
        p.callbackCount <= t.length &&
        p.longTaskDeliveryCount <= c.longTasks.length
    );
    check(p.callbackCount === 0 || t[p.callbackCount - 1] <= p.atMs);
    check(p.callbackCount === t.length || t[p.callbackCount] >= p.atMs);
    previous = p;
  }
  check(c.snapshots.every((s) => inTime(s.atMs)));
  check(
    c.longTasks.every(
      (s) =>
        coverage.captureStoppedAtMs === null ||
        s.startMs + s.durationMs <= coverage.captureStoppedAtMs
    )
  );
  if (c.warmth.state === 'evidence_provided')
    check(
      c.warmth.assetsSettledMs !== null &&
        c.warmth.settleEvidenceSha256 !== null &&
        c.markers.some(
          (m) =>
            m.type === 'assets_settled' && m.atMs === c.warmth.assetsSettledMs
        )
    );
  else
    check(
      c.warmth.assetsSettledMs === null &&
        c.warmth.settleEvidenceSha256 === null
    );
  if (c.warmth.applicationReadyMs !== null)
    check(
      c.markers.some(
        (m) =>
          m.type === 'application_ready' &&
          m.atMs === c.warmth.applicationReadyMs
      )
    );
  if (c.source.artifactReceiptState === 'unbound')
    check(c.source.artifactId === null);
  else check(c.source.artifactId !== null);
  if (c.captureState === 'complete')
    check(
      c.stopReason === 'finished' &&
        c.finishedAt !== null &&
        coverage.state === 'complete' &&
        coverage.reasons.length === 0 &&
        !open.size &&
        Object.values(c.streams).every((s) =>
          ['complete', 'unsupported'].includes(s.state)
        )
    );
  if (coverage.captureStoppedAtMs === null)
    check(coverage.state === 'incomplete');
  check((coverage.state === 'complete') === (coverage.reasons.length === 0));
  check(
    c.finishedAt === null || Date.parse(c.finishedAt) >= Date.parse(c.startedAt)
  );
  check((c.captureState === 'cancelled') === (c.stopReason === 'cancelled'));
  check(c.snapshots.every((s, i) => !i || s.atMs >= c.snapshots[i - 1].atMs));
  for (const s of Object.values(c.streams)) {
    if (s.firstUnrecordedAtMs !== null) check(inTime(s.firstUnrecordedAtMs));
    if (s.state === 'capacity_stop') check(s.observedCount > s.retainedCount);
    if (s.state === 'unsupported') check(s.observedCount === 0);
  }
  const taskState = c.streams.longTasks.state;
  check(
    c.capabilities.longTaskTiming ===
      (taskState === 'unsupported'
        ? 'unsupported'
        : taskState === 'complete'
          ? 'supported'
          : 'partial')
  );
  check(Buffer.byteLength(JSON.stringify(c)) <= b.maxRawBytes, 'input_limit');
  return c;
}

function summary(values) {
  if (!values.length)
    return { state: 'unavailable', reason: 'no_completed_intervals' };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    state: 'available',
    sampleCount: sorted.length,
    p50Ms: sorted[Math.ceil(sorted.length * 0.5) - 1],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
    p99Ms: sorted[Math.ceil(sorted.length * 0.99) - 1],
    maxMs: sorted.at(-1),
  };
}
const overlap = (a, b, c, d) => Math.max(a, c) < Math.min(b, d);
function analyzeCapture(value) {
  const c = parseCapture(value),
    t = c.rafTimestampsMs;
  const invalidTimestampIndexes = [];
  const durations = [];
  for (let i = 1; i < t.length; i++) {
    if (t[i] <= t[i - 1]) invalidTimestampIndexes.push(i);
    durations.push(t[i] - t[i - 1]);
  }
  const invalid =
    invalidTimestampIndexes.length > 0 ||
    c.streams.raf.state === 'clock_invalid';
  const spans = [],
    open = new Map();
  for (const m of c.markers) {
    if (m.type === 'span_begin') open.set(m.spanId, m);
    if (m.type === 'span_end') {
      spans.push({ ...open.get(m.spanId), endMs: m.atMs });
      open.delete(m.spanId);
    }
  }
  for (const m of open.values())
    spans.push({
      ...m,
      endMs: c.coverage.captureStoppedAtMs ?? t.at(-1) ?? m.atMs,
    });
  const visibility = c.markers.filter((m) => m.type.startsWith('visibility_'));
  const visibilityKnown = visibility[0]?.atMs === c.coverage.captureStartedAtMs;
  const coverage = { ...c.coverage, reasons: [...c.coverage.reasons] };
  const reason = (r) => {
    if (!coverage.reasons.includes(r)) coverage.reasons.push(r);
    coverage.state = 'incomplete';
  };
  if (!t.length) reason('no_callbacks');
  if (coverage.leftCensoredMs > 100) reason('unobserved_start');
  if (coverage.rightCensoredMs > 100 || coverage.captureStoppedAtMs === null)
    reason('open_tail');
  if (!visibilityKnown) reason('visibility_unknown');
  if (open.size) reason('unmatched_span');
  if (invalid) reason('invalid_clock');
  if (
    Object.values(c.streams).some((s) =>
      ['unavailable', 'clock_invalid'].includes(s.state)
    )
  )
    reason('export_failed');
  if (Object.values(c.streams).some((s) => s.state === 'capacity_stop'))
    reason('capacity');
  if (c.streams.markers.state !== 'complete') reason('marker_loss');
  const fullStart =
    c.markers.find((m) => m.type === 'route_begin')?.atMs ??
    coverage.captureStartedAtMs;
  const fullEnd =
    c.markers.findLast((m) => m.type === 'route_end')?.atMs ??
    coverage.captureStoppedAtMs ??
    t.at(-1) ??
    fullStart;
  const ready = c.warmth.applicationReadyMs;
  const definitions = [
    {
      id: 'full-route',
      kind: 'full_route',
      startMs: fullStart,
      endMs: fullEnd,
      clean: false,
    },
  ];
  if (ready !== null && ready + 5000 <= fullEnd) {
    definitions.push({
      id: 'post-readiness',
      kind: 'post_readiness_diagnostic',
      startMs: ready + 5000,
      endMs: fullEnd,
      clean: false,
    });
    definitions.push({
      id: 'foreground-candidate',
      kind: 'steady_foreground_candidate',
      startMs: ready + 5000,
      endMs: fullEnd,
      clean: true,
    });
    const first = t.findIndex((v) => v > ready + 5000);
    definitions.push({
      id: 'prefix-120',
      kind: 'prefix_120',
      startMs: ready + 5000,
      endMs: first >= 0 && first + 120 < t.length ? t[first + 120] : fullEnd,
      clean: true,
    });
  }
  check(definitions.length <= c.bounds.maxWindows, 'output_limit');
  let outputBudget = 0;
  const budget = (n) => {
    outputBudget += n;
    check(outputBudget <= c.bounds.maxAnalysisBytes, 'output_limit');
  };
  const gaps = [];
  if (!invalid)
    for (let i = 0; i < durations.length; i++)
      if (durations[i] > 100) {
        const intersections = spans.filter((s) =>
          overlap(t[i], t[i + 1], s.atMs, s.endMs)
        );
        budget(220 + intersections.length * 6);
        const helper = intersections.some((s) =>
          s.spanKind.startsWith('helper_')
        );
        const interruption =
          intersections.some((s) =>
            ['interruption', 'visibility'].includes(s.spanKind)
          ) ||
          visibility.some(
            (m, j) =>
              m.type === 'visibility_hidden' &&
              overlap(
                t[i],
                t[i + 1],
                m.atMs,
                visibility[j + 1]?.atMs ?? fullEnd
              )
          );
        gaps.push({
          intervalIndex: i,
          startMs: t[i],
          endMs: t[i + 1],
          durationMs: durations[i],
          over100Ms: true,
          atLeast1000Ms: durations[i] >= 1000,
          intersectingSpanIds: intersections.map((s) => s.spanId),
          classification: helper
            ? interruption
              ? 'overlaps_helper_and_interruption'
              : 'overlaps_known_helper'
            : interruption
              ? 'overlaps_interruption'
              : 'unclassified',
        });
      }
  const windows = definitions.map((w) => {
    const eligibleRanges = [],
      excludedRanges = [],
      values = [];
    let excludedDurationMs = 0,
      observedDurationMs = 0;
    function addRange(list, i, reasons, duration) {
      const last = list.at(-1);
      const range = reasons ? last?.range : last;
      if (
        range?.toExclusive === i &&
        (!reasons || JSON.stringify(last.reasons) === JSON.stringify(reasons))
      ) {
        range.toExclusive = i + 1;
        if (reasons) last.durationMs += duration;
      } else {
        check(list.length < 4096, 'output_limit');
        budget(200);
        list.push(
          reasons
            ? {
                range: { fromInclusive: i, toExclusive: i + 1 },
                reasons,
                durationMs: duration,
              }
            : { fromInclusive: i, toExclusive: i + 1 }
        );
      }
    }
    if (!invalid)
      for (let i = 0; i < durations.length; i++) {
        const a = t[i],
          b = t[i + 1],
          reasons = [];
        if (!overlap(a, b, w.startMs, w.endMs)) reasons.push('outside_window');
        else if (w.clean) {
          if (a < w.startMs || b > w.endMs) reasons.push('boundary_crossing');
          const visible =
            visibilityKnown &&
            visibility.findLast((m) => m.atMs <= a)?.type ===
              'visibility_visible';
          if (!visibilityKnown) reasons.push('missing_coverage');
          else if (
            !visible ||
            visibility.some(
              (m) => m.atMs > a && m.atMs < b && m.type === 'visibility_hidden'
            )
          )
            reasons.push('hidden');
          if (
            spans.some(
              (s) =>
                s.spanKind.startsWith('helper_') &&
                overlap(a, b, s.atMs, s.endMs)
            )
          )
            reasons.push('helper_overlap');
          if (
            spans.some(
              (s) =>
                s.spanKind === 'interruption' && overlap(a, b, s.atMs, s.endMs)
            )
          )
            reasons.push('missing_coverage');
          if (
            c.warmth.state !== 'evidence_provided' ||
            a < c.warmth.assetsSettledMs + 5000
          )
            reasons.push('warmth_unqualified');
          if (
            c.snapshots.some(
              (s) =>
                s.atMs >= a &&
                s.atMs <= b &&
                (s.rendererClass !== c.profile.rendererClass ||
                  s.appMode !== 'immersive')
            )
          )
            reasons.push('renderer_changed');
          if (open.size || c.streams.markers.state !== 'complete')
            reasons.push('missing_coverage');
        }
        if (reasons.length) {
          addRange(excludedRanges, i, [...new Set(reasons)], durations[i]);
          excludedDurationMs += durations[i];
        } else {
          addRange(eligibleRanges, i);
          values.push(durations[i]);
          observedDurationMs += durations[i];
        }
      }
    let censoredDurationMs = 0;
    for (const [a, b] of [
      [coverage.captureStartedAtMs, coverage.firstCallbackAtMs],
      [coverage.lastCallbackAtMs, coverage.captureStoppedAtMs],
    ])
      if (a !== null && b !== null)
        censoredDurationMs += Math.max(
          0,
          Math.min(w.endMs, b) - Math.max(w.startMs, a)
        );
    let result = invalid
      ? { state: 'unavailable', reason: 'invalid_clock' }
      : summary(values);
    if (
      w.kind === 'prefix_120' &&
      (values.length !== 120 || eligibleRanges.length !== 1)
    )
      result = { state: 'unavailable', reason: 'incomplete_coverage' };
    return {
      id: w.id,
      kind: w.kind,
      startMs: w.startMs,
      endMs: w.endMs,
      requiredDurationMs: null,
      selection: w.clean
        ? 'wholly_contained_foreground_uncontaminated'
        : 'all_completed_intervals',
      warmthState: c.warmth.state,
      summary: result,
      eligibleRanges,
      excludedRanges,
      observedDurationMs,
      excludedDurationMs,
      censoredDurationMs,
      coverageState: coverage.state,
      hardwareQualified: false,
    };
  });
  const comparabilityReasons = [];
  if (!c.source.commit) comparabilityReasons.push('source_unknown');
  if (c.source.artifactReceiptState !== 'verified')
    comparabilityReasons.push('artifact_unverified');
  if (!c.source.routeContractSha256) comparabilityReasons.push('route_unbound');
  comparabilityReasons.push('device_unverified');
  if (coverage.state !== 'complete')
    comparabilityReasons.push('incomplete_window');
  const analysis = {
    kind: 'route_capture_analysis',
    captureSchemaVersion: 1,
    attemptId: c.attemptId,
    rawSha256: sha256(JSON.stringify(c)),
    toolchain: c.toolchain,
    analysisState: invalid
      ? 'rejected'
      : coverage.state === 'complete'
        ? 'complete'
        : 'incomplete',
    metric: 'raf_callback_interval_ms',
    percentileMethod: 'nearest_rank',
    source: c.source,
    profile: c.profile,
    coverage,
    allIntervals: invalid
      ? { state: 'unavailable', reason: 'invalid_clock' }
      : summary(durations),
    windows,
    gaps,
    invalidTimestampIndexes,
    longTasks:
      c.streams.longTasks.state === 'unsupported'
        ? { state: 'unsupported', count: null, totalMs: null, maxMs: null }
        : {
            state:
              c.streams.longTasks.state === 'complete'
                ? 'available'
                : 'partial',
            count: c.longTasks.length,
            totalMs: c.longTasks.reduce((a, v) => a + v.durationMs, 0),
            maxMs: c.longTasks.reduce((a, v) => Math.max(a, v.durationMs), 0),
          },
    comparability: {
      state: 'unbound',
      keySha256: null,
      reasons: comparabilityReasons,
    },
    capabilities: c.capabilities,
    qualification: {
      state: 'incomplete',
      reasons: [
        'diagnostic_cadence_only',
        'synthetic_harness',
        'device_unverified',
        'native_frame_method_unvalidated',
        'renderer_continuity_sampled_only',
        'missing_next_paint',
        'missing_resource_bytes',
        'missing_heap',
        ...(c.warmth.state !== 'evidence_provided'
          ? ['warmth_unqualified']
          : []),
        ...(comparabilityReasons.length > 1 ? ['identity_unbound'] : []),
        ...(coverage.state !== 'complete'
          ? ['missing_duration_or_coverage']
          : []),
      ],
    },
  };
  check(
    Buffer.byteLength(JSON.stringify(analysis)) <= c.bounds.maxAnalysisBytes,
    'output_limit'
  );
  return validateArtifact(analysis);
}

function projectLegacyProbe(value, prefix) {
  const c = parseCapture(value);
  check(
    prefix &&
      Number.isInteger(prefix.callbackCount) &&
      Number.isInteger(prefix.longTaskDeliveryCount) &&
      Number.isFinite(prefix.atMs)
  );
  check(
    prefix.callbackCount >= 0 &&
      prefix.callbackCount <= c.rafTimestampsMs.length &&
      prefix.longTaskDeliveryCount >= 0 &&
      prefix.longTaskDeliveryCount <= c.longTasks.length
  );
  check(
    prefix.atMs >= c.coverage.captureStartedAtMs &&
      (c.coverage.captureStoppedAtMs === null ||
        prefix.atMs <= c.coverage.captureStoppedAtMs)
  );
  check(
    prefix.callbackCount === 0 ||
      c.rafTimestampsMs[prefix.callbackCount - 1] <= prefix.atMs
  );
  for (const name of ['raf', 'longTasks']) {
    const s = c.streams[name];
    check(
      s.state === 'complete' ||
        s.state === 'unsupported' ||
        (s.firstUnrecordedAtMs !== null && prefix.atMs < s.firstUnrecordedAtMs),
      'invalid_input'
    );
  }
  const times = c.rafTimestampsMs.slice(0, prefix.callbackCount),
    values = times.slice(1).map((v, i) => v - times[i]);
  check(values.every((v) => v > 0));
  const stats = summary(values),
    tasks = c.longTasks.slice(0, prefix.longTaskDeliveryCount);
  return {
    elapsedMs: prefix.atMs,
    rafSampleCount: values.length,
    rafP95Ms: stats.p95Ms ?? null,
    rafMaxMs: stats.maxMs ?? null,
    rafIntervalsAtLeast1000Ms: values.filter((v) => v >= 1000).length,
    longTaskCount:
      c.streams.longTasks.state === 'unsupported' ? -1 : tasks.length,
    longTaskTotalMs: tasks.reduce((a, t) => a + t.durationMs, 0),
    longTaskMaxMs: tasks.reduce((a, t) => Math.max(a, t.durationMs), 0),
  };
}
function compareCaptures(base, candidate) {
  const a = parseCapture(base),
    b = parseCapture(candidate),
    aa = analyzeCapture(a),
    bb = analyzeCapture(b),
    reasons = [];
  if (
    [a, b].some(
      (c) =>
        !c.source.commit ||
        !c.source.routeContractSha256 ||
        c.source.artifactReceiptState !== 'verified'
    )
  )
    reasons.push('identity_unbound');
  for (const key of ['profile', 'toolchain', 'bounds'])
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key]))
      reasons.push(key + '_mismatch');
  if (a.source.routeContractSha256 !== b.source.routeContractSha256)
    reasons.push('route_mismatch');
  const windows = (x) =>
    x.windows.map((w) => [
      w.id,
      w.kind,
      w.requiredDurationMs,
      w.selection,
      w.warmthState,
    ]);
  if (JSON.stringify(windows(aa)) !== JSON.stringify(windows(bb)))
    reasons.push('window_mismatch');
  if (aa.analysisState !== 'complete' || bb.analysisState !== 'complete')
    reasons.push('incomplete_window');
  return {
    state: reasons.length ? 'incompatible' : 'diagnostic_profile_comparable',
    reasons,
    hardwareQualified: false,
    deltaP95Ms:
      !reasons.length &&
      aa.allIntervals.state === 'available' &&
      bb.allIntervals.state === 'available'
        ? bb.allIntervals.p95Ms - aa.allIntervals.p95Ms
        : null,
  };
}
module.exports = {
  parseCapture,
  analyzeCapture,
  compareCaptures,
  projectLegacyProbe,
  validateArtifact,
  sha256,
  MAX_BYTES,
};
