/**
 * OpenTelemetry tracing bootstrap para SigNoz.
 *
 * IMPORTANTE: este archivo debe ser el PRIMER import en main.ts para que las
 * auto-instrumentaciones parcheen los módulos antes de que NestJS los cargue.
 *
 * Se usa require() en lugar de import para garantizar ejecución síncrona
 * inmediata antes que cualquier otro módulo del grafo de dependencias.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const otlpEndpoint: string =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';

const serviceName: string =
  process.env.OTEL_SERVICE_NAME ?? 'api-fit-clase';

const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
});

const metricExporter = new OTLPMetricExporter({
  url: `${otlpEndpoint}/v1/metrics`,
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
  }),
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10_000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Deshabilitar instrumentación de fs para evitar ruido excesivo
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

// Cierre limpio al terminar el proceso
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down'))
    .catch((err: unknown) => console.error('Error shutting down OpenTelemetry SDK', err))
    .finally(() => process.exit(0));
});
